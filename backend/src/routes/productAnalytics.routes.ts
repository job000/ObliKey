import { Router } from 'express';
import { ProductAnalyticsController } from '../controllers/productAnalytics.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const productAnalyticsController = new ProductAnalyticsController();

// All routes require authentication
router.use(authenticate);

// Track product view (any authenticated user)
router.post(
  '/track/:productId',
  (req, res) => productAnalyticsController.trackProductView(req, res)
);

// Get sales analytics (admin only)
router.get(
  '/sales',
  authorize('ADMIN', 'SUPER_ADMIN'),
  (req, res) => productAnalyticsController.getSalesAnalytics(req, res)
);

// Get most viewed products (admin only)
router.get(
  '/most-viewed',
  authorize('ADMIN', 'SUPER_ADMIN'),
  (req, res) => productAnalyticsController.getMostViewedProducts(req, res)
);

// Get dashboard analytics (admin only)
router.get(
  '/dashboard',
  authorize('ADMIN', 'SUPER_ADMIN'),
  (req, res) => productAnalyticsController.getDashboardAnalytics(req, res)
);

// Get conversion rates (admin only)
router.get(
  '/conversion',
  authorize('ADMIN', 'SUPER_ADMIN'),
  (req, res) => productAnalyticsController.getConversionRates(req, res)
);

export default router;
