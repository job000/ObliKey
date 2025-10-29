import { Response } from 'express';
import { AuthRequest } from '../types';
import { DoorService } from '../services/door.service';
import { AppError } from '../middleware/errorHandler';

export class DoorController {
  private doorService: DoorService;

  constructor() {
    this.doorService = new DoorService();
  }

  // GET /api/doors - List all doors for tenant
  async getDoors(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const activeOnly = req.query.activeOnly !== 'false'; // Default to true

      const doors = await this.doorService.getDoors(tenantId, activeOnly);

      res.json({
        success: true,
        data: doors,
        count: doors.length,
      });
    } catch (error) {
      console.error('Get doors error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve doors',
      });
    }
  }

  // POST /api/doors - Create new door
  async createDoor(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const {
        name,
        description,
        location,
        integrationId,
        hardwareId,
        ipAddress,
        requiresCredential,
        allowManualOverride,
        alarmEnabled,
        unlockDuration,
        openTooLongAlert
      } = req.body;

      // Validation
      if (!name || !name.trim()) {
        throw new AppError('Door name is required', 400);
      }

      if (unlockDuration !== undefined && (typeof unlockDuration !== 'number' || unlockDuration < 0)) {
        throw new AppError('Unlock duration must be a positive number', 400);
      }

      if (openTooLongAlert !== undefined && (typeof openTooLongAlert !== 'number' || openTooLongAlert < 0)) {
        throw new AppError('Open too long alert must be a positive number', 400);
      }

      const door = await this.doorService.createDoor(tenantId, {
        name: name.trim(),
        description: description?.trim(),
        location: location?.trim(),
        integrationId: integrationId?.trim(),
        hardwareId: hardwareId?.trim(),
        ipAddress: ipAddress?.trim(),
        requiresCredential,
        allowManualOverride,
        alarmEnabled,
        unlockDuration,
        openTooLongAlert,
      });

      res.status(201).json({
        success: true,
        data: door,
        message: 'Door created successfully',
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      } else {
        console.error('Create door error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to create door',
        });
      }
    }
  }

  // GET /api/doors/:doorId - Get door details
  async getDoorById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { doorId } = req.params;

      const door = await this.doorService.getDoorById(doorId, tenantId);

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
        console.error('Get door error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve door',
        });
      }
    }
  }

  // PUT /api/doors/:doorId - Update door
  async updateDoor(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { doorId } = req.params;
      const {
        name,
        description,
        location,
        status,
        integrationId,
        hardwareId,
        ipAddress,
        requiresCredential,
        allowManualOverride,
        alarmEnabled,
        unlockDuration,
        openTooLongAlert,
        isOnline
      } = req.body;

      // Validation
      if (name !== undefined && (!name || !name.trim())) {
        throw new AppError('Door name cannot be empty', 400);
      }

      if (unlockDuration !== undefined && (typeof unlockDuration !== 'number' || unlockDuration < 0)) {
        throw new AppError('Unlock duration must be a positive number', 400);
      }

      if (openTooLongAlert !== undefined && (typeof openTooLongAlert !== 'number' || openTooLongAlert < 0)) {
        throw new AppError('Open too long alert must be a positive number', 400);
      }

      const door = await this.doorService.updateDoor(doorId, tenantId, {
        name: name?.trim(),
        description: description?.trim(),
        location: location?.trim(),
        status,
        integrationId: integrationId?.trim(),
        hardwareId: hardwareId?.trim(),
        ipAddress: ipAddress?.trim(),
        requiresCredential,
        allowManualOverride,
        alarmEnabled,
        unlockDuration,
        openTooLongAlert,
        isOnline,
      });

      res.json({
        success: true,
        data: door,
        message: 'Door updated successfully',
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      } else if (error instanceof Error && error.message === 'Door not found') {
        res.status(404).json({
          success: false,
          error: 'Door not found',
        });
      } else {
        console.error('Update door error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to update door',
        });
      }
    }
  }

  // DELETE /api/doors/:doorId - Delete door
  async deleteDoor(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { doorId } = req.params;

      await this.doorService.deleteDoor(doorId, tenantId);

      res.json({
        success: true,
        message: 'Door deleted successfully',
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Door not found') {
        res.status(404).json({
          success: false,
          error: 'Door not found',
        });
      } else {
        console.error('Delete door error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to delete door',
        });
      }
    }
  }

  // POST /api/doors/:doorId/test-connection - Test hardware connection
  async testConnection(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { doorId } = req.params;

      const result = await this.doorService.testConnection(doorId, tenantId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Door not found') {
        res.status(404).json({
          success: false,
          error: 'Door not found',
        });
      } else {
        console.error('Test connection error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to test connection',
        });
      }
    }
  }

  // POST /api/doors/:doorId/unlock - Manual unlock
  async unlockDoor(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const { doorId } = req.params;

      const result = await this.doorService.unlockDoor(doorId, tenantId, userId);

      res.json({
        success: result.success,
        data: result,
        message: result.message,
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      } else if (error instanceof Error && error.message === 'Door not found') {
        res.status(404).json({
          success: false,
          error: 'Door not found',
        });
      } else if (error instanceof Error && error.message === 'Door is not active') {
        res.status(400).json({
          success: false,
          error: 'Door is not active',
        });
      } else {
        console.error('Unlock door error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to unlock door',
        });
      }
    }
  }

  // POST /api/doors/:doorId/lock - Manual lock
  async lockDoor(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const { doorId } = req.params;

      const result = await this.doorService.lockDoor(doorId, tenantId, userId);

      res.json({
        success: result.success,
        data: result,
        message: result.message,
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      } else if (error instanceof Error && error.message === 'Door not found') {
        res.status(404).json({
          success: false,
          error: 'Door not found',
        });
      } else if (error instanceof Error && error.message === 'Door is not active') {
        res.status(400).json({
          success: false,
          error: 'Door is not active',
        });
      } else {
        console.error('Lock door error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to lock door',
        });
      }
    }
  }

  // GET /api/doors/:doorId/status - Get door status
  async getDoorStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { doorId } = req.params;

      const status = await this.doorService.getDoorStatus(doorId, tenantId);

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Door not found') {
        res.status(404).json({
          success: false,
          error: 'Door not found',
        });
      } else {
        console.error('Get door status error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve door status',
        });
      }
    }
  }

  // GET /api/doors/:doorId/logs - Get access logs
  async getDoorAccessLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { doorId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      if (limit < 1 || limit > 500) {
        throw new AppError('Limit must be between 1 and 500', 400);
      }

      const logs = await this.doorService.getDoorAccessLogs(doorId, tenantId, limit);

      res.json({
        success: true,
        data: logs,
        count: logs.length,
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      } else if (error instanceof Error && error.message === 'Door not found') {
        res.status(404).json({
          success: false,
          error: 'Door not found',
        });
      } else {
        console.error('Get access logs error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve access logs',
        });
      }
    }
  }

  // POST /api/doors/:doorId/set-main-entrance - Mark door as main entrance with auto-access
  async setMainEntrance(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { doorId } = req.params;
      const { isMainEntrance } = req.body;

      const result = await this.doorService.setMainEntrance(
        doorId,
        tenantId,
        isMainEntrance !== false // Default to true
      );

      res.json({
        success: true,
        data: result,
        message: isMainEntrance !== false
          ? 'Door marked as main entrance with automatic access for active members'
          : 'Door unmarked as main entrance',
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      } else if (error instanceof Error && error.message === 'Door not found') {
        res.status(404).json({
          success: false,
          error: 'Door not found',
        });
      } else {
        console.error('Set main entrance error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to set main entrance',
        });
      }
    }
  }
}
