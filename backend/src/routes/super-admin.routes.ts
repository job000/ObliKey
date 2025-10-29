import { Router } from 'express';
import superAdminController from '../controllers/super-admin.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All routes require authentication and SUPER_ADMIN role
router.use(authenticate);
router.use(authorize('SUPER_ADMIN'));

// ============================================
// TENANT MANAGEMENT ROUTES
// ============================================

// Tenant CRUD
router.get('/tenants', (req, res) => superAdminController.getAllTenants(req, res));
router.get('/tenants/:tenantId', (req, res) => superAdminController.getTenantDetails(req, res));
router.post('/tenants', (req, res) => superAdminController.createTenant(req, res));
router.put('/tenants/:tenantId', (req, res) => superAdminController.updateTenant(req, res));
router.patch('/tenants/:tenantId/status', (req, res) => superAdminController.setTenantStatus(req, res));
router.delete('/tenants/:tenantId', (req, res) => superAdminController.deleteTenant(req, res));

// Tenant User Management
router.get('/tenants/:tenantId/users', (req, res) => superAdminController.getTenantUsers(req, res));
router.post('/tenants/:tenantId/users', (req, res) => superAdminController.createUserForTenant(req, res));
router.put('/tenants/:tenantId/users/:userId', (req, res) => superAdminController.updateTenantUser(req, res));
router.delete('/tenants/:tenantId/users/:userId', (req, res) => superAdminController.deleteTenantUser(req, res));

// Tenant monitoring
router.get('/tenants/expiring-trials', (req, res) => superAdminController.getExpiringTrials(req, res));

// ============================================
// FEATURE MANAGEMENT ROUTES
// ============================================

// Feature CRUD
router.get('/features', (req, res) => superAdminController.getAllFeatures(req, res));
router.get('/features/:featureId', (req, res) => superAdminController.getFeatureById(req, res));
router.post('/features', (req, res) => superAdminController.createFeature(req, res));
router.put('/features/:featureId', (req, res) => superAdminController.updateFeature(req, res));
router.delete('/features/:featureId', (req, res) => superAdminController.deleteFeature(req, res));

// Feature Pack CRUD
router.get('/feature-packs', (req, res) => superAdminController.getAllFeaturePacks(req, res));
router.get('/feature-packs/:packId', (req, res) => superAdminController.getFeaturePackById(req, res));
router.post('/feature-packs', (req, res) => superAdminController.createFeaturePack(req, res));
router.put('/feature-packs/:packId', (req, res) => superAdminController.updateFeaturePack(req, res));
router.delete('/feature-packs/:packId', (req, res) => superAdminController.deleteFeaturePack(req, res));

// Tenant Feature Management
router.get('/tenants/:tenantId/features', (req, res) => superAdminController.getTenantFeatures(req, res));
router.post('/tenants/:tenantId/features', (req, res) => superAdminController.setTenantFeatures(req, res));
router.post('/tenants/:tenantId/features/:featureId/enable', (req, res) => superAdminController.enableTenantFeature(req, res));
router.post('/tenants/:tenantId/features/:featureId/disable', (req, res) => superAdminController.disableTenantFeature(req, res));
router.post('/tenants/:tenantId/apply-pack/:packId', (req, res) => superAdminController.applyFeaturePackToTenant(req, res));

// ============================================
// SUBSCRIPTION MANAGEMENT ROUTES
// ============================================

// Subscription CRUD
router.post('/subscriptions', (req, res) => superAdminController.createSubscription(req, res));
router.put('/subscriptions/:subscriptionId', (req, res) => superAdminController.updateSubscription(req, res));
router.patch('/subscriptions/:subscriptionId/status', (req, res) => superAdminController.changeSubscriptionStatus(req, res));
router.post('/subscriptions/:subscriptionId/cancel', (req, res) => superAdminController.cancelSubscription(req, res));
router.post('/subscriptions/:subscriptionId/reactivate', (req, res) => superAdminController.reactivateSubscription(req, res));

// Invoice Management
router.get('/subscriptions/:subscriptionId/invoices', (req, res) => superAdminController.getSubscriptionInvoices(req, res));
router.get('/invoices/:invoiceId', (req, res) => superAdminController.getInvoiceById(req, res));
router.post('/invoices/:invoiceId/mark-sent', (req, res) => superAdminController.markInvoiceSent(req, res));
router.post('/invoices/:invoiceId/mark-paid', (req, res) => superAdminController.markInvoicePaid(req, res));
router.get('/invoices/overdue', (req, res) => superAdminController.getOverdueInvoices(req, res));

// ============================================
// STATISTICS ROUTES
// ============================================

router.get('/stats/tenants', (req, res) => superAdminController.getTenantStats(req, res));
router.get('/stats/features', (req, res) => superAdminController.getFeatureStats(req, res));
router.get('/stats/subscriptions', (req, res) => superAdminController.getSubscriptionStats(req, res));

export default router;
