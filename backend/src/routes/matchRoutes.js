import express from 'express';
import { protect, optionalAuth, authorize } from '../middleware/auth.js';
import { requirePhase } from '../middleware/phase.js';
import { getMatches, createMatch, updateMatch, deleteMatch } from '../controllers/matchController.js';

const router = express.Router();

// GET /api/matches — Public read-only (all roles including unauthenticated)
router.get('/', optionalAuth, getMatches);

// Match write operations (SUPER_ADMIN only) — allowed across all phases so admins can pre-schedule fixtures.
// POST /api/matches — create fixture
router.post('/', protect, authorize('SUPER_ADMIN'), createMatch);

// PUT /api/matches/:id — edit, update status/score, reschedule
router.put('/:id', protect, authorize('SUPER_ADMIN'), updateMatch);

// DELETE /api/matches/:id
router.delete('/:id', protect, authorize('SUPER_ADMIN'), deleteMatch);

export default router;
