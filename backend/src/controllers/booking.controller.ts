import { Response } from 'express';
import { AuthRequest, CreateBookingDto } from '../types';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { emailService } from '../utils/email';

export class BookingController {
  // Create new booking
  async createBooking(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const { classId, notes }: CreateBookingDto = req.body;

      // Check if class exists
      const classData = await prisma.class.findFirst({
        where: { id: classId, tenantId },
        include: {
          trainer: {
            select: { firstName: true, lastName: true }
          }
        }
      });

      if (!classData) {
        throw new AppError('Klasse ikke funnet', 404);
      }

      // Check if class is full (only count active bookings, not cancelled)
      const activeBookingsCount = await prisma.booking.count({
        where: {
          classId,
          status: { in: ['PENDING', 'CONFIRMED'] }
        }
      });

      if (activeBookingsCount >= classData.capacity) {
        throw new AppError('Klassen er full', 400);
      }

      // Check if user already has an active booking for this class
      const existingActiveBooking = await prisma.booking.findFirst({
        where: {
          classId,
          userId,
          status: { in: ['PENDING', 'CONFIRMED'] }
        }
      });

      if (existingActiveBooking) {
        throw new AppError('Du har allerede booket denne klassen', 400);
      }

      // Check for double booking (overlapping classes at same time)
      const overlappingBookings = await prisma.booking.findMany({
        where: {
          userId,
          status: { in: ['PENDING', 'CONFIRMED'] },
          class: {
            OR: [
              {
                AND: [
                  { startTime: { lte: classData.startTime } },
                  { endTime: { gt: classData.startTime } }
                ]
              },
              {
                AND: [
                  { startTime: { lt: classData.endTime } },
                  { endTime: { gte: classData.endTime } }
                ]
              },
              {
                AND: [
                  { startTime: { gte: classData.startTime } },
                  { endTime: { lte: classData.endTime } }
                ]
              }
            ]
          }
        },
        include: {
          class: {
            select: { name: true, startTime: true }
          }
        }
      });

      if (overlappingBookings.length > 0) {
        const conflictClass = overlappingBookings[0].class;
        throw new AppError(
          `Du har allerede en booking på dette tidspunktet: ${conflictClass.name} kl ${new Date(conflictClass.startTime).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}`,
          400
        );
      }

      // Check if there's an existing cancelled booking that we can reactivate
      const existingCancelledBooking = await prisma.booking.findFirst({
        where: {
          classId,
          userId,
          status: 'CANCELLED'
        }
      });

      let booking;
      if (existingCancelledBooking) {
        // Reactivate the cancelled booking
        booking = await prisma.booking.update({
          where: { id: existingCancelledBooking.id },
          data: {
            status: 'CONFIRMED',
            notes,
            cancelledAt: null,
            cancelReason: null
          },
          include: {
            class: {
              include: {
                trainer: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            },
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        });
      } else {
        // Create new booking
        booking = await prisma.booking.create({
          data: {
            tenantId,
            classId,
            userId,
            notes,
            status: 'CONFIRMED'
          },
          include: {
            class: {
              include: {
                trainer: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            },
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        });
      }

      // Send confirmation email
      try {
        await emailService.sendBookingConfirmation({
          userName: booking.user.email,
          className: booking.class.name,
          startTime: booking.class.startTime,
          endTime: booking.class.endTime,
          trainerName: `${booking.class.trainer.firstName} ${booking.class.trainer.lastName}`
        });
      } catch (emailError) {
        console.error('Failed to send booking confirmation:', emailError);
      }

      res.status(201).json({
        success: true,
        data: booking,
        message: 'Booking bekreftet'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: 'Kunne ikke opprette booking' });
      }
    }
  }

  // Get user bookings
  async getUserBookings(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { status, upcoming } = req.query;

      const bookings = await prisma.booking.findMany({
        where: {
          userId,
          ...(status && { status: status as any }),
          ...(upcoming && {
            class: {
              startTime: { gte: new Date() }
            }
          })
        },
        include: {
          class: {
            include: {
              trainer: {
                select: {
                  firstName: true,
                  lastName: true,
                  avatar: true
                }
              }
            }
          }
        },
        orderBy: {
          class: { startTime: 'asc' }
        }
      });

      res.json({ success: true, data: bookings });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Kunne ikke hente bookinger' });
    }
  }

  // Cancel booking
  async cancelBooking(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const { reason } = req.body;

      const booking = await prisma.booking.findFirst({
        where: { id, userId },
        include: { class: true }
      });

      if (!booking) {
        throw new AppError('Booking ikke funnet', 404);
      }

      // Check cancellation policy (24 hours before)
      const hoursUntilClass = (booking.class.startTime.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntilClass < 24) {
        throw new AppError('Kan ikke kansellere mindre enn 24 timer før', 400);
      }

      await prisma.booking.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: reason
        }
      });

      res.json({ success: true, message: 'Booking kansellert' });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: 'Kunne ikke kansellere booking' });
      }
    }
  }
}
