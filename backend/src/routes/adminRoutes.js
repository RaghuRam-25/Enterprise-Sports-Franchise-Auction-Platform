import express from 'express';
import { protect, optionalAuth, authorize } from '../middleware/auth.js';
import {
  getSessions, createSession, deleteSession,
  getPositions, createPosition, deletePosition,
  getCategories, createCategory, deleteCategory,
  getBiddingTiers, createBiddingTier, updateBiddingTier, deleteBiddingTier,
  getTeams, createTeam, editTeam, deleteTeam,
  getManagers, createManager, editManager, deleteManager, resetManagerPassword, handleManagerRequest,
  createPodiumAdmin,
  getAdminPlayers, editPlayer, approvePlayer, banPlayer,
  getReports, exportReports
} from '../controllers/adminController.js';

const router = express.Router();

// ── Dynamic Config Enums — All mutations SUPER_ADMIN only, GETs via /api/config for other roles ──
router.get('/sessions',      protect, authorize('SUPER_ADMIN'), getSessions);
router.post('/sessions',     protect, authorize('SUPER_ADMIN'), createSession);
router.delete('/sessions/:id', protect, authorize('SUPER_ADMIN'), deleteSession);

router.get('/positions',     protect, authorize('SUPER_ADMIN'), getPositions);
router.post('/positions',    protect, authorize('SUPER_ADMIN'), createPosition);
router.delete('/positions/:id', protect, authorize('SUPER_ADMIN'), deletePosition);

router.get('/categories',    protect, authorize('SUPER_ADMIN'), getCategories);
router.post('/categories',   protect, authorize('SUPER_ADMIN'), createCategory);
router.delete('/categories/:id', protect, authorize('SUPER_ADMIN'), deleteCategory);

router.get('/bidding-tiers', protect, authorize('SUPER_ADMIN'), getBiddingTiers);
router.post('/bidding-tiers', protect, authorize('SUPER_ADMIN'), createBiddingTier);
router.put('/bidding-tiers/:id', protect, authorize('SUPER_ADMIN'), updateBiddingTier);
router.delete('/bidding-tiers/:id', protect, authorize('SUPER_ADMIN'), deleteBiddingTier);

// ── Teams Directory (GET: optionalAuth so spectators can view, Mutations: SUPER_ADMIN) ──
router.get('/teams',     optionalAuth, getTeams);
router.post('/teams',    protect, authorize('SUPER_ADMIN'), createTeam);
router.put('/teams/:id', protect, authorize('SUPER_ADMIN'), editTeam);
router.delete('/teams/:id', protect, authorize('SUPER_ADMIN'), deleteTeam);

// ── Managers Directory (SUPER_ADMIN only) ──
router.get('/managers',                       protect, authorize('SUPER_ADMIN'), getManagers);
router.post('/managers',                      protect, authorize('SUPER_ADMIN'), createManager);
router.put('/managers/:id',                   protect, authorize('SUPER_ADMIN'), editManager);
router.put('/managers/:id/request',           protect, authorize('SUPER_ADMIN'), handleManagerRequest);
router.delete('/managers/:id',                protect, authorize('SUPER_ADMIN'), deleteManager);
router.put('/managers/:id/reset-password',    protect, authorize('SUPER_ADMIN'), resetManagerPassword);
router.post('/podium-admins',                 protect, authorize('SUPER_ADMIN'), createPodiumAdmin);

// ── Player Management — SUPER_ADMIN only ──
router.get('/players',             protect, authorize('SUPER_ADMIN'), getAdminPlayers);
router.put('/players/:id',         protect, authorize('SUPER_ADMIN'), editPlayer);
router.put('/players/:id/approve', protect, authorize('SUPER_ADMIN'), approvePlayer);
router.put('/players/:id/ban',     protect, authorize('SUPER_ADMIN'), banPlayer);

// ── Reports & System Analytics (SUPER_ADMIN ONLY) ─────────────────────────────
router.get('/reports',         protect, authorize('SUPER_ADMIN'), getReports);
router.get('/reports/export',  protect, authorize('SUPER_ADMIN'), exportReports);

export default router;
