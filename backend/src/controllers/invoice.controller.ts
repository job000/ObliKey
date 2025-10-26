import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

export class InvoiceController {
  // Generate invoice number
  private async generateInvoiceNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.invoice.count({
      where: {
        tenantId,
        invoiceNumber: { startsWith: `INV-${year}-` }
      }
    });
    return `INV-${year}-${String(count + 1).padStart(3, '0')}`;
  }

  // Get invoices
  async getInvoices(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { status, customerId, startDate, endDate } = req.query;

      const invoices = await prisma.invoice.findMany({
        where: {
          tenantId,
          ...(status && { status: status as any }),
          ...(customerId && { customerId: customerId as string }),
          ...(startDate && endDate && {
            issueDate: {
              gte: new Date(startDate as string),
              lte: new Date(endDate as string)
            }
          })
        },
        include: {
          customer: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          },
          lines: {
            include: {
              product: true
            },
            orderBy: { sortOrder: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({ success: true, data: invoices });
    } catch (error) {
      console.error('Get invoices error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente fakturaer' });
    }
  }

  // Get single invoice
  async getInvoice(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;

      const invoice = await prisma.invoice.findFirst({
        where: { id, tenantId },
        include: {
          customer: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true
            }
          },
          lines: {
            include: {
              product: true
            },
            orderBy: { sortOrder: 'asc' }
          }
        }
      });

      if (!invoice) {
        throw new AppError('Faktura ikke funnet', 404);
      }

      res.json({ success: true, data: invoice });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Get invoice error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke hente faktura' });
      }
    }
  }

  // Create invoice
  async createInvoice(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const {
        customerId,
        customerName,
        customerEmail,
        customerAddress,
        customerVatNumber,
        dueDate,
        lines,
        notes,
        paymentTerms
      } = req.body;

      if (!customerName || !lines || lines.length === 0) {
        throw new AppError('Kundenavn og fakturalinjer er påkrevd', 400);
      }

      if (!dueDate) {
        throw new AppError('Forfallsdato er påkrevd', 400);
      }

      const invoiceNumber = await this.generateInvoiceNumber(tenantId);

      // Calculate totals
      let subtotal = 0;
      let vatAmount = 0;

      const processedLines = lines.map((line: any, index: number) => {
        const lineSubtotal = line.quantity * line.unitPrice;
        const lineVatAmount = this.calculateVAT(lineSubtotal, line.vatRate || 'RATE_25');
        const lineTotal = lineSubtotal + lineVatAmount;

        subtotal += lineSubtotal;
        vatAmount += lineVatAmount;

        return {
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          vatRate: line.vatRate || 'RATE_25',
          vatAmount: lineVatAmount,
          total: lineTotal,
          sortOrder: index,
          productId: line.productId
        };
      });

      const total = subtotal + vatAmount;

      const invoice = await prisma.invoice.create({
        data: {
          tenantId,
          invoiceNumber,
          customerId: customerId || null,
          customerName,
          customerEmail: customerEmail || null,
          customerAddress: customerAddress || null,
          customerVatNumber: customerVatNumber || null,
          dueDate: new Date(dueDate),
          subtotal,
          vatAmount,
          total,
          notes: notes || null,
          paymentTerms: paymentTerms || null,
          createdBy: userId,
          lines: {
            create: processedLines
          }
        },
        include: {
          lines: true,
          customer: {
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
        data: invoice,
        message: 'Faktura opprettet'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Create invoice error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke opprette faktura' });
      }
    }
  }

  // Update invoice
  async updateInvoice(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;
      const updateData = req.body;

      // Check if invoice exists and is editable
      const existing = await prisma.invoice.findFirst({
        where: { id, tenantId }
      });

      if (!existing) {
        throw new AppError('Faktura ikke funnet', 404);
      }

      if (existing.status === 'PAID' || existing.status === 'CANCELLED') {
        throw new AppError('Kan ikke redigere betalt eller kansellert faktura', 400);
      }

      const invoice = await prisma.invoice.update({
        where: { id },
        data: updateData,
        include: {
          lines: true
        }
      });

      res.json({
        success: true,
        data: invoice,
        message: 'Faktura oppdatert'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Update invoice error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke oppdatere faktura' });
      }
    }
  }

  // Send invoice
  async sendInvoice(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;

      const invoice = await prisma.invoice.findFirst({
        where: { id, tenantId }
      });

      if (!invoice) {
        throw new AppError('Faktura ikke funnet', 404);
      }

      // Update status to SENT
      const updated = await prisma.invoice.update({
        where: { id },
        data: {
          status: 'SENT',
          sentAt: new Date()
        }
      });

      // TODO: Send email with PDF attachment

      res.json({
        success: true,
        data: updated,
        message: 'Faktura sendt'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Send invoice error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke sende faktura' });
      }
    }
  }

  // Mark invoice as paid
  async markAsPaid(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;

      const invoice = await prisma.invoice.findFirst({
        where: { id, tenantId },
        include: { lines: true }
      });

      if (!invoice) {
        throw new AppError('Faktura ikke funnet', 404);
      }

      // Update invoice status
      const updated = await prisma.invoice.update({
        where: { id },
        data: {
          status: 'PAID',
          paidAt: new Date()
        }
      });

      // Create income transaction
      await prisma.transaction.create({
        data: {
          tenantId,
          type: 'INCOME',
          accountId: (await this.getDefaultIncomeAccount(tenantId)),
          description: `Betaling for ${invoice.invoiceNumber}`,
          amount: invoice.total,
          vatAmount: invoice.vatAmount,
          transactionDate: new Date(),
          createdBy: userId
        }
      });

      res.json({
        success: true,
        data: updated,
        message: 'Faktura merket som betalt'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Mark as paid error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke merke som betalt' });
      }
    }
  }

  // Cancel invoice
  async cancelInvoice(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;

      const existing = await prisma.invoice.findFirst({
        where: { id, tenantId }
      });

      if (!existing) {
        throw new AppError('Faktura ikke funnet', 404);
      }

      const invoice = await prisma.invoice.update({
        where: { id },
        data: { status: 'CANCELLED' }
      });

      res.json({
        success: true,
        data: invoice,
        message: 'Faktura kansellert'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Cancel invoice error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke kansellere faktura' });
      }
    }
  }

  // Delete invoice
  async deleteInvoice(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;

      const existing = await prisma.invoice.findFirst({
        where: { id, tenantId }
      });

      if (!existing) {
        throw new AppError('Faktura ikke funnet', 404);
      }

      if (existing.status === 'PAID') {
        throw new AppError('Kan ikke slette betalt faktura', 400);
      }

      // Delete invoice lines first
      await prisma.invoiceLine.deleteMany({
        where: { invoiceId: id }
      });

      // Delete invoice
      await prisma.invoice.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Faktura slettet'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Delete invoice error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke slette faktura' });
      }
    }
  }

  // Send reminder
  async sendReminder(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;

      const invoice = await prisma.invoice.findFirst({
        where: { id, tenantId },
        include: {
          customer: {
            select: {
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      if (!invoice) {
        throw new AppError('Faktura ikke funnet', 404);
      }

      if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') {
        throw new AppError('Kan ikke sende purring for betalt eller kansellert faktura', 400);
      }

      // TODO: Send email reminder
      // For now, just update the status if overdue
      const now = new Date();
      const dueDate = new Date(invoice.dueDate);

      let updatedInvoice = invoice;
      if (dueDate < now && invoice.status === 'SENT') {
        updatedInvoice = await prisma.invoice.update({
          where: { id },
          data: { status: 'OVERDUE' }
        });
      }

      res.json({
        success: true,
        data: updatedInvoice,
        message: 'Purring sendt'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Send reminder error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke sende purring' });
      }
    }
  }

  // Helper methods
  private calculateVAT(amount: number, vatRate: string): number {
    const rates: any = {
      'RATE_25': 0.25,
      'RATE_15': 0.15,
      'RATE_12': 0.12,
      'RATE_0': 0,
      'EXEMPT': 0
    };
    return amount * (rates[vatRate] || 0);
  }

  private async getDefaultIncomeAccount(tenantId: string): Promise<string> {
    let account = await prisma.account.findFirst({
      where: {
        tenantId,
        accountNumber: '3000' // Standard sales account
      }
    });

    if (!account) {
      // Create default income account
      account = await prisma.account.create({
        data: {
          tenantId,
          accountNumber: '3000',
          name: 'Salgsinntekt',
          type: 'INCOME',
          vatCode: 'RATE_25'
        }
      });
    }

    return account.id;
  }
}
