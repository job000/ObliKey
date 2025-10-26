import { Router } from 'express';
import { ActivityLogController } from '../controllers/activityLog.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const activityLogController = new ActivityLogController();

// All routes require authentication
router.use(authenticate);

// Export activity logs to CSV (admin only)
// This must come before the '/' route to avoid route matching issues
router.get(
  '/export',
  authorize('ADMIN', 'SUPER_ADMIN'),
  (req, res) => activityLogController.exportActivityLogs(req, res)
);

// Get activity logs (admin only)
router.get(
  '/',
  authorize('ADMIN', 'SUPER_ADMIN'),
  (req, res) => activityLogController.getActivityLogs(req, res)
);

// Get activity statistics (admin only)
router.get(
  '/stats',
  authorize('ADMIN', 'SUPER_ADMIN'),
  (req, res) => activityLogController.getActivityStats(req, res)
);

// Get user-specific activity logs (user can see their own, admin can see all)
router.get(
  '/user/:userId',
  (req, res) => activityLogController.getUserActivityLogs(req, res)
);

// Manual log creation (admin only, for testing)
router.post(
  '/',
  authorize('ADMIN', 'SUPER_ADMIN'),
  (req, res) => activityLogController.createLog(req, res)
);

export default router;
