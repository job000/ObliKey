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

  // Update tenant settings
  async updateSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const settings = req.body;

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
      res.status(500).json({ success: false, error: 'Kunne ikke oppdatere innstillinger' });
    }
  }
}
