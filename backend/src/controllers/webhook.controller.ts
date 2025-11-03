import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { VippsService } from '../services/vipps.service';
import Stripe from 'stripe';

export class WebhookController {
  /**
   * POST /api/webhooks/vipps
   * Handle Vipps payment webhooks
   */
  async handleVippsWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { orderId, transactionInfo } = req.body;

      if (!orderId) {
        res.status(400).json({ error: 'Missing orderId' });
        return;
      }

      console.log('[Vipps Webhook] Received:', { orderId, transactionInfo });

      // Find payment by vippsOrderId
      const payment = await prisma.payment.findFirst({
        where: { vippsOrderId: orderId },
        include: { order: true },
      });

      if (!payment) {
        console.warn('[Vipps Webhook] Payment not found for orderId:', orderId);
        res.status(404).json({ error: 'Payment not found' });
        return;
      }

      // Map Vipps status to our status
      let newStatus: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' = 'PENDING';

      if (transactionInfo?.status) {
        switch (transactionInfo.status) {
          case 'RESERVE':
          case 'SALE':
            newStatus = 'COMPLETED';
            break;
          case 'CANCEL':
          case 'VOID':
            newStatus = 'FAILED';
            break;
          case 'REFUND':
            newStatus = 'REFUNDED';
            break;
        }
      }

      // Update payment status
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: newStatus,
          providerResponse: req.body,
          ...(newStatus === 'COMPLETED' && { paidAt: new Date() }),
        },
      });

      // Update order status if payment is completed
      if (newStatus === 'COMPLETED' && payment.order) {
        await prisma.order.update({
          where: { id: payment.order.id },
          data: {
            status: 'PROCESSING',
            paidAt: new Date(),
          },
        });

        console.log('[Vipps Webhook] Order updated:', payment.order.orderNumber);
      }

      // Log webhook activity
      await prisma.activityLog.create({
        data: {
          tenantId: payment.tenantId,
          userId: payment.userId,
          action: 'UPDATE',
          entityType: 'PAYMENT',
          entityId: payment.id,
          description: `Vipps webhook: ${newStatus}`,
        },
      });

      res.json({ success: true, message: 'Webhook processed' });
    } catch (error) {
      console.error('[Vipps Webhook] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /api/webhooks/stripe
   * Handle Stripe payment webhooks
   */
  async handleStripeWebhook(req: Request, res: Response): Promise<void> {
    const sig = req.headers['stripe-signature'] as string;

    // Note: Webhook signature verification should be done in middleware
    // For now, we'll process the event directly

    try {
      const event = req.body;

      console.log('[Stripe Webhook] Event type:', event.type);

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handleStripePaymentSuccess(event.data.object);
          break;

        case 'payment_intent.payment_failed':
          await this.handleStripePaymentFailed(event.data.object);
          break;

        case 'charge.refunded':
          await this.handleStripeRefund(event.data.object);
          break;

        default:
          console.log('[Stripe Webhook] Unhandled event type:', event.type);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('[Stripe Webhook] Error:', error);
      res.status(400).json({ error: 'Webhook processing failed' });
    }
  }

  /**
   * Handle successful Stripe payment
   */
  private async handleStripePaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const payment = await prisma.payment.findFirst({
      where: { stripeId: paymentIntent.id },
      include: { order: true },
    });

    if (!payment) {
      console.warn('[Stripe Webhook] Payment not found for PI:', paymentIntent.id);
      return;
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'COMPLETED',
        paidAt: new Date(),
        providerResponse: paymentIntent as any,
      },
    });

    // Update order status
    if (payment.order) {
      await prisma.order.update({
        where: { id: payment.order.id },
        data: {
          status: 'PROCESSING',
          paidAt: new Date(),
        },
      });

      console.log('[Stripe Webhook] Order updated:', payment.order.orderNumber);
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        tenantId: payment.tenantId,
        userId: payment.userId,
        action: 'UPDATE',
        entityType: 'PAYMENT',
        entityId: payment.id,
        description: 'Stripe payment succeeded',
      },
    });
  }

  /**
   * Handle failed Stripe payment
   */
  private async handleStripePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const payment = await prisma.payment.findFirst({
      where: { stripeId: paymentIntent.id },
      include: { order: true },
    });

    if (!payment) {
      console.warn('[Stripe Webhook] Payment not found for PI:', paymentIntent.id);
      return;
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'FAILED',
        errorMessage: paymentIntent.last_payment_error?.message || 'Payment failed',
        providerResponse: paymentIntent as any,
      },
    });

    // Update order status
    if (payment.order) {
      await prisma.order.update({
        where: { id: payment.order.id },
        data: {
          status: 'CANCELLED',
        },
      });

      console.log('[Stripe Webhook] Order cancelled:', payment.order.orderNumber);
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        tenantId: payment.tenantId,
        userId: payment.userId,
        action: 'UPDATE',
        entityType: 'PAYMENT',
        entityId: payment.id,
        description: 'Stripe payment failed',
      },
    });
  }

  /**
   * Handle Stripe refund
   */
  private async handleStripeRefund(charge: Stripe.Charge): Promise<void> {
    const payment = await prisma.payment.findFirst({
      where: { stripeId: charge.payment_intent as string },
      include: { order: true },
    });

    if (!payment) {
      console.warn('[Stripe Webhook] Payment not found for charge:', charge.id);
      return;
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'REFUNDED',
        providerResponse: charge as any,
      },
    });

    // Update order status
    if (payment.order) {
      await prisma.order.update({
        where: { id: payment.order.id },
        data: {
          status: 'REFUNDED',
        },
      });

      console.log('[Stripe Webhook] Order refunded:', payment.order.orderNumber);
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        tenantId: payment.tenantId,
        userId: payment.userId,
        action: 'UPDATE',
        entityType: 'PAYMENT',
        entityId: payment.id,
        description: 'Stripe payment refunded',
      },
    });
  }
}
