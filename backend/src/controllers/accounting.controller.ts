import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { suggestPosting, getPostingSuggestion, calculateVAT, calculateAmountExVAT } from '../services/accountingRules.service';
import { seedAccountsForTenant } from '../seeds/seedAccounts';
import {
  calculateMVA,
  validateMVACalculation,
  saveVATReport,
  getCurrentMVAPeriod,
  generateMVAPeriods,
  formatMVAReportText,
  MVAPeriod
} from '../services/mva.service';

export class AccountingController {
  // ============================================
  // INITIALIZATION
  // ============================================

  private async initializeDefaultAccounts(tenantId: string): Promise<void> {
    const existingAccounts = await prisma.account.count({ where: { tenantId } });

    if (existingAccounts > 0) {
      return; // Already initialized
    }

    const defaultAccounts = [
      // Assets (1000-1999)
      { accountNumber: '1500', name: 'Bankinnskudd', type: 'ASSET', vatCode: null, description: 'Bankkonto' },

      // Liabilities (2000-2999)
      { accountNumber: '2400', name: 'Leverandørgjeld', type: 'LIABILITY', vatCode: null, description: 'Gjeld til leverandører' },

      // Income (3000-3999)
      { accountNumber: '3000', name: 'Salgsinntekt', type: 'INCOME', vatCode: 'RATE_25', description: 'Inntekt fra salg' },
      { accountNumber: '3100', name: 'Treningsinntekt', type: 'INCOME', vatCode: 'RATE_25', description: 'Inntekt fra trening' },

      // Expenses (4000-7999)
      { accountNumber: '4000', name: 'Varekjøp', type: 'EXPENSE', vatCode: 'RATE_25', description: 'Kjøp av varer' },
      { accountNumber: '5000', name: 'Lønnskostnader', type: 'EXPENSE', vatCode: 'EXEMPT', description: 'Lønn til ansatte' },
      { accountNumber: '6000', name: 'Kontorkostnader', type: 'EXPENSE', vatCode: 'RATE_25', description: 'Kontorrekvisita mv' },
      { accountNumber: '6100', name: 'Husleie', type: 'EXPENSE', vatCode: 'EXEMPT', description: 'Leie av lokaler' },
      { accountNumber: '6300', name: 'Strøm og oppvarming', type: 'EXPENSE', vatCode: 'RATE_25', description: 'Strøm' },
      { accountNumber: '6340', name: 'Internett og telefon', type: 'EXPENSE', vatCode: 'RATE_25', description: 'Telekommunikasjon' },
      { accountNumber: '6800', name: 'Markedsføring', type: 'EXPENSE', vatCode: 'RATE_25', description: 'Markedsføring og reklame' },
      { accountNumber: '7000', name: 'Frakt og transport', type: 'EXPENSE', vatCode: 'RATE_25', description: 'Transportkostnader' },
    ];

    await prisma.account.createMany({
      data: defaultAccounts.map(account => ({
        tenantId,
        ...account
      }))
    });
  }

  // ============================================
  // DASHBOARD & REPORTS
  // ============================================

