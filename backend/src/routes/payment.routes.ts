import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const paymentController = new PaymentController();

// All routes require authentication
router.use(authenticate);

// Routes
router.post('/', authorize('ADMIN', 'TRAINER'), (req, res) => paymentController.createPayment(req, res));
router.get('/', (req, res) => paymentController.getPayments(req, res));
router.patch('/:id/status', authorize('ADMIN'), (req, res) => paymentController.updatePaymentStatus(req, res));
router.get('/statistics', authorize('ADMIN'), (req, res) => paymentController.getStatistics(req, res));

export default router;
