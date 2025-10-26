import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

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
}
