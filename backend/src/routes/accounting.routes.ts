import { Router } from 'express';
import { AccountingController } from '../controllers/accounting.controller';
import { authenticate, authorize, requireAccountingModule } from '../middleware/auth';

const router = Router();
const accountingController = new AccountingController();

// Module status - accessible to all authenticated users (before requireAccountingModule)
router.get('/module-status', authenticate, (req, res) => accountingController.getModuleStatus(req, res));

// Toggle module - SUPER_ADMIN only (before requireAccountingModule)
router.post('/toggle-module', authenticate, authorize('SUPER_ADMIN'), (req, res) => accountingController.toggleAccountingModule(req, res));

// All remaining routes require authentication
router.use(authenticate);

// All routes require ADMIN or SUPER_ADMIN
router.use(authorize('ADMIN', 'SUPER_ADMIN'));

// All routes require accounting module to be enabled
router.use(requireAccountingModule);

// Dashboard & Reports
router.get('/dashboard', (req, res) => accountingController.getDashboard(req, res));
router.get('/income-statement', (req, res) => accountingController.getIncomeStatement(req, res));
router.get('/vat-report', (req, res) => accountingController.getVATReport(req, res));

// Accounts (Kontoplan)
router.get('/accounts', (req, res) => accountingController.getAccounts(req, res));
router.post('/accounts', (req, res) => accountingController.createAccount(req, res));
router.patch('/accounts/:id', (req, res) => accountingController.updateAccount(req, res));
router.delete('/accounts/:id', (req, res) => accountingController.deleteAccount(req, res));

// Suppliers
router.get('/suppliers', (req, res) => accountingController.getSuppliers(req, res));
router.post('/suppliers', (req, res) => accountingController.createSupplier(req, res));
router.patch('/suppliers/:id', (req, res) => accountingController.updateSupplier(req, res));
router.delete('/suppliers/:id', (req, res) => accountingController.deleteSupplier(req, res));

// Transactions
router.get('/transactions', (req, res) => accountingController.getTransactions(req, res));
router.post('/transactions', (req, res) => accountingController.createTransaction(req, res));

export default router;
