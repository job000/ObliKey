import { prisma } from '../utils/prisma';
import { DoorStatus, AccessResult } from '@prisma/client';

export interface CreateDoorDto {
  name: string;
  description?: string;
  location?: string;
  integrationId?: string;
  hardwareId?: string;
  ipAddress?: string;
  requiresCredential?: boolean;
  allowManualOverride?: boolean;
  alarmEnabled?: boolean;
  unlockDuration?: number;
  openTooLongAlert?: number;
}

export interface UpdateDoorDto {
  name?: string;
  description?: string;
  location?: string;
  status?: DoorStatus;
  integrationId?: string;
  hardwareId?: string;
  ipAddress?: string;
  requiresCredential?: boolean;
  allowManualOverride?: boolean;
  alarmEnabled?: boolean;
  unlockDuration?: number;
  openTooLongAlert?: number;
  isOnline?: boolean;
}

export class DoorService {
  // Get all doors for a tenant
  async getDoors(tenantId: string, activeOnly: boolean = true) {
    const where: any = { tenantId };
    if (activeOnly) {
      where.status = { in: [DoorStatus.ACTIVE, DoorStatus.INACTIVE] };
    }

    const doors = await prisma.door.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        location: true,
        status: true,
        integrationId: true,
        hardwareId: true,
        ipAddress: true,
        isOnline: true,
        isLocked: true,
        lastOnline: true,
        requiresCredential: true,
        allowManualOverride: true,
        alarmEnabled: true,
        unlockDuration: true,
        openTooLongAlert: true,
        batteryLevel: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    return doors;
  }

