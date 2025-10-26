import { Router } from 'express';
import { InvoiceController } from '../controllers/invoice.controller';
import { authenticate, authorize, requireAccountingModule } from '../middleware/auth';

const router = Router();
const invoiceController = new InvoiceController();

// All routes require authentication
router.use(authenticate);

// All routes require ADMIN or SUPER_ADMIN
router.use(authorize('ADMIN', 'SUPER_ADMIN'));

// All routes require accounting module to be enabled
router.use(requireAccountingModule);

// Invoice CRUD
router.get('/', (req, res) => invoiceController.getInvoices(req, res));
router.get('/:id', (req, res) => invoiceController.getInvoice(req, res));
router.post('/', (req, res) => invoiceController.createInvoice(req, res));
router.patch('/:id', (req, res) => invoiceController.updateInvoice(req, res));

// Invoice actions
router.post('/:id/send', (req, res) => invoiceController.sendInvoice(req, res));
router.post('/:id/mark-paid', (req, res) => invoiceController.markAsPaid(req, res));
router.post('/:id/cancel', (req, res) => invoiceController.cancelInvoice(req, res));
router.delete('/:id', (req, res) => invoiceController.deleteInvoice(req, res));
router.post('/:id/reminder', (req, res) => invoiceController.sendReminder(req, res));

export default router;
