import express from 'express';
import {
  launchPlayer,
  pauseAuction,
  resumeAuction,
  rollbackAuction,
  cancelAuction,
  forceSellAuction,
  getAuctionState
} from '../controllers/podiumController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/state', getAuctionState);

// Protected routes for PODIUM_ADMIN and SUPER_ADMIN
router.post('/launch-player', protect, authorize('PODIUM_ADMIN', 'SUPER_ADMIN'), launchPlayer);
router.post('/pause', protect, authorize('PODIUM_ADMIN', 'SUPER_ADMIN'), pauseAuction);
router.post('/resume', protect, authorize('PODIUM_ADMIN', 'SUPER_ADMIN'), resumeAuction);
router.post('/rollback', protect, authorize('PODIUM_ADMIN', 'SUPER_ADMIN'), rollbackAuction);
router.post('/cancel', protect, authorize('PODIUM_ADMIN', 'SUPER_ADMIN'), cancelAuction);
router.post('/force-sell', protect, authorize('PODIUM_ADMIN', 'SUPER_ADMIN'), forceSellAuction);

export default router;