  async getDashboard(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;

      // Get all-time stats for better overview
      const [
        totalIncome,
        totalExpenses,
        accountsReceivable,
        accountsPayable
      ] = await Promise.all([
        // Total income (all time)
        prisma.transaction.aggregate({
          where: {
            tenantId,
            type: 'INCOME'
          },
          _sum: { amount: true }
        }),
        // Total expenses (all time)
        prisma.transaction.aggregate({
          where: {
            tenantId,
            type: 'EXPENSE'
          },
          _sum: { amount: true }
        }),
        // Accounts Receivable (unpaid invoices)
        prisma.invoice.aggregate({
          where: {
            tenantId,
            status: { in: ['SENT', 'OVERDUE'] }
          },
          _sum: { total: true }
        }),
        // Accounts Payable (unpaid supplier invoices)
        prisma.invoice.aggregate({
          where: {
            tenantId,
            status: { in: ['SENT', 'OVERDUE'] }
          },
          _sum: { total: true }
        })
      ]);

      res.json({
        success: true,
        data: {
          totalIncome: totalIncome._sum.amount || 0,
          totalExpenses: totalExpenses._sum.amount || 0,
          netProfit: (totalIncome._sum.amount || 0) - (totalExpenses._sum.amount || 0),
          accountsReceivable: accountsReceivable._sum.total || 0,
          accountsPayable: accountsPayable._sum.total || 0
        }
      });
    } catch (error) {
      console.error('Get dashboard error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente dashboard-data' });
    }
  }

  async getIncomeStatement(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), 0, 1);
      const end = endDate ? new Date(endDate as string) : new Date();

      // Get all transactions grouped by account
      const transactions = await prisma.transaction.findMany({
        where: {
          tenantId,
          transactionDate: { gte: start, lte: end }
        },
        include: {
          account: true
        }
      });

      // Group by transaction type and account name
      const incomeAccounts: any = {};
      const expenseAccounts: any = {};

      transactions.forEach(tx => {
        if (tx.type === 'INCOME') {
          if (!incomeAccounts[tx.account.name]) {
            incomeAccounts[tx.account.name] = 0;
          }
          incomeAccounts[tx.account.name] += tx.amount;
        } else if (tx.type === 'EXPENSE') {
          if (!expenseAccounts[tx.account.name]) {
            expenseAccounts[tx.account.name] = 0;
          }
          expenseAccounts[tx.account.name] += tx.amount;
        }
      });

      const totalIncome = Object.values(incomeAccounts).reduce((sum: number, val: any) => sum + val, 0);
      const totalExpenses = Object.values(expenseAccounts).reduce((sum: number, val: any) => sum + val, 0);

      res.json({
        success: true,
        data: {
          period: { start, end },
          income: incomeAccounts,
          expenses: expenseAccounts,
          totalIncome,
          totalExpenses,
          netProfit: totalIncome - totalExpenses
        }
      });
    } catch (error) {
      console.error('Get income statement error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente resultatregnskap' });
    }
  }

  async getVATReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        throw new AppError('Start- og sluttdato er påkrevd', 400);
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      // Get all transactions in period
      const transactions = await prisma.transaction.findMany({
        where: {
          tenantId,
          transactionDate: { gte: start, lte: end }
        }
      });

      const vatOut = transactions
        .filter(t => t.type === 'INCOME')
        .reduce((sum, t) => sum + (t.vatAmount || 0), 0);

      const vatIn = transactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + (t.vatAmount || 0), 0);

      res.json({
        success: true,
        data: {
          period: { start, end },
          outgoingVAT: vatOut,
          incomingVAT: vatIn,
          netVAT: vatOut - vatIn,
          transactions: transactions.map(t => ({
            date: t.transactionDate,
            type: t.type,
            description: t.description,
            amount: t.amount,
            vatAmount: t.vatAmount,
            vatRate: t.vatRate
          }))
        }
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Get VAT report error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke hente MVA-rapport' });
      }
    }
  }

  // ============================================
  // ACCOUNTS (Kontoplan)
  // ============================================

  async getAccounts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { type, active } = req.query;

      // Initialize default accounts if none exist
      await this.initializeDefaultAccounts(tenantId);

      const accounts = await prisma.account.findMany({
        where: {
          tenantId,
          ...(type && { type: type as any }),
          ...(active !== undefined && { active: active === 'true' })
        },
        orderBy: { accountNumber: 'asc' }
      });

      // Calculate balance for each account based on transactions
      const accountsWithBalance = await Promise.all(
        accounts.map(async (account) => {
          const transactions = await prisma.transaction.aggregate({
            where: {
              accountId: account.id
            },
            _sum: {
              amount: true
            }
          });

          return {
            ...account,
            balance: transactions._sum.amount || 0,
            currency: 'NOK'
          };
        })
      );

      res.json({ success: true, data: accountsWithBalance });
    } catch (error) {
      console.error('Get accounts error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente kontoplan' });
    }
  }

  async createAccount(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { accountNumber, name, type, vatCode, description } = req.body;

      if (!accountNumber || !name || !type) {
        throw new AppError('Kontonummer, navn og type er påkrevd', 400);
      }

      const account = await prisma.account.create({
        data: {
          tenantId,
          accountNumber,
          name,
          type,
          vatCode,
          description
        }
      });

      res.status(201).json({
        success: true,
        data: account,
        message: 'Konto opprettet'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Create account error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke opprette konto' });
      }
    }
  }

  async updateAccount(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;
      const updateData = req.body;

      const existing = await prisma.account.findFirst({
        where: { id, tenantId }
      });

      if (!existing) {
        throw new AppError('Konto ikke funnet', 404);
      }

      const account = await prisma.account.update({
        where: { id },
        data: updateData
      });

      res.json({
        success: true,
        data: account,
        message: 'Konto oppdatert'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Update account error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke oppdatere konto' });
      }
    }
  }

  async deleteAccount(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;

      const existing = await prisma.account.findFirst({
        where: { id, tenantId }
      });

      if (!existing) {
        throw new AppError('Konto ikke funnet', 404);
      }

      // Check if account is in use
      const transactionCount = await prisma.transaction.count({
        where: { accountId: id }
      });

      if (transactionCount > 0) {
        throw new AppError('Kan ikke slette konto som er i bruk', 400);
      }

      await prisma.account.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Konto slettet'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Delete account error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke slette konto' });
      }
    }
  }

  // ============================================
  // SUPPLIERS
  // ============================================

  async getSuppliers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { active } = req.query;

      const suppliers = await prisma.supplier.findMany({
        where: {
          tenantId,
          ...(active !== undefined && { active: active === 'true' })
        },
        orderBy: { name: 'asc' }
      });

      res.json({ success: true, data: suppliers });
    } catch (error) {
      console.error('Get suppliers error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente leverandører' });
    }
  }

  async createSupplier(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { name, contactPerson, email, phone, address, vatNumber, accountNumber, notes } = req.body;

      if (!name) {
        throw new AppError('Navn er påkrevd', 400);
      }

      const supplier = await prisma.supplier.create({
        data: {
          tenantId,
          name,
          contactPerson,
          email,
          phone,
          address,
          vatNumber,
          accountNumber,
          notes
        }
      });

      res.status(201).json({
        success: true,
        data: supplier,
        message: 'Leverandør opprettet'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Create supplier error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke opprette leverandør' });
      }
    }
  }

  async updateSupplier(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;
      const updateData = req.body;

      const existing = await prisma.supplier.findFirst({
        where: { id, tenantId }
      });

      if (!existing) {
        throw new AppError('Leverandør ikke funnet', 404);
      }

      const supplier = await prisma.supplier.update({
        where: { id },
        data: updateData
      });

      res.json({
        success: true,
        data: supplier,
        message: 'Leverandør oppdatert'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Update supplier error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke oppdatere leverandør' });
      }
    }
  }

  async deleteSupplier(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;

      const existing = await prisma.supplier.findFirst({
        where: { id, tenantId }
      });

      if (!existing) {
        throw new AppError('Leverandør ikke funnet', 404);
      }

      // Check if supplier is in use
      const transactionCount = await prisma.transaction.count({
        where: { supplierId: id }
      });

      if (transactionCount > 0) {
        throw new AppError('Kan ikke slette leverandør som er i bruk', 400);
      }

      await prisma.supplier.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Leverandør slettet'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Delete supplier error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke slette leverandør' });
      }
    }
  }

  // ============================================
  // TRANSACTIONS
  // ============================================

  async getTransactions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { type, accountId, startDate, endDate } = req.query;

      const transactions = await prisma.transaction.findMany({
        where: {
          tenantId,
          ...(type && { type: type as any }),
          ...(accountId && { accountId: accountId as string }),
          ...(startDate && endDate && {
            transactionDate: {
              gte: new Date(startDate as string),
              lte: new Date(endDate as string)
            }
          })
        },
        include: {
          account: true,
          supplier: true,
          creator: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { transactionDate: 'desc' }
      });

      res.json({ success: true, data: transactions });
    } catch (error) {
      console.error('Get transactions error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente transaksjoner' });
    }
  }

  async createTransaction(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const {
        type,
        accountId,
        supplierId,
        description,
        amount,
        vatRate,
        transactionDate,
        receiptUrl,
        notes
      } = req.body;

      if (!type || !accountId || !description || amount === undefined) {
        throw new AppError('Type, konto, beskrivelse og beløp er påkrevd', 400);
      }

      // Calculate VAT
      let vatAmount = 0;
      if (vatRate) {
        const rates: any = {
          'RATE_25': 0.25,
          'RATE_15': 0.15,
          'RATE_12': 0.12,
          'RATE_0': 0,
          'EXEMPT': 0
        };
        vatAmount = amount * rates[vatRate];
      }

      const transaction = await prisma.transaction.create({
        data: {
          tenantId,
          type,
          accountId,
          supplierId,
          description,
          amount,
          vatAmount,
          vatRate,
          transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
          receiptUrl,
          notes,
          createdBy: userId
        },
        include: {
          account: true,
          supplier: true
        }
      });

      res.status(201).json({
        success: true,
        data: transaction,
        message: 'Transaksjon opprettet'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Create transaction error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke opprette transaksjon' });
      }
    }
  }

  // ============================================
  // MODULE SETTINGS
  // ============================================

  async toggleAccountingModule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { enabled } = req.body;

      if (enabled === undefined) {
        throw new AppError('Status er påkrevd', 400);
      }

      // Get or create tenant settings
      let settings = await prisma.tenantSettings.findUnique({
        where: { tenantId }
      });

      if (!settings) {
        // Create default settings if they don't exist
        settings = await prisma.tenantSettings.create({
          data: {
            tenantId,
            accountingEnabled: enabled
          }
        });
      } else {
        // Update existing settings
        settings = await prisma.tenantSettings.update({
          where: { tenantId },
          data: { accountingEnabled: enabled }
        });
      }

      // If enabling accounting, initialize default accounts
      if (enabled && !settings.accountingEnabled) {
        await this.initializeDefaultAccounts(tenantId);
      }

      res.json({
        success: true,
        data: settings,
        message: enabled ? 'Regnskapsmodulen er aktivert' : 'Regnskapsmodulen er deaktivert'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Toggle accounting module error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke oppdatere modulstatus' });
      }
    }
  }

  async getModuleStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;

      const settings = await prisma.tenantSettings.findUnique({
        where: { tenantId },
        select: { accountingEnabled: true }
      });

      res.json({
        success: true,
        data: {
          accountingEnabled: settings?.accountingEnabled || false
        }
      });
    } catch (error) {
      console.error('Get module status error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente modulstatus' });
    }
  }

  // ============================================
  // AUTOMATIC POSTING SUGGESTIONS
  // ============================================

  /**
   * Get posting suggestion based on transaction description
   * POST /api/accounting/suggest-posting
   */
  async suggestPostingAccounts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { description, amount, supplierName } = req.body;

      if (!description) {
        throw new AppError('Beskrivelse er påkrevd', 400);
      }

      const suggestion = await getPostingSuggestion(
        description,
        amount || 0,
        supplierName
      );

      if (!suggestion) {
        res.json({
          success: true,
          data: null,
          message: 'Ingen automatisk forslag funnet'
        });
        return;
      }

      res.json({
        success: true,
        data: suggestion
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Suggest posting error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke hente posteringsforslag' });
      }
    }
  }

  // ============================================
  // NORWEGIAN CHART OF ACCOUNTS
  // ============================================

  /**
   * Seed Norwegian chart of accounts for a tenant
   * POST /api/accounting/seed-norwegian-accounts
   */
  async seedNorwegianAccounts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userRole = req.user!.role;

      // Only admins can seed accounts
      if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
        throw new AppError('Kun administratorer kan initialisere kontoplan', 403);
      }

      // Check if accounts already exist
      const existingCount = await prisma.account.count({
        where: { tenantId }
      });

      if (existingCount > 50) {
        throw new AppError('Kontoplanen er allerede initialisert', 400);
      }

      // Seed the accounts
      await seedAccountsForTenant(tenantId);

      const newCount = await prisma.account.count({
        where: { tenantId }
      });

      res.json({
        success: true,
        message: `Norsk kontoplan initialisert med ${newCount} kontoer`
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Seed Norwegian accounts error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke initialisere kontoplan' });
      }
    }
  }

  // ============================================
  // ACCOUNT BALANCES
  // ============================================

  /**
   * Get account balances
   * GET /api/accounting/account-balances
   */
  async getAccountBalances(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { asOfDate } = req.query;

      const endDate = asOfDate ? new Date(asOfDate as string) : new Date();

      // Get all accounts
      const accounts = await prisma.account.findMany({
        where: { tenantId, active: true },
        orderBy: { accountNumber: 'asc' }
      });

      // Calculate balance for each account based on transactions
      const accountBalances = await Promise.all(
        accounts.map(async (account) => {
          const transactions = await prisma.transaction.findMany({
            where: {
              accountId: account.id,
              transactionDate: { lte: endDate }
            }
          });

          // Calculate balance based on account type
          let balance = 0;
          transactions.forEach(tx => {
            if (account.type === 'ASSET' || account.type === 'EXPENSE') {
              // Debit increases, credit decreases
              balance += tx.type === 'EXPENSE' ? tx.amount : -tx.amount;
            } else {
              // Credit increases, debit decreases
              balance += tx.type === 'INCOME' ? tx.amount : -tx.amount;
            }
          });

          return {
            id: account.id,
            accountNumber: account.accountNumber,
            name: account.name,
            type: account.type,
            balance,
            transactionCount: transactions.length
          };
        })
      );

      // Group by type
      const grouped = {
        ASSET: accountBalances.filter(a => a.type === 'ASSET'),
        LIABILITY: accountBalances.filter(a => a.type === 'LIABILITY'),
        EQUITY: accountBalances.filter(a => a.type === 'EQUITY'),
        INCOME: accountBalances.filter(a => a.type === 'INCOME'),
        EXPENSE: accountBalances.filter(a => a.type === 'EXPENSE')
      };

      const summary = {
        totalAssets: grouped.ASSET.reduce((sum, a) => sum + a.balance, 0),
        totalLiabilities: grouped.LIABILITY.reduce((sum, a) => sum + a.balance, 0),
        totalEquity: grouped.EQUITY.reduce((sum, a) => sum + a.balance, 0),
        totalIncome: grouped.INCOME.reduce((sum, a) => sum + a.balance, 0),
        totalExpenses: grouped.EXPENSE.reduce((sum, a) => sum + a.balance, 0)
      };

      res.json({
        success: true,
        data: {
          accounts: accountBalances,
          grouped,
          summary,
          asOfDate: endDate
        }
      });
    } catch (error) {
      console.error('Get account balances error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente kontosaldoer' });
    }
  }

  // ============================================
  // TRIAL BALANCE
  // ============================================

  /**
   * Get trial balance (Råbalanse)
   * GET /api/accounting/trial-balance
   */
  async getTrialBalance(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), 0, 1);
      const end = endDate ? new Date(endDate as string) : new Date();

      const accounts = await prisma.account.findMany({
        where: { tenantId, active: true },
        include: {
          transactions: {
            where: {
              transactionDate: { gte: start, lte: end }
            }
          }
        },
        orderBy: { accountNumber: 'asc' }
      });

      const trialBalance = accounts.map(account => {
        let debit = 0;
        let credit = 0;

        account.transactions.forEach(tx => {
          // Simplified double-entry simulation
          if (account.type === 'ASSET' || account.type === 'EXPENSE') {
            if (tx.type === 'EXPENSE') {
              debit += tx.amount;
            } else {
              credit += tx.amount;
            }
          } else {
            if (tx.type === 'INCOME') {
              credit += tx.amount;
            } else {
              debit += tx.amount;
            }
          }
        });

        const balance = debit - credit;

        return {
          accountNumber: account.accountNumber,
          accountName: account.name,
          type: account.type,
          debit: debit > 0 ? debit : 0,
          credit: credit > 0 ? credit : 0,
          balance
        };
      }).filter(item => item.debit !== 0 || item.credit !== 0);

      const totalDebit = trialBalance.reduce((sum, item) => sum + item.debit, 0);
      const totalCredit = trialBalance.reduce((sum, item) => sum + item.credit, 0);

      res.json({
        success: true,
        data: {
          period: { start, end },
          accounts: trialBalance,
          totals: {
            debit: totalDebit,
            credit: totalCredit,
            difference: totalDebit - totalCredit
          }
        }
      });
    } catch (error) {
      console.error('Get trial balance error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente råbalanse' });
    }
  }

  // ============================================
  // MVA (VAT) MODULE
  // ============================================

  /**
   * Calculate MVA for a period
   * POST /api/accounting/mva/calculate
   */
  async calculateMVAPeriod(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { startDate, endDate } = req.body;

      if (!startDate || !endDate) {
        throw new AppError('Start- og sluttdato er påkrevd', 400);
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      // Calculate MVA
      const calculation = await calculateMVA(tenantId, start, end);

      // Validate calculation
      const validation = validateMVACalculation(calculation);

      res.json({
        success: true,
        data: {
          calculation,
          validation,
          formattedReport: formatMVAReportText(calculation)
        }
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Calculate MVA error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke beregne MVA' });
      }
    }
  }

  /**
   * Get current MVA period
   * GET /api/accounting/mva/current-period
   */
  async getCurrentMVAPeriodEndpoint(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { periodType = 'BIMONTHLY' } = req.query;

      const period = getCurrentMVAPeriod(periodType as MVAPeriod);

      res.json({
        success: true,
        data: period
      });
    } catch (error) {
      console.error('Get current MVA period error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente MVA-periode' });
    }
  }

  /**
   * Generate MVA periods for a year
   * GET /api/accounting/mva/periods/:year
   */
  async getMVAPeriods(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { year } = req.params;
      const { periodType = 'BIMONTHLY' } = req.query;

      const periods = generateMVAPeriods(
        parseInt(year),
        periodType as MVAPeriod
      );

      res.json({
        success: true,
        data: periods
      });
    } catch (error) {
      console.error('Get MVA periods error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke generere MVA-perioder' });
    }
  }

  /**
   * Save or submit VAT report
   * POST /api/accounting/mva/save
   */
  async saveMVAReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const { startDate, endDate, submit = false } = req.body;

      if (!startDate || !endDate) {
        throw new AppError('Start- og sluttdato er påkrevd', 400);
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      // Calculate MVA
      const calculation = await calculateMVA(tenantId, start, end);

      // Validate before saving
      const validation = validateMVACalculation(calculation);

      if (!validation.valid && submit) {
        throw new AppError(
          `Kan ikke sende inn ugyldig MVA-oppgave: ${validation.errors.join(', ')}`,
          400
        );
      }

      // Save to database
      const report = await saveVATReport(
        tenantId,
        userId,
        calculation,
        submit
      );

      res.json({
        success: true,
        data: report,
        message: submit ? 'MVA-oppgave sendt inn' : 'MVA-oppgave lagret som utkast'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Save MVA report error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke lagre MVA-oppgave' });
      }
    }
  }

  /**
   * Get all VAT reports for tenant
   * GET /api/accounting/mva/reports
   */
  async getMVAReports(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { status, year } = req.query;

      const where: any = { tenantId };

      if (status) {
        where.status = status;
      }

      if (year) {
        const yearInt = parseInt(year as string);
        where.periodStart = {
          gte: new Date(yearInt, 0, 1)
        };
        where.periodEnd = {
          lte: new Date(yearInt, 11, 31)
        };
      }

      const reports = await prisma.vATReport.findMany({
        where,
        include: {
          submitter: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { periodStart: 'desc' }
      });

      res.json({
        success: true,
        data: reports
      });
    } catch (error) {
      console.error('Get MVA reports error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente MVA-rapporter' });
    }
  }

  /**
   * Delete VAT report
   * DELETE /api/accounting/mva/reports/:id
   */
  async deleteMVAReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;

      const report = await prisma.vATReport.findFirst({
        where: { id, tenantId }
      });

      if (!report) {
        throw new AppError('MVA-rapport ikke funnet', 404);
      }

      if (report.status === 'SUBMITTED') {
        throw new AppError('Kan ikke slette innsendt MVA-rapport', 400);
      }

      await prisma.vATReport.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'MVA-rapport slettet'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Delete MVA report error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke slette MVA-rapport' });
      }
    }
  }
}
