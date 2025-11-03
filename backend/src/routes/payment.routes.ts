import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const paymentController = new PaymentController();

// All routes require authentication
router.use(authenticate);

// Payment transaction routes
router.post('/', authorize('ADMIN', 'TRAINER'), (req, res) => paymentController.createPayment(req, res));
router.get('/', (req, res) => paymentController.getPayments(req, res));
router.patch('/:id/status', authorize('ADMIN'), (req, res) => paymentController.updatePaymentStatus(req, res));
router.get('/statistics', authorize('ADMIN'), (req, res) => paymentController.getStatistics(req, res));

// Payment configuration routes (Admin/Super Admin only)
router.get('/config', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => paymentController.getPaymentConfigs(req, res));
router.post('/config', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => paymentController.createOrUpdatePaymentConfig(req, res));
router.put('/config/:provider/toggle', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => paymentController.toggleProvider(req, res));
router.delete('/config/:provider', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => paymentController.deletePaymentConfig(req, res));
router.post('/config/:provider/test', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => paymentController.testProviderConnection(req, res));

// Available payment methods (for checkout - all authenticated users)
router.get('/available', (req, res) => paymentController.getAvailablePaymentMethods(req, res));

// Payment initiation routes (for customers during checkout)
router.post('/vipps/initiate', (req, res) => paymentController.initiateVippsPayment(req, res));
router.post('/stripe/create-intent', (req, res) => paymentController.createStripeIntent(req, res));

export default router;
