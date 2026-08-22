import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { getPhase, setPhase, setAuctionStart, setEventSchedule } from '../controllers/phaseController.js';

const router = express.Router();

// GET /api/phase — public read (no auth): landing page + spectators need this
router.get('/', getPhase);

// PATCH /api/phase — Super Admin only: advance the lifecycle state machine
router.patch('/', protect, authorize('SUPER_ADMIN'), setPhase);

// PATCH /api/phase/schedule — Super Admin only: update full multi-phase event schedule
router.patch('/schedule', protect, authorize('SUPER_ADMIN'), setEventSchedule);

// PATCH /api/phase/auction-start — Super Admin only: set/clear public countdown target
router.patch('/auction-start', protect, authorize('SUPER_ADMIN'), setAuctionStart);

export default router;
