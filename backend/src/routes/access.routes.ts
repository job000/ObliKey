import { Router } from 'express';
import { AccessController } from '../controllers/access.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const accessController = new AccessController();

// All routes require authentication
router.use(authenticate);

// Door Access Check & Control
router.post('/doors/:doorId/check-access', (req, res) =>
  accessController.checkAccess(req, res)
);

router.post('/doors/:doorId/unlock', (req, res) =>
  accessController.unlockDoor(req, res)
);

router.get('/doors/:doorId/status', (req, res) =>
  accessController.getDoorStatus(req, res)
);

router.get('/doors/:doorId/stats', authorize('ADMIN', 'TRAINER'), (req, res) =>
  accessController.getDoorAccessStats(req, res)
);

// User Access
router.get('/my-accessible-doors', (req, res) =>
  accessController.getMyAccessibleDoors(req, res)
);

// Access Logs (Admin/Trainer only)
router.get('/access-logs', authorize('ADMIN', 'TRAINER'), (req, res) =>
  accessController.queryAccessLogs(req, res)
);

router.get('/access-logs/stats', authorize('ADMIN', 'TRAINER'), (req, res) =>
  accessController.getAccessLogStats(req, res)
);

router.get('/access-logs/suspicious', authorize('ADMIN'), (req, res) =>
  accessController.getSuspiciousActivity(req, res)
);

router.get('/access-logs/export', authorize('ADMIN'), (req, res) =>
  accessController.exportAccessLogs(req, res)
);

router.get('/access-logs/:logId', authorize('ADMIN', 'TRAINER'), (req, res) =>
  accessController.getAccessLogDetails(req, res)
);

export default router;
