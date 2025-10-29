import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { AuthRequest, CreateTenantDto } from '../types';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

export class TenantController {
  // Create new tenant (Super Admin only)
  async createTenant(req: AuthRequest, res: Response): Promise<void> {
    try {
      const {
        name,
        subdomain,
        email,
        phone,
        address,
        adminFirstName,
        adminLastName,
        adminEmail,
        adminPassword
      }: CreateTenantDto = req.body;

      // Check if subdomain is available
      const existingTenant = await prisma.tenant.findUnique({
        where: { subdomain }
      });

      if (existingTenant) {
        throw new AppError('Subdomene er allerede i bruk', 400);
      }

      // Hash admin password
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      // Create tenant with admin user
      const tenant = await prisma.tenant.create({
        data: {
          name,
          subdomain,
          email,
          phone,
          address,
          users: {
            create: {
              email: adminEmail,
              password: hashedPassword,
              firstName: adminFirstName,
              lastName: adminLastName,
              role: 'ADMIN',
              emailVerified: true
            }
          },
          settings: {
            create: {}
          }
        },
        include: {
          users: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true
            }
          },
          settings: true
        }
      });

      res.status(201).json({
        success: true,
        data: tenant,
        message: 'Tenant opprettet vellykket'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: 'Kunne ikke opprette tenant' });
      }
    }
  }

  // Get all tenants (Super Admin only)
  async getAllTenants(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenants = await prisma.tenant.findMany({
        include: {
          _count: {
            select: {
              users: true,
              bookings: true,
              classes: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({ success: true, data: tenants });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Kunne ikke hente tenants' });
    }
  }

  // Get tenant by ID
  async getTenantById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const tenant = await prisma.tenant.findUnique({
        where: { id },
        include: {
          settings: true,
          _count: {
            select: {
              users: true,
              classes: true,
              bookings: true,
              ptSessions: true
            }
          }
        }
      });

      if (!tenant) {
        throw new AppError('Tenant ikke funnet', 404);
      }

      res.json({ success: true, data: tenant });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: 'Kunne ikke hente tenant' });
      }
    }
  }

  // Get current user's tenant settings
  async getSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        throw new AppError('Tenant ikke funnet', 404);
      }

      const settings = await prisma.tenantSettings.findUnique({
        where: { tenantId: req.user.tenantId },
        include: {
          tenant: {
            select: {
              name: true,
              email: true,
              phone: true,
              address: true,
              subdomain: true
            }
          }
        }
      });

      if (!settings) {
        throw new AppError('Innstillinger ikke funnet', 404);
      }

      res.json({ success: true, data: settings });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: 'Kunne ikke hente innstillinger' });
      }
    }
  }

  // Update tenant settings
  async updateSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const settings = req.body;
      const userTenantId = req.user!.tenantId;
      const userRole = req.user!.role;

      // Verify user can update this tenant's settings
      // Only SUPER_ADMIN can update other tenants, regular ADMIN can only update their own
      if (userRole !== 'SUPER_ADMIN' && userTenantId !== id) {
        throw new AppError('Ingen tilgang', 403);
      }

      const updatedSettings = await prisma.tenantSettings.update({
        where: { tenantId: id },
        data: settings
      });

      res.json({
        success: true,
        data: updatedSettings,
        message: 'Innstillinger oppdatert'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: 'Kunne ikke oppdatere innstillinger' });
      }
    }
  }

  // Set tenant status (activate/deactivate) - Super Admin only
  async setTenantStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { active } = req.body;

      // Verify tenant exists
      const tenant = await prisma.tenant.findUnique({
        where: { id }
      });

      if (!tenant) {
        throw new AppError('Tenant ikke funnet', 404);
      }

      // Update tenant status
      const updatedTenant = await prisma.tenant.update({
        where: { id },
        data: { active }
      });

      res.json({
        success: true,
        data: updatedTenant,
        message: `Tenant ${active ? 'aktivert' : 'deaktivert'} vellykket`
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: 'Kunne ikke endre status' });
      }
    }
  }

  // Delete tenant permanently - Super Admin only
  async deleteTenant(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Verify tenant exists
      const tenant = await prisma.tenant.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              users: true,
              products: true,
              classes: true,
              bookings: true,
              ptSessions: true,
              orders: true
            }
          }
        }
      });

      if (!tenant) {
        throw new AppError('Tenant ikke funnet', 404);
      }

      // Delete tenant - Prisma cascade will handle all related records
      // (users, products, classes, bookings, PT sessions, orders, etc.)
      await prisma.tenant.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: `Tenant "${tenant.name}" og alle tilknyttede data ble slettet permanent`,
        data: {
          deletedTenant: tenant.name,
          deletedRecords: tenant._count
        }
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Delete tenant error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke slette tenant' });
      }
    }
  }
}
