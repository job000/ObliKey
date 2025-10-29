import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

export class DoorAccessRuleController {
  /**
   * GET /api/doors/:doorId/access-rules
   * List all access rules for a door
   */
  async listAccessRules(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { doorId } = req.params;
      const tenantId = req.tenantId!;
      const { active } = req.query;

      // Verify door exists and belongs to tenant
      const door = await prisma.door.findFirst({
        where: { id: doorId, tenantId },
      });

      if (!door) {
        throw new AppError('Door not found', 404);
      }

      // Get access rules
      const where: any = { doorId };
      if (active !== undefined) {
        where.active = active === 'true';
      }

      const rules = await prisma.doorAccessRule.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Get user details for rules that have specific users
      const allUserIds = rules.flatMap(rule => rule.allowedUserIds || []);
      const uniqueUserIds = [...new Set(allUserIds)];

      const users = await prisma.user.findMany({
        where: {
          id: { in: uniqueUserIds },
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

      // Enrich rules with user data
      const enrichedRules = rules.map(rule => ({
        ...rule,
        users: (rule.allowedUserIds || []).map(id => userMap.get(id)).filter(Boolean),
      }));

      res.json({
        success: true,
        data: enrichedRules,
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
          error: 'Failed to list access rules',
        });
      }
    }
  }

  /**
   * POST /api/doors/:doorId/access-rules
   * Create a new access rule for a door
   */
  async createAccessRule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { doorId } = req.params;
      const tenantId = req.tenantId!;
      const {
        name,
        description,
        allowedUserIds,
        allowedRoles,
        allowedMembershipStatuses,
        type,
        priority,
        validFrom,
        validUntil,
        active,
      } = req.body;

      // Validate required fields
      if (!name) {
        throw new AppError('Rule name is required', 400);
      }

      if (!type) {
        throw new AppError('Rule type is required', 400);
      }

      if (!allowedUserIds && !allowedRoles && !allowedMembershipStatuses) {
        throw new AppError('At least one access criteria must be specified (allowedUserIds, allowedRoles, or allowedMembershipStatuses)', 400);
      }

      // Verify door exists and belongs to tenant
      const door = await prisma.door.findFirst({
        where: { id: doorId, tenantId },
      });

      if (!door) {
        throw new AppError('Door not found', 404);
      }

      // Verify all allowedUserIds exist and belong to tenant
      if (allowedUserIds && allowedUserIds.length > 0) {
        const users = await prisma.user.findMany({
          where: {
            id: { in: allowedUserIds },
            tenantId,
          },
        });

        if (users.length !== allowedUserIds.length) {
          throw new AppError('One or more users not found', 400);
        }
      }

      // Create access rule
      const rule = await prisma.doorAccessRule.create({
        data: {
          tenantId,
          doorId,
          name,
          description,
          type,
          priority: priority || 0,
          allowedUserIds: allowedUserIds || [],
          allowedRoles: allowedRoles || [],
          allowedMembershipStatuses: allowedMembershipStatuses || [],
          validFrom: validFrom ? new Date(validFrom) : null,
          validUntil: validUntil ? new Date(validUntil) : null,
          active: active !== undefined ? active : true,
        },
      });

      res.status(201).json({
        success: true,
        data: rule,
        message: 'Access rule created successfully',
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
          error: 'Failed to create access rule',
        });
      }
    }
  }

  /**
   * GET /api/access-rules/:ruleId
   * Get a specific access rule
   */
  async getAccessRule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { ruleId } = req.params;
      const tenantId = req.tenantId!;

      const rule = await prisma.doorAccessRule.findFirst({
        where: {
          id: ruleId,
          door: { tenantId },
        },
        include: {
          door: {
            select: {
              id: true,
              name: true,
              type: true,
              location: true,
            },
          },
        },
      });

      if (!rule) {
        throw new AppError('Access rule not found', 404);
      }

      // Get user details
      const users = await prisma.user.findMany({
        where: {
          id: { in: rule.allowedUserIds || [] },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      });

      res.json({
        success: true,
        data: {
          ...rule,
          users,
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
          error: 'Failed to get access rule',
        });
      }
    }
  }

  /**
   * PUT /api/access-rules/:ruleId
   * Update an access rule
   */
  async updateAccessRule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { ruleId } = req.params;
      const tenantId = req.tenantId!;
      const {
        name,
        description,
        allowedUserIds,
        allowedRoles,
        allowedMembershipStatuses,
        type,
        priority,
        validFrom,
        validUntil,
        active,
      } = req.body;

      // Verify rule exists and belongs to tenant
      const existingRule = await prisma.doorAccessRule.findFirst({
        where: {
          id: ruleId,
          door: { tenantId },
        },
      });

      if (!existingRule) {
        throw new AppError('Access rule not found', 404);
      }

      // Verify all allowedUserIds exist and belong to tenant if provided
      if (allowedUserIds && allowedUserIds.length > 0) {
        const users = await prisma.user.findMany({
          where: {
            id: { in: allowedUserIds },
            tenantId,
          },
        });

        if (users.length !== allowedUserIds.length) {
          throw new AppError('One or more users not found', 400);
        }
      }

      // Build update data
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (allowedUserIds !== undefined) updateData.allowedUserIds = allowedUserIds;
      if (allowedRoles !== undefined) updateData.allowedRoles = allowedRoles;
      if (allowedMembershipStatuses !== undefined) updateData.allowedMembershipStatuses = allowedMembershipStatuses;
      if (type !== undefined) updateData.type = type;
      if (priority !== undefined) updateData.priority = priority;
      if (validFrom !== undefined) updateData.validFrom = validFrom ? new Date(validFrom) : null;
      if (validUntil !== undefined) updateData.validUntil = validUntil ? new Date(validUntil) : null;
      if (active !== undefined) updateData.active = active;

      // Update rule
      const rule = await prisma.doorAccessRule.update({
        where: { id: ruleId },
        data: updateData,
      });

      res.json({
        success: true,
        data: rule,
        message: 'Access rule updated successfully',
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
          error: 'Failed to update access rule',
        });
      }
    }
  }

  /**
   * DELETE /api/access-rules/:ruleId
   * Delete an access rule
   */
  async deleteAccessRule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { ruleId } = req.params;
      const tenantId = req.tenantId!;

      // Verify rule exists and belongs to tenant
      const existingRule = await prisma.doorAccessRule.findFirst({
        where: {
          id: ruleId,
          door: { tenantId },
        },
      });

      if (!existingRule) {
        throw new AppError('Access rule not found', 404);
      }

      // Delete rule
      await prisma.doorAccessRule.delete({
        where: { id: ruleId },
      });

      res.json({
        success: true,
        message: 'Access rule deleted successfully',
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
          error: 'Failed to delete access rule',
        });
      }
    }
  }

  /**
   * PATCH /api/access-rules/:ruleId/toggle
   * Toggle active status of an access rule
   */
  async toggleAccessRule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { ruleId } = req.params;
      const tenantId = req.tenantId!;

      // Verify rule exists and belongs to tenant
      const existingRule = await prisma.doorAccessRule.findFirst({
        where: {
          id: ruleId,
          door: { tenantId },
        },
      });

      if (!existingRule) {
        throw new AppError('Access rule not found', 404);
      }

      // Toggle active status
      const rule = await prisma.doorAccessRule.update({
        where: { id: ruleId },
        data: {
          active: !existingRule.active,
        },
      });

      res.json({
        success: true,
        data: rule,
        message: `Access rule ${rule.active ? 'activated' : 'deactivated'} successfully`,
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
          error: 'Failed to toggle access rule',
        });
      }
    }
  }

  /**
   * POST /api/access-rules/:ruleId/add-users
   * Add users to an existing access rule
   */
  async addUsersToRule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { ruleId } = req.params;
      const tenantId = req.tenantId!;
      const { userIds } = req.body;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        throw new AppError('userIds array is required', 400);
      }

      // Verify rule exists and belongs to tenant
      const existingRule = await prisma.doorAccessRule.findFirst({
        where: {
          id: ruleId,
          door: { tenantId },
        },
      });

      if (!existingRule) {
        throw new AppError('Access rule not found', 404);
      }

      // Verify all userIds exist and belong to tenant
      const users = await prisma.user.findMany({
        where: {
          id: { in: userIds },
          tenantId,
        },
      });

      if (users.length !== userIds.length) {
        throw new AppError('One or more users not found', 400);
      }

      // Add users (avoiding duplicates)
      const updatedUserIds = [...new Set([...(existingRule.allowedUserIds || []), ...userIds])];

      const rule = await prisma.doorAccessRule.update({
        where: { id: ruleId },
        data: {
          allowedUserIds: updatedUserIds,
        },
      });

      res.json({
        success: true,
        data: rule,
        message: `Added ${userIds.length} user(s) to access rule`,
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
          error: 'Failed to add users to access rule',
        });
      }
    }
  }

  /**
   * POST /api/access-rules/:ruleId/remove-users
   * Remove users from an existing access rule
   */
  async removeUsersFromRule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { ruleId } = req.params;
      const tenantId = req.tenantId!;
      const { userIds } = req.body;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        throw new AppError('userIds array is required', 400);
      }

      // Verify rule exists and belongs to tenant
      const existingRule = await prisma.doorAccessRule.findFirst({
        where: {
          id: ruleId,
          door: { tenantId },
        },
      });

      if (!existingRule) {
        throw new AppError('Access rule not found', 404);
      }

      // Remove users
      const updatedUserIds = (existingRule.allowedUserIds || []).filter(id => !userIds.includes(id));

      const rule = await prisma.doorAccessRule.update({
        where: { id: ruleId },
        data: {
          allowedUserIds: updatedUserIds,
        },
      });

      res.json({
        success: true,
        data: rule,
        message: `Removed ${userIds.length} user(s) from access rule`,
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
          error: 'Failed to remove users from access rule',
        });
      }
    }
  }
}
