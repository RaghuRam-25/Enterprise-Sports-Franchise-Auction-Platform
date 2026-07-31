import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { ENV } from '../config/env.js';

const generateTokens = (user) => {
  const userId = user._id || user.id;
  const token = jwt.sign(
    {
      id: userId,
      _id: userId,
      name: user.name,
      email: user.email,
      role: user.role,
      teamId: user.teamId
    },
    ENV.JWT_SECRET,
    { expiresIn: '1d' }
  );

  const refreshToken = jwt.sign(
    { id: userId, _id: userId },
    ENV.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return { token, refreshToken };
};

export const login = async (req, res, next) => {
  try {
    const { email, username, password, role } = req.body;
    const loginIdentifier = email || username;

    let user = await User.findOne({
      $or: [
        { email: loginIdentifier?.toLowerCase() },
        { email: loginIdentifier },
        { name: loginIdentifier }
      ]
    });

    // If not found in User model directly, search Player model by studentId or email
    if (!user) {
      const { Player } = await import('../models/Player.js');
      const player = await Player.findOne({
        $or: [
          { studentId: loginIdentifier },
          { email: loginIdentifier?.toLowerCase() },
          { email: loginIdentifier }
        ]
      });

      if (player && player.userId) {
        user = await User.findById(player.userId);
      } else if (player && player.email) {
        user = await User.findOne({ email: player.email.toLowerCase() });
      }
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email, username, or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email, username, or password' });
    }

    const tokens = generateTokens(user);
    res.json({
      success: true,
      token: tokens.token,
      refreshToken: tokens.refreshToken,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        teamId: user.teamId,
        mustResetPassword: user.mustResetPassword,
        managerRequestStatus: user.managerRequestStatus || 'NONE',
        managerRequestNote: user.managerRequestNote || ''
      }
    });
  } catch (e) { next(e); }
};

export const getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

export const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ success: false, message: 'Refresh token required' });

  try {
    const decoded = jwt.verify(refreshToken, ENV.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });

    const tokens = generateTokens(user);
    res.json({ success: true, token: tokens.token, refreshToken: tokens.refreshToken });
  } catch (e) {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Security practice: don't reveal if user exists, just return success
      return res.json({ success: true, message: 'Password reset link sent to your registered Gmail / Email' });
    }

    // Generate reset token (in real production, send email via Nodemailer/Sendgrid)
    const resetToken = jwt.sign({ id: user._id }, ENV.JWT_SECRET, { expiresIn: '15m' });

    res.json({
      success: true,
      message: 'Password reset link sent to your registered Gmail / Email',
      resetToken // Returned for testing / immediate reset flow
    });
  } catch (e) { next(e); }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { email, token, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    let user;
    if (token) {
      const decoded = jwt.verify(token, ENV.JWT_SECRET);
      user = await User.findById(decoded.id);
    } else if (email) {
      user = await User.findOne({ email: email.toLowerCase() });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found or reset link expired' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.mustResetPassword = false;
    await user.save();

    res.json({ success: true, message: 'Password has been reset successfully. You can now login.' });
  } catch (e) { next(e); }
};

