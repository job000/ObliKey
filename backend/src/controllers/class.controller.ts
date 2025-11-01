import { Response } from 'express';
import { AuthRequest, CreateClassDto } from '../types';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import notificationService from '../services/notification.service';

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
          recurringPattern,
          published: true // Auto-publish classes so members can see and book them
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
      const userRole = req.user!.role;
      const { type, startDate, endDate, status, published } = req.query;

      // Admins and trainers see all classes, customers only see published ones
      const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'TRAINER'].includes(userRole);

      const classes = await prisma.class.findMany({
        where: {
          tenantId,
          active: true,
          deletedAt: null, // Exclude soft-deleted classes
          isTemplate: false, // Exclude templates from regular class listing
          ...(!isAdmin && { published: true }), // Customers only see published
          ...(type && { type: type as any }),
          ...(status && { status: status as any }),
          ...(published !== undefined && { published: published === 'true' }),
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
        },
        orderBy: { startTime: 'asc' }
      });

      // Add available spots and booking details
      const classesWithAvailability = classes.map(cls => ({
        ...cls,
        availableSpots: cls.capacity - cls.bookings.length,
        _count: { bookings: cls.bookings.length }
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
      const tenantId = req.tenantId!;
      const { name, description, capacity, startTime, duration } = req.body;

      // Check if class exists and get booking count
      const existingClass = await prisma.class.findFirst({
        where: { id, tenantId },
        include: {
          bookings: {
            where: {
              status: { in: ['PENDING', 'CONFIRMED'] }
            },
            select: { id: true, userId: true }
          }
        }
      });

      if (!existingClass) {
        throw new AppError('Klasse ikke funnet', 404);
      }

      const hasBookings = existingClass.bookings.length > 0;
      const bookingCount = existingClass.bookings.length;

      // Detect what changed
      const changes: string[] = [];
      if (startTime && new Date(startTime).getTime() !== existingClass.startTime.getTime()) {
        changes.push('tidspunkt');
      }
      if (name && name !== existingClass.name) {
        changes.push('navn');
      }

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

      // Send notifications if there are bookings and significant changes
      if (hasBookings && changes.length > 0) {
        await notificationService.notifyClassUpdate({
          tenantId,
          classId: id,
          className: updatedClass.name,
          changes: changes.join(', '),
        });
      }

      res.json({
        success: true,
        data: updatedClass,
        hasBookings,
        bookingCount,
        affectedUserIds: existingClass.bookings.map(b => b.userId),
        notificationsSent: hasBookings && changes.length > 0,
        message: hasBookings && changes.length > 0
          ? `Klasse oppdatert og varsler sendt til ${bookingCount} deltakere`
          : hasBookings
          ? `Klasse oppdatert. ${bookingCount} bookinger påvirket.`
          : 'Klasse oppdatert'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: 'Kunne ikke oppdatere klasse' });
      }
    }
  }

  // Delete class (soft delete)
  async deleteClass(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;

      // Check if class has any bookings
      const classWithBookings = await prisma.class.findFirst({
        where: { id, tenantId },
        include: {
          bookings: {
            where: {
              status: { in: ['PENDING', 'CONFIRMED'] }
            }
          }
        }
      });

      if (!classWithBookings) {
        throw new AppError('Klasse ikke funnet', 404);
      }

      if (classWithBookings.bookings.length > 0) {
        throw new AppError(
          `Kan ikke slette klasse med aktive bookinger. Avlys klassen først eller kanseller alle bookinger (${classWithBookings.bookings.length} bookinger).`,
          400
        );
      }

      // Soft delete
      await prisma.class.update({
        where: { id },
        data: {
          active: false,
          deletedAt: new Date()
        }
      });

      res.json({ success: true, message: 'Klasse slettet' });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: 'Kunne ikke slette klasse' });
      }
    }
  }

  // Publish class
  async publishClass(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;

      const updatedClass = await prisma.class.update({
        where: { id, tenantId },
        data: { published: true }
      });

      res.json({
        success: true,
        data: updatedClass,
        message: 'Klasse publisert og synlig for kunder'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Kunne ikke publisere klasse' });
    }
  }

  // Unpublish class
  async unpublishClass(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;

      const updatedClass = await prisma.class.update({
        where: { id, tenantId },
        data: { published: false }
      });

      res.json({
        success: true,
        data: updatedClass,
        message: 'Klasse gjort privat og skjult fra kunder'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Kunne ikke avpublisere klasse' });
    }
  }

  // Cancel class
  async cancelClass(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;
      const { reason } = req.body;

      // Get class with bookings
      const classData = await prisma.class.findFirst({
        where: { id, tenantId },
        include: {
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

      if (classData.status === 'CANCELLED') {
        throw new AppError('Klassen er allerede avlyst', 400);
      }

      // Cancel the class
      await prisma.class.update({
        where: { id },
        data: {
          status: 'CANCELLED'
        }
      });

      // Cancel all active bookings
      if (classData.bookings.length > 0) {
        const cancelReason = reason || 'Klassen ble avlyst av administrator';

        await prisma.booking.updateMany({
          where: {
            classId: id,
            status: { in: ['PENDING', 'CONFIRMED'] }
          },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancelReason
          }
        });

        // Send cancellation notifications
        await notificationService.notifyClassCancellation({
          tenantId,
          classId: id,
          className: classData.name,
          reason,
        });
      }

      res.json({
        success: true,
        message: 'Klasse avlyst og varsler sendt',
        affectedBookings: classData.bookings.length,
        affectedUsers: classData.bookings.map(b => ({
          id: b.user.id,
          name: `${b.user.firstName} ${b.user.lastName}`,
          email: b.user.email
        }))
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Cancel class error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke avlyse klasse' });
      }
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

  // Save class as template
  async saveAsTemplate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;
      const { templateName } = req.body;

      if (!templateName) {
        throw new AppError('Mal-navn er påkrevd', 400);
      }

      // Verify class exists and belongs to tenant
      const classData = await prisma.class.findFirst({
        where: { id, tenantId }
      });

      if (!classData) {
        throw new AppError('Klasse ikke funnet', 404);
      }

      // Update the class to be a template
      const template = await prisma.class.update({
        where: { id },
        data: {
          isTemplate: true,
          templateName
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

      res.json({
        success: true,
        data: template,
        message: 'Klasse lagret som mal'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Save as template error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke lagre som mal' });
      }
    }
  }

  // Get all templates
  async getTemplates(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;

      const templates = await prisma.class.findMany({
        where: {
          tenantId,
          isTemplate: true,
          active: true
        },
        include: {
          trainer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          }
        },
        orderBy: { templateName: 'asc' }
      });

      res.json({ success: true, data: templates });
    } catch (error) {
      console.error('Get templates error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente maler' });
    }
  }

  // Create class from template
  async createFromTemplate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const tenantId = req.tenantId!;
      const { startTime, trainerId } = req.body;

      if (!startTime) {
        throw new AppError('Starttidspunkt er påkrevd', 400);
      }

      // Verify template exists and belongs to tenant
      const template = await prisma.class.findFirst({
        where: {
          id: templateId,
          tenantId,
          isTemplate: true
        }
      });

      if (!template) {
        throw new AppError('Mal ikke funnet', 404);
      }

      // Use provided trainerId or default to template's trainer
      const finalTrainerId = trainerId || template.trainerId;

      // Verify trainer exists
      const trainer = await prisma.user.findFirst({
        where: {
          id: finalTrainerId,
          tenantId,
          role: { in: ['TRAINER', 'ADMIN', 'SUPER_ADMIN'] }
        }
      });

      if (!trainer) {
        throw new AppError('Instruktør ikke funnet', 404);
      }

      const startDate = new Date(startTime);
      const endDate = new Date(startDate.getTime() + template.duration * 60000);

      // Create new class from template (WITHOUT copying feedback)
      const newClass = await prisma.class.create({
        data: {
          tenantId,
          trainerId: finalTrainerId,
          name: template.name,
          description: template.description,
          type: template.type,
          capacity: template.capacity,
          duration: template.duration,
          startTime: startDate,
          endTime: endDate,
          recurring: template.recurring,
          recurringPattern: template.recurringPattern,
          // NOT a template, just a regular class
          isTemplate: false,
          templateName: null,
          published: true // Auto-publish classes so members can see and book them
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
        message: 'Klasse opprettet fra mal'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Create from template error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke opprette klasse fra mal' });
      }
    }
  }
}
