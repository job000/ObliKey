import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { registerValidation, loginValidation } from '../utils/validation';
import { validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

const router = Router();
const authController = new AuthController();

// Validation middleware
const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }
  next();
};

// Routes
router.post('/register', registerValidation, validate, (req, res) => authController.register(req, res));
router.post('/login', loginValidation, validate, (req, res) => authController.login(req, res));
router.get('/me', authenticate, (req, res) => authController.getCurrentUser(req, res));
router.post('/change-password', authenticate, (req, res) => authController.changePassword(req, res));

export default router;
