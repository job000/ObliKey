import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

export class ProgramController {
  // Get all training programs
  async getPrograms(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const { active, customerId } = req.query;

      // Build where clause based on role
      let whereClause: any = { tenantId };

      if (active !== undefined) {
        whereClause.active = active === 'true';
      }

      // Customers can only see their own programs
      // Trainers can see programs they created or for specific customer
      // Admins can see all programs
      if (userRole === 'CUSTOMER') {
        whereClause.customerId = userId;
      } else if (userRole === 'TRAINER') {
        if (customerId) {
          whereClause.customerId = customerId;
        } else {
          whereClause.trainerId = userId;
        }
      }
      // ADMIN and SUPER_ADMIN can see all (no additional filter)

      const programs = await prisma.trainingProgram.findMany({
        where: whereClause,
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
          },
          exercises: {
            include: {
              exercise: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                  muscleGroups: true
                }
              }
            },
            orderBy: { createdAt: 'asc' }
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

  // Get single program
  async getProgram(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      const program = await prisma.trainingProgram.findFirst({
        where: { id, tenantId },
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
          },
          exercises: {
            include: {
              exercise: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  category: true,
                  muscleGroups: true,
                  videoUrl: true
                }
              }
            },
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      if (!program) {
        throw new AppError('Program ikke funnet', 404);
      }

      // Check permissions: customers can only see their own, trainers can see their own or their customers'
      if (userRole === 'CUSTOMER' && program.customerId !== userId) {
        throw new AppError('Ingen tilgang til dette programmet', 403);
      }
      if (userRole === 'TRAINER' && program.trainerId !== userId && program.customerId !== userId) {
        throw new AppError('Ingen tilgang til dette programmet', 403);
      }

      res.json({ success: true, data: program });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Get program error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke hente program' });
      }
    }
  }

  // Create program
  async createProgram(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const { customerId, name, description, startDate, endDate, goals, exercises } = req.body;

      // Validate required fields
      if (!name || !startDate) {
        throw new AppError('Navn og startdato er påkrevd', 400);
      }

      // Determine trainer and customer IDs
      let trainerId: string;
      let finalCustomerId: string;

      if (userRole === 'CUSTOMER') {
        // Customers create programs for themselves
        trainerId = userId; // Self-assigned initially, can be changed by trainer
        finalCustomerId = userId;
      } else {
        // Trainers/Admins must specify a customer
        if (!customerId) {
          throw new AppError('Kunde må spesifiseres', 400);
        }
        trainerId = userId;
        finalCustomerId = customerId;

        // Verify customer exists and belongs to tenant
        const customer = await prisma.user.findFirst({
          where: {
            id: finalCustomerId,
            tenantId,
            active: true
          }
        });

        if (!customer) {
          throw new AppError('Kunde ikke funnet', 404);
        }
      }

      // Create program
      const program = await prisma.trainingProgram.create({
        data: {
          tenantId,
          trainerId,
          customerId: finalCustomerId,
          name,
          description,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null,
          goals,
          active: true
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
              lastName: true
            }
          }
        }
      });

      // Add exercises if provided
      if (exercises && Array.isArray(exercises)) {
        for (const ex of exercises) {
          if (ex.exerciseId) {
            await prisma.programExercise.create({
              data: {
                programId: program.id,
                exerciseId: ex.exerciseId,
                sets: ex.sets || 3,
                reps: ex.reps || '10',
                restTime: ex.restTime,
                notes: ex.notes
              }
            });
          }
        }
      }

      res.status(201).json({
        success: true,
        data: program,
        message: 'Treningsprogram opprettet'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Create program error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke opprette program' });
      }
    }
  }

  // Update program
  async updateProgram(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const { name, description, startDate, endDate, goals, active } = req.body;

      // Check if program exists
      const existingProgram = await prisma.trainingProgram.findFirst({
        where: { id, tenantId }
      });

      if (!existingProgram) {
        throw new AppError('Program ikke funnet', 404);
      }

      // Check permissions: customers can only update their own, trainers can update their own
      if (userRole === 'CUSTOMER' && existingProgram.customerId !== userId) {
        throw new AppError('Ingen tilgang til å oppdatere dette programmet', 403);
      }
      if (userRole === 'TRAINER' && existingProgram.trainerId !== userId) {
        throw new AppError('Ingen tilgang til å oppdatere dette programmet', 403);
      }

      // Update program
      const program = await prisma.trainingProgram.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(startDate && { startDate: new Date(startDate) }),
          ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
          ...(goals !== undefined && { goals }),
          ...(active !== undefined && { active })
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
              lastName: true
            }
          }
        }
      });

      res.json({
        success: true,
        data: program,
        message: 'Program oppdatert'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Update program error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke oppdatere program' });
      }
    }
  }

  // Delete program (soft delete - set inactive)
  async deleteProgram(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      const program = await prisma.trainingProgram.findFirst({
        where: { id, tenantId }
      });

      if (!program) {
        throw new AppError('Program ikke funnet', 404);
      }

      // Check permissions
      if (userRole === 'CUSTOMER' && program.customerId !== userId) {
        throw new AppError('Ingen tilgang til å slette dette programmet', 403);
      }
      if (userRole === 'TRAINER' && program.trainerId !== userId) {
        throw new AppError('Ingen tilgang til å slette dette programmet', 403);
      }

      // Soft delete
      await prisma.trainingProgram.update({
        where: { id },
        data: { active: false }
      });

      res.json({
        success: true,
        message: 'Program slettet'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Delete program error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke slette program' });
      }
    }
  }

  // Add exercise to program
  async addExercise(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const { exerciseId, sets, reps, restTime, notes } = req.body;

      if (!exerciseId) {
        throw new AppError('Øvelse må spesifiseres', 400);
      }

      const program = await prisma.trainingProgram.findFirst({
        where: { id, tenantId }
      });

      if (!program) {
        throw new AppError('Program ikke funnet', 404);
      }

      // Check permissions
      if (userRole === 'CUSTOMER' && program.customerId !== userId) {
        throw new AppError('Ingen tilgang til dette programmet', 403);
      }
      if (userRole === 'TRAINER' && program.trainerId !== userId) {
        throw new AppError('Ingen tilgang til dette programmet', 403);
      }

      const programExercise = await prisma.programExercise.create({
        data: {
          programId: id,
          exerciseId,
          sets: sets || 3,
          reps: reps || '10',
          restTime,
          notes
        },
        include: {
          exercise: true
        }
      });

      res.status(201).json({
        success: true,
        data: programExercise,
        message: 'Øvelse lagt til'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Add exercise error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke legge til øvelse' });
      }
    }
  }

  // Remove exercise from program
  async removeExercise(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id, exerciseId } = req.params;
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      const program = await prisma.trainingProgram.findFirst({
        where: { id, tenantId }
      });

      if (!program) {
        throw new AppError('Program ikke funnet', 404);
      }

      // Check permissions
      if (userRole === 'CUSTOMER' && program.customerId !== userId) {
        throw new AppError('Ingen tilgang til dette programmet', 403);
      }
      if (userRole === 'TRAINER' && program.trainerId !== userId) {
        throw new AppError('Ingen tilgang til dette programmet', 403);
      }

      await prisma.programExercise.delete({
        where: { id: exerciseId }
      });

      res.json({
        success: true,
        message: 'Øvelse fjernet'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Remove exercise error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke fjerne øvelse' });
      }
    }
  }
}
