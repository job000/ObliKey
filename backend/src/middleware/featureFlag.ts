import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../utils/prisma';
import { AppError } from './errorHandler';

/**
 * Middleware to check if a feature is enabled for the tenant
 */
export const requireFeature = (...features: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.tenantId || req.user?.tenantId;

      if (!tenantId) {
        res.status(400).json({ success: false, error: 'Tenant ID mangler' });
        return;
      }

      // Get tenant features
      const tenantFeatures = await prisma.tenantFeatures.findUnique({
        where: { tenantId },
      });

      if (!tenantFeatures) {
        res.status(403).json({
          success: false,
          error: 'Feature konfigurasjon ikke funnet',
        });
        return;
      }

      // Check each required feature
      for (const feature of features) {
        const featureKey = feature as keyof typeof tenantFeatures;

        if (!(tenantFeatures[featureKey] as boolean)) {
          res.status(403).json({
            success: false,
            error: `Funksjonen "${feature}" er ikke tilgjengelig i din pakke`,
            upgrade: true,
          });
          return;
        }
      }

      next();
    } catch (error) {
      res.status(500).json({ success: false, error: 'Feil ved sjekk av features' });
    }
  };
};

/**
 * Middleware to check tenant limits
 */
export const checkLimits = (limitType: 'users' | 'classes' | 'bookings' | 'storage' | 'apiCalls') => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.tenantId || req.user?.tenantId;

      if (!tenantId) {
        res.status(400).json({ success: false, error: 'Tenant ID mangler' });
        return;
      }

      const limits = await prisma.tenantLimits.findUnique({
        where: { tenantId },
      });

      if (!limits) {
        next();
        return;
      }

      let currentCount = 0;
      let maxLimit = 0;
      let limitName = '';

      switch (limitType) {
        case 'users':
          currentCount = await prisma.user.count({ where: { tenantId } });
          maxLimit = limits.maxUsers;
          limitName = 'brukere';
          break;

        case 'classes':
          // Count classes in current month
          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0, 0, 0, 0);

          currentCount = await prisma.class.count({
            where: {
              tenantId,
              createdAt: { gte: startOfMonth },
            },
          });
          maxLimit = limits.maxClasses;
          limitName = 'klasser per måned';
          break;

        case 'bookings':
          // Count bookings in current month
          const monthStart = new Date();
          monthStart.setDate(1);
          monthStart.setHours(0, 0, 0, 0);

          currentCount = await prisma.booking.count({
            where: {
              tenantId,
              createdAt: { gte: monthStart },
            },
          });
          maxLimit = limits.maxBookings;
          limitName = 'bookinger per måned';
          break;

        default:
          next();
          return;
      }

      if (currentCount >= maxLimit) {
        res.status(403).json({
          success: false,
          error: `Du har nådd grensen for ${limitName} (${maxLimit})`,
          limit: maxLimit,
          current: currentCount,
          upgrade: true,
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Error checking limits:', error);
      next(); // Don't block on error
    }
  };
};

/**
 * Get feature status for tenant
 */
export async function getTenantFeatures(tenantId: string): Promise<any> {
  const features = await prisma.tenantFeatures.findUnique({
    where: { tenantId },
  });

  return features || {};
}

/**
 * Enable/disable feature for tenant
 */
export async function toggleFeature(
  tenantId: string,
  feature: string,
  enabled: boolean
): Promise<void> {
  await prisma.tenantFeatures.update({
    where: { tenantId },
    data: { [feature]: enabled },
  });

  // Log the change
  console.log(`Feature "${feature}" ${enabled ? 'enabled' : 'disabled'} for tenant ${tenantId}`);
}
