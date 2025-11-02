import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { ptCreditService } from '../services/ptCredit.service';

export class OrderController {
  // Create order from cart items
  async createOrder(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const { items, notes, paymentMethod, deliveryAddress, deliveryCity, deliveryZip, deliveryCountry } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new AppError('Ingen produkter i bestillingen', 400);
      }

      // Validate payment method
      const validPaymentMethods = ['CARD', 'VIPPS', 'KLARNA'];
      if (paymentMethod && !validPaymentMethods.includes(paymentMethod)) {
        throw new AppError('Ugyldig betalingsmetode', 400);
      }

      // Fetch product details and calculate totals
      let subtotal = 0;
      const orderItems = [];

      for (const item of items) {
        const product = await prisma.product.findFirst({
          where: {
            id: item.productId,
            tenantId,
            status: 'PUBLISHED'
          }
        });

        if (!product) {
          throw new AppError(`Produkt ${item.productId} ikke funnet eller ikke tilgjengelig`, 404);
        }

        // Check inventory if tracked
        if (product.trackInventory && product.stock !== null) {
          if (product.stock < item.quantity) {
            throw new AppError(`Ikke nok på lager for ${product.name}`, 400);
          }
        }

        const itemSubtotal = product.price * item.quantity;
        subtotal += itemSubtotal;

        orderItems.push({
          productId: product.id,
          productName: product.name,
          productType: product.type,
          quantity: item.quantity,
          price: product.price,
          subtotal: itemSubtotal,
          sessionCount: product.sessionCount
        });
      }

      const tax = 0; // Can be calculated based on product types
      const total = subtotal + tax;

      // Check if any items require physical delivery
      const requiresDelivery = orderItems.some(item => item.productType === 'PHYSICAL_PRODUCT');

      // Validate delivery information if physical products
      if (requiresDelivery) {
        if (!deliveryAddress || !deliveryCity || !deliveryZip) {
          throw new AppError('Leveringsinformasjon er påkrevd for fysiske produkter', 400);
        }
      }

      // Generate order number
      const orderCount = await prisma.order.count({ where: { tenantId } });
      const orderNumber = `ORD-${Date.now()}-${String(orderCount + 1).padStart(4, '0')}`;

