import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const notificationController = new NotificationController();

// All routes require authentication
router.use(authenticate);

// Notification routes
router.get('/', (req, res) => notificationController.getNotifications(req, res));
router.get('/unread-count', (req, res) => notificationController.getUnreadCount(req, res));
router.patch('/:notificationId/read', (req, res) => notificationController.markAsRead(req, res));
router.patch('/mark-all-read', (req, res) => notificationController.markAllAsRead(req, res));
router.delete('/:notificationId', (req, res) => notificationController.deleteNotification(req, res));

// Notification preferences routes
router.get('/preferences', (req, res) => notificationController.getPreferences(req, res));
router.patch('/preferences', (req, res) => notificationController.updatePreferences(req, res));

export default router;
