import { Response } from 'express';
import { AuthRequest, CreatePTSessionDto, CreateTrainingProgramDto } from '../types';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { ptCreditService } from '../services/ptCredit.service';

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
        const availableCredits = await ptCreditService.getUserAvailableCredits(currentUserId, tenantId);
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
        await ptCreditService.useCredits(finalCustomerId!, tenantId, 1);
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
          },
          program: {
            select: {
              id: true,
              name: true,
              description: true
            }
          },
          sessionResult: {
            select: {
              id: true,
              trainerFeedback: true,
              clientFeedback: true,
              rating: true,
              completedAt: true
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

  // Get single PT session by ID
  async getSessionById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      const session = await prisma.pTSession.findFirst({
        where: { id, tenantId },
        include: {
          trainer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              avatar: true
            }
          },
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              avatar: true
            }
          },
          program: {
            select: {
              id: true,
              name: true,
              description: true
            }
          },
          sessionResult: {
            select: {
              id: true,
              trainerFeedback: true,
              clientFeedback: true,
              rating: true,
              completedAt: true,
              sessionExercises: true
            }
          }
        }
      });

      if (!session) {
        res.status(404).json({ success: false, error: 'PT-økt ikke funnet' });
        return;
      }

      // Check user has permission to view this session
      const hasAccess =
        userRole === 'ADMIN' ||
        userRole === 'SUPER_ADMIN' ||
        session.trainerId === userId ||
        session.customerId === userId;

      if (!hasAccess) {
        res.status(403).json({ success: false, error: 'Ingen tilgang til denne økten' });
        return;
      }

      res.json({ success: true, data: session });
    } catch (error) {
      console.error('Get session by ID error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente PT-økt' });
    }
  }

  // Update PT session
  async updateSession(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title, description, startTime, endTime, location, status, notes, price, customerId, trainerId } = req.body;
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

      // Only admin, super admin, trainer who owns it, or customer who owns it can update
      const userId = req.user!.userId;
      const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
      const isOwnTrainer = userRole === 'TRAINER' && existingSession.trainerId === userId;
      const isOwnCustomer = userRole === 'CUSTOMER' && existingSession.customerId === userId;

      if (!isAdmin && !isOwnTrainer && !isOwnCustomer) {
        res.status(403).json({ success: false, error: 'Ingen tilgang til å oppdatere denne økten' });
        return;
      }

      // Prepare update data
      const updateData: any = {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(startTime && { startTime: new Date(startTime) }),
        ...(endTime && { endTime: new Date(endTime) }),
        ...(location !== undefined && { location }),
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
        ...(price !== undefined && { price: Number(price) })
      };

      // Only admins can change customer and trainer
      if (isAdmin) {
        if (customerId) {
          updateData.customerId = customerId;
        }
        if (trainerId) {
          updateData.trainerId = trainerId;
        }
      }

      const session = await prisma.pTSession.update({
        where: { id },
        data: updateData,
        include: {
          trainer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true
            }
          },
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true
            }
          }
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

  // Update PT session status
  async updateSessionStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const tenantId = req.tenantId!;
      const userRole = req.user!.role;
      const userId = req.user!.userId;

      if (!status) {
        res.status(400).json({ success: false, error: 'Status er påkrevd' });
        return;
      }

      // Check if session exists
      const existingSession = await prisma.pTSession.findFirst({
        where: { id, tenantId }
      });

      if (!existingSession) {
        res.status(404).json({ success: false, error: 'PT-økt ikke funnet' });
        return;
      }

      // Only admin, super admin, trainer who owns it can update status
      const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
      const isOwnTrainer = userRole === 'TRAINER' && existingSession.trainerId === userId;

      if (!isAdmin && !isOwnTrainer) {
        res.status(403).json({ success: false, error: 'Ingen tilgang til å oppdatere status' });
        return;
      }

      const session = await prisma.pTSession.update({
        where: { id },
        data: { status },
        include: {
          trainer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true
            }
          },
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true
            }
          }
        }
      });

      res.json({
        success: true,
        data: session,
        message: 'Status oppdatert'
      });
    } catch (error) {
      console.error('Update session status error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke oppdatere status' });
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

      // Only admin, super admin, or the trainer who created it can delete
      const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
      const isOwnTrainer = userRole === 'TRAINER' && session.trainerId === userId;

      if (!isAdmin && !isOwnTrainer) {
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
      const tenantId = req.user!.tenantId;

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

      const availableCredits = await ptCreditService.getUserAvailableCredits(targetUserId, tenantId);
      const creditDetails = await ptCreditService.getUserCreditDetails(targetUserId, tenantId);

      res.json({
        success: true,
        data: {
          credits: creditDetails,
          available: availableCredits,
          total: creditDetails.reduce((sum, c) => sum + c.total, 0),
          used: creditDetails.reduce((sum, c) => sum + c.used, 0)
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

      if (!userId || credits === undefined || credits === null || credits === 0) {
        throw new AppError('userId og credits er påkrevd (credits kan ikke være 0)', 400);
      }

      // Check if user exists
      const user = await prisma.user.findFirst({
        where: { id: userId, tenantId }
      });

      if (!user) {
        throw new AppError('Bruker ikke funnet', 404);
      }

      // If subtracting credits, check if user has enough
      if (credits < 0) {
        const availableCredits = await ptCreditService.getUserAvailableCredits(userId, tenantId);
        if (Math.abs(credits) > availableCredits) {
          throw new AppError(`Brukeren har kun ${availableCredits} tilgjengelige kreditter`, 400);
        }
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

      const action = credits > 0 ? 'lagt til' : 'trukket fra';
      const message = `${Math.abs(credits)} PT-kreditter ${action} ${user.firstName} ${user.lastName}`;

      res.status(201).json({
        success: true,
        data: credit,
        message
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Add credits error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke oppdatere PT-kreditter' });
      }
    }
  }

  // ============================================
  // SESSION RESULTS & FEEDBACK
  // ============================================

  // Create or update session result (trainer adds feedback and exercises performed)
  async createSessionResult(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { trainerFeedback, exercises } = req.body;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      // Check if session exists
      const session = await prisma.pTSession.findUnique({
        where: { id: sessionId }
      });

      if (!session) {
        res.status(404).json({ success: false, error: 'PT-økt ikke funnet' });
        return;
      }

      // Only trainer or admin can add session results
      if (userRole === 'CUSTOMER' || (userRole === 'TRAINER' && session.trainerId !== userId)) {
        res.status(403).json({ success: false, error: 'Ingen tilgang til å legge til øktresultat' });
        return;
      }

      // Check if result already exists
      let sessionResult = await prisma.sessionResult.findUnique({
        where: { sessionId }
      });

      if (sessionResult) {
        // Update existing result
        sessionResult = await prisma.sessionResult.update({
          where: { id: sessionResult.id },
          data: { trainerFeedback },
          include: {
            sessionExercises: {
              orderBy: { sortOrder: 'asc' }
            }
          }
        });

        // Delete existing exercises if new ones provided
        if (exercises && Array.isArray(exercises)) {
          await prisma.sessionExercise.deleteMany({
            where: { sessionResultId: sessionResult.id }
          });
        }
      } else {
        // Create new result
        sessionResult = await prisma.sessionResult.create({
          data: {
            sessionId,
            trainerFeedback
          },
          include: {
            sessionExercises: {
              orderBy: { sortOrder: 'asc' }
            }
          }
        });

        // Mark session as completed
        await prisma.pTSession.update({
          where: { id: sessionId },
          data: { status: 'COMPLETED' }
        });
      }

      // Add exercises if provided
      if (exercises && Array.isArray(exercises) && exercises.length > 0) {
        await prisma.sessionExercise.createMany({
          data: exercises.map((ex: any, index: number) => ({
            sessionResultId: sessionResult!.id,
            exerciseName: ex.exerciseName,
            exerciseId: ex.exerciseId || null,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight || null,
            notes: ex.notes || null,
            sortOrder: index
          }))
        });

        // Refetch with exercises
        sessionResult = await prisma.sessionResult.findUnique({
          where: { id: sessionResult!.id },
          include: {
            sessionExercises: {
              include: {
                exercise: true
              },
              orderBy: { sortOrder: 'asc' }
            }
          }
        });
      }

      res.json({
        success: true,
        data: sessionResult,
        message: 'Øktresultat lagret'
      });
    } catch (error) {
      console.error('Create session result error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke lagre øktresultat' });
    }
  }

  // Get session result
  async getSessionResult(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      // Check if session exists and user has permission
      const session = await prisma.pTSession.findUnique({
        where: { id: sessionId }
      });

      if (!session) {
        res.status(404).json({ success: false, error: 'PT-økt ikke funnet' });
        return;
      }

      // Check permission
      if (
        userRole !== 'ADMIN' &&
        userRole !== 'SUPER_ADMIN' &&
        session.trainerId !== userId &&
        session.customerId !== userId
      ) {
        res.status(403).json({ success: false, error: 'Ingen tilgang til dette øktresultatet' });
        return;
      }

      const sessionResult = await prisma.sessionResult.findUnique({
        where: { sessionId },
        include: {
          sessionExercises: {
            include: {
              exercise: true
            },
            orderBy: { sortOrder: 'asc' }
          }
        }
      });

      if (!sessionResult) {
        res.status(404).json({ success: false, error: 'Ingen resultat funnet for denne økten' });
        return;
      }

      res.json({ success: true, data: sessionResult });
    } catch (error) {
      console.error('Get session result error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente øktresultat' });
    }
  }

  // Add client feedback to session result
  async addClientFeedback(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { clientFeedback, rating } = req.body;
      const userId = req.user!.userId;

      // Check if session exists and belongs to customer
      const session = await prisma.pTSession.findUnique({
        where: { id: sessionId }
      });

      if (!session) {
        res.status(404).json({ success: false, error: 'PT-økt ikke funnet' });
        return;
      }

      if (session.customerId !== userId) {
        res.status(403).json({ success: false, error: 'Du kan kun gi tilbakemelding på dine egne økter' });
        return;
      }

      // Get or create session result
      let sessionResult = await prisma.sessionResult.findUnique({
        where: { sessionId }
      });

      if (!sessionResult) {
        res.status(404).json({ success: false, error: 'Ingen resultat funnet. Treneren må først fullføre økten.' });
        return;
      }

      // Update with client feedback
      sessionResult = await prisma.sessionResult.update({
        where: { id: sessionResult.id },
        data: {
          clientFeedback,
          rating: rating ? Number(rating) : null
        },
        include: {
          sessionExercises: {
            include: {
              exercise: true
            },
            orderBy: { sortOrder: 'asc' }
          }
        }
      });

      res.json({
        success: true,
        data: sessionResult,
        message: 'Tilbakemelding lagret'
      });
    } catch (error) {
      console.error('Add client feedback error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke lagre tilbakemelding' });
    }
  }

  // Approve PT session (customer accepts)
  async approveSession(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;

      const session = await prisma.pTSession.findFirst({
        where: { id, tenantId },
        include: {
          trainer: true,
          customer: true
        }
      });

      if (!session) {
        res.status(404).json({ success: false, error: 'PT-økt ikke funnet' });
        return;
      }

      if (session.customerId !== userId) {
        res.status(403).json({ success: false, error: 'Kun kunde kan godta økten' });
        return;
      }

      if (session.status !== 'PENDING_APPROVAL') {
        res.status(400).json({ success: false, error: 'Økten kan ikke godtas i nåværende status' });
        return;
      }

      const updatedSession = await prisma.pTSession.update({
        where: { id },
        data: { status: 'SCHEDULED' },
        include: {
          trainer: true,
          customer: true
        }
      });

      // Send notifications
      const notificationService = (await import('../services/notification.service')).default;
      await notificationService.notifyPTSessionParticipants({
        tenantId,
        trainerId: session.trainerId,
        customerId: session.customerId,
        ptSessionId: id,
        type: 'PT_SESSION_APPROVED',
        trainerTitle: 'PT-økt godkjent',
        trainerMessage: `${session.customer.firstName} ${session.customer.lastName} har godtatt PT-økten "${session.title}"`,
        customerTitle: 'PT-økt godkjent',
        customerMessage: `Du har godtatt PT-økten "${session.title}" med ${session.trainer.firstName} ${session.trainer.lastName}`
      });

      res.json({
        success: true,
        data: updatedSession,
        message: 'PT-økt godkjent'
      });
    } catch (error) {
      console.error('Approve session error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke godta PT-økt' });
    }
  }

  // Reject PT session (customer rejects)
  async rejectSession(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;

      const session = await prisma.pTSession.findFirst({
        where: { id, tenantId },
        include: {
          trainer: true,
          customer: true
        }
      });

      if (!session) {
        res.status(404).json({ success: false, error: 'PT-økt ikke funnet' });
        return;
      }

      if (session.customerId !== userId) {
        res.status(403).json({ success: false, error: 'Kun kunde kan avslå økten' });
        return;
      }

      if (session.status !== 'PENDING_APPROVAL') {
        res.status(400).json({ success: false, error: 'Økten kan ikke avslås i nåværende status' });
        return;
      }

      const updatedSession = await prisma.pTSession.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectionReason: rejectionReason || 'Ingen grunn oppgitt'
        },
        include: {
          trainer: true,
          customer: true
        }
      });

      // Send notifications
      const notificationService = (await import('../services/notification.service')).default;
      await notificationService.notifyPTSessionParticipants({
        tenantId,
        trainerId: session.trainerId,
        customerId: session.customerId,
        ptSessionId: id,
        type: 'PT_SESSION_REJECTED',
        trainerTitle: 'PT-økt avslått',
        trainerMessage: `${session.customer.firstName} ${session.customer.lastName} har avslått PT-økten "${session.title}". Grunn: ${rejectionReason || 'Ingen grunn oppgitt'}`,
        customerTitle: 'PT-økt avslått',
        customerMessage: `Du har avslått PT-økten "${session.title}"`
      });

      res.json({
        success: true,
        data: updatedSession,
        message: 'PT-økt avslått'
      });
    } catch (error) {
      console.error('Reject session error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke avslå PT-økt' });
    }
  }

  // Cancel PT session
  async cancelSession(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { cancellationReason } = req.body;
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;

      const session = await prisma.pTSession.findFirst({
        where: { id, tenantId },
        include: {
          trainer: true,
          customer: true
        }
      });

      if (!session) {
        res.status(404).json({ success: false, error: 'PT-økt ikke funnet' });
        return;
      }

      // Only admin, super admin, trainer who owns it, or customer who owns it can cancel
      const userRole = req.user!.role;
      const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
      const isOwnTrainer = userRole === 'TRAINER' && session.trainerId === userId;
      const isOwnCustomer = session.customerId === userId;

      if (!isAdmin && !isOwnTrainer && !isOwnCustomer) {
        res.status(403).json({ success: false, error: 'Du har ikke tilgang til å avlyse denne økten' });
        return;
      }

      if (session.status === 'COMPLETED' || session.status === 'CANCELLED') {
        res.status(400).json({ success: false, error: 'Økten kan ikke avlyses i nåværende status' });
        return;
      }

      // Get tenant settings for PT cancellation policy
      const settings = await prisma.tenantSettings.findUnique({
        where: { tenantId }
      });

      let shouldRefund = false;
      let refundMessage = '';

      // Calculate hours until session
      const hoursUntilSession = (new Date(session.startTime).getTime() - Date.now()) / (1000 * 60 * 60);

      // Determine if refund should be given based on who cancelled and settings
      if (settings?.ptCancellationRefundEnabled) {
        if (isAdmin || isOwnTrainer) {
          // PT, Admin, or Super Admin cancelling - ALWAYS refund customer
          shouldRefund = true;
          refundMessage = ' PT-time er refundert.';
        } else if (isOwnCustomer) {
          // Customer cancelling - check cancellation policy
          const requiredHours = settings.ptCancellationHours || 24;
          if (hoursUntilSession >= requiredHours) {
            shouldRefund = true;
            refundMessage = ' PT-time er refundert.';
          } else {
            refundMessage = ` Du må avlyse minst ${requiredHours} timer før økten for å få refusjon.`;
          }
        }
      }

      // Perform refund if applicable
      if (shouldRefund) {
        await ptCreditService.refundCredit(session.customerId, tenantId, 1);
      }

      const updatedSession = await prisma.pTSession.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancellationReason: cancellationReason || 'Ingen grunn oppgitt'
        },
        include: {
          trainer: true,
          customer: true
        }
      });

      // Determine who cancelled
      const cancelledBy = session.trainerId === userId ? 'PT' : (isAdmin ? 'administrator' : 'kunde');
      const cancellerName = session.trainerId === userId
        ? `${session.trainer.firstName} ${session.trainer.lastName}`
        : `${session.customer.firstName} ${session.customer.lastName}`;

      // Send notifications
      const notificationService = (await import('../services/notification.service')).default;
      await notificationService.notifyPTSessionParticipants({
        tenantId,
        trainerId: session.trainerId,
        customerId: session.customerId,
        ptSessionId: id,
        type: 'PT_SESSION_CANCELLED',
        trainerTitle: 'PT-økt avlyst',
        trainerMessage: `PT-økten "${session.title}" har blitt avlyst av ${cancelledBy}. Grunn: ${cancellationReason || 'Ingen grunn oppgitt'}`,
        customerTitle: 'PT-økt avlyst',
        customerMessage: `PT-økten "${session.title}" har blitt avlyst av ${cancelledBy}. Grunn: ${cancellationReason || 'Ingen grunn oppgitt'}${refundMessage}`
      });

      res.json({
        success: true,
        data: updatedSession,
        message: 'PT-økt avlyst' + refundMessage
      });
    } catch (error) {
      console.error('Cancel session error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke avlyse PT-økt' });
    }
  }

  /**
   * Mark session as NO_SHOW
   * Only trainers and admins can mark sessions as no-show
   * Refund policy configurable via tenant settings
   */
  async markNoShow(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      // Check if user is authorized (only trainers and admins can mark no-show)
      const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
      const isTrainer = userRole === 'TRAINER';

      if (!isAdmin && !isTrainer) {
        res.status(403).json({
          success: false,
          error: 'Kun trenere og administratorer kan markere økter som møtte ikke'
        });
        return;
      }

      // Get session
      const session = await prisma.pTSession.findFirst({
        where: { id, tenantId },
        include: {
          trainer: true,
          customer: true
        }
      });

      if (!session) {
        res.status(404).json({ success: false, error: 'PT-økt ikke funnet' });
        return;
      }

      // If user is trainer, verify they own this session
      if (isTrainer && session.trainerId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Du kan kun markere dine egne økter som møtte ikke'
        });
        return;
      }

      // Get tenant settings for NO_SHOW refund policy
      const settings = await prisma.tenantSettings.findUnique({
        where: { tenantId }
      });

      let shouldRefund = false;
      let refundMessage = ' Kreditt er IKKE refundert.';

      // Check if NO_SHOW refund is enabled in settings
      if (settings?.ptNoShowRefundEnabled) {
        shouldRefund = true;
        refundMessage = ' Kreditt er refundert til kunden.';

        // Perform refund
        await ptCreditService.refundCredit(session.customerId, tenantId, 1);
      }

      // Update session status to NO_SHOW
      const updatedSession = await prisma.pTSession.update({
        where: { id },
        data: {
          status: 'NO_SHOW'
        },
        include: {
          trainer: true,
          customer: true
        }
      });

      // Send notifications
      const notificationService = (await import('../services/notification.service')).default;
      await notificationService.notifyPTSessionParticipants({
        tenantId,
        trainerId: session.trainerId,
        customerId: session.customerId,
        ptSessionId: id,
        type: 'PT_SESSION_NO_SHOW',
        trainerTitle: 'Økt markert som møtte ikke',
        trainerMessage: `PT-økten "${session.title}" har blitt markert som møtte ikke.`,
        customerTitle: 'Økt markert som møtte ikke',
        customerMessage: `PT-økten "${session.title}" har blitt markert som møtte ikke.${refundMessage}`
      });

      res.json({
        success: true,
        data: updatedSession,
        message: 'PT-økt markert som møtte ikke.' + refundMessage
      });
    } catch (error) {
      console.error('Mark no-show error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke markere PT-økt som møtte ikke' });
    }
  }

  // ============================================
  // PT AVAILABILITY
  // ============================================

  /**
   * Get trainer's weekly availability schedule
   */
  async getTrainerAvailability(req: AuthRequest, res: Response): Promise<void> {
    try {
      const trainerId = req.params.trainerId || req.user!.userId;
      const tenantId = req.user!.tenantId;

      const { ptAvailabilityService } = await import('../services/pt-availability.service');
      const availability = await ptAvailabilityService.getTrainerAvailability(trainerId, tenantId);

      res.json({
        success: true,
        data: availability
      });
    } catch (error) {
      console.error('Get trainer availability error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente tilgjengelighet' });
    }
  }

  /**
   * Set trainer's availability for a specific day
   */
  async setTrainerAvailability(req: AuthRequest, res: Response): Promise<void> {
    try {
      const trainerId = req.user!.userId;
      const tenantId = req.user!.tenantId;
      const { dayOfWeek, startTime, endTime } = req.body;

      if (!dayOfWeek || !startTime || !endTime) {
        res.status(400).json({
          success: false,
          error: 'dayOfWeek, startTime og endTime er påkrevd'
        });
        return;
      }

      const { ptAvailabilityService } = await import('../services/pt-availability.service');
      const availability = await ptAvailabilityService.setTrainerAvailability(
        trainerId,
        tenantId,
        dayOfWeek,
        startTime,
        endTime
      );

      res.json({
        success: true,
        data: availability,
        message: 'Tilgjengelighet satt'
      });
    } catch (error) {
      console.error('Set trainer availability error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke sette tilgjengelighet' });
    }
  }

  /**
   * Update trainer availability
   */
  async updateTrainerAvailability(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { availabilityId } = req.params;
      const { startTime, endTime, isActive } = req.body;

      const { ptAvailabilityService } = await import('../services/pt-availability.service');
      const availability = await ptAvailabilityService.updateTrainerAvailability(availabilityId, {
        startTime,
        endTime,
        isActive
      });

      res.json({
        success: true,
        data: availability,
        message: 'Tilgjengelighet oppdatert'
      });
    } catch (error) {
      console.error('Update trainer availability error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke oppdatere tilgjengelighet' });
    }
  }

  /**
   * Delete trainer availability
   */
  async deleteTrainerAvailability(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { availabilityId } = req.params;

      const { ptAvailabilityService } = await import('../services/pt-availability.service');
      await ptAvailabilityService.deleteTrainerAvailability(availabilityId);

      res.json({
        success: true,
        message: 'Tilgjengelighet slettet'
      });
    } catch (error) {
      console.error('Delete trainer availability error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke slette tilgjengelighet' });
    }
  }

  /**
   * Get trainer's time blocks
   */
  async getTrainerTimeBlocks(req: AuthRequest, res: Response): Promise<void> {
    try {
      const trainerId = req.params.trainerId || req.user!.userId;
      const tenantId = req.user!.tenantId;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'startDate og endDate er påkrevd'
        });
        return;
      }

      const { ptAvailabilityService } = await import('../services/pt-availability.service');
      const timeBlocks = await ptAvailabilityService.getTrainerTimeBlocks(
        trainerId,
        tenantId,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json({
        success: true,
        data: timeBlocks
      });
    } catch (error) {
      console.error('Get trainer time blocks error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente tidsblokker' });
    }
  }

  /**
   * Block a specific time slot
   */
  async blockTimeSlot(req: AuthRequest, res: Response): Promise<void> {
    try {
      const trainerId = req.user!.userId;
      const tenantId = req.user!.tenantId;
      const { startTime, endTime, reason } = req.body;

      if (!startTime || !endTime) {
        res.status(400).json({
          success: false,
          error: 'startTime og endTime er påkrevd'
        });
        return;
      }

      const { ptAvailabilityService } = await import('../services/pt-availability.service');
      const timeBlock = await ptAvailabilityService.blockTimeSlot(
        trainerId,
        tenantId,
        new Date(startTime),
        new Date(endTime),
        reason
      );

      res.json({
        success: true,
        data: timeBlock,
        message: 'Tid blokkert'
      });
    } catch (error) {
      console.error('Block time slot error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke blokkere tid' });
    }
  }

  /**
   * Add one-time availability
   */
  async addOneTimeAvailability(req: AuthRequest, res: Response): Promise<void> {
    try {
      const trainerId = req.user!.userId;
      const tenantId = req.user!.tenantId;
      const { startTime, endTime, reason } = req.body;

      if (!startTime || !endTime) {
        res.status(400).json({
          success: false,
          error: 'startTime og endTime er påkrevd'
        });
        return;
      }

      const { ptAvailabilityService } = await import('../services/pt-availability.service');
      const timeBlock = await ptAvailabilityService.addOneTimeAvailability(
        trainerId,
        tenantId,
        new Date(startTime),
        new Date(endTime),
        reason
      );

      res.json({
        success: true,
        data: timeBlock,
        message: 'Tilgjengelighet lagt til'
      });
    } catch (error) {
      console.error('Add one-time availability error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke legge til tilgjengelighet' });
    }
  }

  /**
   * Delete time block
   */
  async deleteTimeBlock(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { timeBlockId } = req.params;

      const { ptAvailabilityService } = await import('../services/pt-availability.service');
      await ptAvailabilityService.deleteTimeBlock(timeBlockId);

      res.json({
        success: true,
        message: 'Tidsblokk slettet'
      });
    } catch (error) {
      console.error('Delete time block error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke slette tidsblokk' });
    }
  }

  /**
   * Get available slots for a specific trainer on a date
   */
  async getAvailableSlots(req: AuthRequest, res: Response): Promise<void> {
    try {
      const trainerId = req.params.trainerId;
      const tenantId = req.user!.tenantId;
      const { date, duration } = req.query;

      if (!date) {
        res.status(400).json({
          success: false,
          error: 'date er påkrevd'
        });
        return;
      }

      const slotDuration = duration ? parseInt(duration as string) : 60;

      const { ptAvailabilityService } = await import('../services/pt-availability.service');
      const slots = await ptAvailabilityService.getAvailableSlots(
        trainerId,
        tenantId,
        new Date(date as string),
        slotDuration
      );

      res.json({
        success: true,
        data: slots
      });
    } catch (error) {
      console.error('Get available slots error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente ledige tider' });
    }
  }

  /**
   * Get available slots for all trainers on a date
   */
  async getAllAvailableSlots(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const { date, duration } = req.query;

      if (!date) {
        res.status(400).json({
          success: false,
          error: 'date er påkrevd'
        });
        return;
      }

      const slotDuration = duration ? parseInt(duration as string) : 60;

      const { ptAvailabilityService } = await import('../services/pt-availability.service');
      const slots = await ptAvailabilityService.getAllAvailableSlots(
        tenantId,
        new Date(date as string),
        slotDuration
      );

      res.json({
        success: true,
        data: slots
      });
    } catch (error) {
      console.error('Get all available slots error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente ledige tider' });
    }
  }
}
