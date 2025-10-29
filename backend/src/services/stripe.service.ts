import Stripe from 'stripe';
import { prisma } from '../utils/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
});

export class StripeService {
  /**
   * Create a new customer in Stripe
   */
  async createCustomer(email: string, name: string, metadata?: any): Promise<Stripe.Customer> {
    return await stripe.customers.create({
      email,
      name,
      metadata,
    });
  }

  /**
   * Create a subscription for a tenant
   */
  async createSubscription(params: {
    customerId: string;
    priceId: string;
    tenantId: string;
    trialDays?: number;
  }): Promise<Stripe.Subscription> {
    const subscription = await stripe.subscriptions.create({
      customer: params.customerId,
      items: [{ price: params.priceId }],
      trial_period_days: params.trialDays || 14,
      metadata: {
        tenantId: params.tenantId,
      },
    });

    // Update subscription in our database
    await prisma.subscription.update({
      where: { tenantId: params.tenantId },
      data: {
        stripeCustomerId: params.customerId,
        stripeSubscriptionId: subscription.id,
        status: 'TRIAL',
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    });

    return subscription;
  }

  /**
   * Update subscription (upgrade/downgrade)
   */
  async updateSubscription(params: {
    subscriptionId: string;
    newPriceId: string;
  }): Promise<Stripe.Subscription> {
    const subscription = await stripe.subscriptions.retrieve(params.subscriptionId);

    return await stripe.subscriptions.update(params.subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: params.newPriceId,
        },
      ],
      proration_behavior: 'create_prorations',
    });
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string, immediately: boolean = false): Promise<Stripe.Subscription> {
    if (immediately) {
      return await stripe.subscriptions.cancel(subscriptionId);
    } else {
      // Cancel at period end
      return await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    }
  }

  /**
   * Handle webhook events
   */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  private async handleSubscriptionUpdate(subscription: Stripe.Subscription): Promise<void> {
    const tenantId = subscription.metadata.tenantId;

    if (!tenantId) {
      console.error('No tenantId in subscription metadata');
      return;
    }

    const status = this.mapStripeStatus(subscription.status);

    await prisma.subscription.update({
      where: { tenantId },
      data: {
        status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
      },
    });

    // If subscription becomes inactive, suspend tenant
    if (status === 'SUSPENDED' || status === 'CANCELLED') {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { active: false },
      });
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const tenantId = subscription.metadata.tenantId;

    if (!tenantId) return;

    await prisma.subscription.update({
      where: { tenantId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });

    // Suspend tenant (don't delete, keep data for 30 days)
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { active: false },
    });
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    if (!invoice.subscription) return;

    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    const tenantId = subscription.metadata.tenantId;

    if (!tenantId) return;

    // Create invoice record
    await prisma.invoice.create({
      data: {
        subscriptionId: (await prisma.subscription.findUnique({
          where: { tenantId },
          select: { id: true },
        }))!.id,
        invoiceNumber: invoice.number || `INV-${invoice.id}`,
        amount: (invoice.amount_due - (invoice.tax || 0)) / 100,
        tax: (invoice.tax || 0) / 100,
        total: invoice.amount_due / 100,
        currency: invoice.currency.toUpperCase(),
        status: 'paid',
        dueDate: new Date(invoice.due_date! * 1000),
        paidAt: new Date(invoice.status_transitions.paid_at! * 1000),
        stripeInvoiceId: invoice.id,
        invoiceUrl: invoice.hosted_invoice_url || undefined,
      },
    });
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    if (!invoice.subscription) return;

    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    const tenantId = subscription.metadata.tenantId;

    if (!tenantId) return;

    // Update subscription to PAST_DUE
    await prisma.subscription.update({
      where: { tenantId },
      data: { status: 'PAST_DUE' },
    });

    // TODO: Send email notification to tenant
    console.log(`Payment failed for tenant ${tenantId}`);
  }

  private mapStripeStatus(status: Stripe.Subscription.Status): 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELLED' {
    switch (status) {
      case 'trialing':
        return 'TRIAL';
      case 'active':
        return 'ACTIVE';
      case 'past_due':
        return 'PAST_DUE';
      case 'canceled':
      case 'unpaid':
        return 'CANCELLED';
      default:
        return 'SUSPENDED';
    }
  }

  /**
   * Create payment intent for one-time payments
   */
  async createPaymentIntent(params: {
    amount: number;
    currency: string;
    tenantId: string;
    userId: string;
    description?: string;
  }): Promise<Stripe.PaymentIntent> {
    return await stripe.paymentIntents.create({
      amount: Math.round(params.amount * 100), // Convert to cents
      currency: params.currency.toLowerCase(),
      metadata: {
        tenantId: params.tenantId,
        userId: params.userId,
      },
      description: params.description,
    });
  }

  /**
   * Get Stripe pricing based on plan
   */
  getPriceId(plan: 'STARTER' | 'BASIC' | 'PRO' | 'ENTERPRISE', billingCycle: 'MONTHLY' | 'YEARLY'): string {
    // These would be actual Stripe Price IDs from your Stripe dashboard
    const prices: Record<string, Record<string, string>> = {
      STARTER: {
        MONTHLY: process.env.STRIPE_PRICE_STARTER_MONTHLY || 'price_starter_monthly',
        YEARLY: process.env.STRIPE_PRICE_STARTER_YEARLY || 'price_starter_yearly',
      },
      BASIC: {
        MONTHLY: process.env.STRIPE_PRICE_BASIC_MONTHLY || 'price_basic_monthly',
        YEARLY: process.env.STRIPE_PRICE_BASIC_YEARLY || 'price_basic_yearly',
      },
      PRO: {
        MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly',
        YEARLY: process.env.STRIPE_PRICE_PRO_YEARLY || 'price_pro_yearly',
      },
      ENTERPRISE: {
        MONTHLY: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || 'price_enterprise_monthly',
        YEARLY: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY || 'price_enterprise_yearly',
      },
    };

    return prices[plan][billingCycle];
  }
}

export const stripeService = new StripeService();
