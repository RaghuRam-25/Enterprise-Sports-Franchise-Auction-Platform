import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getOwnTeam,
  getOwnBudget,
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

// GET /api/manager/budget — view own budget & roster slots
router.get('/budget', authorize('TEAM_MANAGER', 'SUPER_ADMIN'), getOwnBudget);

// GET /api/manager/history — view auction history (read-only)
router.get('/history', authorize('TEAM_MANAGER', 'SUPER_ADMIN'), getAuctionHistory);

// POST /api/manager/bid — place a normal bid during live auction
router.post('/bid', authorize('TEAM_MANAGER', 'SUPER_ADMIN'), placeBid);

// POST /api/manager/blind-bid — place a sealed blind bid
router.post('/blind-bid', authorize('TEAM_MANAGER', 'SUPER_ADMIN'), placeBlindBid);

// ── Team Manager only (own password — no Super Admin escalation here) ─────────

// PUT /api/manager/password — change own password
router.put('/password', authorize('TEAM_MANAGER', 'PODIUM_ADMIN', 'PLAYER'), changeOwnPassword);

export default router;
