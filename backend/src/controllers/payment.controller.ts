import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { encryptCredentials, VippsCredentials, StripeCredentials, generateSecureToken } from '../utils/encryption';
import { getVippsService } from '../services/vipps.service';
import { getStripeService } from '../services/stripe.service';

export class PaymentController {
  // Create payment
  async createPayment(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { userId, amount, type, description, ptSessionId } = req.body;

      const payment = await prisma.payment.create({
        data: {
          tenantId,
          userId,
          amount,
          type,
          description,
          ptSessionId,
          status: 'PENDING'
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      res.status(201).json({
        success: true,
        data: payment,
        message: 'Betaling opprettet'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Kunne ikke opprette betaling' });
    }
  }

  // Get payments
  async getPayments(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const { status, type } = req.query;

      const payments = await prisma.payment.findMany({
        where: {
          tenantId,
          ...(userRole === 'CUSTOMER' && { userId }),
          ...(status && { status: status as any }),
          ...(type && { type: type as any })
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          },
          ptSession: {
            select: {
              title: true,
              startTime: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({ success: true, data: payments });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Kunne ikke hente betalinger' });
    }
  }

  // Update payment status
  async updatePaymentStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const payment = await prisma.payment.update({
        where: { id },
        data: {
          status,
          ...(status === 'COMPLETED' && { paidAt: new Date() })
        }
      });

      res.json({
        success: true,
        data: payment,
        message: 'Betalingsstatus oppdatert'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Kunne ikke oppdatere betaling' });
    }
  }

  // Get payment statistics
  async getStatistics(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { startDate, endDate } = req.query;

      const payments = await prisma.payment.findMany({
        where: {
          tenantId,
          status: 'COMPLETED',
          ...(startDate && endDate && {
            paidAt: {
              gte: new Date(startDate as string),
              lte: new Date(endDate as string)
            }
          })
        }
      });

      const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
      const byType = payments.reduce((acc, p) => {
        acc[p.type] = (acc[p.type] || 0) + p.amount;
        return acc;
      }, {} as Record<string, number>);

      res.json({
        success: true,
        data: {
          totalRevenue,
          totalTransactions: payments.length,
          byType,
          averageTransaction: payments.length > 0 ? totalRevenue / payments.length : 0
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Kunne ikke hente statistikk' });
    }
  }

  /**
   * GET /api/payments/config
   * List all payment configurations for tenant
   */
  async getPaymentConfigs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;

      const configs = await prisma.tenantPaymentConfig.findMany({
        where: { tenantId },
        select: {
          id: true,
          provider: true,
          enabled: true,
          testMode: true,
          displayName: true,
          sortOrder: true,
          vippsMerchantSerialNumber: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { sortOrder: 'asc' },
      });

      res.json({ success: true, data: configs });
    } catch (error) {
      console.error('Get payment configs error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente betalingskonfigurasjoner' });
    }
  }

  /**
   * POST /api/payments/config
   * Create or update payment configuration
   */
  async createOrUpdatePaymentConfig(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const { provider, enabled, testMode, credentials, displayName, sortOrder } = req.body;

      const validProviders = ['VIPPS', 'STRIPE', 'CARD'];
      if (!validProviders.includes(provider)) {
        res.status(400).json({ success: false, error: 'Ugyldig betalingsleverandør' });
        return;
      }

      let encryptedCredentials: string;
      let vippsMSN: string | undefined;

      if (provider === 'VIPPS') {
        const vippsCredentials: VippsCredentials = {
          clientId: credentials.clientId,
          clientSecret: credentials.clientSecret,
          subscriptionKey: credentials.subscriptionKey,
          merchantSerialNumber: credentials.merchantSerialNumber,
        };
        encryptedCredentials = encryptCredentials(vippsCredentials);
        vippsMSN = credentials.merchantSerialNumber;
      } else if (provider === 'STRIPE') {
        const stripeCredentials: StripeCredentials = {
          secretKey: credentials.secretKey,
          publishableKey: credentials.publishableKey,
          webhookSecret: credentials.webhookSecret,
        };
        encryptedCredentials = encryptCredentials(stripeCredentials);
      } else {
        encryptedCredentials = encryptCredentials(credentials);
      }

      const webhookSecret = credentials.webhookSecret || generateSecureToken(32);

      const config = await prisma.tenantPaymentConfig.upsert({
        where: {
          tenantId_provider: {
            tenantId,
            provider,
          },
        },
        create: {
          tenantId,
          provider,
          enabled: enabled ?? false,
          testMode: testMode ?? true,
          credentialsEncrypted: encryptedCredentials,
          webhookSecret,
          vippsMerchantSerialNumber: vippsMSN,
          displayName: displayName || provider,
          sortOrder: sortOrder ?? 0,
        },
        update: {
          enabled: enabled ?? undefined,
          testMode: testMode ?? undefined,
          credentialsEncrypted: encryptedCredentials,
          webhookSecret,
          vippsMerchantSerialNumber: vippsMSN,
          displayName: displayName ?? undefined,
          sortOrder: sortOrder ?? undefined,
        },
        select: {
          id: true,
          provider: true,
          enabled: true,
          testMode: true,
          displayName: true,
          sortOrder: true,
          vippsMerchantSerialNumber: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await prisma.activityLog.create({
        data: {
          tenantId,
          userId,
          action: 'UPDATE',
          entityType: 'PAYMENT_CONFIG',
          entityId: config.id,
          description: `${enabled ? 'Aktiverte' : 'Konfigurerte'} ${provider} betalingsleverandør`,
        },
      });

      res.json({ success: true, data: config, message: 'Betalingskonfigurasjonen ble lagret' });
    } catch (error) {
      console.error('Create/update payment config error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke lagre betalingskonfigurasjon' });
    }
  }

  /**
   * PUT /api/payments/config/:provider/toggle
   * Toggle payment provider enabled/disabled
   */
  async toggleProvider(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const { provider } = req.params;
      const { enabled } = req.body;

      const config = await prisma.tenantPaymentConfig.update({
        where: {
          tenantId_provider: {
            tenantId,
            provider: provider as any,
          },
        },
        data: { enabled },
        select: {
          id: true,
          provider: true,
          enabled: true,
          testMode: true,
          displayName: true,
        },
      });

      await prisma.activityLog.create({
        data: {
          tenantId,
          userId,
          action: 'UPDATE',
          entityType: 'PAYMENT_CONFIG',
          entityId: config.id,
          description: `${enabled ? 'Aktiverte' : 'Deaktiverte'} ${provider} betalingsleverandør`,
        },
      });

      res.json({ success: true, data: config });
    } catch (error) {
      console.error('Toggle payment provider error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke endre betalingsleverandør' });
    }
  }

  /**
   * DELETE /api/payments/config/:provider
   * Delete payment configuration
   */
  async deletePaymentConfig(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const { provider } = req.params;

      await prisma.tenantPaymentConfig.delete({
        where: {
          tenantId_provider: {
            tenantId,
            provider: provider as any,
          },
        },
      });

      await prisma.activityLog.create({
        data: {
          tenantId,
          userId,
          action: 'DELETE',
          entityType: 'PAYMENT_CONFIG',
          description: `Slettet ${provider} betalingsleverandør konfigurasjon`,
        },
      });

      res.json({ success: true, message: 'Betalingskonfigurasjonen ble slettet' });
    } catch (error) {
      console.error('Delete payment config error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke slette betalingskonfigurasjon' });
    }
  }

  /**
   * POST /api/payments/config/:provider/test
   * Test payment provider connection
   */
  async testProviderConnection(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const { provider } = req.params;

      let testResult: { success: boolean; message: string; error?: string };

      if (provider === 'VIPPS') {
        const vippsService = await getVippsService(tenantId);

        if (!vippsService) {
          res.status(404).json({ success: false, error: 'Vipps er ikke konfigurert' });
          return;
        }

        try {
          await (vippsService as any).getAccessToken();
          testResult = {
            success: true,
            message: 'Tilkoblingen til Vipps ePay API fungerer',
          };
        } catch (error: any) {
          testResult = {
            success: false,
            message: 'Kunne ikke koble til Vipps ePay API',
            error: error.message,
          };
        }
      } else if (provider === 'STRIPE') {
        const stripeService = await getStripeService(tenantId);

        if (!stripeService) {
          res.status(404).json({ success: false, error: 'Stripe er ikke konfigurert' });
          return;
        }

        try {
          await stripeService.createPaymentIntent({
            amount: 0.01,
            currency: 'NOK',
            tenantId,
            userId,
            description: 'Tilkoblingstest',
          });

          testResult = {
            success: true,
            message: 'Tilkoblingen til Stripe API fungerer',
          };
        } catch (error: any) {
          testResult = {
            success: false,
            message: 'Kunne ikke koble til Stripe API',
            error: error.message,
          };
        }
      } else {
        res.status(400).json({ success: false, error: 'Test er ikke tilgjengelig for denne leverandøren' });
        return;
      }

      res.json(testResult);
    } catch (error) {
      console.error('Test provider connection error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke teste tilkobling' });
    }
  }

  /**
   * GET /api/payments/available
   * Get available payment methods for checkout
   */
  async getAvailablePaymentMethods(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;

      const configs = await prisma.tenantPaymentConfig.findMany({
        where: {
          tenantId,
          enabled: true,
        },
        select: {
          provider: true,
          displayName: true,
          sortOrder: true,
        },
        orderBy: { sortOrder: 'asc' },
      });

      res.json({ success: true, data: configs });
    } catch (error) {
      console.error('Get available payment methods error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente betalingsmetoder' });
    }
  }
}
