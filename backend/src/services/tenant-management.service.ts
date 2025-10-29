import { PrismaClient, Tenant, SubscriptionStatus } from '@prisma/client';

const prisma = new PrismaClient();

export interface TenantListItem {
  id: string;
  name: string;
  subdomain: string;
  active: boolean;
  createdAt: Date;
  subscription?: {
    id: string;
    status: SubscriptionStatus;
    tier: string | null;
    price: number;
    currency: string;
    interval: string;
    currentPeriodEnd: Date;
    nextBillingAt: Date | null;
  };
  featureCount: number;
  userCount: number;
  lastActivity?: Date;
}

export interface TenantDetails extends TenantListItem {
  settings: any;
  subscription?: {
    id: string;
    status: SubscriptionStatus;
    tier: string | null;
    featurePackId: string | null;
    price: number;
    currency: string;
    interval: string;
    customFeatures: any;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    trialEndsAt: Date | null;
    cancelAtPeriodEnd: boolean;
    cancelledAt: Date | null;
    nextBillingAt: Date | null;
    lastBilledAt: Date | null;
    billingEmail: string | null;
    billingName: string | null;
    billingAddress: string | null;
    billingPhone: string | null;
    vatNumber: string | null;
    notes: string | null;
  };
  features: Array<{
    id: string;
    key: string;
    name: string;
    category: string;
    enabled: boolean;
    enabledAt: Date;
  }>;
  users: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    active: boolean;
    lastSeenAt: Date | null;
  }>;
  stats: {
    totalUsers: number;
    activeUsers: number;
    totalClasses: number;
    totalBookings: number;
    totalOrders: number;
    revenue: number;
  };
}

export interface TenantCreateData {
  name: string;
  subdomain: string;
  email?: string;
  phone?: string;
  address?: string;
  settings?: any;
  active?: boolean;
}

export interface TenantUpdateData {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  settings?: any;
  active?: boolean;
}

export interface TenantQueryParams {
  search?: string;
  active?: boolean;
  subscriptionStatus?: SubscriptionStatus;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'createdAt' | 'userCount';
  sortOrder?: 'asc' | 'desc';
}

