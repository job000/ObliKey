import { PrismaClient } from '@prisma/client';
import { Parser } from 'json2csv';

const prisma = new PrismaClient();

export interface CreateAccessLogData {
  doorId: string;
  userId?: string;
  action: 'UNLOCK' | 'LOCK' | 'ACCESS_GRANTED' | 'ACCESS_DENIED';
  method?: 'CARD' | 'PIN' | 'MOBILE' | 'MANUAL' | 'API';
  success: boolean;
  reason?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

export interface AccessLogQueryParams {
  doorId?: string;
  userId?: string;
  success?: boolean;
  action?: string;
  method?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class AccessLogService {
  /**
   * Create a new access log entry
   */
  async createAccessLog(data: CreateAccessLogData) {
    // Map success flag to AccessResult enum
    const result = data.success ? 'GRANTED' : 'DENIED_NO_PERMISSION';

    // Map method to accessMethod (use 'MANUAL' as default)
    const accessMethod = data.method || 'MANUAL';

    // We need tenantId - this should be passed from controller
    // For now, try to get it from the door
    const door = await prisma.door.findUnique({
      where: { id: data.doorId },
      select: { tenantId: true },
    });

    if (!door) {
      throw new Error('Door not found');
    }

    return await prisma.doorAccessLog.create({
      data: {
        doorId: data.doorId,
        userId: data.userId,
        result: result as any,
        accessMethod: accessMethod,
        denialReason: data.success ? null : data.reason,
        ipAddress: data.ipAddress,
        metadata: data.metadata as any,
        tenantId: door.tenantId,
      },
      include: {
        door: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
    });
  }

  /**
   * Query access logs with filters
   */
  async queryAccessLogs(tenantId: string, params: AccessLogQueryParams) {
    const {
      doorId,
      userId,
      success,
      action,
      method,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = params;

    // Build where clause
    const where: any = {
      tenantId,
    };

    if (doorId) where.doorId = doorId;
    if (userId) where.userId = userId;
    if (success !== undefined) {
      where.result = success ? 'GRANTED' : { not: 'GRANTED' };
    }
    // action filter is ignored as we map everything to 'UNLOCK'
    if (method) where.accessMethod = { contains: method, mode: 'insensitive' };

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    // Get logs with pagination
    const [logs, total] = await Promise.all([
      prisma.doorAccessLog.findMany({
        where,
        include: {
          door: {
            select: {
              id: true,
              name: true,
              location: true,
            },
          },
        },
        orderBy: {
          timestamp: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.doorAccessLog.count({ where }),
    ]);

    // Get user information for logs that have userId
    const userIds = [...new Set(logs.filter(log => log.userId).map(log => log.userId))];
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds as string[] },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    // Transform logs to match frontend expectation
    const enrichedLogs = logs.map(log => ({
      id: log.id,
      doorId: log.doorId,
      userId: log.userId,
      action: 'UNLOCK', // Map all to UNLOCK for now
      method: log.accessMethod || 'MANUAL',
      success: log.result === 'GRANTED',
      reason: log.denialReason,
      ipAddress: log.ipAddress,
      metadata: log.metadata,
      createdAt: log.timestamp.toISOString(),
      door: log.door,
      user: log.userId ? userMap.get(log.userId) : null,
    }));

    return {
      logs: enrichedLogs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  /**
   * Get a single access log by ID
   */
  async getAccessLogById(logId: string, tenantId: string) {
    const log = await prisma.doorAccessLog.findFirst({
      where: {
        id: logId,
        tenantId,
      },
      include: {
        door: {
          select: {
            id: true,
            name: true,
            location: true,
            tenantId: true,
          },
        },
      },
    });

    if (!log) {
      return null;
    }

    // Get user information if available
    let user = null;
    if (log.userId) {
      user = await prisma.user.findFirst({
        where: { id: log.userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      });
    }

    return {
      ...log,
      user,
    };
  }

  /**
   * Get access logs for a specific door
   */
  async getDoorAccessLogs(doorId: string, tenantId: string, limit = 50, offset = 0) {
    return await this.queryAccessLogs(tenantId, {
      doorId,
      limit,
      offset,
    });
  }

  /**
   * Get access logs for a specific user
   */
  async getUserAccessLogs(userId: string, tenantId: string, limit = 50, offset = 0) {
    return await this.queryAccessLogs(tenantId, {
      userId,
      limit,
      offset,
    });
  }

  /**
   * Export access logs to CSV
   */
  async exportAccessLogs(tenantId: string, params: AccessLogQueryParams): Promise<string> {
    const { logs } = await this.queryAccessLogs(tenantId, {
      ...params,
      limit: 10000, // Max export limit
      offset: 0,
    });

    // Prepare data for CSV
    const csvData = logs.map(log => ({
      'Log ID': log.id,
      'Date/Time': log.createdAt,
      'Door Name': log.door.name,
      'Door Location': log.door.location || 'N/A',
      'User Name': log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Unknown',
      'User Email': log.user?.email || 'N/A',
      'User Role': log.user?.role || 'N/A',
      'Action': log.action,
      'Method': log.method || 'N/A',
      'Success': log.success ? 'Yes' : 'No',
      'Reason': log.reason || 'N/A',
      'IP Address': log.ipAddress || 'N/A',
    }));

    // Convert to CSV
    const parser = new Parser({
      fields: [
        'Log ID',
        'Date/Time',
        'Door Name',
        'Door Location',
        'User Name',
        'User Email',
        'User Role',
        'Action',
        'Method',
        'Success',
        'Reason',
        'IP Address',
      ],
    });

    return parser.parse(csvData);
  }

  /**
   * Get access log statistics
   */
  async getAccessLogStats(tenantId: string, startDate?: Date, endDate?: Date) {
    const where: any = {
      tenantId,
    };

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const [
      totalAttempts,
      successfulAttempts,
      failedAttempts,
      byAction,
      byMethod,
      byDoor,
      uniqueUsers,
    ] = await Promise.all([
      prisma.doorAccessLog.count({ where }),
      prisma.doorAccessLog.count({ where: { ...where, result: 'GRANTED' } }),
      prisma.doorAccessLog.count({ where: { ...where, result: { not: 'GRANTED' } } }),
      prisma.doorAccessLog.groupBy({
        by: ['result'],
        where,
        _count: { result: true },
      }),
      prisma.doorAccessLog.groupBy({
        by: ['accessMethod'],
        where: { ...where, accessMethod: { not: null } },
        _count: { accessMethod: true },
      }),
      prisma.doorAccessLog.groupBy({
        by: ['doorId'],
        where,
        _count: { doorId: true },
        orderBy: { _count: { doorId: 'desc' } },
        take: 10,
      }),
      prisma.doorAccessLog.findMany({
        where: { ...where, userId: { not: null } },
        distinct: ['userId'],
        select: { userId: true },
      }),
    ]);

    // Get door names for top doors
    const doorIds = byDoor.map(d => d.doorId);
    const doors = await prisma.door.findMany({
      where: { id: { in: doorIds } },
      select: { id: true, name: true },
    });

    const doorMap = new Map(doors.map(d => [d.id, d]));

    return {
      totalAttempts,
      successfulAttempts,
      failedAttempts,
      successRate: totalAttempts > 0 ? (successfulAttempts / totalAttempts) * 100 : 0,
      uniqueUsers: uniqueUsers.length,
      byAction: byAction.map(a => ({
        action: a.result || 'UNLOCK', // Map result to action
        count: a._count.result,
      })),
      byMethod: byMethod.map(m => ({
        method: m.accessMethod || 'MANUAL',
        count: m._count.accessMethod,
      })),
      topDoors: byDoor.map(d => ({
        doorId: d.doorId,
        doorName: doorMap.get(d.doorId)?.name || 'Unknown',
        count: d._count.doorId,
      })),
    };
  }

  /**
   * Get recent failed access attempts (security monitoring)
   */
  async getRecentFailedAttempts(tenantId: string, limit = 20) {
    const logs = await prisma.doorAccessLog.findMany({
      where: {
        tenantId,
        result: { not: 'GRANTED' },
      },
      include: {
        door: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
    });

    // Get user information
    const userIds = [...new Set(logs.filter(log => log.userId).map(log => log.userId))];
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds as string[] },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    return logs.map(log => ({
      ...log,
      user: log.userId ? userMap.get(log.userId) : null,
    }));
  }

  /**
   * Get suspicious activity (multiple failed attempts from same user/IP)
   */
  async getSuspiciousActivity(tenantId: string, timeWindowMinutes = 30, threshold = 5) {
    const since = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

    const failedAttempts = await prisma.doorAccessLog.findMany({
      where: {
        tenantId,
        result: { not: 'GRANTED' },
        timestamp: { gte: since },
      },
      select: {
        userId: true,
        ipAddress: true,
        doorId: true,
        timestamp: true,
      },
    });

    // Group by userId and ipAddress
    const suspiciousUsers = new Map<string, number>();
    const suspiciousIPs = new Map<string, number>();

    for (const attempt of failedAttempts) {
      if (attempt.userId) {
        suspiciousUsers.set(attempt.userId, (suspiciousUsers.get(attempt.userId) || 0) + 1);
      }
      if (attempt.ipAddress) {
        suspiciousIPs.set(attempt.ipAddress, (suspiciousIPs.get(attempt.ipAddress) || 0) + 1);
      }
    }

    // Filter entries that exceed threshold
    const suspiciousUserIds = Array.from(suspiciousUsers.entries())
      .filter(([_, count]) => count >= threshold)
      .map(([userId]) => userId);

    const suspiciousIPAddresses = Array.from(suspiciousIPs.entries())
      .filter(([_, count]) => count >= threshold)
      .map(([ip, count]) => ({ ip, count }));

    // Get user details
    const users = await prisma.user.findMany({
      where: { id: { in: suspiciousUserIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    });

    return {
      suspiciousUsers: users.map(u => ({
        ...u,
        failedAttempts: suspiciousUsers.get(u.id) || 0,
      })),
      suspiciousIPs: suspiciousIPAddresses,
      timeWindow: timeWindowMinutes,
      threshold,
    };
  }

  /**
   * Delete old access logs (data retention)
   */
  async deleteOldLogs(tenantId: string, olderThanDays: number) {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const result = await prisma.doorAccessLog.deleteMany({
      where: {
        tenantId,
        timestamp: { lt: cutoffDate },
      },
    });

    return {
      deletedCount: result.count,
      cutoffDate,
    };
  }
}

export default new AccessLogService();
