import { PrismaClient, Subscription, SubscriptionStatus, SubscriptionInterval, InvoiceStatusEnum } from '@prisma/client';
import featureManagementService from './feature-management.service';

const prisma = new PrismaClient();

export interface SubscriptionCreateData {
  tenantId: string;
  featurePackId?: string;
  tier?: string;
  interval: SubscriptionInterval;
  price: number;
  currency?: string;
  trialDays?: number;
  customFeatures?: any;
  billingEmail?: string;
  billingName?: string;
  billingAddress?: string;
  billingPhone?: string;
  vatNumber?: string;
  notes?: string;
}

export interface SubscriptionUpdateData {
  featurePackId?: string;
  tier?: string;
  interval?: SubscriptionInterval;
  price?: number;
  currency?: string;
  customFeatures?: any;
  billingEmail?: string;
  billingName?: string;
  billingAddress?: string;
  billingPhone?: string;
  vatNumber?: string;
  notes?: string;
}

export interface InvoiceCreateData {
  subscriptionId: string;
  amount: number;
  currency?: string;
  vatAmount?: number;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  description?: string;
  notes?: string;
}

export class SubscriptionService {
  /**
   * Create a subscription for a tenant
   */
  async createSubscription(data: SubscriptionCreateData): Promise<Subscription> {
    // Check if tenant already has a subscription
    const existing = await prisma.subscription.findUnique({
      where: { tenantId: data.tenantId },
    });

    if (existing) {
      throw new Error('Tenant already has a subscription');
    }

    // Calculate trial end date
    const trialEndsAt = data.trialDays
      ? new Date(Date.now() + data.trialDays * 24 * 60 * 60 * 1000)
      : null;

    // Calculate first billing period
    const now = new Date();
    const currentPeriodEnd = this.calculateNextBillingDate(now, data.interval);

    const subscription = await prisma.subscription.create({
      data: {
        tenantId: data.tenantId,
        featurePackId: data.featurePackId,
        tier: data.tier,
        status: data.trialDays && data.trialDays > 0 ? 'TRIAL' : 'ACTIVE',
        interval: data.interval,
        price: data.price,
        currency: data.currency || 'NOK',
        customFeatures: data.customFeatures,
        trialEndsAt,
        currentPeriodStart: now,
        currentPeriodEnd,
        nextBillingAt: trialEndsAt || currentPeriodEnd,
        billingEmail: data.billingEmail,
        billingName: data.billingName,
        billingAddress: data.billingAddress,
        billingPhone: data.billingPhone,
        vatNumber: data.vatNumber,
        notes: data.notes,
      },
      include: {
        tenant: true,
        featurePack: true,
      },
    });

    // If feature pack is specified, apply features to tenant
    if (data.featurePackId) {
      await featureManagementService.applyFeaturePackToTenant(
        data.tenantId,
        data.featurePackId
      );
    }

    return subscription;
  }

