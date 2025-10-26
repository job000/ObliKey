import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const orderController = new OrderController();

// All routes require authentication
router.use(authenticate);

// Order routes
router.post('/', (req, res) => orderController.createOrder(req, res)); // All authenticated users can create orders
router.get('/', (req, res) => orderController.getOrders(req, res));
router.get('/statistics', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => orderController.getOrderStatistics(req, res));
router.get('/:id', (req, res) => orderController.getOrderById(req, res));
router.patch('/:id/status', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => orderController.updateOrderStatus(req, res));

// Delivery management routes (admin only)
router.patch('/:id/delivery', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => orderController.updateDeliveryInfo(req, res));
router.patch('/:id/ship', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => orderController.markAsShipped(req, res));
router.patch('/:id/deliver', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => orderController.markAsDelivered(req, res));

export default router;
