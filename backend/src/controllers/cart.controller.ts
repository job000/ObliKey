import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

export class CartController {
  // Get user's cart
  async getCart(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const tenantId = req.tenantId!;

      // Find or create cart
      let cart = await prisma.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              cart: false
            }
          }
        }
      });

      if (!cart) {
        cart = await prisma.cart.create({
          data: {
            userId,
            tenantId
          },
          include: {
            items: true
          }
        });
      }

      // Get product details for cart items
      const productIds = cart.items.map(item => item.productId);
      const products = await prisma.product.findMany({
        where: {
          id: { in: productIds },
          tenantId
        },
        include: { images: true }
      });

      // Build cart response with product details
      const cartItems = cart.items.map(item => {
        const product = products.find(p => p.id === item.productId);
        return {
          id: item.id,
          productId: item.productId,
          quantity: item.quantity,
          product: product ? {
            id: product.id,
            name: product.name,
            description: product.description,
            type: product.type,
            price: product.price,
            currency: product.currency,
            stock: product.stock,
            trackInventory: product.trackInventory,
            sessionCount: product.sessionCount,
            image: product.images.find(img => img.isPrimary)?.url || product.images[0]?.url || null
          } : null
        };
      });

      // Calculate totals
      const subtotal = cartItems.reduce((sum, item) => {
        if (!item.product) return sum;
        return sum + (item.product.price * item.quantity);
      }, 0);

      res.json({
        success: true,
        data: {
          id: cart.id,
          items: cartItems,
          subtotal,
          currency: 'NOK',
          itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0)
        }
      });
    } catch (error) {
      console.error('Get cart error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente handlekurv' });
    }
  }

  // Add item to cart
  async addItem(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const tenantId = req.tenantId!;
      const { productId, quantity = 1 } = req.body;

      if (!productId) {
        throw new AppError('Produkt-ID er påkrevd', 400);
      }

      // Verify product exists and is available
      const product = await prisma.product.findFirst({
        where: {
          id: productId,
          tenantId
        }
      });

      if (!product) {
        throw new AppError('Produktet finnes ikke', 404);
      }

      if (product.status !== 'PUBLISHED') {
        throw new AppError('Produktet er ikke tilgjengelig', 400);
      }

      // Check stock if inventory tracking is enabled
      if (product.trackInventory && product.stock !== null) {
        if (product.stock < quantity) {
          throw new AppError(`Kun ${product.stock} på lager`, 400);
        }
      }

      // Find or create cart
      let cart = await prisma.cart.findUnique({
        where: { userId }
      });

      if (!cart) {
        cart = await prisma.cart.create({
          data: { userId, tenantId }
        });
      }

      // Check if item already in cart
      const existingItem = await prisma.cartItem.findUnique({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId
          }
        }
      });

      if (existingItem) {
        // Update quantity
        const newQuantity = existingItem.quantity + quantity;

        // Check stock again
        if (product.trackInventory && product.stock !== null && product.stock < newQuantity) {
          throw new AppError(`Kun ${product.stock} på lager`, 400);
        }

        await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: newQuantity }
        });
      } else {
        // Add new item
        await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId,
            quantity
          }
        });
      }

      res.json({
        success: true,
        message: 'Produkt lagt til i handlekurven'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Add item error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke legge til produkt' });
      }
    }
  }

  // Update cart item quantity
  async updateItem(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const tenantId = req.tenantId!;
      const { itemId } = req.params;
      const { quantity } = req.body;

      if (quantity < 1) {
        throw new AppError('Antall må være minst 1', 400);
      }

      // Verify item belongs to user's cart
      const item = await prisma.cartItem.findUnique({
        where: { id: itemId },
        include: {
          cart: true
        }
      });

      if (!item || item.cart.userId !== userId) {
        throw new AppError('Varelinje ikke funnet', 404);
      }

      // Check product stock
      const product = await prisma.product.findFirst({
        where: {
          id: item.productId,
          tenantId
        }
      });

      if (product && product.trackInventory && product.stock !== null && product.stock < quantity) {
        throw new AppError(`Kun ${product.stock} på lager`, 400);
      }

      await prisma.cartItem.update({
        where: { id: itemId },
        data: { quantity }
      });

      res.json({
        success: true,
        message: 'Antall oppdatert'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Update item error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke oppdatere antall' });
      }
    }
  }

  // Remove item from cart
  async removeItem(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { itemId } = req.params;

      // Verify item belongs to user's cart
      const item = await prisma.cartItem.findUnique({
        where: { id: itemId },
        include: { cart: true }
      });

      if (!item || item.cart.userId !== userId) {
        throw new AppError('Varelinje ikke funnet', 404);
      }

      await prisma.cartItem.delete({
        where: { id: itemId }
      });

      res.json({
        success: true,
        message: 'Produkt fjernet fra handlekurven'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Remove item error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke fjerne produkt' });
      }
    }
  }

  // Clear entire cart
  async clearCart(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;

      const cart = await prisma.cart.findUnique({
        where: { userId }
      });

      if (cart) {
        await prisma.cartItem.deleteMany({
          where: { cartId: cart.id }
        });
      }

      res.json({
        success: true,
        message: 'Handlekurven er tømt'
      });
    } catch (error) {
      console.error('Clear cart error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke tømme handlekurven' });
    }
  }

  // Check cart reminder
  async checkReminder(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;

      // Find user's cart
      const cart = await prisma.cart.findUnique({
        where: { userId },
        include: {
          items: true
        }
      });

      // No cart or empty cart - no reminder needed
      if (!cart || cart.items.length === 0) {
        res.json({
          success: true,
          data: {
            shouldRemind: false,
            itemCount: 0
          }
        });
        return;
      }

      // Check if cart has items and if reminder should be sent
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Should remind if:
      // 1. Cart has items
      // 2. Cart was created more than 24 hours ago
      // 3. No reminder sent in last 24 hours (or never sent)
      const shouldRemind = cart.items.length > 0 &&
        cart.createdAt < twentyFourHoursAgo &&
        (!cart.lastReminderSent || cart.lastReminderSent < twentyFourHoursAgo);

      res.json({
        success: true,
        data: {
          shouldRemind,
          itemCount: cart.items.length,
          cartAge: now.getTime() - cart.createdAt.getTime(),
          lastReminderSent: cart.lastReminderSent
        }
      });
    } catch (error) {
      console.error('Check reminder error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke sjekke påminnelse' });
    }
  }

  // Update reminder timestamp
  async updateReminder(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;

      // Find user's cart
      const cart = await prisma.cart.findUnique({
        where: { userId }
      });

      if (!cart) {
        throw new AppError('Handlekurv ikke funnet', 404);
      }

      // Update lastReminderSent timestamp
      await prisma.cart.update({
        where: { userId },
        data: {
          lastReminderSent: new Date()
        }
      });

      res.json({
        success: true,
        message: 'Påminnelse oppdatert'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Update reminder error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke oppdatere påminnelse' });
      }
    }
  }
}
