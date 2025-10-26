import { Response } from 'express';
import { AuthRequest, CreatePTSessionDto, CreateTrainingProgramDto } from '../types';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

export class PTController {
  // ============================================
  // PT SESSIONS
  // ============================================

  // Create PT session
  async createSession(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const currentUserId = req.user!.userId;
      const userRole = req.user!.role;
      const { customerId, trainerId, title, description, startTime, endTime, location }: CreatePTSessionDto = req.body;

      // Determine trainer and customer based on role
      let finalTrainerId = trainerId;
      let finalCustomerId = customerId;

      if (userRole === 'CUSTOMER') {
        // Customer is booking - they are the customer, need to select trainer
        finalCustomerId = currentUserId;
        if (!trainerId) {
          throw new AppError('Du må velge en PT/instruktør', 400);
        }

        // Check if customer has available PT credits
        const availableCredits = await this.getAvailableCredits(currentUserId);
        if (availableCredits < 1) {
          throw new AppError('Du har ikke nok PT-timer. Kjøp PT-timer i butikken.', 400);
        }
      } else if (userRole === 'TRAINER') {
        // Trainer is creating session for a customer
        finalTrainerId = currentUserId;
        if (!customerId) {
          throw new AppError('Du må velge en kunde', 400);
        }
      } else if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
        // Admin can specify both
        if (!trainerId || !customerId) {
          throw new AppError('Du må velge både PT og kunde', 400);
        }
      }

