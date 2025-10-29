import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const analyticsController = new AnalyticsController();

// All routes require authentication and admin authorization
router.use(authenticate);
router.use(authorize('ADMIN', 'SUPER_ADMIN'));

// Get general analytics
router.get(
  '/',
  (req, res) => analyticsController.getAnalytics(req, res)
);

export default router;
