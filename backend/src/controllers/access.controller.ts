import { Response } from 'express';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import accessControlService from '../services/access-control.service';
import accessLogService from '../services/access-log.service';

export class AccessController {
  /**
   * POST /api/doors/:doorId/check-access
   * Check if user can access a door
   */
  async checkAccess(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { doorId } = req.params;
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const ipAddress = req.ip;

      // Evaluate access
      const result = await accessControlService.evaluateAccess(doorId, userId, tenantId);

      // Log the access attempt
      await accessLogService.createAccessLog({
        doorId,
        userId,
        action: result.granted ? 'ACCESS_GRANTED' : 'ACCESS_DENIED',
        method: 'API',
        success: result.granted,
        reason: result.reason,
        ipAddress,
        metadata: {
          ruleId: result.ruleId,
          evaluationSteps: result.evaluationSteps,
          ...result.metadata,
        },
      });

      res.json({
        success: true,
        data: {
          granted: result.granted,
          reason: result.reason,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to check access',
        });
      }
    }
  }

  /**
   * POST /api/doors/:doorId/unlock
   * Unlock a door (if user has access)
   * Supports Bluetooth proximity-based access
   */
  async unlockDoor(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { doorId } = req.params;
      const { proximityData, testMode } = req.body; // New: Support proximity data
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const ipAddress = req.ip;

      // Validate proximity if provided
      let proximityValid = false;
      let proximityMethod = 'MANUAL';

      if (proximityData) {
        // Check if door requires proximity
        const { prisma } = await import('../utils/prisma');
        const door = await prisma.door.findUnique({
          where: { id: doorId },
          select: { metadata: true, name: true },
        });

        const doorMetadata = door?.metadata as any;
        const bleEnabled = doorMetadata?.bluetooth?.enabled;

        if (bleEnabled) {
          const beaconId = doorMetadata?.bluetooth?.beaconId;
          const requiredRssi = doorMetadata?.bluetooth?.minimumRssi || -70; // Default: within ~5 meters

          // In test mode, accept test beacon data
          if (testMode && proximityData.testBeaconId === beaconId) {
            proximityValid = true;
            proximityMethod = 'BLUETOOTH_TEST';
          }
          // In production, validate real BLE data
          else if (proximityData.beaconId === beaconId && proximityData.rssi >= requiredRssi) {
            proximityValid = true;
            proximityMethod = 'BLUETOOTH';
          } else {
            // Proximity check failed
            await accessLogService.createAccessLog({
              doorId,
              userId,
              action: 'UNLOCK',
              method: proximityMethod,
              success: false,
              reason: 'Ikke innenfor rekkevidde av dør (Bluetooth)',
              ipAddress,
              metadata: {
                proximityData,
                requiredBeacon: beaconId,
                requiredRssi,
              },
            });

            return res.status(403).json({
              success: false,
              error: 'Du må være i nærheten av døren for å åpne den',
              code: 'PROXIMITY_REQUIRED',
            });
          }
        }
      }

      // Attempt to unlock the door
      const result = await accessControlService.unlockDoor(doorId, tenantId, userId);

      // Log the unlock attempt with proximity info
      await accessLogService.createAccessLog({
        doorId,
        userId,
        action: 'UNLOCK',
        method: proximityMethod,
        success: result.success,
        reason: result.message,
        ipAddress,
        metadata: {
          proximityUsed: !!proximityData,
          proximityValid,
          testMode,
        },
      });

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          data: {
            doorId,
            unlockedAt: new Date().toISOString(),
            method: proximityMethod,
          },
        });
      } else {
        res.status(403).json({
          success: false,
          error: result.message,
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to unlock door',
      });
    }
  }

  /**
   * GET /api/access-logs
   * Query access logs with filters
   */
  async queryAccessLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const currentUserId = req.user!.userId;
      const currentUserRole = req.user!.role;

      const {
        doorId,
        userId,
        success,
        action,
        method,
        startDate,
        endDate,
        limit,
        offset,
      } = req.query;

      // SECURITY: CUSTOMER and TRAINER can only see their own logs
      let effectiveUserId = userId as string;
      if (currentUserRole === 'CUSTOMER' || currentUserRole === 'TRAINER') {
        effectiveUserId = currentUserId; // Force filter to only show their own logs
      }

      const result = await accessLogService.queryAccessLogs(tenantId, {
        doorId: doorId as string,
        userId: effectiveUserId,
        success: success === 'true' ? true : success === 'false' ? false : undefined,
        action: action as string,
        method: method as string,
        startDate: startDate && String(startDate).trim() ? new Date(startDate as string) : undefined,
        endDate: endDate && String(endDate).trim() ? new Date(endDate as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json({
        success: true,
        data: result.logs,
        pagination: result.pagination,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to query access logs',
      });
    }
  }

  /**
   * GET /api/access-logs/:logId
   * Get details of a specific access log
   */
  async getAccessLogDetails(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { logId } = req.params;
      const tenantId = req.tenantId!;
      const currentUserId = req.user!.userId;
      const currentUserRole = req.user!.role;

      const log = await accessLogService.getAccessLogById(logId, tenantId);

      if (!log) {
        throw new AppError('Access log not found', 404);
      }

      // SECURITY: CUSTOMER and TRAINER can only see their own logs
      if ((currentUserRole === 'CUSTOMER' || currentUserRole === 'TRAINER') && log.userId !== currentUserId) {
        throw new AppError('Access log not found', 404); // Don't reveal that it exists
      }

      res.json({
        success: true,
        data: log,
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to get access log details',
        });
      }
    }
  }

  /**
   * GET /api/access-logs/export
   * Export access logs to CSV
   */
  async exportAccessLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const currentUserId = req.user!.userId;
      const currentUserRole = req.user!.role;

      const {
        doorId,
        userId,
        success,
        action,
        method,
        startDate,
        endDate,
      } = req.query;

      // SECURITY: CUSTOMER and TRAINER can only export their own logs
      let effectiveUserId = userId as string;
      if (currentUserRole === 'CUSTOMER' || currentUserRole === 'TRAINER') {
        effectiveUserId = currentUserId; // Force filter to only export their own logs
      }

      const csv = await accessLogService.exportAccessLogs(tenantId, {
        doorId: doorId as string,
        userId: effectiveUserId,
        success: success === 'true' ? true : success === 'false' ? false : undefined,
        action: action as string,
        method: method as string,
        startDate: startDate && String(startDate).trim() ? new Date(startDate as string) : undefined,
        endDate: endDate && String(endDate).trim() ? new Date(endDate as string) : undefined,
      });

      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=access-logs-${new Date().toISOString()}.csv`
      );

      res.send(csv);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to export access logs',
      });
    }
  }

  /**
   * GET /api/access-logs/stats
   * Get access log statistics
   */
  async getAccessLogStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { startDate, endDate } = req.query;

      console.log('[getAccessLogStats] Query params:', { startDate, endDate, startDateType: typeof startDate, endDateType: typeof endDate });

      const parsedStartDate = startDate && String(startDate).trim() ? new Date(startDate as string) : undefined;
      const parsedEndDate = endDate && String(endDate).trim() ? new Date(endDate as string) : undefined;

      console.log('[getAccessLogStats] Parsed dates:', { parsedStartDate, parsedEndDate });

      const stats = await accessLogService.getAccessLogStats(
        tenantId,
        parsedStartDate,
        parsedEndDate
      );

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('[getAccessLogStats] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get access log statistics',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * GET /api/access-logs/suspicious
   * Get suspicious activity
   */
  async getSuspiciousActivity(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { timeWindow, threshold } = req.query;

      const activity = await accessLogService.getSuspiciousActivity(
        tenantId,
        timeWindow ? parseInt(timeWindow as string) : undefined,
        threshold ? parseInt(threshold as string) : undefined
      );

      res.json({
        success: true,
        data: activity,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get suspicious activity',
      });
    }
  }

  /**
   * GET /api/doors/:doorId/stats
   * Get access statistics for a specific door
   */
  async getDoorAccessStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { doorId } = req.params;
      const tenantId = req.tenantId!;
      const { startDate, endDate } = req.query;

      const stats = await accessControlService.getDoorAccessStats(
        doorId,
        tenantId,
        startDate && String(startDate).trim() ? new Date(startDate as string) : undefined,
        endDate && String(endDate).trim() ? new Date(endDate as string) : undefined
      );

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get door access statistics',
      });
    }
  }

  /**
   * GET /api/doors/my-access
   * Get all doors accessible by the current user
   */
  async getMyAccessibleDoors(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;

      const doors = await accessControlService.getUserAccessibleDoors(userId, tenantId);

      res.json({
        success: true,
        data: doors,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get accessible doors',
      });
    }
  }

  /**
   * GET /api/doors/:doorId/status
   * Get door status and information
   */
  async getDoorStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { doorId } = req.params;
      const tenantId = req.tenantId!;

      const door = await accessControlService.getDoorStatus(doorId, tenantId);

      if (!door) {
        throw new AppError('Door not found', 404);
      }

      res.json({
        success: true,
        data: door,
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to get door status',
        });
      }
    }
  }
}