      const session = await prisma.pTSession.create({
        data: {
          tenantId,
          trainerId: finalTrainerId!,
          customerId: finalCustomerId!,
          title,
          description,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          location,
          status: 'SCHEDULED'
        },
        include: {
          trainer: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      // If customer booked, consume one credit
      if (userRole === 'CUSTOMER') {
        await this.useCredit(finalCustomerId!);
      }

      res.status(201).json({
        success: true,
        data: session,
        message: 'PT-økt opprettet'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Create session error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke opprette PT-økt' });
      }
    }
  }

  // Get PT sessions
  async getSessions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const { status, startDate, endDate } = req.query;

      // Build where clause based on role
      let whereClause: any = { tenantId };

      if (userRole === 'TRAINER') {
        whereClause.trainerId = userId;
      } else if (userRole === 'CUSTOMER') {
        whereClause.customerId = userId;
      }
      // ADMIN and SUPER_ADMIN see all sessions (no filter)

      if (status) {
        whereClause.status = status as any;
      }

      if (startDate && endDate) {
        whereClause.startTime = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        };
      }

      const sessions = await prisma.pTSession.findMany({
        where: whereClause,
        include: {
          trainer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          },
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          }
        },
        orderBy: { startTime: 'asc' }
      });

      res.json({ success: true, data: sessions });
    } catch (error) {
      console.error('Get sessions error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente PT-økter' });
    }
  }

  // Update PT session
  async updateSession(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title, description, startTime, endTime, location, status, notes, price } = req.body;
      const tenantId = req.tenantId!;
      const userRole = req.user!.role;

      // Check if session exists and user has permission
      const existingSession = await prisma.pTSession.findUnique({
        where: { id }
      });

      if (!existingSession) {
        res.status(404).json({ success: false, error: 'PT-økt ikke funnet' });
        return;
      }

      // Only admin, trainer (if they own it), or customer (if they are the customer) can update
      if (
        userRole !== 'ADMIN' &&
        userRole !== 'SUPER_ADMIN' &&
        (userRole === 'TRAINER' && existingSession.trainerId !== req.user!.userId) &&
        (userRole === 'CUSTOMER' && existingSession.customerId !== req.user!.userId)
      ) {
        res.status(403).json({ success: false, error: 'Ingen tilgang til å oppdatere denne økten' });
        return;
      }

      const session = await prisma.pTSession.update({
        where: { id },
        data: {
          ...(title && { title }),
          ...(description !== undefined && { description }),
          ...(startTime && { startTime: new Date(startTime) }),
          ...(endTime && { endTime: new Date(endTime) }),
          ...(location !== undefined && { location }),
          ...(status && { status }),
          ...(notes !== undefined && { notes }),
          ...(price !== undefined && { price: Number(price) })
        }
      });

      res.json({
        success: true,
        data: session,
        message: 'PT-økt oppdatert'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Kunne ikke oppdatere PT-økt' });
    }
  }

  // Delete PT session
  async deleteSession(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userRole = req.user!.role;
      const userId = req.user!.userId;

      // Check if session exists
      const session = await prisma.pTSession.findUnique({
        where: { id }
      });

      if (!session) {
        res.status(404).json({ success: false, error: 'PT-økt ikke funnet' });
        return;
      }

      // Only admin or the trainer who created it can delete
      if (
        userRole !== 'ADMIN' &&
        userRole !== 'SUPER_ADMIN' &&
        session.trainerId !== userId
      ) {
        res.status(403).json({ success: false, error: 'Ingen tilgang til å slette denne økten' });
        return;
      }

      await prisma.pTSession.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'PT-økt slettet'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Kunne ikke slette PT-økt' });
    }
  }

  // Cancel PT session (customers can cancel their sessions)
  async cancelSession(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { cancelReason } = req.body;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      // Check if session exists
      const session = await prisma.pTSession.findUnique({
        where: { id }
      });

      if (!session) {
        res.status(404).json({ success: false, error: 'PT-økt ikke funnet' });
        return;
      }

      // Check if session is already cancelled
      if (session.status === 'CANCELLED') {
        res.status(400).json({ success: false, error: 'Økten er allerede kansellert' });
        return;
      }

      // Customers can only cancel their own sessions
      if (userRole === 'CUSTOMER' && session.customerId !== userId) {
        res.status(403).json({ success: false, error: 'Du kan kun kansellere dine egne økter' });
        return;
      }

      // Check cancellation time (e.g., must cancel at least 24 hours before)
      const hoursUntilSession = (new Date(session.startTime).getTime() - Date.now()) / (1000 * 60 * 60);
      if (userRole === 'CUSTOMER' && hoursUntilSession < 24) {
        res.status(400).json({
          success: false,
          error: 'Du må kansellere minst 24 timer før økten starter'
        });
        return;
      }

      // Cancel the session
      const cancelledSession = await prisma.pTSession.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          notes: cancelReason ? `Kansellert: ${cancelReason}` : 'Kansellert av kunde'
        }
      });

      // Refund PT credit if customer cancelled with enough notice
      if (userRole === 'CUSTOMER' && hoursUntilSession >= 24) {
        // Find the credit that was used for this session
        const credit = await prisma.pTCredit.findFirst({
          where: {
            userId: session.customerId,
            used: { gt: 0 }
          },
          orderBy: {
            purchaseDate: 'desc'
          }
        });

        if (credit) {
          await prisma.pTCredit.update({
            where: { id: credit.id },
            data: {
              used: { decrement: 1 }
            }
          });
        }
      }

      res.json({
        success: true,
        data: cancelledSession,
        message: 'PT-økt kansellert' + (userRole === 'CUSTOMER' && hoursUntilSession >= 24 ? '. PT-time er refundert.' : '')
      });
    } catch (error) {
      console.error('Cancel session error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke kansellere PT-økt' });
    }
  }

  // ============================================
  // TRAINING PROGRAMS
  // ============================================

  // Create training program
  async createProgram(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const trainerId = req.user!.userId;
      const { customerId, name, description, startDate, endDate, goals, exercises } = req.body;

      const program = await prisma.trainingProgram.create({
        data: {
          tenantId,
          trainerId,
          customerId,
          name,
          description,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null,
          goals
        },
        include: {
          trainer: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          customer: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          exercises: {
            include: {
              exercise: true
            },
            orderBy: { sortOrder: 'asc' }
          }
        }
      });

      // Add exercises if provided
      if (exercises && Array.isArray(exercises) && exercises.length > 0) {
        await prisma.programExercise.createMany({
          data: exercises.map((ex: any, index: number) => ({
            programId: program.id,
            exerciseId: ex.exerciseId,
            sets: ex.sets || 3,
            reps: ex.reps || '10',
            restTime: ex.restTime,
            notes: ex.notes,
            sortOrder: index
          }))
        });

        // Refetch with exercises
        const updatedProgram = await prisma.trainingProgram.findUnique({
          where: { id: program.id },
          include: {
            trainer: {
              select: {
                firstName: true,
                lastName: true
              }
            },
            customer: {
              select: {
                firstName: true,
                lastName: true
              }
            },
            exercises: {
              include: {
                exercise: true
              },
              orderBy: { sortOrder: 'asc' }
            }
          }
        });

        return res.status(201).json({
          success: true,
          data: updatedProgram,
          message: 'Treningsprogram opprettet'
        });
      }

      res.status(201).json({
        success: true,
        data: program,
        message: 'Treningsprogram opprettet'
      });
    } catch (error) {
      console.error('Create program error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke opprette treningsprogram' });
    }
  }

  // Get training programs
  async getPrograms(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const { active } = req.query;

      // Build where clause based on user role
      const whereClause: any = { tenantId };

      // ADMIN and SUPER_ADMIN can see all programs
      if (userRole === 'TRAINER') {
        whereClause.trainerId = userId;
      } else if (userRole === 'CUSTOMER') {
        whereClause.customerId = userId;
      }
      // ADMIN/SUPER_ADMIN see all programs in tenant (no additional filter)

      if (active !== undefined) {
        whereClause.active = active === 'true';
      }

      const programs = await prisma.trainingProgram.findMany({
        where: whereClause,
        include: {
          trainer: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          exercises: {
            include: {
              exercise: true
            },
            orderBy: { sortOrder: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({ success: true, data: programs });
    } catch (error) {
      console.error('Get programs error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente treningsprogrammer' });
    }
  }

  // Get program by ID
  async getProgramById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;

      const program = await prisma.trainingProgram.findFirst({
        where: { id, tenantId },
        include: {
          trainer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true
            }
          },
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          exercises: {
            include: {
              exercise: true
            },
            orderBy: { sortOrder: 'asc' }
          }
        }
      });

      if (!program) {
        throw new AppError('Treningsprogram ikke funnet', 404);
      }

      res.json({ success: true, data: program });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: 'Kunne ikke hente treningsprogram' });
      }
    }
  }

  // Update training program
  async updateProgram(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, description, startDate, endDate, goals, exercises, active } = req.body;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (startDate !== undefined) updateData.startDate = new Date(startDate);
      if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
      if (goals !== undefined) updateData.goals = goals;
      if (active !== undefined) updateData.active = active;

      // Update program
      await prisma.trainingProgram.update({
        where: { id },
        data: updateData
      });

      // Update exercises if provided
      if (exercises !== undefined && Array.isArray(exercises)) {
        // Delete existing program exercises
        await prisma.programExercise.deleteMany({
          where: { programId: id }
        });

        // Add new exercises
        if (exercises.length > 0) {
          await prisma.programExercise.createMany({
            data: exercises.map((ex: any, index: number) => ({
              programId: id,
              exerciseId: ex.exerciseId,
              sets: ex.sets || 3,
              reps: ex.reps || '10',
              restTime: ex.restTime,
              notes: ex.notes,
              sortOrder: index
            }))
          });
        }
      }

      // Fetch updated program with exercises
      const program = await prisma.trainingProgram.findUnique({
        where: { id },
        include: {
          trainer: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          exercises: {
            include: {
              exercise: true
            },
            orderBy: { sortOrder: 'asc' }
          }
        }
      });

      res.json({
        success: true,
        data: program,
        message: 'Treningsprogram oppdatert'
      });
    } catch (error) {
      console.error('Update program error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke oppdatere treningsprogram' });
    }
  }

  // Get trainer clients
  async getClients(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      // If ADMIN, get all customers in tenant
      if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
        const customers = await prisma.user.findMany({
          where: {
            tenantId,
            role: 'CUSTOMER',
            active: true
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatar: true
          },
          orderBy: { firstName: 'asc' }
        });

        return res.json({ success: true, data: customers });
      }

      // For trainers, get unique clients from both PT sessions and training programs
      const [sessionClients, programClients] = await Promise.all([
        prisma.pTSession.findMany({
          where: { tenantId, trainerId: userId },
          select: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                avatar: true
              }
            }
          },
          distinct: ['customerId']
        }),
        prisma.trainingProgram.findMany({
          where: { tenantId, trainerId: userId },
          select: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                avatar: true
              }
            }
          },
          distinct: ['customerId']
        })
      ]);

      // Combine and deduplicate clients
      const clientMap = new Map();
      [...sessionClients, ...programClients].forEach(item => {
        if (!clientMap.has(item.customer.id)) {
          clientMap.set(item.customer.id, item.customer);
        }
      });

      const clients = Array.from(clientMap.values()).sort((a, b) =>
        a.firstName.localeCompare(b.firstName)
      );

      res.json({ success: true, data: clients });
    } catch (error) {
      console.error('Get clients error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente klienter' });
    }
  }

  // Get available trainers
  async getTrainers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;

      const trainers = await prisma.user.findMany({
        where: {
          tenantId,
          role: { in: ['TRAINER', 'ADMIN', 'SUPER_ADMIN'] },
          active: true
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true,
          role: true
        },
        orderBy: [
          { role: 'asc' },
          { firstName: 'asc' }
        ]
      });

      res.json({ success: true, data: trainers });
    } catch (error) {
      console.error('Get trainers error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente trenere' });
    }
  }

  // ============================================
  // PT CREDITS
  // ============================================

  // Get available credits for a user
  private async getAvailableCredits(userId: string): Promise<number> {
    const credits = await prisma.pTCredit.findMany({
      where: {
        userId,
        OR: [
          { expiryDate: null },
          { expiryDate: { gte: new Date() } }
        ]
      }
    });

    const totalCredits = credits.reduce((sum, c) => sum + c.credits, 0);
    const usedCredits = credits.reduce((sum, c) => sum + c.used, 0);

    return totalCredits - usedCredits;
  }

  // Use one PT credit (consume oldest first)
  private async useCredit(userId: string): Promise<void> {
    // Find oldest credit with available balance
    const credit = await prisma.pTCredit.findFirst({
      where: {
        userId,
        OR: [
          { expiryDate: null },
          { expiryDate: { gte: new Date() } }
        ]
      },
      orderBy: { purchaseDate: 'asc' }
    });

    if (!credit) {
      throw new AppError('Ingen tilgjengelige PT-timer funnet', 400);
    }

    // Check if this credit has available balance
    if (credit.used >= credit.credits) {
      throw new AppError('PT-timer er brukt opp', 400);
    }

    await prisma.pTCredit.update({
      where: { id: credit.id },
      data: { used: { increment: 1 } }
    });
  }

  // Get user's PT credits
  async getMyCredits(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      // Determine which user's credits to fetch
      let targetUserId = userId;

      // ADMIN can query for specific user via query param
      if ((userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && req.query.userId) {
        targetUserId = req.query.userId as string;
      }

      const credits = await prisma.pTCredit.findMany({
        where: { userId: targetUserId },
        orderBy: { purchaseDate: 'desc' }
      });

      const availableCredits = await this.getAvailableCredits(targetUserId);

      res.json({
        success: true,
        data: {
          credits,
          available: availableCredits,
          total: credits.reduce((sum, c) => sum + c.credits, 0),
          used: credits.reduce((sum, c) => sum + c.used, 0)
        }
      });
    } catch (error) {
      console.error('Get credits error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente PT-timer' });
    }
  }

  // Add PT credits (admin only or shop integration)
  async addCredits(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { userId, credits, orderId, expiryDate, notes } = req.body;

      if (!userId || !credits || credits < 1) {
        throw new AppError('userId og credits er påkrevd', 400);
      }

      const credit = await prisma.pTCredit.create({
        data: {
          tenantId,
          userId,
          credits,
          orderId,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          notes
        }
      });

      res.status(201).json({
        success: true,
        data: credit,
        message: 'PT-timer lagt til'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Add credits error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke legge til PT-timer' });
      }
    }
  }
}
