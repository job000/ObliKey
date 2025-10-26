import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../utils/prisma';

export class ActivityLogController {
  // Get activity logs (admin only)
  async getActivityLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const {
        userId,
        action,
        resource,
        dateFrom,
        dateTo,
        startDate,
        endDate,
        search,
        limit = '50',
        offset = '0',
        page = '1'
      } = req.query;

      const where: any = { tenantId };

      if (userId) where.userId = userId as string;
      if (action) where.action = action as string;
      if (resource) where.resource = resource as string;

      // Support both dateFrom/dateTo and startDate/endDate
      const from = (dateFrom || startDate) as string;
      const to = (dateTo || endDate) as string;

      if (from || to) {
        where.createdAt = {};
        if (from) where.createdAt.gte = new Date(from);
        if (to) where.createdAt.lte = new Date(to);
      }

      // Add search functionality
      if (search) {
        where.OR = [
          { description: { contains: search as string, mode: 'insensitive' } },
          { ipAddress: { contains: search as string, mode: 'insensitive' } },
          { userAgent: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      // Calculate pagination
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const [logs, total] = await Promise.all([
        prisma.activityLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limitNum,
          skip: skip,
          include: {
            tenant: {
              select: {
                name: true
              }
            }
          }
        }),
        prisma.activityLog.count({ where })
      ]);

      // Get user details for logs
      const userIds = [...new Set(logs.filter(log => log.userId).map(log => log.userId!))];
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true
        }
      });

      const userMap = users.reduce((acc: any, user) => {
        acc[user.id] = user;
        return acc;
      }, {});

      const logsWithUsers = logs.map(log => ({
        ...log,
        user: log.userId ? userMap[log.userId] : null
      }));

      res.json({
        success: true,
        data: {
          logs: logsWithUsers,
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      console.error('Get activity logs error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente aktivitetslogger' });
    }
  }

  // Get user-specific activity logs
  async getUserActivityLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const tenantId = req.tenantId!;
      const currentUser = req.user!;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      // Check permission - users can only see their own logs unless they're admin
      if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN' && currentUser.userId !== userId) {
        res.status(403).json({ success: false, error: 'Ingen tilgang' });
        return;
      }

      const [logs, total] = await Promise.all([
        prisma.activityLog.findMany({
          where: {
            tenantId,
            userId
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset
        }),
        prisma.activityLog.count({
          where: {
            tenantId,
            userId
          }
        })
      ]);

      res.json({
        success: true,
        data: {
          logs,
          total,
          limit,
          offset
        }
      });
    } catch (error) {
      console.error('Get user activity logs error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente aktivitetslogger' });
    }
  }

  // Get activity statistics
  async getActivityStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { startDate, endDate } = req.query;

      const where: any = { tenantId };

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }

      // Get stats
      const [
        totalLogs,
        uniqueUsers,
        actionCounts,
        resourceCounts
      ] = await Promise.all([
        prisma.activityLog.count({ where }),
        prisma.activityLog.findMany({
          where,
          distinct: ['userId'],
          select: { userId: true }
        }),
        prisma.activityLog.groupBy({
          by: ['action'],
          where,
          _count: { action: true }
        }),
        prisma.activityLog.groupBy({
          by: ['resource'],
          where,
          _count: { resource: true }
        })
      ]);

      // Get most active users
      const userActivity = await prisma.activityLog.groupBy({
        by: ['userId'],
        where: {
          ...where,
          userId: { not: null }
        },
        _count: { userId: true },
        orderBy: {
          _count: { userId: 'desc' }
        },
        take: 10
      });

      const topUserIds = userActivity.map((u: any) => u.userId).filter((id: any) => id);
      const topUsers = await prisma.user.findMany({
        where: { id: { in: topUserIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      });

      const topUsersMap = topUsers.reduce((acc: any, user) => {
        acc[user.id] = user;
        return acc;
      }, {});

      const mostActiveUsers = userActivity
        .filter((u: any) => u.userId)
        .map((u: any) => ({
        user: topUsersMap[u.userId],
        count: u._count.userId
      }));

      res.json({
        success: true,
        data: {
          totalLogs,
          uniqueUsers: uniqueUsers.filter(u => u.userId).length,
          actionCounts: actionCounts.map(a => ({
            action: a.action,
            count: a._count.action
          })),
          resourceCounts: resourceCounts.map(r => ({
            resource: r.resource,
            count: r._count.resource
          })),
          mostActiveUsers
        }
      });
    } catch (error) {
      console.error('Get activity stats error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente statistikk' });
    }
  }

  // Manual log creation (for testing or special cases)
  async createLog(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const {
        userId,
        action,
        resource,
        resourceId,
        description,
        ipAddress,
        userAgent,
        metadata
      } = req.body;

      const log = await prisma.activityLog.create({
        data: {
          tenantId,
          userId,
          action,
          resource,
          resourceId,
          description,
          ipAddress,
          userAgent,
          metadata
        }
      });

      res.status(201).json({
        success: true,
        data: log,
        message: 'Aktivitetslogg opprettet'
      });
    } catch (error) {
      console.error('Create activity log error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke opprette aktivitetslogg' });
    }
  }

  // Export activity logs to CSV (admin only)
  async exportActivityLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const {
        userId,
        action,
        resource,
        dateFrom,
        dateTo,
        startDate,
        endDate,
        search
      } = req.query;

      const where: any = { tenantId };

      if (userId) where.userId = userId as string;
      if (action) where.action = action as string;
      if (resource) where.resource = resource as string;

      // Support both dateFrom/dateTo and startDate/endDate
      const from = (dateFrom || startDate) as string;
      const to = (dateTo || endDate) as string;

      if (from || to) {
        where.createdAt = {};
        if (from) where.createdAt.gte = new Date(from);
        if (to) where.createdAt.lte = new Date(to);
      }

      // Add search functionality
      if (search) {
        where.OR = [
          { description: { contains: search as string, mode: 'insensitive' } },
          { ipAddress: { contains: search as string, mode: 'insensitive' } },
          { userAgent: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      // Fetch all logs matching the criteria (with reasonable limit)
      const logs = await prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 10000, // Max 10000 records for export
        include: {
          tenant: {
            select: {
              name: true
            }
          }
        }
      });

      // Get user details for logs
      const userIds = [...new Set(logs.filter(log => log.userId).map(log => log.userId!))];
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true
        }
      });

      const userMap = users.reduce((acc: any, user) => {
        acc[user.id] = user;
        return acc;
      }, {});

      // Build CSV content
      const csvHeaders = ['Tidspunkt', 'Handling', 'Ressurs', 'Beskrivelse', 'Bruker', 'E-post', 'Rolle', 'IP-adresse', 'Bruker-Agent'];
      const csvRows = logs.map(log => {
        const user = log.userId ? userMap[log.userId] : null;
        return [
          new Date(log.createdAt).toLocaleString('nb-NO'),
          log.action,
          log.resource,
          `"${log.description.replace(/"/g, '""')}"`, // Escape quotes in CSV
          user ? `${user.firstName} ${user.lastName}` : 'System',
          user?.email || '',
          user?.role || '',
          log.ipAddress,
          `"${log.userAgent.replace(/"/g, '""')}"` // Escape quotes in CSV
        ];
      });

      const csv = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');

      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="activity-logs-${new Date().toISOString()}.csv"`);

      // Add BOM for Excel UTF-8 support
      res.send('\ufeff' + csv);
    } catch (error) {
      console.error('Export activity logs error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke eksportere aktivitetslogger' });
    }
  }
}
