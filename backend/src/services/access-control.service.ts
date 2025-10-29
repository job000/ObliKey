import { PrismaClient, UserRole, MembershipStatus, DoorType } from '@prisma/client';

const prisma = new PrismaClient();

export interface AccessEvaluationResult {
  granted: boolean;
  reason: string;
  metadata?: Record<string, any>;
  ruleId?: string;
  evaluationSteps: string[];
}

export interface TimeSlot {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
}

export class AccessControlService {
  /**
   * Main access evaluation algorithm
   * Evaluates whether a user should be granted access to a door
   *
   * Algorithm Steps:
   * 1. Verify door exists and is active
   * 2. Verify user exists and is active
   * 3. Check if user has active membership (if required)
   * 4. Evaluate access rules (role-based and user-specific)
   * 5. Check time-based restrictions
   * 6. Return final decision with reasoning
   */
  async evaluateAccess(
    doorId: string,
    userId: string,
    tenantId: string
  ): Promise<AccessEvaluationResult> {
    const evaluationSteps: string[] = [];

    try {
      // Step 1: Verify door exists and is active
      evaluationSteps.push('Checking door status');
      const door = await prisma.door.findFirst({
        where: { id: doorId, tenantId, active: true },
      });

      if (!door) {
        return {
          granted: false,
          reason: 'Door not found or inactive',
          evaluationSteps,
        };
      }

      evaluationSteps.push(`Door found: ${door.name}`);

      // Step 2: Verify user exists and is active
      evaluationSteps.push('Verifying user account');
      const user = await prisma.user.findFirst({
        where: { id: userId, tenantId, active: true },
      });

      if (!user) {
        return {
          granted: false,
          reason: 'User not found or inactive',
          evaluationSteps,
        };
      }

      evaluationSteps.push(`User verified: ${user.firstName} ${user.lastName} (${user.role})`);

      // Step 3: Admin and Super Admin have automatic access
      if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
        evaluationSteps.push('Admin/Super Admin - automatic access granted');
        return {
          granted: true,
          reason: 'Admin/Super Admin automatic access',
          evaluationSteps,
          metadata: {
            accessType: 'admin',
            role: user.role,
          },
        };
      }

      // Step 4: Check for active membership (for context, not requirement)
      evaluationSteps.push('Checking membership status');
      const activeMembership = await this.checkActiveMembership(userId, tenantId);

      if (activeMembership) {
        evaluationSteps.push('Active membership found');
      } else {
        evaluationSteps.push('No active membership - will check for explicit access rules');
      }

      // Step 5: For TRAINER role, check if they are active
      if (user.role === 'TRAINER') {
        evaluationSteps.push('Trainer role verified');
      }

      // Step 6: Evaluate access rules (CRITICAL - checked before membership requirement)
      evaluationSteps.push('Evaluating access rules');
      const accessRules = await prisma.doorAccessRule.findMany({
        where: {
          doorId,
          active: true,
          OR: [
            { validFrom: null, validUntil: null },
            { validFrom: { lte: new Date() }, validUntil: null },
            { validFrom: null, validUntil: { gte: new Date() } },
            {
              AND: [
                { validFrom: { lte: new Date() } },
                { validUntil: { gte: new Date() } }
              ]
            },
          ],
        },
        orderBy: {
          priority: 'asc', // Lower priority number = higher priority
        },
      });

      if (accessRules.length === 0) {
        evaluationSteps.push('No access rules defined - denying by default');
        return {
          granted: false,
          reason: 'No access rules configured for this door',
          evaluationSteps,
        };
      }

      // Step 7: Check rule-based access (user-specific rules take precedence)
      for (const rule of accessRules) {
        evaluationSteps.push(`Evaluating rule: ${rule.name} (priority: ${rule.priority})`);

        // Check user-specific access (HIGHEST PRIORITY - bypasses membership requirement)
        if (rule.allowedUserIds && rule.allowedUserIds.includes(userId)) {
          evaluationSteps.push('User found in explicit user list - admin granted access');

          // Check time-based restrictions
          const timeCheck = this.checkTimeRestrictions(rule.timeSlots as any);
          if (!timeCheck.allowed) {
            evaluationSteps.push(`Time restriction failed: ${timeCheck.reason}`);
            continue;
          }

          evaluationSteps.push('Time restrictions passed - ACCESS GRANTED via admin rule');
          return {
            granted: true,
            reason: 'Access granted via admin-defined user-specific rule (membership not required)',
            ruleId: rule.id,
            evaluationSteps,
            metadata: {
              ruleName: rule.name,
              accessType: 'user-specific',
              membershipRequired: false,
            },
          };
        }

        // Check role-based access (requires active membership for CUSTOMER role)
        if (rule.allowedRoles && rule.allowedRoles.includes(user.role)) {
          evaluationSteps.push(`User role (${user.role}) matches rule`);

          // For CUSTOMER role with role-based rules, require membership
          if (user.role === 'CUSTOMER' && !activeMembership) {
            evaluationSteps.push('Role-based rule requires active membership for CUSTOMER role - denied');
            continue;
          }

          // Check time-based restrictions
          const timeCheck = this.checkTimeRestrictions(rule.timeSlots as any);
          if (!timeCheck.allowed) {
            evaluationSteps.push(`Time restriction failed: ${timeCheck.reason}`);
            continue;
          }

          evaluationSteps.push('Time restrictions passed - ACCESS GRANTED via role');
          return {
            granted: true,
            reason: 'Access granted via role-based rule',
            ruleId: rule.id,
            evaluationSteps,
            metadata: {
              ruleName: rule.name,
              accessType: 'role-based',
              role: user.role,
            },
          };
        }

        // Check membership-based access rules
        if (rule.allowedMembershipStatuses && rule.allowedMembershipStatuses.length > 0) {
          if (activeMembership) {
            evaluationSteps.push('User has active membership - checking if it matches rule');

            const timeCheck = this.checkTimeRestrictions(rule.timeSlots as any);
            if (!timeCheck.allowed) {
              evaluationSteps.push(`Time restriction failed: ${timeCheck.reason}`);
              continue;
            }

            evaluationSteps.push('Membership-based rule matched - ACCESS GRANTED');
            return {
              granted: true,
              reason: 'Access granted via membership-based rule',
              ruleId: rule.id,
              evaluationSteps,
              metadata: {
                ruleName: rule.name,
                accessType: 'membership-based',
              },
            };
          } else {
            evaluationSteps.push('Rule requires membership but user has none - skipping');
          }
        }
      }

      // No matching rules found
      evaluationSteps.push('No matching access rules found for this user');

      if (user.role === 'CUSTOMER' && !activeMembership) {
        return {
          granted: false,
          reason: 'No active membership and no admin-granted access rules match',
          evaluationSteps,
        };
      }

      return {
        granted: false,
        reason: 'User does not match any access rules',
        evaluationSteps,
      };

    } catch (error) {
      evaluationSteps.push(`Error during evaluation: ${error}`);
      return {
        granted: false,
        reason: 'Error evaluating access',
        evaluationSteps,
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Check if user has an active membership
   */
  private async checkActiveMembership(userId: string, tenantId: string): Promise<boolean> {
    const membership = await prisma.membership.findFirst({
      where: {
        userId,
        tenantId,
        status: MembershipStatus.ACTIVE,
        OR: [
          { endDate: null },
          { endDate: { gte: new Date() } },
        ],
      },
    });

    return !!membership;
  }

  /**
   * Check time-based restrictions
   * Returns whether access is allowed at the current time
   */
  private checkTimeRestrictions(timeSlots: TimeSlot[] | null): { allowed: boolean; reason?: string } {
    // If no time restrictions, allow access
    if (!timeSlots || !Array.isArray(timeSlots) || timeSlots.length === 0) {
      return { allowed: true };
    }

    const now = new Date();
    const currentDay = now.getDay(); // 0-6 (Sunday-Saturday)
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Check if current time matches any time slot
    for (const slot of timeSlots) {
      if (slot.dayOfWeek === currentDay) {
        if (currentTime >= slot.startTime && currentTime <= slot.endTime) {
          return { allowed: true };
        }
      }
    }

    return {
      allowed: false,
      reason: 'Current time does not match any allowed time slots'
    };
  }

  /**
   * Get all doors accessible by a user
   */
  async getUserAccessibleDoors(userId: string, tenantId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId, active: true },
    });

