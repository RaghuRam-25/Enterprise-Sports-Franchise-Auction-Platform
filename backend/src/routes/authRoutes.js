import express from 'express';
import { login, getMe, refreshToken, forgotPassword, resetPassword, changePassword, registerGeneralUser, updateMe } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.post('/register/general', registerGeneralUser);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.post('/change-password', protect, changePassword);

export default router;
