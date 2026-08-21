import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { User } from '../models/User.js';

// ── Role hierarchy ────────────────────────────────────────────────────────────
export const ROLES = ['SPECTATOR', 'PLAYER', 'TEAM_MANAGER', 'PODIUM_ADMIN', 'SUPER_ADMIN', 'GENERAL_USER'];

/**
 * Helper: checks if a string is a valid 24-char hex MongoDB ObjectId
 */
const isValidObjectId = (id) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);

/**
 * Middleware: Authenticates the request via JWT.
 * Sets req.user and calls next(). Blocks with 401 if no valid token or user.
 *
 * SECURITY: No mock fallback. If the user cannot be found in the DB,
 * the request is rejected — always.
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

    // Only look up real DB users — no mock user construction ever
    if (!decoded.id || !isValidObjectId(decoded.id)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token: user ID is not a valid database reference'
      });
    }

    let user;
    try {
      user = await User.findById(decoded.id).select('-passwordHash');
    } catch (_) {
      user = null;
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'User account no longer exists' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account disabled. Contact system administrator.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ success: false, message: 'Token verification failed' });
  }
};

/**
 * Middleware: Optionally attaches user if a valid token is present.
 * Does NOT block requests without a token — public routes still work.
 *
 * SECURITY: No mock fallback. Either the DB user exists or req.user = null.
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

    if (decoded.id && isValidObjectId(decoded.id)) {
      try {
        const user = await User.findById(decoded.id).select('-passwordHash');
        req.user = (user && user.isActive) ? user : null;
      } catch (_) {
        req.user = null;
      }
    } else {
      req.user = null;
    }
  } catch (_) {
    req.user = null;
  }

  next();
};

/**
 * Middleware factory: Role-based authorization gate (strict allow-list).
 * Usage: authorize('SUPER_ADMIN', 'PODIUM_ADMIN')
 *
 * Returns 403 if the authenticated user's role is not in the allow-list.
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied: role '${req.user?.role || 'unauthenticated'}' is not permitted for this endpoint`
      });
    }
    next();
  };
};

/**
 * Middleware factory: Own-resource enforcement.
 * Allows SUPER_ADMIN to bypass, and only lets the owning user through.
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
