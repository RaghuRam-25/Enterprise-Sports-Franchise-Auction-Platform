import express from 'express';
import { uploadMiddleware } from '../services/imageService.js';
import {
  registerPlayer,
  getPlayers,
  getMyProfile,
  withdrawPlayer,
  updatePlayerProfile,
  getRegistrationStatus,
  toggleRegistrationFreeze,
  requestManagerRole
} from '../controllers/playerController.js';
import { protect, optionalAuth, authorize } from '../middleware/auth.js';

const router = express.Router();

// ── Public / Optional-Auth Routes ────────────────────────────────────────────

// GET /api/players/status — public
router.get('/status', getRegistrationStatus);

// GET /api/players/me — logged-in player profile
router.get('/me', protect, getMyProfile);

// POST /api/players/register — public (freeze bypass for SUPER_ADMIN handled in controller)
router.post('/register', optionalAuth, uploadMiddleware.single('picture'), registerPlayer);

// GET /api/players — optionalAuth: public gets limited fields, privileged users get full data
router.get('/', optionalAuth, getPlayers);

// ── Authenticated Routes ──────────────────────────────────────────────────────

// POST /api/players/request-manager — PLAYER role upgrade request
router.post('/request-manager', protect, authorize('PLAYER', 'SPECTATOR'), requestManagerRole);

// PUT /api/players/:id/withdraw — PLAYER (own only) or SUPER_ADMIN
router.put(
  '/:id/withdraw',
  protect,
  authorize('PLAYER', 'SUPER_ADMIN'),
  withdrawPlayer
);

// PUT /api/players/:id/profile — PLAYER (own only) or SUPER_ADMIN
router.put(
  '/:id/profile',
  protect,
  authorize('PLAYER', 'SUPER_ADMIN'),
  uploadMiddleware.single('picture'),
  updatePlayerProfile
);

// POST /api/players/toggle-freeze — SUPER_ADMIN only
router.post('/toggle-freeze', protect, authorize('SUPER_ADMIN'), toggleRegistrationFreeze);

export default router;
