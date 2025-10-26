import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const productController = new ProductController();

// All routes require authentication
router.use(authenticate);

// Public routes (read-only for CUSTOMER)
router.get('/', (req, res) => productController.getProducts(req, res));
router.get('/:id', (req, res) => productController.getProduct(req, res));

// Admin routes
router.post('/', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => productController.createProduct(req, res));
router.patch('/:id', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => productController.updateProduct(req, res));
router.delete('/:id', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => productController.deleteProduct(req, res));
router.post('/:id/publish', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => productController.publishProduct(req, res));
router.post('/:id/unpublish', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => productController.unpublishProduct(req, res));

// Image management routes
router.post('/:id/images', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => productController.addProductImage(req, res));
router.patch('/images/:imageId', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => productController.updateProductImage(req, res));
router.delete('/images/:imageId', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => productController.deleteProductImage(req, res));

export default router;
