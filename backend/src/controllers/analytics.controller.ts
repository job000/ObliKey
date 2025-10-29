import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../utils/prisma';

export class AnalyticsController {
  async getAnalytics(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { timeRange = 'month' } = req.query;

      // Calculate date ranges
      const now = new Date();
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

      // Determine date range based on timeRange parameter
      let startDate: Date;
      switch (timeRange) {
        case 'week':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'year':
          startDate = new Date();
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        case 'month':
        default:
          startDate = startOfThisMonth;
          break;
      }

      // Revenue calculations
      const paidStatuses = ['COMPLETED', 'PROCESSING'];

      const [
        totalRevenue,
        thisMonthRevenue,
        lastMonthRevenue,
        totalOrders,
        pendingOrders,
        completedOrders,
        totalUsers,
        activeUsers,
        newUsersThisMonth,
        totalClasses,
        totalBookings,
        completedBookings,
        totalPTSessions,
        completedPTSessions,
        scheduledPTSessions
      ] = await Promise.all([
        // Total revenue (all time)
        prisma.order.aggregate({
          where: { tenantId, status: { in: paidStatuses } },
          _sum: { totalAmount: true }
        }),
        // This month revenue
        prisma.order.aggregate({
          where: {
            tenantId,
            status: { in: paidStatuses },
            createdAt: { gte: startOfThisMonth }
          },
          _sum: { totalAmount: true }
        }),
        // Last month revenue
        prisma.order.aggregate({
          where: {
            tenantId,
            status: { in: paidStatuses },
            createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }
          },
          _sum: { totalAmount: true }
        }),
        // Total orders
        prisma.order.count({ where: { tenantId } }),
        // Pending orders
        prisma.order.count({ where: { tenantId, status: 'PENDING' } }),
        // Completed orders
        prisma.order.count({ where: { tenantId, status: { in: paidStatuses } } }),
        // Total users
        prisma.user.count({ where: { tenantId } }),
        // Active users (logged in within last 30 days)
        prisma.user.count({
          where: {
            tenantId,
            lastLogin: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        }),
        // New users this month
        prisma.user.count({
          where: {
            tenantId,
            createdAt: { gte: startOfThisMonth }
          }
        }),
        // Total classes
        prisma.class.count({ where: { tenantId } }),
        // Total bookings
        prisma.booking.count({ where: { class: { tenantId } } }),
        // Completed bookings (attended)
        prisma.booking.count({
          where: {
            class: { tenantId },
            status: 'CONFIRMED'
          }
        }),
        // Total PT sessions
        prisma.pTSession.count({ where: { tenantId } }),
        // Completed PT sessions
        prisma.pTSession.count({
          where: { tenantId, status: 'COMPLETED' }
        }),
        // Scheduled PT sessions
        prisma.pTSession.count({
          where: {
            tenantId,
            status: { in: ['SCHEDULED', 'CONFIRMED'] }
          }
        })
      ]);

      // Calculate growth percentage
      const thisMonthRev = thisMonthRevenue._sum.totalAmount || 0;
      const lastMonthRev = lastMonthRevenue._sum.totalAmount || 0;
      const growth = lastMonthRev > 0
        ? ((thisMonthRev - lastMonthRev) / lastMonthRev) * 100
        : thisMonthRev > 0 ? 100 : 0;

      // Calculate average order value
      const avgValue = completedOrders > 0
        ? (totalRevenue._sum.totalAmount || 0) / completedOrders
        : 0;

      // Calculate average attendance percentage
      const avgAttendance = totalBookings > 0
        ? (completedBookings / totalBookings) * 100
        : 0;

      res.json({
        success: true,
        data: {
          revenue: {
            total: totalRevenue._sum.totalAmount || 0,
            thisMonth: thisMonthRev,
            lastMonth: lastMonthRev,
            growth: parseFloat(growth.toFixed(1))
          },
          orders: {
            total: totalOrders,
            pending: pendingOrders,
            completed: completedOrders,
            avgValue: parseFloat(avgValue.toFixed(2))
          },
          users: {
            total: totalUsers,
            active: activeUsers,
            newThisMonth: newUsersThisMonth
          },
          classes: {
            total: totalClasses,
            avgAttendance: parseFloat(avgAttendance.toFixed(1)),
            totalBookings: totalBookings
          },
          ptSessions: {
            total: totalPTSessions,
            completed: completedPTSessions,
            scheduled: scheduledPTSessions
          }
        }
      });
    } catch (error) {
      console.error('Get analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Kunne ikke hente analysedata'
      });
    }
  }
}
