import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getSessions, createSession, deleteSession,
  getPositions, createPosition, deletePosition,
  getCategories, createCategory, deleteCategory,
  getBiddingTiers, updateBiddingTier,
  getTeams, createTeam, editTeam, deleteTeam,
  getManagers, createManager, deleteManager, resetManagerPassword,
  createPodiumAdmin,
  getAdminPlayers, editPlayer, approvePlayer, banPlayer,
  getReports, exportReports
} from '../controllers/adminController.js';

const router = express.Router();

// Apply auth protection & Super Admin enforcement to all routes
router.use(protect);
router.use(authorize('SUPER_ADMIN'));

// ── Sessions ──────────────────────────────────────────────────────────────────
router.route('/sessions').get(getSessions).post(createSession);
router.route('/sessions/:id').delete(deleteSession);

// ── Positions ─────────────────────────────────────────────────────────────────
router.route('/positions').get(getPositions).post(createPosition);
router.route('/positions/:id').delete(deletePosition);

// ── Categories ────────────────────────────────────────────────────────────────
router.route('/categories').get(getCategories).post(createCategory);
router.route('/categories/:id').delete(deleteCategory);

// ── Bidding Tiers ─────────────────────────────────────────────────────────────
router.route('/bidding-tiers').get(getBiddingTiers);
router.route('/bidding-tiers/:id').put(updateBiddingTier);

// ── Teams ─────────────────────────────────────────────────────────────────────
router.route('/teams').get(getTeams).post(createTeam);
router.route('/teams/:id').put(editTeam).delete(deleteTeam);

// ── Managers & Podium Admins ──────────────────────────────────────────────────
router.route('/managers').get(getManagers).post(createManager);
router.route('/managers/:id').delete(deleteManager);
router.route('/managers/:id/reset-password').put(resetManagerPassword);
router.route('/podium-admins').post(createPodiumAdmin);

// ── Player Management ─────────────────────────────────────────────────────────
router.route('/players').get(getAdminPlayers);
router.route('/players/:id').put(editPlayer);
router.route('/players/:id/approve').put(approvePlayer);
router.route('/players/:id/ban').put(banPlayer);

// ── Reports ───────────────────────────────────────────────────────────────────
router.route('/reports').get(getReports);
router.route('/reports/export').get(exportReports);

export default router;
