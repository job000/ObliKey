import { Router } from 'express';
import { EcommerceController } from '../controllers/ecommerce.controller';
import { authenticate, authorize } from '../middleware/auth';
import { requireEcommerceModule } from '../middleware/moduleCheck';

const router = Router();
const ecommerceController = new EcommerceController();

// All routes require authentication and e-commerce module to be enabled
router.use(authenticate);
router.use(requireEcommerceModule);

// ============================================
// PRODUCT CATEGORIES
// ============================================

// Public endpoints (all authenticated users)
router.get('/categories', (req, res) => ecommerceController.getCategories(req, res));
router.get('/categories/:slug', (req, res) => ecommerceController.getCategoryBySlug(req, res));

// Admin only endpoints
router.post('/categories', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => ecommerceController.createCategory(req, res));
router.patch('/categories/:id', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => ecommerceController.updateCategory(req, res));
router.delete('/categories/:id', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => ecommerceController.deleteCategory(req, res));

// ============================================
// PRODUCT VARIANTS
// ============================================

// Public endpoints
router.get('/products/:productId/variants', (req, res) => ecommerceController.getProductVariants(req, res));

// Admin only endpoints
router.post('/variants', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => ecommerceController.createVariant(req, res));
router.patch('/variants/:id', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => ecommerceController.updateVariant(req, res));
router.delete('/variants/:id', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => ecommerceController.deleteVariant(req, res));

// ============================================
// PRODUCT ATTRIBUTES
// ============================================

// Public endpoints
router.get('/attributes', (req, res) => ecommerceController.getAttributes(req, res));

// Admin only endpoints
router.post('/attributes', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => ecommerceController.createAttribute(req, res));
router.post('/attributes/values', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => ecommerceController.createAttributeValue(req, res));

// ============================================
// WISHLIST
// ============================================

router.get('/wishlist', (req, res) => ecommerceController.getWishlist(req, res));
router.post('/wishlist', (req, res) => ecommerceController.addToWishlist(req, res));
router.delete('/wishlist/:itemId', (req, res) => ecommerceController.removeFromWishlist(req, res));

// ============================================
// PRODUCT REVIEWS
// ============================================

// Public endpoints
router.get('/products/:productId/reviews', (req, res) => ecommerceController.getProductReviews(req, res));
router.post('/reviews', (req, res) => ecommerceController.createReview(req, res));
router.post('/reviews/:reviewId/vote', (req, res) => ecommerceController.voteReviewHelpful(req, res));

// Admin only endpoints
router.patch('/reviews/:reviewId/moderate', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => ecommerceController.moderateReview(req, res));

// ============================================
// DISCOUNT CODES
// ============================================

// Public endpoint (validate code)
router.post('/discount-codes/validate', (req, res) => ecommerceController.validateDiscountCode(req, res));

// Admin only endpoints
router.get('/discount-codes', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => ecommerceController.getDiscountCodes(req, res));
router.post('/discount-codes', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => ecommerceController.createDiscountCode(req, res));

// ============================================
// PRODUCT COLLECTIONS
// ============================================

// Public endpoints
router.get('/collections', (req, res) => ecommerceController.getCollections(req, res));

// Admin only endpoints
router.post('/collections', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => ecommerceController.createCollection(req, res));
router.post('/collections/products', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => ecommerceController.addProductToCollection(req, res));
router.delete('/collections/:collectionId/products/:productId', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => ecommerceController.removeProductFromCollection(req, res));

export default router;
