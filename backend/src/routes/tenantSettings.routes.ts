import { Router } from 'express';
import { TenantSettingsController } from '../controllers/tenantSettings.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const tenantSettingsController = new TenantSettingsController();

// All routes require authentication
router.use(authenticate);

// ============================================
// PUBLIC ENDPOINTS (All authenticated users)
// ============================================

// Get e-commerce module status
router.get('/ecommerce-status', (req, res) =>
  tenantSettingsController.getEcommerceStatus(req, res)
);

// Get all module statuses
router.get('/modules', (req, res) =>
  tenantSettingsController.getModuleStatuses(req, res)
);

// ============================================
// ADMIN ENDPOINTS
// ============================================

// Get all settings
router.get('/', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) =>
  tenantSettingsController.getSettings(req, res)
);

// Update settings
router.patch('/', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) =>
  tenantSettingsController.updateSettings(req, res)
);

// Toggle any module (NEW unified endpoint)
router.post('/modules/toggle', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) =>
  tenantSettingsController.toggleModule(req, res)
);

// Toggle e-commerce module (legacy)
router.post('/ecommerce/toggle', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) =>
  tenantSettingsController.toggleEcommerceModule(req, res)
);

export default router;
