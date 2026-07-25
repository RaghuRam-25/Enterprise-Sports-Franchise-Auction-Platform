import express from 'express';
import {
  launchPlayer,
  selectUnsoldPlayer,
  moveNextPlayer,
  declareWinner,
  pauseAuction,
  resumeAuction,
  rollbackAuction,
  cancelAuction,
  forceSellAuction,
  getAuctionState,
  getAvailablePlayers
} from '../controllers/podiumController.js';
import { protect, optionalAuth, authorize } from '../middleware/auth.js';

const router = express.Router();

// ── Public Routes (Spectators can view live state) ────────────────────────────
router.get('/state', getAuctionState);

// ── Podium Admin + Super Admin only ──────────────────────────────────────────
const podiumGuard = [protect, authorize('PODIUM_ADMIN', 'SUPER_ADMIN')];

// Player management for podium
router.get('/players', ...podiumGuard, getAvailablePlayers);
router.post('/launch-player', ...podiumGuard, launchPlayer);
router.post('/select-unsold', ...podiumGuard, selectUnsoldPlayer);
router.post('/move-next', ...podiumGuard, moveNextPlayer);
router.post('/declare-winner', ...podiumGuard, declareWinner);

// Auction clock control
router.post('/pause', ...podiumGuard, pauseAuction);
router.post('/resume', ...podiumGuard, resumeAuction);
router.post('/rollback', ...podiumGuard, rollbackAuction);
router.post('/cancel', ...podiumGuard, cancelAuction);
router.post('/force-sell', ...podiumGuard, forceSellAuction);

export default router;
