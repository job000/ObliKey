import { Response } from 'express';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import tenantManagementService from '../services/tenant-management.service';
import featureManagementService from '../services/feature-management.service';
import subscriptionService from '../services/subscription.service';

export class SuperAdminController {
  // ============================================
  // TENANT MANAGEMENT ENDPOINTS
  // ============================================

  /**
   * GET /api/super-admin/tenants
   * Get all tenants with filtering and pagination
   */
  async getAllTenants(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { search, active, subscriptionStatus, limit, offset, sortBy, sortOrder } = req.query;

      const result = await tenantManagementService.getAllTenants({
        search: search as string,
        active: active === 'true' ? true : active === 'false' ? false : undefined,
        subscriptionStatus: subscriptionStatus as any,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
        sortBy: sortBy as any,
        sortOrder: sortOrder as any,
      });

      res.json({
        success: true,
        data: result.tenants,
        pagination: result.pagination,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get tenants',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * GET /api/super-admin/tenants/:tenantId
   * Get detailed information about a tenant
   */
  async getTenantDetails(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;

      const tenant = await tenantManagementService.getTenantById(tenantId);

      if (!tenant) {
        throw new AppError('Tenant not found', 404);
      }

      res.json({
        success: true,
        data: tenant,
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
          error: 'Failed to get tenant details',
        });
      }
    }
  }

  /**
   * POST /api/super-admin/tenants
   * Create a new tenant
   */
  async createTenant(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, subdomain, email, phone, address, settings, active } = req.body;

      const tenant = await tenantManagementService.createTenant({
        name,
        subdomain,
        email,
        phone,
        address,
        settings,
        active,
      });

      res.status(201).json({
        success: true,
        data: tenant,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create tenant',
      });
    }
  }

  /**
   * PUT /api/super-admin/tenants/:tenantId
   * Update a tenant
   */
  async updateTenant(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const { name, email, phone, address, settings, active } = req.body;

      const tenant = await tenantManagementService.updateTenant(tenantId, {
        name,
        email,
        phone,
        address,
        settings,
        active,
      });

      res.json({
        success: true,
        data: tenant,
      });
    } catch (error) {
      console.error('[updateTenant] Error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update tenant',
      });
    }
  }

  /**
   * PATCH /api/super-admin/tenants/:tenantId/status
   * Activate or deactivate a tenant
   */
  async setTenantStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const { active } = req.body;

      if (typeof active !== 'boolean') {
        res.status(400).json({
          success: false,
          error: 'Active must be a boolean value',
        });
        return;
      }

      const tenant = await tenantManagementService.setTenantActive(tenantId, active);

      res.json({
        success: true,
        data: tenant,
      });
    } catch (error) {
      console.error('[setTenantStatus] Error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update tenant status',
      });
    }
  }

  /**
   * DELETE /api/super-admin/tenants/:tenantId
   * Permanently delete a tenant and all related data
   */
  async deleteTenant(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;

      const result = await tenantManagementService.deleteTenant(tenantId);

      res.json({
        success: true,
        message: result.message,
        data: result.data,
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
          error: 'Failed to delete tenant',
        });
      }
    }
  }

  /**
   * GET /api/super-admin/stats/tenants
   * Get tenant statistics
   */
  async getTenantStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const stats = await tenantManagementService.getTenantStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get tenant statistics',
      });
    }
  }

  /**
   * GET /api/super-admin/tenants/expiring-trials
   * Get tenants with expiring trials
   */
  async getExpiringTrials(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { days } = req.query;
      const daysUntilExpiry = days ? parseInt(days as string) : 7;

      const tenants = await tenantManagementService.getTenantsWithExpiringTrials(daysUntilExpiry);

      res.json({
        success: true,
        data: tenants,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get expiring trials',
      });
    }
  }

  // ============================================
  // FEATURE MANAGEMENT ENDPOINTS
  // ============================================

  /**
   * GET /api/super-admin/features
   * Get all features
   */
  async getAllFeatures(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { includeInactive } = req.query;

      const features = await featureManagementService.getAllFeatures(
        includeInactive === 'true'
      );

      res.json({
        success: true,
        data: features,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get features',
      });
    }
  }

  /**
   * GET /api/super-admin/features/:featureId
   * Get a single feature
   */
  async getFeatureById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { featureId } = req.params;

      const feature = await featureManagementService.getFeatureById(featureId);

      if (!feature) {
        throw new AppError('Feature not found', 404);
      }

      res.json({
        success: true,
        data: feature,
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
          error: 'Failed to get feature',
        });
      }
    }
  }

  /**
   * POST /api/super-admin/features
   * Create a new feature
   */
  async createFeature(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { key, name, description, category, isCore, sortOrder } = req.body;

      const feature = await featureManagementService.createFeature({
        key,
        name,
        description,
        category,
        isCore,
        sortOrder,
      });

      res.status(201).json({
        success: true,
        data: feature,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create feature',
      });
    }
  }

  /**
   * PUT /api/super-admin/features/:featureId
   * Update a feature
   */
  async updateFeature(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { featureId } = req.params;
      const { name, description, category, isCore, sortOrder, active } = req.body;

      const feature = await featureManagementService.updateFeature(featureId, {
        name,
        description,
        category,
        isCore,
        sortOrder,
        active,
      });

      res.json({
        success: true,
        data: feature,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to update feature',
      });
    }
  }

  /**
   * DELETE /api/super-admin/features/:featureId
   * Delete a feature (soft delete)
   */
  async deleteFeature(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { featureId } = req.params;

      await featureManagementService.deleteFeature(featureId);

      res.json({
        success: true,
        message: 'Feature deleted successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to delete feature',
      });
    }
  }

  /**
   * GET /api/super-admin/stats/features
   * Get feature usage statistics
   */
  async getFeatureStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const stats = await featureManagementService.getFeatureStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get feature statistics',
      });
    }
  }

  // ============================================
  // FEATURE PACK MANAGEMENT ENDPOINTS
  // ============================================

  /**
   * GET /api/super-admin/feature-packs
   * Get all feature packs
   */
  async getAllFeaturePacks(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { includeInactive } = req.query;

      const packs = await featureManagementService.getAllFeaturePacks(
        includeInactive === 'true'
      );

      res.json({
        success: true,
        data: packs,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get feature packs',
      });
    }
  }

  /**
   * GET /api/super-admin/feature-packs/:packId
   * Get a single feature pack
   */
  async getFeaturePackById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { packId } = req.params;

      const pack = await featureManagementService.getFeaturePackById(packId);

      if (!pack) {
        throw new AppError('Feature pack not found', 404);
      }

      res.json({
        success: true,
        data: pack,
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
          error: 'Failed to get feature pack',
        });
      }
    }
  }

  /**
   * POST /api/super-admin/feature-packs
   * Create a new feature pack
   */
  async createFeaturePack(req: AuthRequest, res: Response): Promise<void> {
    try {
      const {
        name,
        slug,
        description,
        price,
        currency,
        interval,
        trialDays,
        isPopular,
        sortOrder,
        featureIds,
        metadata,
      } = req.body;

      const pack = await featureManagementService.createFeaturePack({
        name,
        slug,
        description,
        price,
        currency,
        interval,
        trialDays,
        isPopular,
        sortOrder,
        featureIds,
        metadata,
      });

      res.status(201).json({
        success: true,
        data: pack,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create feature pack',
      });
    }
  }

  /**
   * PUT /api/super-admin/feature-packs/:packId
   * Update a feature pack
   */
  async updateFeaturePack(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { packId } = req.params;
      const {
        name,
        slug,
        description,
        price,
        currency,
        interval,
        trialDays,
        isPopular,
        sortOrder,
        featureIds,
        active,
        metadata,
      } = req.body;

      const pack = await featureManagementService.updateFeaturePack(packId, {
        name,
        slug,
        description,
        price,
        currency,
        interval,
        trialDays,
        isPopular,
        sortOrder,
        featureIds,
        active,
        metadata,
      });

      res.json({
        success: true,
        data: pack,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to update feature pack',
      });
    }
  }

  /**
   * DELETE /api/super-admin/feature-packs/:packId
   * Delete a feature pack (soft delete)
   */
  async deleteFeaturePack(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { packId } = req.params;

      await featureManagementService.deleteFeaturePack(packId);

      res.json({
        success: true,
        message: 'Feature pack deleted successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to delete feature pack',
      });
    }
  }

  // ============================================
  // TENANT FEATURE MANAGEMENT ENDPOINTS
  // ============================================

  /**
   * GET /api/super-admin/tenants/:tenantId/features
   * Get all features for a tenant
   */
  async getTenantFeatures(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;

      const features = await featureManagementService.getTenantFeatures(tenantId);

      res.json({
        success: true,
        data: features,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get tenant features',
      });
    }
  }

  /**
   * POST /api/super-admin/tenants/:tenantId/features
   * Set features for a tenant (replaces all)
   */
  async setTenantFeatures(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const { featureIds } = req.body;

      const features = await featureManagementService.setTenantFeatures(tenantId, featureIds);

      res.json({
        success: true,
        data: features,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set tenant features',
      });
    }
  }

  /**
   * POST /api/super-admin/tenants/:tenantId/features/:featureId/enable
   * Enable a feature for a tenant
   */
  async enableTenantFeature(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { tenantId, featureId } = req.params;

      const feature = await featureManagementService.enableFeatureForTenant(tenantId, featureId);

      res.json({
        success: true,
        data: feature,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to enable feature',
      });
    }
  }

  /**
   * POST /api/super-admin/tenants/:tenantId/features/:featureId/disable
   * Disable a feature for a tenant
   */
  async disableTenantFeature(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { tenantId, featureId } = req.params;

      const feature = await featureManagementService.disableFeatureForTenant(tenantId, featureId);

      res.json({
        success: true,
        data: feature,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to disable feature',
      });
    }
  }

  /**
   * POST /api/super-admin/tenants/:tenantId/apply-pack/:packId
   * Apply a feature pack to a tenant
   */
  async applyFeaturePackToTenant(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { tenantId, packId } = req.params;

      const features = await featureManagementService.applyFeaturePackToTenant(tenantId, packId);

      res.json({
        success: true,
        data: features,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to apply feature pack',
      });
    }
  }

  // ============================================
  // SUBSCRIPTION MANAGEMENT ENDPOINTS
  // ============================================

  /**
   * POST /api/super-admin/subscriptions
   * Create a subscription for a tenant
   */
  async createSubscription(req: AuthRequest, res: Response): Promise<void> {
    try {
      const {
        tenantId,
        featurePackId,
        tier,
        interval,
        price,
        currency,
        trialDays,
        customFeatures,
        billingEmail,
        billingName,
        billingAddress,
        billingPhone,
        vatNumber,
        notes,
      } = req.body;

      const subscription = await subscriptionService.createSubscription({
        tenantId,
        featurePackId,
        tier,
        interval,
        price,
        currency,
        trialDays,
        customFeatures,
        billingEmail,
        billingName,
        billingAddress,
        billingPhone,
        vatNumber,
        notes,
      });

      res.status(201).json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create subscription',
      });
    }
  }

  /**
   * PUT /api/super-admin/subscriptions/:subscriptionId
   * Update a subscription
   */
  async updateSubscription(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { subscriptionId } = req.params;
      const {
        featurePackId,
        tier,
        interval,
        price,
        currency,
        customFeatures,
        billingEmail,
        billingName,
        billingAddress,
        billingPhone,
        vatNumber,
        notes,
      } = req.body;

      const subscription = await subscriptionService.updateSubscription(subscriptionId, {
        featurePackId,
        tier,
        interval,
        price,
        currency,
        customFeatures,
        billingEmail,
        billingName,
        billingAddress,
        billingPhone,
        vatNumber,
        notes,
      });

      res.json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to update subscription',
      });
    }
  }

  /**
   * PATCH /api/super-admin/subscriptions/:subscriptionId/status
   * Change subscription status
   */
  async changeSubscriptionStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { subscriptionId } = req.params;
      const { status } = req.body;

      const subscription = await subscriptionService.changeSubscriptionStatus(
        subscriptionId,
        status
      );

      res.json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to change subscription status',
      });
    }
  }

  /**
   * POST /api/super-admin/subscriptions/:subscriptionId/cancel
   * Cancel a subscription
   */
  async cancelSubscription(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { subscriptionId } = req.params;
      const { cancelAtPeriodEnd, cancellationReason } = req.body;

      const subscription = await subscriptionService.cancelSubscription(
        subscriptionId,
        cancelAtPeriodEnd ?? true,
        cancellationReason
      );

      res.json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to cancel subscription',
      });
    }
  }

  /**
   * POST /api/super-admin/subscriptions/:subscriptionId/reactivate
   * Reactivate a cancelled subscription
   */
  async reactivateSubscription(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { subscriptionId } = req.params;

      const subscription = await subscriptionService.reactivateSubscription(subscriptionId);

      res.json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to reactivate subscription',
      });
    }
  }

  /**
   * GET /api/super-admin/stats/subscriptions
   * Get subscription statistics
   */
  async getSubscriptionStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const stats = await subscriptionService.getSubscriptionStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get subscription statistics',
      });
    }
  }

  // ============================================
  // INVOICE MANAGEMENT ENDPOINTS
  // ============================================

  /**
   * GET /api/super-admin/subscriptions/:subscriptionId/invoices
   * Get all invoices for a subscription
   */
  async getSubscriptionInvoices(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { subscriptionId } = req.params;

      const invoices = await subscriptionService.getSubscriptionInvoices(subscriptionId);

      res.json({
        success: true,
        data: invoices,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get invoices',
      });
    }
  }

  /**
   * GET /api/super-admin/invoices/:invoiceId
   * Get a single invoice
   */
  async getInvoiceById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { invoiceId } = req.params;

      const invoice = await subscriptionService.getInvoiceById(invoiceId);

      if (!invoice) {
        throw new AppError('Invoice not found', 404);
      }

      res.json({
        success: true,
        data: invoice,
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
          error: 'Failed to get invoice',
        });
      }
    }
  }

  /**
   * POST /api/super-admin/invoices/:invoiceId/mark-sent
   * Mark an invoice as sent
   */
  async markInvoiceSent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { invoiceId } = req.params;

      const invoice = await subscriptionService.markInvoiceSent(invoiceId);

      res.json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to mark invoice as sent',
      });
    }
  }

  /**
   * POST /api/super-admin/invoices/:invoiceId/mark-paid
   * Mark an invoice as paid
   */
  async markInvoicePaid(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { invoiceId } = req.params;
      const { paymentMethod, paymentId } = req.body;

      const invoice = await subscriptionService.markInvoicePaid(
        invoiceId,
        paymentMethod,
        paymentId
      );

      res.json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to mark invoice as paid',
      });
    }
  }

  /**
   * GET /api/super-admin/invoices/overdue
   * Get all overdue invoices
   */
  async getOverdueInvoices(req: AuthRequest, res: Response): Promise<void> {
    try {
      const invoices = await subscriptionService.getOverdueInvoices();

      res.json({
        success: true,
        data: invoices,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get overdue invoices',
      });
    }
  }

  /**
   * POST /api/super-admin/tenants/:tenantId/users
   * Create a new user for a tenant
   */
  async createUserForTenant(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const { email, password, firstName, lastName, role, phone } = req.body;

      // Validate required fields
      if (!email || !password || !firstName || !lastName || !role) {
        res.status(400).json({
          success: false,
          error: 'Email, password, firstName, lastName, and role are required',
        });
        return;
      }

      // Validate role
      if (!['ADMIN', 'CUSTOMER'].includes(role)) {
        res.status(400).json({
          success: false,
          error: 'Role must be either ADMIN or CUSTOMER',
        });
        return;
      }

      const user = await tenantManagementService.createUserForTenant(tenantId, {
        email,
        password,
        firstName,
        lastName,
        role,
        phone,
      });

      res.status(201).json({
        success: true,
        data: user,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create user',
      });
    }
  }

  /**
   * GET /api/super-admin/tenants/:tenantId/users
   * Get all users for a tenant
   */
  async getTenantUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const users = await tenantManagementService.getTenantUsers(tenantId);

      res.json({
        success: true,
        data: users,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get tenant users',
      });
    }
  }

  /**
   * PUT /api/super-admin/tenants/:tenantId/users/:userId
   * Update a user for a tenant
   */
  async updateTenantUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { tenantId, userId } = req.params;
      const { email, firstName, lastName, role, phone, active } = req.body;

      // Verify user belongs to this tenant
      const { prisma } = await import('../utils/prisma');
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      if (existingUser.tenantId !== tenantId) {
        res.status(403).json({
          success: false,
          error: 'User does not belong to this tenant',
        });
        return;
      }

      // Build update data
      const updateData: any = {};
      if (email !== undefined) updateData.email = email;
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (role !== undefined) {
        if (!['ADMIN', 'CUSTOMER'].includes(role)) {
          res.status(400).json({
            success: false,
            error: 'Role must be either ADMIN or CUSTOMER',
          });
          return;
        }
        updateData.role = role;
      }
      if (phone !== undefined) updateData.phone = phone;
      if (active !== undefined) updateData.active = active;

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          phone: true,
          active: true,
          createdAt: true,
          tenant: {
            select: {
              id: true,
              name: true,
              subdomain: true,
            },
          },
        },
      });

      res.json({
        success: true,
        data: updatedUser,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user',
      });
    }
  }

  /**
   * DELETE /api/super-admin/tenants/:tenantId/users/:userId
   * Delete a user from a tenant
   */
  async deleteTenantUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { tenantId, userId } = req.params;

      // Verify user belongs to this tenant
      const { prisma } = await import('../utils/prisma');
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          tenant: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!existingUser) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      if (existingUser.tenantId !== tenantId) {
        res.status(403).json({
          success: false,
          error: 'User does not belong to this tenant',
        });
        return;
      }

      // Delete the user
      await prisma.user.delete({
        where: { id: userId },
      });

      res.json({
        success: true,
        message: `User ${existingUser.firstName} ${existingUser.lastName} deleted successfully from ${existingUser.tenant.name}`,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete user',
      });
    }
  }
}

export default new SuperAdminController();