  // Get a single door by ID
  async getDoorById(doorId: string, tenantId: string) {
    const door = await prisma.door.findFirst({
      where: { id: doorId, tenantId },
      select: {
        id: true,
        name: true,
        description: true,
        location: true,
        status: true,
        integrationId: true,
        hardwareId: true,
        ipAddress: true,
        requiresCredential: true,
        allowManualOverride: true,
        alarmEnabled: true,
        isOnline: true,
        isLocked: true,
        lastOnline: true,
        batteryLevel: true,
        unlockDuration: true,
        openTooLongAlert: true,
        sortOrder: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            accessLogs: true,
            accessRules: true,
            schedules: true,
          },
        },
      },
    });

    return door;
  }

  // Create a new door
  async createDoor(tenantId: string, data: CreateDoorDto) {
    const door = await prisma.door.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        location: data.location,
        integrationId: data.integrationId,
        hardwareId: data.hardwareId,
        ipAddress: data.ipAddress,
        requiresCredential: data.requiresCredential ?? true,
        allowManualOverride: data.allowManualOverride ?? false,
        alarmEnabled: data.alarmEnabled ?? false,
        unlockDuration: data.unlockDuration || 5,
        openTooLongAlert: data.openTooLongAlert || 30,
      },
      select: {
        id: true,
        name: true,
        description: true,
        location: true,
        status: true,
        integrationId: true,
        hardwareId: true,
        ipAddress: true,
        requiresCredential: true,
        allowManualOverride: true,
        alarmEnabled: true,
        isOnline: true,
        isLocked: true,
        unlockDuration: true,
        openTooLongAlert: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return door;
  }

  // Update a door
  async updateDoor(doorId: string, tenantId: string, data: UpdateDoorDto) {
    // First verify the door exists and belongs to tenant
    const existingDoor = await prisma.door.findFirst({
      where: { id: doorId, tenantId },
    });

    if (!existingDoor) {
      throw new Error('Door not found');
    }

    const door = await prisma.door.update({
      where: { id: doorId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.integrationId !== undefined && { integrationId: data.integrationId }),
        ...(data.hardwareId !== undefined && { hardwareId: data.hardwareId }),
        ...(data.ipAddress !== undefined && { ipAddress: data.ipAddress }),
        ...(data.requiresCredential !== undefined && { requiresCredential: data.requiresCredential }),
        ...(data.allowManualOverride !== undefined && { allowManualOverride: data.allowManualOverride }),
        ...(data.alarmEnabled !== undefined && { alarmEnabled: data.alarmEnabled }),
        ...(data.unlockDuration !== undefined && { unlockDuration: data.unlockDuration }),
        ...(data.openTooLongAlert !== undefined && { openTooLongAlert: data.openTooLongAlert }),
        ...(data.isOnline !== undefined && { isOnline: data.isOnline }),
      },
      select: {
        id: true,
        name: true,
        description: true,
        location: true,
        status: true,
        integrationId: true,
        hardwareId: true,
        ipAddress: true,
        requiresCredential: true,
        allowManualOverride: true,
        alarmEnabled: true,
        isOnline: true,
        isLocked: true,
        unlockDuration: true,
        openTooLongAlert: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return door;
  }

  // Delete a door
  async deleteDoor(doorId: string, tenantId: string) {
    // First verify the door exists and belongs to tenant
    const existingDoor = await prisma.door.findFirst({
      where: { id: doorId, tenantId },
    });

    if (!existingDoor) {
      throw new Error('Door not found');
    }

    // Delete the door (cascading will handle related records)
    await prisma.door.delete({
      where: { id: doorId },
    });

    return { success: true };
  }

  // Test hardware connection
  async testConnection(doorId: string, tenantId: string) {
    const door = await prisma.door.findFirst({
      where: { id: doorId, tenantId },
    });

    if (!door) {
      throw new Error('Door not found');
    }

    // TODO: Implement actual hardware connection test
    // For now, we'll simulate a test
    const isConnected = Math.random() > 0.2; // 80% success rate for demo

    // Update door status based on test
    await prisma.door.update({
      where: { id: doorId },
      data: {
        isOnline: isConnected,
        lastOnline: isConnected ? new Date() : undefined,
        status: isConnected ? door.status : DoorStatus.ERROR,
      },
    });

    // Log the test attempt
    await prisma.doorAccessLog.create({
      data: {
        tenantId,
        doorId,
        result: isConnected ? AccessResult.GRANTED : AccessResult.ERROR,
        accessMethod: 'API',
        denialReason: isConnected ? null : 'Connection test failed',
      },
    });

    return {
      success: isConnected,
      message: isConnected ? 'Connection successful' : 'Connection failed',
      timestamp: new Date(),
    };
  }

  // Manual unlock
  async unlockDoor(doorId: string, tenantId: string, userId: string) {
    const door = await prisma.door.findFirst({
      where: { id: doorId, tenantId },
    });

    if (!door) {
      throw new Error('Door not found');
    }

    if (door.status === DoorStatus.MAINTENANCE || door.status === DoorStatus.ERROR) {
      throw new Error('Door is not available');
    }

    // Check if user has access to this door
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        membership: true,
      },
    });

    if (!user) {
      await prisma.doorAccessLog.create({
        data: {
          tenantId,
          doorId,
          userId,
          result: AccessResult.DENIED,
          accessMethod: 'MANUAL',
          denialReason: 'User not found',
        },
      });
      throw new Error('User not found');
    }

    // ADMIN and SUPER_ADMIN always have access
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';

    if (!isAdmin) {
      // Check access rules for non-admin users
      const accessRules = await prisma.doorAccessRule.findMany({
        where: {
          doorId,
          tenantId,
          active: true,
        },
        orderBy: {
          priority: 'desc',
        },
      });

      let hasAccess = false;

      for (const rule of accessRules) {
        // Check if rule is within validity period
        const now = new Date();
        if (rule.validFrom && now < rule.validFrom) continue;
        if (rule.validUntil && now > rule.validUntil) continue;

        // Check role-based access
        if (rule.allowedRoles.length > 0 && rule.allowedRoles.includes(user.role)) {
          hasAccess = true;
          break;
        }

        // Check user ID-based access
        if (rule.allowedUserIds.length > 0 && rule.allowedUserIds.includes(userId)) {
          hasAccess = true;
          break;
        }

        // Check membership status-based access
        if (rule.allowedMembershipStatuses.length > 0 && user.membership) {
          if (rule.allowedMembershipStatuses.includes(user.membership.status)) {
            hasAccess = true;
            break;
          }
        }
      }

      if (!hasAccess) {
        await prisma.doorAccessLog.create({
          data: {
            tenantId,
            doorId,
            userId,
            result: AccessResult.DENIED,
            accessMethod: 'MANUAL',
            denialReason: 'No access rule grants permission',
          },
        });
        throw new Error('Access denied - you do not have permission to unlock this door');
      }
    }

    // TODO: Send unlock command to actual hardware
    // For now, we'll simulate the unlock
    const success = door.isOnline;

    // Update door state to unlocked if successful
    if (success) {
      await prisma.door.update({
        where: { id: doorId },
        data: { isLocked: false },
      });
    }

    // Log the unlock attempt
    await prisma.doorAccessLog.create({
      data: {
        tenantId,
        doorId,
        userId,
        result: success ? AccessResult.GRANTED : AccessResult.ERROR,
        accessMethod: 'MANUAL',
        denialReason: success ? null : 'Door offline',
      },
    });

    return {
      success,
      message: success ? 'Door unlocked successfully' : 'Failed to unlock door - door is offline',
      timestamp: new Date(),
    };
  }

  // Manual lock
  async lockDoor(doorId: string, tenantId: string, userId: string) {
    const door = await prisma.door.findFirst({
      where: { id: doorId, tenantId },
    });

    if (!door) {
      throw new Error('Door not found');
    }

    if (door.status === DoorStatus.MAINTENANCE || door.status === DoorStatus.ERROR) {
      throw new Error('Door is not available');
    }

    // Check if user has access to this door
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        membership: true,
      },
    });

    if (!user) {
      await prisma.doorAccessLog.create({
        data: {
          tenantId,
          doorId,
          userId,
          result: AccessResult.DENIED,
          accessMethod: 'MANUAL',
          denialReason: 'User not found',
        },
      });
      throw new Error('User not found');
    }

    // ADMIN and SUPER_ADMIN always have access
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';

    if (!isAdmin) {
      // Check access rules for non-admin users
      const accessRules = await prisma.doorAccessRule.findMany({
        where: {
          doorId,
          tenantId,
          active: true,
        },
        orderBy: {
          priority: 'desc',
        },
      });

      let hasAccess = false;

      for (const rule of accessRules) {
        // Check if rule is within validity period
        const now = new Date();
        if (rule.validFrom && now < rule.validFrom) continue;
        if (rule.validUntil && now > rule.validUntil) continue;

        // Check role-based access
        if (rule.allowedRoles.length > 0 && rule.allowedRoles.includes(user.role)) {
          hasAccess = true;
          break;
        }

        // Check user ID-based access
        if (rule.allowedUserIds.length > 0 && rule.allowedUserIds.includes(userId)) {
          hasAccess = true;
          break;
        }

        // Check membership status-based access
        if (rule.allowedMembershipStatuses.length > 0 && user.membership) {
          if (rule.allowedMembershipStatuses.includes(user.membership.status)) {
            hasAccess = true;
            break;
          }
        }
      }

      if (!hasAccess) {
        await prisma.doorAccessLog.create({
          data: {
            tenantId,
            doorId,
            userId,
            result: AccessResult.DENIED,
            accessMethod: 'MANUAL',
            denialReason: 'No access rule grants permission',
          },
        });
        throw new Error('Access denied - you do not have permission to lock this door');
      }
    }

    // TODO: Send lock command to actual hardware
    // For now, we'll simulate the lock
    const success = door.isOnline;

    // Update door state to locked if successful
    if (success) {
      await prisma.door.update({
        where: { id: doorId },
        data: { isLocked: true },
      });
    }

    // Log the lock attempt
    await prisma.doorAccessLog.create({
      data: {
        tenantId,
        doorId,
        userId,
        result: success ? AccessResult.GRANTED : AccessResult.ERROR,
        accessMethod: 'MANUAL',
        denialReason: success ? null : 'Door offline',
      },
    });

    return {
      success,
      message: success ? 'Door locked successfully' : 'Failed to lock door - door is offline',
      timestamp: new Date(),
    };
  }

  // Get door status
  async getDoorStatus(doorId: string, tenantId: string) {
    const door = await prisma.door.findFirst({
      where: { id: doorId, tenantId },
      select: {
        id: true,
        name: true,
        status: true,
        isOnline: true,
        isLocked: true,
        lastOnline: true,
        batteryLevel: true,
      },
    });

    if (!door) {
      throw new Error('Door not found');
    }

    return {
      id: door.id,
      name: door.name,
      status: door.status,
      isOnline: door.isOnline,
      isLocked: door.isLocked,
      lastOnline: door.lastOnline,
      batteryLevel: door.batteryLevel,
      timestamp: new Date(),
    };
  }

  // Get access logs for a door
  async getDoorAccessLogs(doorId: string, tenantId: string, limit: number = 50) {
    // Verify door belongs to tenant
    const door = await prisma.door.findFirst({
      where: { id: doorId, tenantId },
    });

    if (!door) {
      throw new Error('Door not found');
    }

    const logs = await prisma.doorAccessLog.findMany({
      where: { doorId, tenantId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      select: {
        id: true,
        result: true,
        accessMethod: true,
        credentialId: true,
        denialReason: true,
        userId: true,
        membershipId: true,
        ipAddress: true,
        timestamp: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return logs;
  }

  // Set door as main entrance with automatic access
  async setMainEntrance(doorId: string, tenantId: string, isMainEntrance: boolean) {
    // Verify door belongs to tenant
    const door = await prisma.door.findFirst({
      where: { id: doorId, tenantId },
      include: {
        accessRules: {
          where: {
            type: 'MEMBERSHIP',
            name: 'Automatic Access - Active Members',
          },
        },
      },
    });

    if (!door) {
      throw new Error('Door not found');
    }

    // Update door metadata
    const currentMetadata = (door.metadata as any) || {};
    const updatedDoor = await prisma.door.update({
      where: { id: doorId },
      data: {
        metadata: {
          ...currentMetadata,
          isMainEntrance,
        },
      },
      select: {
        id: true,
        name: true,
        metadata: true,
      },
    });

    // Handle access rule
    if (isMainEntrance) {
      // Check if auto-access rule already exists
      const existingRule = door.accessRules.find(
        (rule) => rule.type === 'MEMBERSHIP' && rule.name === 'Automatic Access - Active Members'
      );

      if (!existingRule) {
        // Create membership access rule for active members
        await prisma.doorAccessRule.create({
          data: {
            tenantId,
            doorId,
            name: 'Automatic Access - Active Members',
            description: 'Automatically grants access to all active members. This is a system-created rule for main entrance access.',
            type: 'MEMBERSHIP',
            priority: 10, // Lower priority than manual user-specific rules (0-9)
            active: true,
            allowedMembershipStatuses: ['ACTIVE'],
            allowedRoles: [],
            allowedUserIds: [],
          },
        });
      } else if (!existingRule.active) {
        // Reactivate existing rule
        await prisma.doorAccessRule.update({
          where: { id: existingRule.id },
          data: { active: true },
        });
      }
    } else {
      // Deactivate auto-access rule if it exists
      const existingRule = door.accessRules.find(
        (rule) => rule.type === 'MEMBERSHIP' && rule.name === 'Automatic Access - Active Members'
      );

      if (existingRule && existingRule.active) {
        await prisma.doorAccessRule.update({
          where: { id: existingRule.id },
          data: { active: false },
        });
      }
    }

    return {
      door: updatedDoor,
      isMainEntrance,
      message: isMainEntrance
        ? 'Door marked as main entrance. All active members now have automatic access.'
        : 'Door unmarked as main entrance. Automatic access has been removed.',
    };
  }
}
