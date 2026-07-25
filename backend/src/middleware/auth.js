import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { User } from '../models/User.js';

// ── Role hierarchy (lowest → highest) ────────────────────────────────────────
export const ROLES = ['SPECTATOR', 'PLAYER', 'TEAM_MANAGER', 'PODIUM_ADMIN', 'SUPER_ADMIN'];

/**
 * Middleware: Authenticates the request via JWT.
 * Sets req.user and calls next(). Blocks with 401 if no valid token.
 */
export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, token missing' });
  }

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-passwordHash');

    if (!user) {
      // Fallback mock user if database is unseeded
      req.user = {
        _id: decoded.id,
        role: decoded.role || 'SUPER_ADMIN',
        teamId: decoded.teamId
      };
      return next();
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account disabled' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token verification failed' });
  }
};

/**
 * Middleware: Optionally attaches user if a valid token is present.
 * Does NOT block requests without a token — public routes still work.
 * Use this for routes that behave differently for authenticated vs. anonymous users.
 */
export const optionalAuth = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-passwordHash');
    req.user = user || {
      _id: decoded.id,
      role: decoded.role || 'SUPER_ADMIN',
      teamId: decoded.teamId
    };
  } catch (_) {
    req.user = null;
  }

  next();
};

/**
 * Middleware factory: Role-based authorization gate.
 * Usage: authorize('SUPER_ADMIN', 'PODIUM_ADMIN')
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user?.role}' is not authorized for this route`
      });
    }
    next();
  };
};

/**
 * Middleware factory: Own-resource enforcement.
 * Allows SUPER_ADMIN to bypass, and only lets the owning user through.
 *
 * @param {string} paramField  - The req.params key that holds the resource ID (e.g., 'id')
 * @param {string} userField   - The field on req.user to compare against (e.g., '_id' or 'playerId')
 *
 * Usage: authorizeOwn('id', '_id')
 */
export const authorizeOwn = (paramField = 'id', userField = '_id') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    // Super Admin always bypasses ownership checks
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    const resourceId = req.params[paramField]?.toString();
    const userId = req.user[userField]?.toString();

    if (!resourceId || !userId || resourceId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to access this resource'
      });
    }

    next();
  };
};
