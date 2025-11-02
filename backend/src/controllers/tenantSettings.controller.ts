import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

export class TenantSettingsController {
  /**
   * Get e-commerce module status for the tenant
   * Public endpoint - no admin required
   */
  async getEcommerceStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;

      const settings = await prisma.tenantSettings.findUnique({
        where: { tenantId },
        select: {
          ecommerceEnabled: true
        }
      });

      res.json({
        success: true,
        data: {
          enabled: settings?.ecommerceEnabled || false
        }
      });
    } catch (error) {
      console.error('Get e-commerce status error:', error);
      res.status(500).json({
        success: false,
        error: 'Kunne ikke hente modulstatus'
      });
    }
  }

  /**
   * Get all tenant settings
   * Admin only
   */
  async getSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;

      let settings = await prisma.tenantSettings.findUnique({
        where: { tenantId }
      });

      // Create default settings if they don't exist
      if (!settings) {
        settings = await prisma.tenantSettings.create({
          data: { tenantId }
        });
      }

      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      console.error('Get settings error:', error);
      res.status(500).json({
        success: false,
        error: 'Kunne ikke hente innstillinger'
      });
    }
  }

  /**
   * Update tenant settings
   * Admin only
   */
  async updateSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const updateData = req.body;

      // Remove fields that shouldn't be updated directly
      delete updateData.id;
      delete updateData.tenantId;
      delete updateData.createdAt;
      delete updateData.updatedAt;

      // Check if settings exist
      let settings = await prisma.tenantSettings.findUnique({
        where: { tenantId }
      });

      // Create or update settings
      if (settings) {
        settings = await prisma.tenantSettings.update({
          where: { tenantId },
          data: updateData
        });
      } else {
        settings = await prisma.tenantSettings.create({
          data: {
            tenantId,
            ...updateData
          }
        });
      }

      // Sync ptEnabled with PT feature in tenant_features
      if ('ptEnabled' in updateData) {
        const ptFeature = await prisma.feature.findFirst({
          where: { key: 'pt', active: true }
        });

        if (ptFeature) {
          await prisma.tenantFeature.upsert({
            where: {
              tenantId_featureId: {
                tenantId,
                featureId: ptFeature.id
              }
            },
            create: {
              tenantId,
              featureId: ptFeature.id,
              enabled: updateData.ptEnabled,
              enabledAt: updateData.ptEnabled ? new Date() : null
            },
            update: {
              enabled: updateData.ptEnabled,
              enabledAt: updateData.ptEnabled ? new Date() : null,
              disabledAt: !updateData.ptEnabled ? new Date() : null
            }
          });
          console.log(`✅ Synced PT feature for tenant ${tenantId}: ptEnabled=${updateData.ptEnabled}`);
        }
      }

      res.json({
        success: true,
        data: settings,
        message: 'Innstillinger oppdatert'
      });
    } catch (error) {
      console.error('Update settings error:', error);
      res.status(500).json({
        success: false,
        error: 'Kunne ikke oppdatere innstillinger'
      });
    }
  }

  /**
   * Toggle any module
   * Admin only
   */
  async toggleModule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { module, enabled } = req.body;

      if (typeof enabled !== 'boolean') {
        throw new AppError('enabled må være true eller false', 400);
      }

      // Map of valid modules to database fields
      const moduleFieldMap: Record<string, string> = {
        accounting: 'accountingEnabled',
        classes: 'classesEnabled',
        chat: 'chatEnabled',
        landingPage: 'landingPageEnabled',
        shop: 'ecommerceEnabled',
        ecommerce: 'ecommerceEnabled',
        membership: 'membershipEnabled',
        doorAccess: 'doorAccessEnabled',
        workout: 'workoutEnabled'
      };

      const dbField = moduleFieldMap[module];
      if (!dbField) {
        throw new AppError('Ugyldig modul', 400);
      }

      // Check if settings exist
      let settings = await prisma.tenantSettings.findUnique({
        where: { tenantId }
      });

      // Create or update settings
      if (settings) {
        settings = await prisma.tenantSettings.update({
          where: { tenantId },
          data: { [dbField]: enabled }
        });
      } else {
        settings = await prisma.tenantSettings.create({
          data: {
            tenantId,
            [dbField]: enabled
          }
        });
      }

      res.json({
        success: true,
        data: settings,
        message: enabled
          ? `${module}-modulen er aktivert`
          : `${module}-modulen er deaktivert`
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Toggle module error:', error);
        res.status(500).json({
          success: false,
          error: 'Kunne ikke endre modulstatus'
        });
      }
    }
  }

  /**
   * Toggle e-commerce module (legacy endpoint, redirects to toggleModule)
   * Admin only
   */
  async toggleEcommerceModule(req: AuthRequest, res: Response): Promise<void> {
    req.body.module = 'ecommerce';
    return this.toggleModule(req, res);
  }

  /**
   * Get module statuses for the tenant
   * Returns all module enabled/disabled states
   * Now uses Feature system with fallback to TenantSettings
   */
  async getModuleStatuses(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;

      // Feature key mapping to module names
      const featureKeyMap: Record<string, string> = {
        'shop': 'shop',
        'ecommerce': 'shop',
        'classes': 'classes',
        'accounting': 'accounting',
        'regnskap': 'accounting',
        'chat': 'chat',
        'landingpage': 'landingPage',
        'membership': 'membership',
        'medlemskap': 'membership',
        'dooraccess': 'doorAccess',
        'door': 'doorAccess',
        'pt': 'pt',
        'personaltraining': 'pt',
        'workout': 'workout',
        'treningsprogram': 'workout'
      };

      // Get enabled tenant features
      const tenantFeatures = await prisma.tenantFeature.findMany({
        where: {
          tenantId,
          enabled: true
        },
        include: {
          feature: {
            select: {
              key: true,
              active: true
            }
          }
        }
      });

      // Initialize all modules as disabled
      const moduleStatuses: any = {
        shop: false,
        ecommerce: false,
        classes: false,
        accounting: false,
        chat: false,
        landingPage: false,
        membership: false,
        doorAccess: false,
        pt: false,
        workout: false
      };

      // Enable only features that exist in tenant_features with enabled=true
      tenantFeatures.forEach(tf => {
        if (tf.feature.active) {
          const moduleName = featureKeyMap[tf.feature.key.toLowerCase()];
          if (moduleName) {
            moduleStatuses[moduleName] = true;
            if (moduleName === 'shop') {
              moduleStatuses.ecommerce = true;  // Keep both for compatibility
            }
          }
        }
      });

      res.json({
        success: true,
        data: moduleStatuses
      });
    } catch (error) {
      console.error('Get module statuses error:', error);
      res.status(500).json({
        success: false,
        error: 'Kunne ikke hente modulstatus'
      });
    }
  }
}