export class TenantManagementService {
  /**
   * Get all tenants with pagination and filtering
   */
  async getAllTenants(params: TenantQueryParams = {}) {
    const {
      search,
      active,
      subscriptionStatus,
      limit = 50,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { subdomain: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (active !== undefined) {
      where.active = active;
    }

    if (subscriptionStatus) {
      where.subscription = {
        status: subscriptionStatus,
      };
    }

    // Get tenants with counts
    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        include: {
          subscription: {
            select: {
              id: true,
              status: true,
              tier: true,
              price: true,
              currency: true,
              interval: true,
              currentPeriodEnd: true,
              nextBillingAt: true,
            },
          },
          _count: {
            select: {
              users: true,
              tenantFeatures: { where: { enabled: true } },
            },
          },
        },
        orderBy:
          sortBy === 'userCount'
            ? undefined
            : { [sortBy]: sortOrder },
        take: limit,
        skip: offset,
      }),
      prisma.tenant.count({ where }),
    ]);

    // Get last activity for each tenant (from activity logs)
    const tenantIds = tenants.map(t => t.id);
    const lastActivities = await prisma.activityLog.groupBy({
      by: ['tenantId'],
      where: { tenantId: { in: tenantIds } },
      _max: { createdAt: true },
    });

    const lastActivityMap = new Map(
      lastActivities.map(a => [a.tenantId, a._max.createdAt])
    );

    // Transform to TenantListItem
    const tenantList: TenantListItem[] = tenants.map(tenant => ({
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      active: tenant.active,
      createdAt: tenant.createdAt,
      subscription: tenant.subscription || undefined,
      featureCount: tenant._count.tenantFeatures,
      userCount: tenant._count.users,
      lastActivity: lastActivityMap.get(tenant.id) || undefined,
    }));

    return {
      tenants: tenantList,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  /**
   * Get a single tenant's detailed information
   */
  async getTenantById(tenantId: string): Promise<TenantDetails | null> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscription: true,
        tenantFeatures: {
          where: { enabled: true },
          include: {
            feature: {
              select: {
                id: true,
                key: true,
                name: true,
                category: true,
              },
            },
          },
        },
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            active: true,
            lastSeenAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 100, // Limit users to 100 for performance
        },
      },
    });

    if (!tenant) {
      return null;
    }

    // Get statistics
    const [
      totalUsers,
      activeUsers,
      totalClasses,
      totalBookings,
      totalOrders,
      orderRevenue,
    ] = await Promise.all([
      prisma.user.count({ where: { tenantId } }),
      prisma.user.count({
        where: {
          tenantId,
          active: true,
          lastSeenAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Active in last 30 days
          },
        },
      }),
      prisma.class.count({ where: { tenantId } }),
      prisma.classBooking.count({ where: { class: { tenantId } } }),
      prisma.order.count({ where: { tenantId } }),
      prisma.order.aggregate({
        where: {
          tenantId,
          status: 'COMPLETED',
        },
        _sum: { totalAmount: true },
      }),
    ]);

    // Get last activity
    const lastActivity = await prisma.activityLog.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    return {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      active: tenant.active,
      createdAt: tenant.createdAt,
      settings: tenant.settings,
      subscription: tenant.subscription || undefined,
      featureCount: tenant.tenantFeatures.length,
      userCount: totalUsers,
      lastActivity: lastActivity?.createdAt,
      features: tenant.tenantFeatures.map(tf => ({
        id: tf.feature.id,
        key: tf.feature.key,
        name: tf.feature.name,
        category: tf.feature.category,
        enabled: tf.enabled,
        enabledAt: tf.enabledAt,
      })),
      users: tenant.users,
      stats: {
        totalUsers,
        activeUsers,
        totalClasses,
        totalBookings,
        totalOrders,
        revenue: orderRevenue._sum.totalAmount || 0,
      },
    };
  }

  /**
   * Create a new tenant
   */
  async createTenant(data: TenantCreateData): Promise<Tenant> {
    // Check if subdomain is already taken
    const existing = await prisma.tenant.findUnique({
      where: { subdomain: data.subdomain },
    });

    if (existing) {
      throw new Error(`Subdomain '${data.subdomain}' is already taken`);
    }

    // Create tenant with default settings
    return await prisma.tenant.create({
      data: {
        name: data.name,
        subdomain: data.subdomain,
        email: data.email,
        phone: data.phone,
        address: data.address,
        settings: data.settings || {},
        active: data.active !== undefined ? data.active : true,
      },
    });
  }

  /**
   * Update a tenant
   */
  async updateTenant(tenantId: string, data: TenantUpdateData): Promise<Tenant> {
    return await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        settings: data.settings,
        active: data.active,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Activate or deactivate a tenant
   */
  async setTenantActive(tenantId: string, active: boolean): Promise<Tenant> {
    return await prisma.tenant.update({
      where: { id: tenantId },
      data: { active },
    });
  }

  /**
   * Permanently delete a tenant and all related data (hard delete with cascade)
   */
  async deleteTenant(tenantId: string): Promise<{
    message: string;
    data: { deletedTenant: string; deletedRecords: any };
  }> {
    // First get the tenant with counts of related records
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        _count: {
          select: {
            users: true,
            products: true,
            classes: true,
            bookings: true,
            ptSessions: true,
            orders: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Delete the tenant - Prisma cascade will handle all related records
    await prisma.tenant.delete({
      where: { id: tenantId },
    });

    return {
      message: `Tenant "${tenant.name}" og alle tilknyttede data ble slettet permanent`,
      data: {
        deletedTenant: tenant.name,
        deletedRecords: tenant._count,
      },
    };
  }

  /**
   * Get tenant statistics summary
   */
  async getTenantStats() {
    const [
      totalTenants,
      activeTenants,
      trialTenants,
      subscriptionCounts,
      revenueData,
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { active: true } }),
      prisma.subscription.count({ where: { status: 'TRIAL' } }),
      prisma.subscription.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      prisma.subscription.aggregate({
        where: { status: 'ACTIVE' },
        _sum: { price: true },
      }),
    ]);

    return {
      totalTenants,
      activeTenants,
      inactiveTenants: totalTenants - activeTenants,
      trialTenants,
      subscriptionsByStatus: subscriptionCounts.map(s => ({
        status: s.status,
        count: s._count.status,
      })),
      monthlyRevenue: revenueData._sum.price || 0,
    };
  }

  /**
   * Get tenants with expiring trials
   */
  async getTenantsWithExpiringTrials(daysUntilExpiry: number = 7) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry);

    return await prisma.tenant.findMany({
      where: {
        subscription: {
          status: 'TRIAL',
          trialEndsAt: {
            lte: expiryDate,
            gte: new Date(),
          },
        },
      },
      include: {
        subscription: true,
      },
    });
  }

  /**
   * Get tenants with overdue payments
   */
  async getTenantsWithOverduePayments() {
    return await prisma.tenant.findMany({
      where: {
        subscription: {
          status: 'PAST_DUE',
        },
      },
      include: {
        subscription: true,
      },
    });
  }

  /**
   * Create a new user for a specific tenant
   */
  async createUserForTenant(
    tenantId: string,
    userData: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      role: 'ADMIN' | 'CUSTOMER';
      phone?: string;
    }
  ) {
    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Check if user already exists with this email in this tenant
    const existingUser = await prisma.user.findFirst({
      where: {
        email: userData.email,
        tenantId,
      },
    });

    if (existingUser) {
      throw new Error('User with this email already exists in this tenant');
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        phone: userData.phone,
        tenantId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
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

    return user;
  }

  /**
   * Get all users for a tenant
   */
  async getTenantUsers(tenantId: string) {
    return await prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}

export default new TenantManagementService();
