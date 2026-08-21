import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Team } from '../models/Team.js';
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

    // ── TEAM MANAGER: Verify existing team assignment (NO auto-creation) ────────
    // Teams are pre-created by Super Admin and assigned during manager approval.
    // We only sync teamId if the assigned team still exists (cleanup guard).
    if (user.role === 'TEAM_MANAGER') {
      // If teamId points to a deleted team, clear it
      if (user.teamId) {
        const team = await Team.findById(user.teamId);
        if (!team) {
          user.teamId = null;
          await user.save();
        }
      }
      // Try to find team by managerId if teamId is still missing
      if (!user.teamId) {
        const team = await Team.findOne({ managerId: user._id });
        if (team) {
          user.teamId = team._id;
          await user.save();
        }
      }
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
        profilePhoto: user.profilePhoto || '',
        notificationPrefs: user.notificationPrefs,
        createdAt: user.createdAt,
        mustResetPassword: user.mustResetPassword,
        managerRequestStatus: user.managerRequestStatus || 'NONE',
        managerRequestNote: user.managerRequestNote || '',
        playerRequestStatus: user.playerRequestStatus || 'NONE',
        playerRequestNote: user.playerRequestNote || ''
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

// ── CHANGE PASSWORD (all authenticated roles) ────────────────────────────────
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Current password and new password (min 6 chars) are required' });
    }

    const user = await User.findById(req.user._id || req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.mustResetPassword = false;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (e) { next(e); }
};

// ── GENERAL USER SELF-REGISTRATION ───────────────────────────────────────────
// Public endpoint. ALWAYS creates a GENERAL_USER account — the role is
// hardcoded server-side and can never be elevated from the client payload.
export const registerGeneralUser = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Full name (min 2 characters) is required' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'A valid email address is required' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    if (!phone || String(phone).trim().length < 6) {
      return res.status(400).json({ success: false, message: 'A valid mobile phone number is required' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // role is NEVER taken from req.body — always GENERAL_USER
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: String(phone).trim(),
      passwordHash,
      role: 'GENERAL_USER',
      isActive: true,
      profilePhoto: typeof req.body.profilePhoto === 'string' ? req.body.profilePhoto : ''
    });

    const tokens = generateTokens(user);
    res.status(201).json({
      success: true,
      token: tokens.token,
      refreshToken: tokens.refreshToken,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        teamId: user.teamId,
        profilePhoto: user.profilePhoto,
        notificationPrefs: user.notificationPrefs,
        createdAt: user.createdAt,
        managerRequestStatus: 'NONE',
        managerRequestNote: '',
        playerRequestStatus: 'NONE',
        playerRequestNote: ''
      }
    });
  } catch (e) { next(e); }
};

// ── UPDATE OWN PROFILE (GENERAL_USER) ────────────────────────────────────────
// Only allows safe self-fields. Role / email / teamId / isActive are ignored
// even if present in the body — a GENERAL_USER can never elevate themselves.
export const updateMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id || req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const { name, profilePhoto, notificationPrefs } = req.body;

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({ success: false, message: 'Name must be at least 2 characters' });
      }
      user.name = name.trim();
    }
    if (profilePhoto !== undefined && typeof profilePhoto === 'string') {
      user.profilePhoto = profilePhoto;
    }
    if (notificationPrefs && typeof notificationPrefs === 'object') {
      const allowed = ['tournamentUpdates', 'matchReminders', 'auctionAlerts', 'resultsPublished'];
      for (const key of allowed) {
        if (typeof notificationPrefs[key] === 'boolean') {
          user.notificationPrefs[key] = notificationPrefs[key];
        }
      }
    }

    await user.save();
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        teamId: user.teamId,
        profilePhoto: user.profilePhoto,
        notificationPrefs: user.notificationPrefs,
        createdAt: user.createdAt
      }
    });
  } catch (e) { next(e); }
};
