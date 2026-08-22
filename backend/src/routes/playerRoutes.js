import express from 'express';
import { uploadMiddleware } from '../services/imageService.js';
import {
  registerPlayer,
  getPlayers,
  getMyProfile,
  getMyFieldPosition,
  withdrawPlayer,
  updatePlayerProfile,
  getRegistrationStatus,
  toggleRegistrationFreeze,
  requestManagerRole,
  requestPlayerRole
} from '../controllers/playerController.js';
import { protect, optionalAuth, authorize } from '../middleware/auth.js';
import { requirePhase, requireRegistrationOpen } from '../middleware/phase.js';

const router = express.Router();

// ── Public / Optional-Auth Routes ────────────────────────────────────────────

// GET /api/players/status — public
router.get('/status', getRegistrationStatus);

// GET /api/players/me — logged-in player profile
router.get('/me', protect, getMyProfile);

// GET /api/players/field-position — logged-in player's assigned pitch position
// (SOLD players only; 404 with code NOT_SOLD otherwise). Drives the Reveal page.
router.get('/field-position', protect, authorize('PLAYER', 'SUPER_ADMIN'), getMyFieldPosition);

// POST /api/players/register — public (freeze bypass for SUPER_ADMIN handled in controller)
// Gated by the AUTOMATIC registration window: closed before the scheduled
// start time, open at start, closed again after the end time. All evaluated
// server-side; SUPER_ADMIN retains an operational bypass.
router.post('/register', optionalAuth, requireRegistrationOpen(), uploadMiddleware.single('picture'), registerPlayer);

// GET /api/players — optionalAuth: public gets limited fields, privileged users get full data
router.get('/', optionalAuth, getPlayers);

// ── Authenticated Routes ──────────────────────────────────────────────────────

// POST /api/players/request-manager — PLAYER or GENERAL_USER role upgrade request
router.post('/request-manager', protect, authorize('PLAYER', 'SPECTATOR', 'GENERAL_USER'), requestManagerRole);

// POST /api/players/request-player — GENERAL_USER request for Player role
router.post('/request-player', protect, authorize('GENERAL_USER', 'SPECTATOR'), requestPlayerRole);

// PUT /api/players/:id/withdraw — PLAYER (own only) or SUPER_ADMIN
// Self-service withdraw is a REGISTRATION-phase action; Super Admin overrides
// player records via /api/admin/players (not phase-gated).
router.put(
  '/:id/withdraw',
  protect,
  authorize('PLAYER', 'SUPER_ADMIN'),
  requirePhase('REGISTRATION'),
  withdrawPlayer
);

// PUT /api/players/:id/profile — PLAYER (own only) or SUPER_ADMIN
// Self-service profile edit is REGISTRATION-only; admin overrides via /api/admin/players.
router.put(
  '/:id/profile',
  protect,
  authorize('PLAYER', 'SUPER_ADMIN'),
  requirePhase('REGISTRATION'),
  uploadMiddleware.single('picture'),
  updatePlayerProfile
);

// POST /api/players/toggle-freeze — SUPER_ADMIN only
router.post('/toggle-freeze', protect, authorize('SUPER_ADMIN'), toggleRegistrationFreeze);

export default router;
