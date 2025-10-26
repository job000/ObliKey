import { Router } from 'express';
import { CartController } from '../controllers/cart.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const cartController = new CartController();

// All cart routes require authentication
router.use(authenticate);

// Get user's cart
router.get('/', (req, res) => cartController.getCart(req, res));

// Add item to cart
router.post('/items', (req, res) => cartController.addItem(req, res));

// Update cart item quantity
router.patch('/items/:itemId', (req, res) => cartController.updateItem(req, res));

// Remove item from cart
router.delete('/items/:itemId', (req, res) => cartController.removeItem(req, res));

// Clear entire cart
router.delete('/', (req, res) => cartController.clearCart(req, res));

export default router;
