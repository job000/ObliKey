import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../types';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { stripeService } from '../services/stripe.service';

export class PlatformAdminController {
  // ============================================
  // DASHBOARD & ANALYTICS
  // ============================================

  async getDashboard(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Get key metrics
      const [totalTenants, activeTenants, trialTenants, suspendedTenants] = await Promise.all([
        prisma.tenant.count(),
        prisma.tenant.count({ where: { active: true } }),
        prisma.subscription.count({ where: { status: 'TRIAL' } }),
        prisma.subscription.count({ where: { status: 'SUSPENDED' } }),
      ]);

      // Calculate MRR (Monthly Recurring Revenue)
      const subscriptions = await prisma.subscription.findMany({
        where: { status: { in: ['ACTIVE', 'TRIAL'] } },
        select: { price: true, billingCycle: true },
      });

      const mrr = subscriptions.reduce((sum, sub) => {
        const monthlyPrice = sub.billingCycle === 'YEARLY' ? sub.price / 12 : sub.price;
        return sum + monthlyPrice;
      }, 0);

      // Get total end users across all tenants
      const totalEndUsers = await prisma.user.count();

      // Get recent tenants
      const recentTenants = await prisma.tenant.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          subscription: true,
          _count: {
            select: { users: true },
          },
        },
      });

      res.json({
        success: true,
        data: {
          metrics: {
            totalTenants,
            activeTenants,
            trialTenants,
            suspendedTenants,
            mrr: Math.round(mrr),
            totalEndUsers,
          },
          recentTenants,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Kunne ikke hente dashboard data' });
    }
  }

  // ============================================
  // TENANT MANAGEMENT
  // ============================================

  async createTenant(req: AuthRequest, res: Response): Promise<void> {
    try {
      const {
        subdomain,
        customDomain,
        companyName,
        email,
        phone,
        address,
        country,
        industry,
        plan,
        billingCycle,
        adminFirstName,
        adminLastName,
        adminEmail,
        adminPassword,
      } = req.body;

      // Check if subdomain is available
      const existing = await prisma.tenant.findUnique({ where: { subdomain } });

      if (existing) {
        throw new AppError('Subdomene er allerede i bruk', 400);
      }

      // Get plan pricing
      const planPricing: Record<string, number> = {
        STARTER: billingCycle === 'YEARLY' ? 995 * 12 * 0.85 : 995, // 15% discount on yearly
        BASIC: billingCycle === 'YEARLY' ? 1995 * 12 * 0.85 : 1995,
        PRO: billingCycle === 'YEARLY' ? 3995 * 12 * 0.85 : 3995,
        ENTERPRISE: billingCycle === 'YEARLY' ? 7995 * 12 * 0.85 : 7995,
      };

      const price = planPricing[plan];

      // Create tenant with all related records
      const tenant = await prisma.tenant.create({
        data: {
          subdomain,
          customDomain,
          companyName,
          email,
          phone,
          address,
          country,
          industry,
          createdById: req.user!.userId,
          branding: {
            create: {}, // Default branding
          },
          features: {
            create: this.getPlanFeatures(plan),
          },
          limits: {
            create: this.getPlanLimits(plan),
          },
          integrations: {
            create: {}, // Empty integrations initially
          },
          subscription: {
            create: {
              plan,
              billingCycle,
              price,
              status: 'TRIAL',
              trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
              currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            },
          },
          settings: {
            create: {}, // Default settings
          },
          users: {
            create: {
              email: adminEmail,
              password: await bcrypt.hash(adminPassword, 10),
              firstName: adminFirstName,
              lastName: adminLastName,
              role: 'TENANT_OWNER',
              emailVerified: true,
            },
          },
        },
        include: {
          subscription: true,
          branding: true,
          features: true,
          limits: true,
        },
      });

      // Log the action
      await prisma.auditLog.create({
        data: {
          adminId: req.user!.userId,
          action: 'tenant_created',
          entityType: 'Tenant',
          entityId: tenant.id,
          details: JSON.stringify({ subdomain, plan }),
        },
      });

      res.status(201).json({
        success: true,
        data: tenant,
        message: 'Tenant opprettet vellykket',
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Create tenant error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke opprette tenant' });
      }
    }
  }

  async getAllTenants(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { status, plan, search } = req.query;

      const tenants = await prisma.tenant.findMany({
        where: {
          ...(search && {
            OR: [
              { companyName: { contains: search as string, mode: 'insensitive' } },
              { subdomain: { contains: search as string, mode: 'insensitive' } },
              { email: { contains: search as string, mode: 'insensitive' } },
            ],
          }),
          ...(status && {
            subscription: {
              status: status as any,
            },
          }),
          ...(plan && {
            subscription: {
              plan: plan as any,
            },
          }),
        },
        include: {
          subscription: true,
          _count: {
            select: {
              users: true,
              classes: true,
              bookings: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ success: true, data: tenants });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Kunne ikke hente tenants' });
    }
  }

  async getTenantDetails(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const tenant = await prisma.tenant.findUnique({
        where: { id },
        include: {
          subscription: {
            include: { invoices: true },
          },
          branding: true,
          features: true,
          limits: true,
          integrations: true,
          settings: true,
          _count: {
            select: {
              users: true,
              classes: true,
              bookings: true,
              ptSessions: true,
              payments: true,
            },
          },
        },
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

  async updateTenantPlan(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { plan, billingCycle } = req.body;

      const tenant = await prisma.tenant.findUnique({
        where: { id },
        include: { subscription: true },
      });

      if (!tenant) {
        throw new AppError('Tenant ikke funnet', 404);
      }

      // Update subscription
      const planPricing: Record<string, number> = {
        STARTER: billingCycle === 'YEARLY' ? 995 * 12 * 0.85 : 995,
        BASIC: billingCycle === 'YEARLY' ? 1995 * 12 * 0.85 : 1995,
        PRO: billingCycle === 'YEARLY' ? 3995 * 12 * 0.85 : 3995,
        ENTERPRISE: billingCycle === 'YEARLY' ? 7995 * 12 * 0.85 : 7995,
      };

      await prisma.subscription.update({
        where: { tenantId: id },
        data: {
          plan,
          billingCycle,
          price: planPricing[plan],
        },
      });

      // Update features and limits
      await prisma.tenantFeatures.update({
        where: { tenantId: id },
        data: this.getPlanFeatures(plan),
      });

      await prisma.tenantLimits.update({
        where: { tenantId: id },
        data: this.getPlanLimits(plan),
      });

      // Log the action
      await prisma.auditLog.create({
        data: {
          adminId: req.user!.userId,
          action: 'plan_changed',
          entityType: 'Subscription',
          entityId: tenant.subscription!.id,
          details: JSON.stringify({ oldPlan: tenant.subscription!.plan, newPlan: plan }),
        },
      });

      res.json({ success: true, message: 'Pakke oppdatert' });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: 'Kunne ikke oppdatere pakke' });
      }
    }
  }

  async suspendTenant(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      await prisma.tenant.update({
        where: { id },
        data: { active: false },
      });

      await prisma.subscription.update({
        where: { tenantId: id },
        data: { status: 'SUSPENDED' },
      });

      // Log the action
      await prisma.auditLog.create({
        data: {
          adminId: req.user!.userId,
          action: 'tenant_suspended',
          entityType: 'Tenant',
          entityId: id,
          details: JSON.stringify({ reason }),
        },
      });

      res.json({ success: true, message: 'Tenant suspendert' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Kunne ikke suspendere tenant' });
    }
  }

  async unsuspendTenant(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await prisma.tenant.update({
        where: { id },
        data: { active: true },
      });

      await prisma.subscription.update({
        where: { tenantId: id },
        data: { status: 'ACTIVE' },
      });

      // Log the action
      await prisma.auditLog.create({
        data: {
          adminId: req.user!.userId,
          action: 'tenant_unsuspended',
          entityType: 'Tenant',
          entityId: id,
        },
      });

      res.json({ success: true, message: 'Tenant aktivert' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Kunne ikke aktivere tenant' });
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private getPlanFeatures(plan: string): any {
    const features: Record<string, any> = {
      STARTER: {
        booking: true,
        customerPortal: false,
        ptModule: false,
        trainingPrograms: false,
        payments: false,
        emailNotifications: false,
        smsNotifications: false,
        pushNotifications: false,
        analytics: false,
        apiAccess: false,
        mobileApp: false,
        whiteLabel: false,
        customDomain: false,
      },
      BASIC: {
        booking: true,
        customerPortal: true,
        ptModule: false,
        trainingPrograms: false,
        payments: false,
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: false,
        analytics: false,
        apiAccess: false,
        mobileApp: false,
        whiteLabel: false,
        customDomain: false,
      },
      PRO: {
        booking: true,
        customerPortal: true,
        ptModule: true,
        trainingPrograms: true,
        payments: true,
        emailNotifications: true,
        smsNotifications: true,
        pushNotifications: true,
        analytics: true,
        apiAccess: false,
        mobileApp: false,
        whiteLabel: false,
        customDomain: false,
      },
      ENTERPRISE: {
        booking: true,
        customerPortal: true,
        ptModule: true,
        trainingPrograms: true,
        payments: true,
        emailNotifications: true,
        smsNotifications: true,
        pushNotifications: true,
        analytics: true,
        apiAccess: true,
        mobileApp: true,
        whiteLabel: true,
        customDomain: true,
      },
    };

    return features[plan] || features.STARTER;
  }

  private getPlanLimits(plan: string): any {
    const limits: Record<string, any> = {
      STARTER: {
        maxUsers: 50,
        maxTrainers: 2,
        maxAdmins: 1,
        maxClasses: 100,
        maxBookings: 500,
        maxStorage: 1000,
        maxApiCalls: 0,
      },
      BASIC: {
        maxUsers: 200,
        maxTrainers: 5,
        maxAdmins: 2,
        maxClasses: 500,
        maxBookings: 2000,
        maxStorage: 5000,
        maxApiCalls: 0,
      },
      PRO: {
        maxUsers: 1000,
        maxTrainers: 20,
        maxAdmins: 5,
        maxClasses: 999999,
        maxBookings: 999999,
        maxStorage: 20000,
        maxApiCalls: 0,
      },
      ENTERPRISE: {
        maxUsers: 999999,
        maxTrainers: 999999,
        maxAdmins: 999999,
        maxClasses: 999999,
        maxBookings: 999999,
        maxStorage: 100000,
        maxApiCalls: 10000,
      },
    };

    return limits[plan] || limits.STARTER;
  }
}
