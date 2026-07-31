import express from 'express';
import { protect, optionalAuth, authorize } from '../middleware/auth.js';
import { getMatches, createMatch, updateMatch, deleteMatch } from '../controllers/matchController.js';

const router = express.Router();

// GET /api/matches — Public read-only (all roles including unauthenticated)
router.get('/', optionalAuth, getMatches);

// POST /api/matches — SUPER_ADMIN only
router.post('/', protect, authorize('SUPER_ADMIN'), createMatch);

// PUT /api/matches/:id — SUPER_ADMIN only (edit, update status, reschedule)
router.put('/:id', protect, authorize('SUPER_ADMIN'), updateMatch);

// DELETE /api/matches/:id — SUPER_ADMIN only
router.delete('/:id', protect, authorize('SUPER_ADMIN'), deleteMatch);

export default router;
