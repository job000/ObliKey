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

      // Core UI modules that don't have database fields
      const coreModules = ['dashboard', 'admin'];
      if (coreModules.includes(module)) {
        // Return success for core modules without updating database
        return res.json({
          success: true,
          message: `${module} er en kjernemodule og kan ikke endres`
        });
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
        workout: 'workoutEnabled',
        ptSessions: 'ptEnabled',
        pt: 'ptEnabled'
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
   * Uses TenantSettings as the source of truth
   */
  async getModuleStatuses(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;

      // Get tenant settings
      let settings = await prisma.tenantSettings.findUnique({
        where: { tenantId }
      });

      // Create default settings if they don't exist
      if (!settings) {
        settings = await prisma.tenantSettings.create({
          data: { tenantId }
        });
      }

      // Map TenantSettings fields to module status
      // Using !== false for modules that should be enabled by default
      const moduleStatuses: any = {
        shop: settings.ecommerceEnabled || false,
        ecommerce: settings.ecommerceEnabled || false,
        classes: settings.classesEnabled !== false, // Default true
        accounting: settings.accountingEnabled || false,
        chat: settings.chatEnabled !== false, // Default true (was enabled in schema)
        landingPage: settings.landingPageEnabled || false,
        membership: settings.membershipEnabled || false,
        doorAccess: settings.doorAccessEnabled || false,
        pt: settings.ptEnabled !== false, // Default true (core business module)
        workout: settings.workoutEnabled || false
      };

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
