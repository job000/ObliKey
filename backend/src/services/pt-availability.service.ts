import { PrismaClient, DayOfWeek, TimeBlockType } from '@prisma/client';

const prisma = new PrismaClient();

interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
  trainerId: string;
}

interface AvailableSlot {
  startTime: string;
  endTime: string;
  trainerId: string;
  trainerName: string;
}

export class PTAvailabilityService {
  /**
   * Get trainer's weekly availability schedule
   */
  async getTrainerAvailability(trainerId: string, tenantId: string) {
    const availability = await prisma.pTAvailability.findMany({
      where: {
        trainerId,
        tenantId,
        isActive: true
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ]
    });

    return availability;
  }

  /**
   * Set trainer's availability for a specific day
   */
  async setTrainerAvailability(
    trainerId: string,
    tenantId: string,
    dayOfWeek: DayOfWeek,
    startTime: string, // Format: "HH:MM"
    endTime: string
  ) {
    return await prisma.pTAvailability.create({
      data: {
        trainerId,
        tenantId,
        dayOfWeek,
        startTime,
        endTime,
        isActive: true
      }
    });
  }

  /**
   * Update trainer availability
   */
  async updateTrainerAvailability(
    availabilityId: string,
    data: {
      startTime?: string;
      endTime?: string;
      isActive?: boolean;
    }
  ) {
    return await prisma.pTAvailability.update({
      where: { id: availabilityId },
      data
    });
  }

  /**
   * Delete trainer availability
   */
  async deleteTrainerAvailability(availabilityId: string) {
    return await prisma.pTAvailability.delete({
      where: { id: availabilityId }
    });
  }

  /**
   * Get trainer's time blocks (blocked times or one-time availability)
   */
  async getTrainerTimeBlocks(
    trainerId: string,
    tenantId: string,
    startDate: Date,
    endDate: Date
  ) {
    return await prisma.pTTimeBlock.findMany({
      where: {
        trainerId,
        tenantId,
        isActive: true,
        startTime: { gte: startDate },
        endTime: { lte: endDate }
      },
      orderBy: { startTime: 'asc' }
    });
  }

  /**
   * Block a specific time slot (vacation, meeting, etc.)
   */
  async blockTimeSlot(
    trainerId: string,
    tenantId: string,
    startTime: Date,
    endTime: Date,
    reason?: string
  ) {
    return await prisma.pTTimeBlock.create({
      data: {
        trainerId,
        tenantId,
        type: TimeBlockType.BLOCKED,
        startTime,
        endTime,
        reason,
        isActive: true
      }
    });
  }

  /**
   * Add one-time availability outside regular schedule
   */
  async addOneTimeAvailability(
    trainerId: string,
    tenantId: string,
    startTime: Date,
    endTime: Date,
    reason?: string
  ) {
    return await prisma.pTTimeBlock.create({
      data: {
        trainerId,
        tenantId,
        type: TimeBlockType.AVAILABLE,
        startTime,
        endTime,
        reason,
        isActive: true
      }
    });
  }

  /**
   * Delete time block
   */
  async deleteTimeBlock(timeBlockId: string) {
    return await prisma.pTTimeBlock.delete({
      where: { id: timeBlockId }
    });
  }