    if (!user) {
      return [];
    }

    // Get user's active membership if they have one
    const activeMembership = await prisma.membership.findFirst({
      where: {
        userId,
        tenantId,
        status: 'ACTIVE',
      },
    });

    // Get all active doors for the tenant
    const doors = await prisma.door.findMany({
      where: { tenantId, status: 'ACTIVE' },
      include: {
        accessRules: {
          where: { active: true },
        },
      },
    });

    // Filter doors based on access rules
    const accessibleDoors = [];
    for (const door of doors) {
      for (const rule of door.accessRules) {
        let hasAccess = false;

        // Check USER_SPECIFIC access (via userIds)
        if (rule.allowedUserIds && rule.allowedUserIds.includes(userId)) {
          hasAccess = true;
        }

        // Check ROLE access
        if (!hasAccess && rule.allowedRoles && rule.allowedRoles.includes(user.role)) {
          hasAccess = true;
        }

        // Check MEMBERSHIP access
        if (!hasAccess && rule.allowedMembershipStatuses && rule.allowedMembershipStatuses.length > 0) {
          // User must have an active membership with matching status
          if (activeMembership && rule.allowedMembershipStatuses.includes(activeMembership.status)) {
            hasAccess = true;
          }
        }

        if (hasAccess) {
          // Check date validity
          const now = new Date();
          const startValid = !rule.validFrom || rule.validFrom <= now;
          const endValid = !rule.validUntil || rule.validUntil >= now;

          if (startValid && endValid) {
            accessibleDoors.push({
              ...door,
              accessRule: {
                id: rule.id,
                name: rule.name,
                description: rule.description,
              },
            });
            break; // User has access, no need to check more rules for this door
          }
        }
      }
    }

