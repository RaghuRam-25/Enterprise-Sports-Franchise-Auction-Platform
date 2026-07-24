import express from 'express';
import { uploadMiddleware } from '../services/imageService.js';
import {
  registerPlayer,
  getPlayers,
  withdrawPlayer,
  getRegistrationStatus,
  toggleRegistrationFreeze
} from '../controllers/playerController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/status', getRegistrationStatus);
router.post('/register', uploadMiddleware.single('picture'), registerPlayer);
router.get('/', getPlayers);
router.put('/:id/withdraw', withdrawPlayer);
router.post('/toggle-freeze', protect, authorize('SUPER_ADMIN'), toggleRegistrationFreeze);

export default router;