  /**
   * Update a subscription
   */
  async updateSubscription(subscriptionId: string, data: SubscriptionUpdateData): Promise<Subscription> {
    const subscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        featurePackId: data.featurePackId,
        tier: data.tier,
        interval: data.interval,
        price: data.price,
        currency: data.currency,
        customFeatures: data.customFeatures,
        billingEmail: data.billingEmail,
        billingName: data.billingName,
        billingAddress: data.billingAddress,
        billingPhone: data.billingPhone,
        vatNumber: data.vatNumber,
        notes: data.notes,
        updatedAt: new Date(),
      },
      include: {
        tenant: true,
        featurePack: true,
      },
    });

    // If feature pack changed, update tenant features
    if (data.featurePackId) {
      await featureManagementService.applyFeaturePackToTenant(
        subscription.tenantId,
        data.featurePackId
      );
    }

    return subscription;
  }

  /**
   * Change subscription status
   */
  async changeSubscriptionStatus(subscriptionId: string, status: SubscriptionStatus): Promise<Subscription> {
    return await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status },
    });
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = true,
    cancellationReason?: string
  ): Promise<Subscription> {
    const updateData: any = {
      cancelAtPeriodEnd,
      cancelledAt: new Date(),
      cancellationReason,
    };

    if (!cancelAtPeriodEnd) {
      updateData.status = 'CANCELLED';
    }

    return await prisma.subscription.update({
      where: { id: subscriptionId },
      data: updateData,
    });
  }

  /**
   * Reactivate a cancelled subscription
   */
  async reactivateSubscription(subscriptionId: string): Promise<Subscription> {
    return await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'ACTIVE',
        cancelAtPeriodEnd: false,
        cancelledAt: null,
        cancellationReason: null,
      },
    });
  }

  /**
   * Process subscription renewal (called by cron job or webhook)
   */
  async renewSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Calculate next billing period
    const currentPeriodStart = new Date();
    const currentPeriodEnd = this.calculateNextBillingDate(
      currentPeriodStart,
      subscription.interval
    );

    // Update subscription
    const updated = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        currentPeriodStart,
        currentPeriodEnd,
        lastBilledAt: new Date(),
        nextBillingAt: currentPeriodEnd,
      },
    });

    // Generate invoice
    await this.generateInvoice({
      subscriptionId,
      amount: subscription.price,
      currency: subscription.currency,
      vatAmount: subscription.price * 0.25, // 25% VAT (Norway)
      periodStart: currentPeriodStart,
      periodEnd: currentPeriodEnd,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Due in 14 days
      description: `Subscription renewal for ${subscription.tier || 'custom plan'}`,
    });

    return updated;
  }

  /**
   * Generate an invoice for a subscription
   */
  async generateInvoice(data: InvoiceCreateData) {
    const subscription = await prisma.subscription.findUnique({
      where: { id: data.subscriptionId },
      include: { tenant: true },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber();

    const total = data.amount + (data.vatAmount || 0);

    return await prisma.subscriptionInvoice.create({
      data: {
        subscriptionId: data.subscriptionId,
        invoiceNumber,
        amount: data.amount,
        currency: data.currency || subscription.currency,
        vatAmount: data.vatAmount || 0,
        total,
        status: 'DRAFT',
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        dueDate: data.dueDate,
        description: data.description,
        notes: data.notes,
      },
    });
  }

  /**
   * Get all invoices for a subscription
   */
  async getSubscriptionInvoices(subscriptionId: string) {
    return await prisma.subscriptionInvoice.findMany({
      where: { subscriptionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single invoice
   */
  async getInvoiceById(invoiceId: string) {
    return await prisma.subscriptionInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        subscription: {
          include: {
            tenant: true,
          },
        },
      },
    });
  }

  /**
   * Mark invoice as sent
   */
  async markInvoiceSent(invoiceId: string) {
    return await prisma.subscriptionInvoice.update({
      where: { id: invoiceId },
      data: { status: 'SENT' },
    });
  }

  /**
   * Mark invoice as paid
   */
  async markInvoicePaid(
    invoiceId: string,
    paymentMethod?: string,
    paymentId?: string
  ) {
    return await prisma.subscriptionInvoice.update({
      where: { id: invoiceId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paymentMethod,
        paymentId,
      },
    });
  }

  /**
   * Get overdue invoices
   */
  async getOverdueInvoices() {
    return await prisma.subscriptionInvoice.findMany({
      where: {
        status: { in: ['SENT', 'OVERDUE'] },
        dueDate: { lt: new Date() },
      },
      include: {
        subscription: {
          include: {
            tenant: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  /**
   * Send payment reminders for overdue invoices
   */
  async sendPaymentReminders() {
    const overdueInvoices = await this.getOverdueInvoices();

    for (const invoice of overdueInvoices) {
      // Update reminder count
      await prisma.subscriptionInvoice.update({
        where: { id: invoice.id },
        data: {
          status: 'OVERDUE',
          reminderCount: invoice.reminderCount + 1,
          lastReminderAt: new Date(),
        },
      });

      // TODO: Send email reminder to tenant
      // await emailService.sendPaymentReminder(invoice);
    }

    return overdueInvoices.length;
  }

  /**
   * Suspend subscriptions with overdue payments
   */
  async suspendOverdueSubscriptions() {
    const overdueInvoices = await prisma.subscriptionInvoice.findMany({
      where: {
        status: 'OVERDUE',
        reminderCount: { gte: 3 }, // After 3 reminders
        dueDate: {
          lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days overdue
        },
      },
      include: {
        subscription: true,
      },
    });

    const suspendedCount = overdueInvoices.length;

    for (const invoice of overdueInvoices) {
      await prisma.subscription.update({
        where: { id: invoice.subscriptionId },
        data: { status: 'PAST_DUE' },
      });
    }

    return suspendedCount;
  }

  /**
   * Check for expiring trials and convert to active subscriptions
   */
  async processExpiringTrials() {
    const expiringTrials = await prisma.subscription.findMany({
      where: {
        status: 'TRIAL',
        trialEndsAt: {
          lte: new Date(),
        },
      },
    });

    for (const subscription of expiringTrials) {
      await this.renewSubscription(subscription.id);
      await this.changeSubscriptionStatus(subscription.id, 'ACTIVE');
    }

    return expiringTrials.length;
  }

  /**
   * Get subscription statistics
   */
  async getSubscriptionStats() {
    const [
      totalSubscriptions,
      activeSubscriptions,
      trialSubscriptions,
      cancelledSubscriptions,
      revenueData,
      churnRate,
    ] = await Promise.all([
      prisma.subscription.count(),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.subscription.count({ where: { status: 'TRIAL' } }),
      prisma.subscription.count({ where: { status: 'CANCELLED' } }),
      prisma.subscription.aggregate({
        where: { status: 'ACTIVE' },
        _sum: { price: true },
        _avg: { price: true },
      }),
      this.calculateChurnRate(),
    ]);

    return {
      totalSubscriptions,
      activeSubscriptions,
      trialSubscriptions,
      cancelledSubscriptions,
      monthlyRecurringRevenue: revenueData._sum.price || 0,
      averageRevenuePerUser: revenueData._avg.price || 0,
      churnRate,
    };
  }

  /**
   * Calculate churn rate (percentage of cancelled subscriptions in last 30 days)
   */
  private async calculateChurnRate(): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [activeAtStart, cancelledInPeriod] = await Promise.all([
      prisma.subscription.count({
        where: {
          createdAt: { lte: thirtyDaysAgo },
        },
      }),
      prisma.subscription.count({
        where: {
          status: 'CANCELLED',
          cancelledAt: { gte: thirtyDaysAgo },
        },
      }),
    ]);

    if (activeAtStart === 0) return 0;
    return (cancelledInPeriod / activeAtStart) * 100;
  }

  /**
   * Calculate next billing date based on interval
   */
  private calculateNextBillingDate(
    startDate: Date,
    interval: SubscriptionInterval
  ): Date {
    const date = new Date(startDate);

    switch (interval) {
      case 'WEEKLY':
        date.setDate(date.getDate() + 7);
        break;
      case 'MONTHLY':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'QUARTERLY':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'YEARLY':
        date.setFullYear(date.getFullYear() + 1);
        break;
      case 'CUSTOM':
        // For custom intervals, default to monthly
        date.setMonth(date.getMonth() + 1);
        break;
    }

    return date;
  }

  /**
   * Generate unique invoice number
   */
  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    // Get the last invoice number for this year
    const lastInvoice = await prisma.subscriptionInvoice.findFirst({
      where: {
        invoiceNumber: { startsWith: prefix },
      },
      orderBy: { createdAt: 'desc' },
    });

    let nextNumber = 1;
    if (lastInvoice) {
      const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${String(nextNumber).padStart(6, '0')}`;
  }
}

export default new SubscriptionService();
