import { Router } from 'express';
import { DoorController } from '../controllers/door.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const doorController = new DoorController();

// All routes require authentication
router.use(authenticate);

// Routes - ADMIN and SUPER_ADMIN only
// GET /api/doors - List all doors for tenant
router.get('/', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => doorController.getDoors(req, res));

// POST /api/doors - Create new door
router.post('/', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => doorController.createDoor(req, res));

// GET /api/doors/:doorId - Get door details
router.get('/:doorId', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => doorController.getDoorById(req, res));

// PUT /api/doors/:doorId - Update door
router.put('/:doorId', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => doorController.updateDoor(req, res));

// DELETE /api/doors/:doorId - Delete door
router.delete('/:doorId', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => doorController.deleteDoor(req, res));

// POST /api/doors/:doorId/test-connection - Test hardware connection
router.post('/:doorId/test-connection', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => doorController.testConnection(req, res));

// POST /api/doors/:doorId/unlock - Manual unlock
router.post('/:doorId/unlock', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => doorController.unlockDoor(req, res));

// POST /api/doors/:doorId/lock - Manual lock
router.post('/:doorId/lock', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => doorController.lockDoor(req, res));

// GET /api/doors/:doorId/status - Get door status
router.get('/:doorId/status', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => doorController.getDoorStatus(req, res));

// GET /api/doors/:doorId/logs - Get access logs
router.get('/:doorId/logs', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => doorController.getDoorAccessLogs(req, res));

// POST /api/doors/:doorId/set-main-entrance - Mark door as main entrance
router.post('/:doorId/set-main-entrance', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => doorController.setMainEntrance(req, res));

export default router;