      // Create order with items in a transaction
      const order = await prisma.$transaction(async (tx) => {
        const newOrder = await tx.order.create({
          data: {
            tenantId,
            userId,
            orderNumber,
            status: requiresDelivery ? 'PROCESSING' : 'COMPLETED', // PROCESSING if delivery needed
            subtotal,
            tax,
            total,
            notes,
            paymentMethod: paymentMethod || 'CARD', // Default to CARD if not specified
            requiresDelivery,
            deliveryAddress: requiresDelivery ? deliveryAddress : null,
            deliveryCity: requiresDelivery ? deliveryCity : null,
            deliveryZip: requiresDelivery ? deliveryZip : null,
            deliveryCountry: requiresDelivery ? (deliveryCountry || 'Norway') : null,
            completedAt: requiresDelivery ? null : new Date(),
            items: {
              create: orderItems
            }
          },
          include: {
            items: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        });

        // Update inventory for products with tracking
        for (const item of items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId }
          });

          if (product?.trackInventory && product.stock !== null) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: {
                  decrement: item.quantity
                }
              }
            });
          }
        }

        // Create PT credits for PT service products
        for (const orderItem of orderItems) {
          if (orderItem.productType === 'PT_SERVICE' && orderItem.sessionCount) {
            const totalCredits = orderItem.sessionCount * orderItem.quantity;

            await tx.pTCredit.create({
              data: {
                tenantId,
                userId,
                orderId: newOrder.id,
                credits: totalCredits,
                used: 0,
                notes: `Kjøpt via ordre ${orderNumber}: ${orderItem.productName}`
              }
            });
          }
        }

        // Create accounting transaction for the sale
        if (!requiresDelivery) {
          // Only create transaction for completed orders (digital/PT services)
          // Get default income account (3000 - Salgsinntekt)
          let incomeAccount = await tx.account.findFirst({
            where: {
              tenantId,
              accountNumber: '3000'
            }
          });

          // If income account exists, create transaction
          if (incomeAccount) {
            await tx.transaction.create({
              data: {
                tenantId,
                type: 'INCOME',
                accountId: incomeAccount.id,
                description: `Salg - Ordre ${orderNumber}`,
                amount: total,
                vatAmount: 0, // TODO: Calculate VAT from order items
                transactionDate: new Date(),
                createdBy: userId
              }
            });
          }
        }

        return newOrder;
      });

      res.status(201).json({
        success: true,
        data: order,
        message: 'Bestilling fullført'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Create order error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke opprette bestilling' });
      }
    }
  }

  // Get orders
  async getOrders(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const { status } = req.query;

      // Build where clause based on role
      const whereClause: any = { tenantId };

      // Customers and Trainers only see their own orders
      if (userRole === 'CUSTOMER' || userRole === 'TRAINER') {
        whereClause.userId = userId;
      }
      // Admins and Super Admins see all orders (no additional filter)

      if (status) {
        whereClause.status = status as any;
      }

      const orders = await prisma.order.findMany({
        where: whereClause,
        include: {
          items: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({ success: true, data: orders });
    } catch (error) {
      console.error('Get orders error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente bestillinger' });
    }
  }

  // Get all orders (admin only - for order management screen)
  async getAllOrders(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { status } = req.query;

      const whereClause: any = { tenantId };

      if (status) {
        whereClause.status = status as any;
      }

      const orders = await prisma.order.findMany({
        where: whereClause,
        include: {
          items: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({ success: true, data: orders });
    } catch (error) {
      console.error('Get all orders error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente alle bestillinger' });
    }
  }

  // Get single order
  async getOrderById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      const order = await prisma.order.findFirst({
        where: {
          id,
          tenantId,
          ...(userRole === 'CUSTOMER' && { userId })
        },
        include: {
          items: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          ptCredits: true
        }
      });

      if (!order) {
        throw new AppError('Bestilling ikke funnet', 404);
      }

      res.json({ success: true, data: order });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Get order error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke hente bestilling' });
      }
    }
  }

  // Update order status (admin only)
  async updateOrderStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const tenantId = req.tenantId!;

      const order = await prisma.order.findFirst({
        where: { id, tenantId }
      });

      if (!order) {
        throw new AppError('Bestilling ikke funnet', 404);
      }

      const updatedOrder = await prisma.order.update({
        where: { id },
        data: {
          status,
          ...(status === 'COMPLETED' && !order.completedAt && {
            completedAt: new Date()
          })
        },
        include: {
          items: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      // Grant PT credits if order contains PT packages and is being marked as COMPLETED
      if (status === 'COMPLETED' && order.status !== 'COMPLETED') {
        try {
          await ptCreditService.grantCreditsForOrder(id, order.userId, tenantId);
          console.log(`[Order] PT credits granted for order ${id}`);
        } catch (error) {
          console.error(`[Order] Failed to grant PT credits for order ${id}:`, error);
          // Don't fail the order update if credit granting fails
        }
      }

      res.json({
        success: true,
        data: updatedOrder,
        message: 'Bestillingsstatus oppdatert'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Update order status error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke oppdatere bestilling' });
      }
    }
  }

  // Get order statistics (admin only)
  async getOrderStatistics(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { startDate, endDate } = req.query;

      const whereClause: any = {
        tenantId,
        status: 'COMPLETED'
      };

      if (startDate && endDate) {
        whereClause.completedAt = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        };
      }

      const orders = await prisma.order.findMany({
        where: whereClause,
        include: {
          items: true
        }
      });

      const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
      const totalOrders = orders.length;

      // Group by product type
      const revenueByType: Record<string, number> = {};
      const quantityByType: Record<string, number> = {};

      orders.forEach(order => {
        order.items.forEach(item => {
          revenueByType[item.productType] = (revenueByType[item.productType] || 0) + item.subtotal;
          quantityByType[item.productType] = (quantityByType[item.productType] || 0) + item.quantity;
        });
      });

      res.json({
        success: true,
        data: {
          totalRevenue,
          totalOrders,
          averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
          revenueByType,
          quantityByType
        }
      });
    } catch (error) {
      console.error('Get order statistics error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente statistikk' });
    }
  }

  // Update delivery information (admin only)
  async updateDeliveryInfo(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { deliveryAddress, deliveryCity, deliveryZip } = req.body;
      const tenantId = req.tenantId!;

      const order = await prisma.order.findFirst({
        where: { id, tenantId, requiresDelivery: true }
      });

      if (!order) {
        throw new AppError('Bestilling ikke funnet eller krever ikke levering', 404);
      }

      const updatedOrder = await prisma.order.update({
        where: { id },
        data: {
          deliveryAddress,
          deliveryCity,
          deliveryZip
        },
        include: {
          items: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      res.json({
        success: true,
        data: updatedOrder,
        message: 'Leveringsinformasjon oppdatert'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Update delivery info error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke oppdatere leveringsinformasjon' });
      }
    }
  }

  // Mark order as shipped (admin only)
  async markAsShipped(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { trackingNumber } = req.body;
      const tenantId = req.tenantId!;

      const order = await prisma.order.findFirst({
        where: { id, tenantId, requiresDelivery: true }
      });

      if (!order) {
        throw new AppError('Bestilling ikke funnet eller krever ikke levering', 404);
      }

      const updatedOrder = await prisma.order.update({
        where: { id },
        data: {
          status: 'SHIPPED',
          trackingNumber,
          shippedAt: new Date()
        },
        include: {
          items: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      res.json({
        success: true,
        data: updatedOrder,
        message: 'Ordre markert som sendt'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Mark as shipped error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke markere som sendt' });
      }
    }
  }

  // Mark order as delivered (admin only)
  async markAsDelivered(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;

      const order = await prisma.order.findFirst({
        where: { id, tenantId, requiresDelivery: true }
      });

      if (!order) {
        throw new AppError('Bestilling ikke funnet eller krever ikke levering', 404);
      }

      // Update order and create accounting transaction
      const updatedOrder = await prisma.$transaction(async (tx) => {
        const updated = await tx.order.update({
          where: { id },
          data: {
            status: 'DELIVERED',
            deliveredAt: new Date()
          },
          include: {
            items: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        });

        // Create accounting transaction when delivery is confirmed
        // Get default income account (3000 - Salgsinntekt)
        const incomeAccount = await tx.account.findFirst({
          where: {
            tenantId,
            accountNumber: '3000'
          }
        });

        // If income account exists, create transaction
        if (incomeAccount) {
          await tx.transaction.create({
            data: {
              tenantId,
              type: 'INCOME',
              accountId: incomeAccount.id,
              description: `Salg - Ordre ${order.orderNumber} (Levert)`,
              amount: order.total,
              vatAmount: 0, // TODO: Calculate VAT from order items
              transactionDate: new Date(),
              createdBy: req.user!.userId,
              notes: `Ordre ${order.orderNumber} levert og bekreftet`
            }
          });
        }

        return updated;
      });

      res.json({
        success: true,
        data: updatedOrder,
        message: 'Ordre markert som levert'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Mark as delivered error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke markere som levert' });
      }
    }
  }
}