  /**
   * Get available time slots for a trainer on a specific date
   * This is the main function customers will use to see when they can book
   */
  async getAvailableSlots(
    trainerId: string,
    tenantId: string,
    date: Date,
    slotDuration: number = 60 // Default 60 minutes
  ): Promise<AvailableSlot[]> {
    // Get trainer info
    const trainer = await prisma.user.findUnique({
      where: { id: trainerId },
      select: {
        id: true,
        firstName: true,
        lastName: true
      }
    });

    if (!trainer) {
      throw new Error('Trainer not found');
    }

    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const dayIndex = date.getDay();
    const dayOfWeek = this.getDayOfWeek(dayIndex);

    // Get trainer's regular availability for this day
    const availability = await prisma.pTAvailability.findFirst({
      where: {
        trainerId,
        tenantId,
        dayOfWeek,
        isActive: true
      }
    });

    if (!availability) {
      return []; // Trainer not available on this day
    }

    // Generate time slots based on regular availability
    const slots = this.generateTimeSlots(
      date,
      availability.startTime,
      availability.endTime,
      slotDuration
    );

    // Get existing bookings for this trainer on this date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const existingBookings = await prisma.pTSession.findMany({
      where: {
        trainerId,
        tenantId,
        startTime: { gte: startOfDay },
        endTime: { lte: endOfDay },
        status: {
          in: ['PENDING_APPROVAL', 'SCHEDULED', 'CONFIRMED']
        }
      },
      select: {
        startTime: true,
        endTime: true
      }
    });

    // Get time blocks for this date
    const timeBlocks = await this.getTrainerTimeBlocks(
      trainerId,
      tenantId,
      startOfDay,
      endOfDay
    );

    // Filter out unavailable slots
    const availableSlots = slots.filter(slot => {
      // Check if slot overlaps with existing bookings
      const overlapsBooking = existingBookings.some(booking =>
        this.slotsOverlap(slot.start, slot.end, booking.startTime, booking.endTime)
      );

      if (overlapsBooking) return false;

      // Check if slot is blocked
      const blockedBlocks = timeBlocks.filter(block => block.type === TimeBlockType.BLOCKED);
      const isBlocked = blockedBlocks.some(block =>
        this.slotsOverlap(slot.start, slot.end, block.startTime, block.endTime)
      );

      if (isBlocked) return false;

      // Check if slot is in the past
      if (slot.start < new Date()) return false;

      return true;
    });

    // Convert to API format
    return availableSlots.map(slot => ({
      startTime: slot.start.toISOString(),
      endTime: slot.end.toISOString(),
      trainerId: trainer.id,
      trainerName: `${trainer.firstName} ${trainer.lastName}`
    }));
  }

  /**
   * Get available slots for all trainers on a specific date
   */
  async getAllAvailableSlots(
    tenantId: string,
    date: Date,
    slotDuration: number = 60
  ): Promise<AvailableSlot[]> {
    // Get all trainers for this tenant
    const trainers = await prisma.user.findMany({
      where: {
        tenantId,
        role: 'TRAINER',
        active: true
      },
      select: { id: true }
    });

    // Get available slots for each trainer
    const allSlots: AvailableSlot[] = [];
    for (const trainer of trainers) {
      const slots = await this.getAvailableSlots(trainer.id, tenantId, date, slotDuration);
      allSlots.push(...slots);
    }

    // Sort by start time
    allSlots.sort((a, b) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    return allSlots;
  }

  // Helper functions

  private getDayOfWeek(dayIndex: number): DayOfWeek {
    const days: DayOfWeek[] = [
      DayOfWeek.SUNDAY,
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
      DayOfWeek.SATURDAY
    ];
    return days[dayIndex];
  }

  private generateTimeSlots(
    date: Date,
    startTime: string, // Format: "HH:MM"
    endTime: string,   // Format: "HH:MM"
    duration: number   // In minutes
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];

    // Parse start and end times
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    // Create start datetime
    const slotStart = new Date(date);
    slotStart.setHours(startHour, startMinute, 0, 0);

    // Create end datetime
    const dayEnd = new Date(date);
    dayEnd.setHours(endHour, endMinute, 0, 0);

    // Generate slots
    let current = new Date(slotStart);
    while (current < dayEnd) {
      const slotEnd = new Date(current);
      slotEnd.setMinutes(slotEnd.getMinutes() + duration);

      if (slotEnd <= dayEnd) {
        slots.push({
          start: new Date(current),
          end: new Date(slotEnd),
          available: true,
          trainerId: ''
        });
      }

      current = new Date(slotEnd);
    }

    return slots;
  }

  private slotsOverlap(
    start1: Date,
    end1: Date,
    start2: Date,
    end2: Date
  ): boolean {
    return start1 < end2 && end1 > start2;
  }
}

export const ptAvailabilityService = new PTAvailabilityService();
