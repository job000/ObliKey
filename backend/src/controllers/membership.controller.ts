import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

export class MembershipController {
  // ============================================
  // MEMBERSHIP PLANS (Admin only)
  // ============================================

  async getMembershipPlans(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { activeOnly } = req.query;

      const plans = await prisma.membershipPlan.findMany({
        where: {
          tenantId,
          ...(activeOnly === 'true' && { active: true })
        },
        orderBy: {
          sortOrder: 'asc'
        }
      });

      res.json({ success: true, data: plans });
    } catch (error) {
      console.error('Get membership plans error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente medlemskapsplaner' });
    }
  }

  async createMembershipPlan(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const {
        name,
        description,
        price,
        currency,
        interval,
        intervalCount,
        trialDays,
        features,
        maxFreezes,
        active,
        sortOrder
      } = req.body;

      if (!name || !price || !interval) {
        throw new AppError('Navn, pris og intervall er påkrevd', 400);
      }

      const plan = await prisma.membershipPlan.create({
        data: {
          tenantId,
          name,
          description,
          price,
          currency: currency || 'NOK',
          interval,
          intervalCount: intervalCount || 1,
          trialDays: trialDays || 0,
          features,
          maxFreezes: maxFreezes || 2,
          active: active !== undefined ? active : true,
          sortOrder: sortOrder || 0
        }
      });

      res.status(201).json({
        success: true,
        data: plan,
        message: 'Medlemskapsplan opprettet'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Create membership plan error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke opprette medlemskapsplan' });
      }
    }
  }

  async updateMembershipPlan(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      const updateData = req.body;

      const plan = await prisma.membershipPlan.findFirst({
        where: { id, tenantId }
      });

      if (!plan) {
        throw new AppError('Medlemskapsplan ikke funnet', 404);
      }

      const updated = await prisma.membershipPlan.update({
        where: { id },
        data: updateData
      });

      res.json({
        success: true,
        data: updated,
        message: 'Medlemskapsplan oppdatert'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Update membership plan error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke oppdatere medlemskapsplan' });
      }
    }
  }

  async deleteMembershipPlan(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;

      const plan = await prisma.membershipPlan.findFirst({
        where: { id, tenantId },
        include: {
          _count: {
            select: { memberships: true }
          }
        }
      });

      if (!plan) {
        throw new AppError('Medlemskapsplan ikke funnet', 404);
      }

      if (plan._count.memberships > 0) {
        throw new AppError('Kan ikke slette plan med aktive medlemskap', 400);
      }

      await prisma.membershipPlan.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Medlemskapsplan slettet'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Delete membership plan error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke slette medlemskapsplan' });
      }
    }
  }

  // ============================================
  // MEMBERSHIPS
  // ============================================

  async getMemberships(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const { status, search } = req.query;

      const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

      const memberships = await prisma.membership.findMany({
        where: {
          tenantId,
          ...(!isAdmin && { userId }), // Customers only see their own
          ...(status && { status: status as any }),
          ...(search && isAdmin && {
            user: {
              OR: [
                { firstName: { contains: search as string, mode: 'insensitive' } },
                { lastName: { contains: search as string, mode: 'insensitive' } },
                { email: { contains: search as string, mode: 'insensitive' } }
              ]
            }
          })
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true
            }
          },
          plan: true,
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 5
          },
          freezes: {
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.json({ success: true, data: memberships });
    } catch (error) {
      console.error('Get memberships error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente medlemskap' });
    }
  }

  async getMembership(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const { id } = req.params;

      const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

      const membership = await prisma.membership.findFirst({
        where: {
          id,
          tenantId,
          ...(!isAdmin && { userId })
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true,
              phone: true
            }
          },
          plan: true,
          payments: {
            orderBy: { createdAt: 'desc' }
          },
          freezes: {
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!membership) {
        throw new AppError('Medlemskap ikke funnet', 404);
      }

      res.json({ success: true, data: membership });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Get membership error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke hente medlemskap' });
      }
    }
  }

  async createMembership(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { userId, planId, startDate, notes } = req.body;

      if (!userId || !planId) {
        throw new AppError('BrukerId og PlanId er påkrevd', 400);
      }

      // Check if plan exists
      const plan = await prisma.membershipPlan.findFirst({
        where: { id: planId, tenantId, active: true }
      });

      if (!plan) {
        throw new AppError('Medlemskapsplan ikke funnet eller inaktiv', 404);
      }

      // Check if user already has an active membership
      const existingMembership = await prisma.membership.findFirst({
        where: {
          tenantId,
          userId,
          status: { in: ['ACTIVE', 'FROZEN'] }
        }
      });

      if (existingMembership) {
        throw new AppError('Bruker har allerede et aktivt medlemskap', 400);
      }

      // Calculate next billing date
      const start = startDate ? new Date(startDate) : new Date();
      const nextBilling = new Date(start);

      if (plan.interval === 'MONTHLY') {
        nextBilling.setMonth(nextBilling.getMonth() + plan.intervalCount);
      } else if (plan.interval === 'YEARLY') {
        nextBilling.setFullYear(nextBilling.getFullYear() + plan.intervalCount);
      } else if (plan.interval === 'WEEKLY') {
        nextBilling.setDate(nextBilling.getDate() + (7 * plan.intervalCount));
      } else if (plan.interval === 'QUARTERLY') {
        nextBilling.setMonth(nextBilling.getMonth() + (3 * plan.intervalCount));
      }

      const membership = await prisma.membership.create({
        data: {
          tenantId,
          userId,
          planId,
          startDate: start,
          nextBillingDate: nextBilling,
          notes,
          status: 'ACTIVE'
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          plan: true
        }
      });

      // Create first payment
      await prisma.membershipPayment.create({
        data: {
          tenantId,
          membershipId: membership.id,
          amount: plan.price,
          currency: plan.currency,
          dueDate: start,
          status: 'PENDING'
        }
      });

      res.status(201).json({
        success: true,
        data: membership,
        message: 'Medlemskap opprettet'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Create membership error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke opprette medlemskap' });
      }
    }
  }

  // ============================================
  // MEMBERSHIP ACTIONS
  // ============================================

  async freezeMembership(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const { id } = req.params;
      const { reason, startDate, endDate } = req.body;

      const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

      // Validate dates
      if (!startDate || !endDate) {
        throw new AppError('Startdato og sluttdato er påkrevd', 400);
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (end <= start) {
        throw new AppError('Sluttdato må være senere enn startdato', 400);
      }

      const membership = await prisma.membership.findFirst({
        where: {
          id,
          tenantId,
          ...(!isAdmin && { userId })
        },
        include: {
          plan: true
        }
      });

      if (!membership) {
        throw new AppError('Medlemskap ikke funnet', 404);
      }

      if (membership.status !== 'ACTIVE') {
        throw new AppError('Kan kun fryse aktive medlemskap', 400);
      }

      // Check freeze limit for current year
      const currentYear = new Date().getFullYear();
      if (membership.lastFreezeResetYear !== currentYear) {
        // Reset freeze count for new year
        await prisma.membership.update({
          where: { id },
          data: {
            freezesUsedThisYear: 0,
            lastFreezeResetYear: currentYear
          }
        });
        membership.freezesUsedThisYear = 0;
      }

      if (membership.freezesUsedThisYear >= membership.plan.maxFreezes) {
        throw new AppError(`Du har brukt maksimalt antall fryser for ${currentYear} (${membership.plan.maxFreezes})`, 400);
      }

      // Freeze membership
      await prisma.membership.update({
        where: { id },
        data: {
          status: 'FROZEN',
          freezesUsedThisYear: membership.freezesUsedThisYear + 1
        }
      });

      // Create freeze record with dates
      await prisma.membershipFreeze.create({
        data: {
          membershipId: id,
          userId: membership.userId,
          startDate: start,
          endDate: end,
          reason
        }
      });

      res.json({
        success: true,
        message: 'Medlemskap fryst'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Freeze membership error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke fryse medlemskap' });
      }
    }
  }

  async unfreezeMembership(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const { id } = req.params;

      const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

      const membership = await prisma.membership.findFirst({
        where: {
          id,
          tenantId,
          ...(!isAdmin && { userId })
        }
      });

      if (!membership) {
        throw new AppError('Medlemskap ikke funnet', 404);
      }

      if (membership.status !== 'FROZEN') {
        throw new AppError('Medlemskap er ikke fryst', 400);
      }

      // Unfreeze membership
      await prisma.membership.update({
        where: { id },
        data: {
          status: 'ACTIVE'
        }
      });

      res.json({
        success: true,
        message: 'Medlemskap aktivert'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Unfreeze membership error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke aktivere medlemskap' });
      }
    }
  }

  async cancelMembership(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const { id } = req.params;
      const { reason } = req.body;

      const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

      const membership = await prisma.membership.findFirst({
        where: {
          id,
          tenantId,
          ...(!isAdmin && { userId })
        }
      });

      if (!membership) {
        throw new AppError('Medlemskap ikke funnet', 404);
      }

      if (membership.status === 'CANCELLED') {
        throw new AppError('Medlemskap er allerede kansellert', 400);
      }

      await prisma.membership.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          endDate: new Date(),
          cancelledAt: new Date(),
          cancelledReason: reason,
          autoRenew: false
        }
      });

      res.json({
        success: true,
        message: 'Medlemskap kansellert'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Cancel membership error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke kansellere medlemskap' });
      }
    }
  }

  // ============================================
  // ADMIN ACTIONS
  // ============================================

  async suspendMembership(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        throw new AppError('Årsak for suspensjon er påkrevd', 400);
      }

      const membership = await prisma.membership.findFirst({
        where: { id, tenantId }
      });

      if (!membership) {
        throw new AppError('Medlemskap ikke funnet', 404);
      }

      await prisma.membership.update({
        where: { id },
        data: {
          status: 'SUSPENDED',
          suspendedAt: new Date(),
          suspendedReason: reason
        }
      });

      res.json({
        success: true,
        message: 'Medlemskap suspendert'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Suspend membership error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke suspendere medlemskap' });
      }
    }
  }

  async blacklistMembership(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        throw new AppError('Årsak for svartelisting er påkrevd', 400);
      }

      const membership = await prisma.membership.findFirst({
        where: { id, tenantId }
      });

      if (!membership) {
        throw new AppError('Medlemskap ikke funnet', 404);
      }

      await prisma.membership.update({
        where: { id },
        data: {
          status: 'BLACKLISTED',
          blacklistedAt: new Date(),
          blacklistReason: reason,
          autoRenew: false
        }
      });

      res.json({
        success: true,
        message: 'Medlem svartelistet'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Blacklist membership error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke svarteliste medlem' });
      }
    }
  }

  async reactivateMembership(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;

      const membership = await prisma.membership.findFirst({
        where: { id, tenantId }
      });

      if (!membership) {
        throw new AppError('Medlemskap ikke funnet', 404);
      }

      if (membership.status === 'ACTIVE') {
        throw new AppError('Medlemskap er allerede aktivt', 400);
      }

      await prisma.membership.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          suspendedAt: null,
          suspendedReason: null,
          blacklistedAt: null,
          blacklistReason: null
        }
      });

      res.json({
        success: true,
        message: 'Medlemskap reaktivert'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Reactivate membership error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke reaktivere medlemskap' });
      }
    }
  }

  // ============================================
  // PAYMENTS
  // ============================================

  async getMembershipPayments(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const { membershipId } = req.params;

      const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

      // Verify membership access
      const membership = await prisma.membership.findFirst({
        where: {
          id: membershipId,
          tenantId,
          ...(!isAdmin && { userId })
        }
      });

      if (!membership) {
        throw new AppError('Medlemskap ikke funnet', 404);
      }

      const payments = await prisma.membershipPayment.findMany({
        where: {
          membershipId,
          tenantId
        },
        orderBy: {
          dueDate: 'desc'
        }
      });

      res.json({ success: true, data: payments });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Get membership payments error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke hente betalinger' });
      }
    }
  }

  async markPaymentPaid(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      const { paymentMethod, notes } = req.body;

      const payment = await prisma.membershipPayment.findFirst({
        where: { id, tenantId }
      });

      if (!payment) {
        throw new AppError('Betaling ikke funnet', 404);
      }

      if (payment.status === 'PAID') {
        throw new AppError('Betaling er allerede markert som betalt', 400);
      }

      await prisma.membershipPayment.update({
        where: { id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          paymentMethod,
          notes
        }
      });

      // Update membership last billing date
      await prisma.membership.update({
        where: { id: payment.membershipId },
        data: {
          lastBillingDate: new Date()
        }
      });

      res.json({
        success: true,
        message: 'Betaling markert som betalt'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Mark payment paid error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke markere betaling som betalt' });
      }
    }
  }

  // ============================================
  // STATISTICS
  // ============================================

  async getMembershipStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;

      const [
        totalActive,
        totalFrozen,
        totalCancelled,
        totalBlacklisted,
        totalSuspended,
        newThisMonth,
        expiringSoon
      ] = await Promise.all([
        prisma.membership.count({
          where: { tenantId, status: 'ACTIVE' }
        }),
        prisma.membership.count({
          where: { tenantId, status: 'FROZEN' }
        }),
        prisma.membership.count({
          where: { tenantId, status: 'CANCELLED' }
        }),
        prisma.membership.count({
          where: { tenantId, status: 'BLACKLISTED' }
        }),
        prisma.membership.count({
          where: { tenantId, status: 'SUSPENDED' }
        }),
        prisma.membership.count({
          where: {
            tenantId,
            startDate: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
          }
        }),
        prisma.membership.count({
          where: {
            tenantId,
            nextBillingDate: {
              lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
            },
            status: 'ACTIVE'
          }
        })
      ]);

      // Get pending payments
      const pendingPayments = await prisma.membershipPayment.count({
        where: {
          tenantId,
          status: 'PENDING'
        }
      });

      const overduePayments = await prisma.membershipPayment.count({
        where: {
          tenantId,
          status: 'OVERDUE'
        }
      });

      res.json({
        success: true,
        data: {
          totalActive,
          totalFrozen,
          totalCancelled,
          totalBlacklisted,
          totalSuspended,
          newThisMonth,
          expiringSoon,
          pendingPayments,
          overduePayments
        }
      });
    } catch (error) {
      console.error('Get membership stats error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente statistikk' });
    }
  }

  // ============================================
  // CHECK-IN TRACKING
  // ============================================

  async checkIn(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const { location, notes } = req.body;

      // Find user's active membership
      const membership = await prisma.membership.findFirst({
        where: {
          userId,
          tenantId,
          status: 'ACTIVE'
        }
      });

      if (!membership) {
        throw new AppError('Aktivt medlemskap ikke funnet', 404);
      }

      // Check if there's already an open check-in
      const existingCheckIn = await prisma.membershipCheckIn.findFirst({
        where: {
          tenantId,
          userId,
          membershipId: membership.id,
          checkOutTime: null
        }
      });

      if (existingCheckIn) {
        throw new AppError('Du er allerede innsjekket', 400);
      }

      // Create check-in
      const checkIn = await prisma.membershipCheckIn.create({
        data: {
          tenantId,
          userId,
          membershipId: membership.id,
          location,
          notes
        }
      });

      // Update last check-in time on membership
      await prisma.membership.update({
        where: { id: membership.id },
        data: { lastCheckInAt: new Date() }
      });

      res.status(201).json({
        success: true,
        data: checkIn,
        message: 'Velkommen! Du er nå innsjekket'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Check-in error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke sjekke inn' });
      }
    }
  }

  async checkOut(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const { checkInId } = req.params;

      const checkIn = await prisma.membershipCheckIn.findFirst({
        where: {
          id: checkInId,
          userId,
          tenantId,
          checkOutTime: null
        }
      });

      if (!checkIn) {
        throw new AppError('Aktiv innsjekning ikke funnet', 404);
      }

      const updated = await prisma.membershipCheckIn.update({
        where: { id: checkInId },
        data: { checkOutTime: new Date() }
      });

      res.json({
        success: true,
        data: updated,
        message: 'Ha en fin dag!'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Check-out error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke sjekke ut' });
      }
    }
  }

  async getCheckInHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const { membershipId } = req.params;
      const { limit = '50', offset = '0' } = req.query;

      // Admins can view any user's check-ins, customers only their own
      const membership = await prisma.membership.findFirst({
        where: {
          id: membershipId,
          tenantId,
          ...(userRole === 'CUSTOMER' && { userId })
        }
      });

      if (!membership) {
        throw new AppError('Medlemskap ikke funnet', 404);
      }

      const checkIns = await prisma.membershipCheckIn.findMany({
        where: {
          tenantId,
          membershipId
        },
        orderBy: {
          checkInTime: 'desc'
        },
        take: parseInt(limit as string),
        skip: parseInt(offset as string)
      });

      const total = await prisma.membershipCheckIn.count({
        where: {
          tenantId,
          membershipId
        }
      });

      res.json({
        success: true,
        data: checkIns,
        meta: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Get check-in history error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke hente historikk' });
      }
    }
  }

  async getActiveCheckIn(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;

      const checkIn = await prisma.membershipCheckIn.findFirst({
        where: {
          tenantId,
          userId,
          checkOutTime: null
        },
        include: {
          membership: {
            include: {
              plan: true
            }
          }
        }
      });

      res.json({
        success: true,
        data: checkIn
      });
    } catch (error) {
      console.error('Get active check-in error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente aktiv innsjekning' });
    }
  }

  // ============================================
  // PAYMENT REMINDERS
  // ============================================

  async sendPaymentReminder(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { paymentId } = req.params;
      const { type, method = 'EMAIL', message } = req.body;

      const payment = await prisma.membershipPayment.findFirst({
        where: {
          id: paymentId,
          tenantId,
          status: { in: ['PENDING', 'OVERDUE'] }
        },
        include: {
          membership: {
            include: {
              user: true
            }
          }
        }
      });

      if (!payment) {
        throw new AppError('Betaling ikke funnet', 404);
      }

      // Create reminder record
      const reminder = await prisma.membershipReminder.create({
        data: {
          tenantId,
          paymentId,
          userId: payment.membership.userId,
          type,
          sentAt: new Date(),
          method,
          message
        }
      });

      // Update payment reminder count
      await prisma.membershipPayment.update({
        where: { id: paymentId },
        data: {
          reminderCount: { increment: 1 },
          lastReminderAt: new Date()
        }
      });

      // TODO: Send actual email/SMS/push notification here
      // For now, just log it
      console.log(`Sending ${type} reminder to ${payment.membership.user.email}`);

      res.json({
        success: true,
        data: reminder,
        message: 'Purring sendt'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Send payment reminder error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke sende purring' });
      }
    }
  }

  async getMemberActivityOverview(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { membershipId } = req.params;

      const membership = await prisma.membership.findFirst({
        where: {
          id: membershipId,
          tenantId
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true
            }
          },
          plan: true
        }
      });

      if (!membership) {
        throw new AppError('Medlemskap ikke funnet', 404);
      }

      // Get check-in stats
      const totalCheckIns = await prisma.membershipCheckIn.count({
        where: {
          tenantId,
          membershipId
        }
      });

      const last30DaysCheckIns = await prisma.membershipCheckIn.count({
        where: {
          tenantId,
          membershipId,
          checkInTime: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      });

      const recentCheckIns = await prisma.membershipCheckIn.findMany({
        where: {
          tenantId,
          membershipId
        },
        orderBy: {
          checkInTime: 'desc'
        },
        take: 10
      });

      // Get payment stats
      const totalPayments = await prisma.membershipPayment.count({
        where: {
          tenantId,
          membershipId
        }
      });

      const paidPayments = await prisma.membershipPayment.count({
        where: {
          tenantId,
          membershipId,
          status: 'PAID'
        }
      });

      const overduePayments = await prisma.membershipPayment.count({
        where: {
          tenantId,
          membershipId,
          status: 'OVERDUE'
        }
      });

      // Get reminder stats
      const totalReminders = await prisma.membershipReminder.count({
        where: {
          tenantId,
          userId: membership.userId
        }
      });

      res.json({
        success: true,
        data: {
          membership,
          checkIns: {
            total: totalCheckIns,
            last30Days: last30DaysCheckIns,
            recent: recentCheckIns
          },
          payments: {
            total: totalPayments,
            paid: paidPayments,
            overdue: overduePayments
          },
          reminders: {
            total: totalReminders
          }
        }
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Get member activity overview error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke hente aktivitetsoversikt' });
      }
    }
  }

  // ============================================
  // CURRENT USER MEMBERSHIP STATUS
  // ============================================

  async getMyMembershipStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;

      // Get user's active membership
      const membership = await prisma.membership.findFirst({
        where: {
          tenantId,
          userId,
          status: 'ACTIVE',
          OR: [
            { endDate: null },
            { endDate: { gte: new Date() } },
          ],
        },
        include: {
          plan: true,
        },
      });

      if (!membership) {
        res.json({
          success: true,
          data: {
            hasActiveMembership: false,
            membershipName: null,
            expiresAt: null,
          },
        });
        return;
      }

      res.json({
        success: true,
        data: {
          hasActiveMembership: true,
          membershipName: membership.plan.name,
          expiresAt: membership.endDate,
        },
      });
    } catch (error) {
      console.error('Get membership status error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente medlemskapsstatus' });
    }
  }
}
