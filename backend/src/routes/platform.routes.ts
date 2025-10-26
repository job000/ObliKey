import { Router } from 'express';
import { PlatformAdminController } from '../controllers/platformAdmin.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const platformController = new PlatformAdminController();

// All platform routes require authentication and platform admin role
router.use(authenticate);
router.use(authorize('PLATFORM_ADMIN', 'PLATFORM_OWNER'));

// Dashboard
router.get('/dashboard', platformController.getDashboard.bind(platformController));

// Tenant Management
router.get('/tenants', platformController.getAllTenants.bind(platformController));
router.get('/tenants/:tenantId', platformController.getTenantDetails.bind(platformController));
router.post('/tenants', platformController.createTenant.bind(platformController));
router.patch('/tenants/:tenantId/plan', platformController.updateTenantPlan.bind(platformController));

// Tenant Actions
router.patch('/tenants/:tenantId/suspend', platformController.suspendTenant.bind(platformController));
router.patch('/tenants/:tenantId/unsuspend', platformController.unsuspendTenant.bind(platformController));

export default router;
