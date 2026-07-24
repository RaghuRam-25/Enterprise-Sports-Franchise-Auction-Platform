import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getSessions, createSession, deleteSession,
  getPositions, createPosition, deletePosition,
  getCategories, createCategory, deleteCategory,
  getBiddingTiers, updateBiddingTier,
  getTeams, createTeam,
  getManagers, createManager
} from '../controllers/adminController.js';

const router = express.Router();

// Apply auth protection & Super Admin enforcement to all routes
router.use(protect);
router.use(authorize('SUPER_ADMIN'));

// Sessions
router.route('/sessions').get(getSessions).post(createSession);
router.route('/sessions/:id').delete(deleteSession);

// Positions
router.route('/positions').get(getPositions).post(createPosition);
router.route('/positions/:id').delete(deletePosition);

// Categories
router.route('/categories').get(getCategories).post(createCategory);
router.route('/categories/:id').delete(deleteCategory);

// Bidding Tiers
router.route('/bidding-tiers').get(getBiddingTiers);
router.route('/bidding-tiers/:id').put(updateBiddingTier);

// Teams
router.route('/teams').get(getTeams).post(createTeam);

// Managers
router.route('/managers').get(getManagers).post(createManager);

export default router;