    return accessibleDoors;
  }

  /**
   * Check if a specific user can access a specific door (quick check)
   */
  async canUserAccessDoor(userId: string, doorId: string, tenantId: string): Promise<boolean> {
    const result = await this.evaluateAccess(doorId, userId, tenantId);
    return result.granted;
  }

  /**
   * Get door status and information
   */
  async getDoorStatus(doorId: string, tenantId: string) {
    return await prisma.door.findFirst({
      where: { id: doorId, tenantId },
      include: {
        accessRules: {
          where: { active: true },
          select: {
            id: true,
            name: true,
            description: true,
            roleAccess: true,
            timeSlots: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    });
  }

  /**
   * Update door status
   */
  async updateDoorStatus(doorId: string, tenantId: string, status: any) {
    return await prisma.door.update({
      where: { id: doorId },
      data: {
        status,
        lastStatusUpdate: new Date(),
      },
    });
  }

  /**
   * Unlock door (triggers hardware controller)
   */
  async unlockDoor(doorId: string, tenantId: string, userId: string): Promise<{ success: boolean; message: string }> {
    // First evaluate access
    const accessResult = await this.evaluateAccess(doorId, userId, tenantId);

    if (!accessResult.granted) {
      return {
        success: false,
        message: accessResult.reason,
      };
    }

    // In a real implementation, this would communicate with the hardware controller
    // For now, we'll just update the door status
    try {
      await prisma.door.update({
        where: { id: doorId },
        data: {
          status: 'UNLOCKED',
          lastStatusUpdate: new Date(),
        },
      });

      // Auto-lock after configured delay (this would be handled by hardware)
      // In production, you'd send a command to the door controller

      return {
        success: true,
        message: 'Door unlocked successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to unlock door',
      };
    }
  }

  /**
   * Get access statistics for a door
   */
  async getDoorAccessStats(doorId: string, tenantId: string, startDate?: Date, endDate?: Date) {
    const where: any = {
      doorId,
      door: { tenantId },
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [totalAttempts, successfulAccess, deniedAccess, uniqueUsers] = await Promise.all([
      prisma.doorAccessLog.count({ where }),
      prisma.doorAccessLog.count({ where: { ...where, success: true } }),
      prisma.doorAccessLog.count({ where: { ...where, success: false } }),
      prisma.doorAccessLog.findMany({
        where,
        distinct: ['userId'],
        select: { userId: true },
      }),
    ]);

    return {
      totalAttempts,
      successfulAccess,
      deniedAccess,
      uniqueUsers: uniqueUsers.filter(u => u.userId).length,
      successRate: totalAttempts > 0 ? (successfulAccess / totalAttempts) * 100 : 0,
    };
  }
}

export default new AccessControlService();
