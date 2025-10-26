import { Router } from 'express';
import { TenantController } from '../controllers/tenant.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const tenantController = new TenantController();

// All routes require authentication
router.use(authenticate);

// Routes
router.post('/', authorize('SUPER_ADMIN'), (req, res) => tenantController.createTenant(req, res));
router.get('/', authorize('SUPER_ADMIN'), (req, res) => tenantController.getAllTenants(req, res));
router.get('/:id', authorize('SUPER_ADMIN', 'ADMIN'), (req, res) => tenantController.getTenantById(req, res));
router.patch('/:id/settings', authorize('ADMIN'), (req, res) => tenantController.updateSettings(req, res));

export default router;
