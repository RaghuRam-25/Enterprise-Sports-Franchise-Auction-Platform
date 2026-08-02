import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { getPhase, setPhase } from '../controllers/phaseController.js';

const router = express.Router();

// GET /api/phase — public read (no auth): landing page + spectators need this
router.get('/', getPhase);

// PATCH /api/phase — Super Admin only: advance the lifecycle state machine
router.patch('/', protect, authorize('SUPER_ADMIN'), setPhase);

export default router;
