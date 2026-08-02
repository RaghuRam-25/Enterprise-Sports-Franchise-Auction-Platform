import express from 'express';
import { protect, optionalAuth, authorize } from '../middleware/auth.js';
import { requirePhase } from '../middleware/phase.js';
import { getMatches, createMatch, updateMatch, deleteMatch } from '../controllers/matchController.js';

const router = express.Router();

// GET /api/matches — Public read-only (all roles including unauthenticated)
router.get('/', optionalAuth, getMatches);

// Match write operations unlock only in the TOURNAMENT phase (SUPER_ADMIN only).
// POST /api/matches — create fixture
router.post('/', protect, authorize('SUPER_ADMIN'), requirePhase('TOURNAMENT'), createMatch);

// PUT /api/matches/:id — edit, update status/score, reschedule
router.put('/:id', protect, authorize('SUPER_ADMIN'), requirePhase('TOURNAMENT'), updateMatch);

// DELETE /api/matches/:id
router.delete('/:id', protect, authorize('SUPER_ADMIN'), requirePhase('TOURNAMENT'), deleteMatch);

export default router;
