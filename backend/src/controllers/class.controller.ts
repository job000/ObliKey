import { Response } from 'express';
import { AuthRequest, CreateClassDto } from '../types';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

export class ClassController {
  // Create new class
  async createClass(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const currentUserId = req.user!.userId;
      const { name, description, type, capacity, duration, startTime, recurring, recurringPattern, trainerId }: CreateClassDto = req.body;

      // Use provided trainerId, or default to current user if not provided
      const finalTrainerId = trainerId || currentUserId;

      // Verify that the selected trainer exists and belongs to the same tenant
      const trainer = await prisma.user.findFirst({
        where: {
          id: finalTrainerId,
          tenantId,
          role: { in: ['TRAINER', 'ADMIN', 'SUPER_ADMIN'] }
        }
      });

      if (!trainer) {
        throw new AppError('Valgt instruktør ikke funnet eller har ikke tilgang', 404);
      }

      const startDate = new Date(startTime);
      const endDate = new Date(startDate.getTime() + duration * 60000);

      const newClass = await prisma.class.create({
        data: {
          tenantId,
          trainerId: finalTrainerId,
          name,
          description,
          type,
          capacity,
          duration,
          startTime: startDate,
          endTime: endDate,
          recurring,
          recurringPattern
        },
        include: {
          trainer: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      res.status(201).json({
        success: true,
        data: newClass,
        message: 'Klasse opprettet'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Create class error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke opprette klasse' });
      }
    }
  }

  // Get all classes
  async getClasses(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { type, startDate, endDate } = req.query;

      const classes = await prisma.class.findMany({
        where: {
          tenantId,
          active: true,
          ...(type && { type: type as any }),
          ...(startDate && endDate && {
            startTime: {
              gte: new Date(startDate as string),
              lte: new Date(endDate as string)
            }
          })
        },
        include: {
          trainer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          },
          bookings: {
            where: {
              status: { in: ['PENDING', 'CONFIRMED'] }
            },
            select: { id: true }
          }
        },
        orderBy: { startTime: 'asc' }
      });

      // Add available spots (only count active bookings)
      const classesWithAvailability = classes.map(cls => ({
        ...cls,
        availableSpots: cls.capacity - cls.bookings.length,
        _count: { bookings: cls.bookings.length },
        bookings: undefined // Remove bookings array from response
      }));

      res.json({ success: true, data: classesWithAvailability });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Kunne ikke hente klasser' });
    }
  }

  // Get class by ID
  async getClassById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;

      const classData = await prisma.class.findFirst({
        where: { id, tenantId },
        include: {
          trainer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              email: true,
              phone: true
            }
          },
          bookings: {
            where: {
              status: { in: ['PENDING', 'CONFIRMED'] }
            },
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          }
        }
      });

      if (!classData) {
        throw new AppError('Klasse ikke funnet', 404);
      }

      res.json({
        success: true,
        data: {
          ...classData,
          availableSpots: classData.capacity - classData.bookings.length,
          _count: { bookings: classData.bookings.length }
        }
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: 'Kunne ikke hente klasse' });
      }
    }
  }

  // Update class
  async updateClass(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, description, capacity, startTime, duration } = req.body;

      const updatedClass = await prisma.class.update({
        where: { id },
        data: {
          name,
          description,
          capacity,
          ...(startTime && duration && {
            startTime: new Date(startTime),
            endTime: new Date(new Date(startTime).getTime() + duration * 60000)
          })
        }
      });

      res.json({
        success: true,
        data: updatedClass,
        message: 'Klasse oppdatert'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Kunne ikke oppdatere klasse' });
    }
  }

  // Delete class
  async deleteClass(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await prisma.class.update({
        where: { id },
        data: { active: false }
      });

      res.json({ success: true, message: 'Klasse slettet' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Kunne ikke slette klasse' });
    }
  }

  // Get available trainers
  async getTrainers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;

      const trainers = await prisma.user.findMany({
        where: {
          tenantId,
          role: { in: ['TRAINER', 'ADMIN', 'SUPER_ADMIN'] }
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
      res.status(500).json({ success: false, error: 'Kunne ikke hente instruktører' });
    }
  }

  // Toggle classes module
  async toggleClassesModule(req: AuthRequest, res: Response): Promise<void> {
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
            classesEnabled: enabled
          }
        });
      } else {
        // Update existing settings
        settings = await prisma.tenantSettings.update({
          where: { tenantId },
          data: { classesEnabled: enabled }
        });
      }

      res.json({
        success: true,
        data: settings,
        message: enabled ? 'Klassemodulen er aktivert' : 'Klassemodulen er deaktivert'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Toggle classes module error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke oppdatere modulstatus' });
      }
    }
  }

  // Get module status
  async getModuleStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;

      const settings = await prisma.tenantSettings.findUnique({
        where: { tenantId },
        select: { classesEnabled: true }
      });

      res.json({
        success: true,
        data: {
          classesEnabled: settings?.classesEnabled !== false // Default to true if not set
        }
      });
    } catch (error) {
      console.error('Get module status error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente modulstatus' });
    }
  }
}
