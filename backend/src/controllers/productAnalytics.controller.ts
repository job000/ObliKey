import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

export class ProductAnalyticsController {
  // Track product view
  async trackProductView(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { productId } = req.params;
      const tenantId = req.tenantId!;
      const userId = req.user?.userId;
      const sessionId = req.headers['x-session-id'] as string;
      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'Unknown';
      const userAgent = req.headers['user-agent'] || 'Unknown';

      // Verify product exists
      const product = await prisma.product.findFirst({
        where: { id: productId, tenantId }
      });

      if (!product) {
        throw new AppError('Produkt ikke funnet', 404);
      }

      // Track the view
      await prisma.productView.create({
        data: {
          tenantId,
          productId,
          userId,
          sessionId,
          ipAddress,
          userAgent
        }
      });

      res.json({
        success: true,
        message: 'Produktvisning registrert'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Track product view error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke registrere produktvisning' });
      }
    }
  }

  // Get sales analytics
  async getSalesAnalytics(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { startDate, endDate } = req.query;

      const where: any = { tenantId };

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }

      // Get order statistics (include PROCESSING and COMPLETED as paid orders)
      const paidStatuses = ['COMPLETED', 'PROCESSING'];
      const [
        totalOrders,
        completedOrders,
        totalRevenue,
        ordersByStatus
      ] = await Promise.all([
        prisma.order.count({ where }),
        prisma.order.count({ where: { ...where, status: { in: paidStatuses } } }),
        prisma.order.aggregate({
          where: { ...where, status: { in: paidStatuses } },
          _sum: { totalAmount: true }
        }),
        prisma.order.groupBy({
          by: ['status'],
          where,
          _count: { status: true }
        })
      ]);

      // Get top selling products (include both COMPLETED and PROCESSING orders)
      const orderItems = await prisma.invoiceLine.findMany({
        where: {
          invoice: {
            order: {
              tenantId,
              status: { in: paidStatuses },
              ...(startDate || endDate ? { createdAt: where.createdAt } : {})
            }
          }
        },
        include: {
          invoice: {
            include: {
              order: true
            }
          }
        }
      });

      // Aggregate by product
      const productSales = orderItems.reduce((acc: any, item: any) => {
        const productId = item.description; // This needs to be improved - we should store productId
        if (!acc[productId]) {
          acc[productId] = {
            productName: item.description,
            quantity: 0,
            revenue: 0,
            orders: 0
          };
        }
        acc[productId].quantity += item.quantity;
        acc[productId].revenue += item.total;
        acc[productId].orders += 1;
        return acc;
      }, {});

      const topProducts = Object.values(productSales)
        .sort((a: any, b: any) => b.revenue - a.revenue)
        .slice(0, 10);

      // Get average order value
      const avgOrderValue = totalOrders > 0
        ? (totalRevenue._sum.totalAmount || 0) / completedOrders
        : 0;

      res.json({
        success: true,
        data: {
          totalOrders,
          completedOrders,
          totalRevenue: totalRevenue._sum.totalAmount || 0,
          averageOrderValue: avgOrderValue,
          ordersByStatus: ordersByStatus.map(item => ({
            status: item.status,
            count: item._count.status
          })),
          topProducts
        }
      });
    } catch (error) {
      console.error('Get sales analytics error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente salgsstatistikk' });
    }
  }

  // Get most viewed products
  async getMostViewedProducts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { startDate, endDate, limit = '10' } = req.query;

      const where: any = { tenantId };

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }

      // Group views by product
      const productViews = await prisma.productView.groupBy({
        by: ['productId'],
        where,
        _count: { productId: true },
        orderBy: {
          _count: { productId: 'desc' }
        },
        take: parseInt(limit as string)
      });

      // Get product details
      const productIds = productViews.map(pv => pv.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        include: {
          images: {
            orderBy: { sortOrder: 'asc' },
            take: 1
          }
        }
      });

      const productMap = products.reduce((acc: any, product) => {
        acc[product.id] = product;
        return acc;
      }, {});

      const mostViewed = productViews.map(pv => ({
        product: productMap[pv.productId],
        viewCount: pv._count.productId
      }));

      res.json({
        success: true,
        data: mostViewed
      });
    } catch (error) {
      console.error('Get most viewed products error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente mest sette produkter' });
    }
  }

  // Get product analytics dashboard data
  async getDashboardAnalytics(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { period = '30' } = req.query; // days

      const daysAgo = parseInt(period as string);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const where = {
        tenantId,
        createdAt: { gte: startDate }
      };

      // Get parallel statistics
      const [
        totalViews,
        uniqueViewers,
        totalProducts,
        activeProducts,
        recentOrders,
        topViewedProducts
      ] = await Promise.all([
        prisma.productView.count({ where }),
        prisma.productView.findMany({
          where,
          distinct: ['userId'],
          select: { userId: true }
        }),
        prisma.product.count({ where: { tenantId } }),
        prisma.product.count({ where: { tenantId, status: 'PUBLISHED' } }),
        prisma.order.count({
          where: {
            tenantId,
            createdAt: { gte: startDate }
          }
        }),
        prisma.productView.groupBy({
          by: ['productId'],
          where,
          _count: { productId: true },
          orderBy: {
            _count: { productId: 'desc' }
          },
          take: 5
        })
      ]);

      // Get product details for top viewed
      const productIds = topViewedProducts.map(pv => pv.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        include: {
          images: {
            where: { isPrimary: true },
            take: 1
          }
        }
      });

      const productMap = products.reduce((acc: any, product) => {
        acc[product.id] = product;
        return acc;
      }, {});

      const topProducts = topViewedProducts.map(pv => ({
        product: productMap[pv.productId],
        viewCount: pv._count.productId
      }));

      // Get views trend (daily for the period)
      const dailyViews = await prisma.$queryRaw<any[]>`
        SELECT DATE(created_at) as date, COUNT(*) as views
        FROM product_views
        WHERE tenant_id = ${tenantId}
        AND created_at >= ${startDate}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `;

      res.json({
        success: true,
        data: {
          overview: {
            totalViews,
            uniqueViewers: uniqueViewers.filter(v => v.userId).length,
            totalProducts,
            activeProducts,
            recentOrders
          },
          topProducts,
          viewsTrend: dailyViews.map(dv => ({
            date: dv.date,
            views: parseInt(dv.views)
          }))
        }
      });
    } catch (error) {
      console.error('Get dashboard analytics error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente dashboard-statistikk' });
    }
  }

  // Get product conversion rate
  async getConversionRates(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { startDate, endDate } = req.query;

      const where: any = { tenantId };

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }

      // Get total views
      const totalViews = await prisma.productView.count({ where });

      // Get unique sessions that viewed products
      const uniqueSessions = await prisma.productView.findMany({
        where,
        distinct: ['sessionId'],
        select: { sessionId: true }
      });

      // Get orders in same period
      const orders = await prisma.order.count({
        where: {
          tenantId,
          ...(where.createdAt ? { createdAt: where.createdAt } : {})
        }
      });

      const conversionRate = uniqueSessions.length > 0
        ? (orders / uniqueSessions.length) * 100
        : 0;

      res.json({
        success: true,
        data: {
          totalViews,
          uniqueSessions: uniqueSessions.length,
          totalOrders: orders,
          conversionRate: conversionRate.toFixed(2)
        }
      });
    } catch (error) {
      console.error('Get conversion rates error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente konverteringsrate' });
    }
  }
}
