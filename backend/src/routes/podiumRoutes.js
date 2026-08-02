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
import { requirePhase } from '../middleware/phase.js';

const router = express.Router();

// ── Public Routes (Spectators can view live state) ────────────────────────────
router.get('/state', getAuctionState);

// ── Read-only for Podium Admin and Super Admin ──────────────────────────────
router.get('/players', protect, authorize('PODIUM_ADMIN', 'SUPER_ADMIN'), getAvailablePlayers);

// ── Full Control for Podium Admin AND Super Admin ──────────────────────────
// Per RBAC spec: SUPER_ADMIN has full control on /podium/**, PODIUM_ADMIN has full control too.
// Phase-gated: the podium only operates during the AUCTION phase.
const podiumControlGuard = [protect, authorize('PODIUM_ADMIN', 'SUPER_ADMIN'), requirePhase('AUCTION')];

// Player launch and auction controls
router.post('/launch-player', ...podiumControlGuard, launchPlayer);
router.post('/select-unsold', ...podiumControlGuard, selectUnsoldPlayer);
router.post('/move-next',     ...podiumControlGuard, moveNextPlayer);
router.post('/declare-winner',...podiumControlGuard, declareWinner);

// Auction clock dispute & state controls
router.post('/pause',      ...podiumControlGuard, pauseAuction);
router.post('/resume',     ...podiumControlGuard, resumeAuction);
router.post('/rollback',   ...podiumControlGuard, rollbackAuction);
router.post('/cancel',     ...podiumControlGuard, cancelAuction);
router.post('/force-sell', ...podiumControlGuard, forceSellAuction);

export default router;
