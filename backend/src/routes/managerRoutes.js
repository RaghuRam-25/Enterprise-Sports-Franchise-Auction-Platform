import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { requirePhase } from '../middleware/phase.js';
import { uploadMiddleware } from '../services/imageService.js';
import {
  getOwnTeam,
  updateOwnTeam,
  getOwnBudget,
  getOwnRoster,
  placeBid,
  placeBlindBid,
  changeOwnPassword,
  getAuctionHistory
} from '../controllers/managerController.js';

const router = express.Router();

// All manager routes require authentication
router.use(protect);

// ── Team Manager + Super Admin access ─────────────────────────────────────────

// GET /api/manager/team — view own team info
router.get('/team', authorize('TEAM_MANAGER', 'SUPER_ADMIN'), getOwnTeam);

// PUT /api/manager/team — edit own team details & logo
router.put('/team', authorize('TEAM_MANAGER'), uploadMiddleware.single('logo'), updateOwnTeam);

// GET /api/manager/budget — view own budget & roster slots
router.get('/budget', authorize('TEAM_MANAGER', 'SUPER_ADMIN'), getOwnBudget);

// GET /api/manager/roster — view acquired players (GAP 8 FIX)
router.get('/roster', authorize('TEAM_MANAGER', 'SUPER_ADMIN'), getOwnRoster);

// GET /api/manager/history — view auction history (read-only)
router.get('/history', authorize('TEAM_MANAGER', 'SUPER_ADMIN'), getAuctionHistory);

// POST /api/manager/bid — place a normal bid during live auction (TEAM_MANAGER only, AUCTION phase)
router.post('/bid', authorize('TEAM_MANAGER'), requirePhase('AUCTION'), placeBid);

// POST /api/manager/blind-bid — place a sealed blind bid (TEAM_MANAGER only, AUCTION phase)
router.post('/blind-bid', authorize('TEAM_MANAGER'), requirePhase('AUCTION'), placeBlindBid);

// ── All authenticated users can change their own password ─────────────────────
// PUT /api/manager/password — change own password
router.put('/password', authorize('TEAM_MANAGER', 'PODIUM_ADMIN', 'PLAYER', 'SUPER_ADMIN'), changeOwnPassword);

export default router;
