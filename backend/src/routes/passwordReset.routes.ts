import { Router } from 'express';
import { PasswordResetController } from '../controllers/passwordReset.controller';

const router = Router();
const passwordResetController = new PasswordResetController();

// Request password reset (public)
router.post('/request', (req, res) => passwordResetController.requestReset(req, res));

// Verify reset token (public)
router.get('/verify/:token', (req, res) => passwordResetController.verifyToken(req, res));

// Reset password with token (public)
router.post('/reset', (req, res) => passwordResetController.resetPassword(req, res));

export default router;
