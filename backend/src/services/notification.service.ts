import { PrismaClient, NotificationType } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateNotificationData {
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  ptSessionId?: string;
  classId?: string;
}

export class NotificationService {
  /**
   * Create a new notification
   */
  async createNotification(data: CreateNotificationData) {
    return await prisma.notification.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        ptSessionId: data.ptSessionId,
        classId: data.classId,
      },
      include: {
        ptSession: {
          include: {
            trainer: true,
            customer: true,
          },
        },
        class: {
          include: {
            trainer: true,
          },
        },
      },
    });
  }

  /**
   * Get all notifications for a user
   */
  async getUserNotifications(userId: string, tenantId: string, unreadOnly: boolean = false) {
    return await prisma.notification.findMany({
      where: {
        userId,
        tenantId,
        ...(unreadOnly && { isRead: false }),
      },
      include: {
        ptSession: {
          include: {
            trainer: true,
            customer: true,
          },
        },
        class: {
          include: {
            trainer: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    // Verify the notification belongs to the user
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string, tenantId: string) {
    return await prisma.notification.updateMany({
      where: {
        userId,
        tenantId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string, tenantId: string) {
    return await prisma.notification.count({
      where: {
        userId,
        tenantId,
        isRead: false,
      },
    });
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string, userId: string) {
    // Verify the notification belongs to the user
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return await prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  /**
   * Create notification preferences for a user
   */
  async createNotificationPreferences(userId: string) {
    return await prisma.notificationPreferences.create({
      data: {
        userId,
      },
    });
  }

  /**
   * Get notification preferences for a user
   */
  async getNotificationPreferences(userId: string) {
    let prefs = await prisma.notificationPreferences.findUnique({
      where: { userId },
    });

    // Create default preferences if they don't exist
    if (!prefs) {
      prefs = await this.createNotificationPreferences(userId);
    }

    return prefs;
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    userId: string,
    data: {
      ptSessionReminder?: boolean;
      reminderMinutes?: number;
      sessionUpdates?: boolean;
      sessionApprovals?: boolean;
      sessionCancellations?: boolean;
      feedbackNotifications?: boolean;
      classUpdates?: boolean;
      classCancellations?: boolean;
    }
  ) {
    return await prisma.notificationPreferences.upsert({
      where: { userId },
      create: {
        userId,
        ...data,
      },
      update: data,
    });
  }

  /**
   * Helper: Send PT session notification to both trainer and customer
   */
  async notifyPTSessionParticipants({
    tenantId,
    trainerId,
    customerId,
    ptSessionId,
    type,
    trainerTitle,
    trainerMessage,
    customerTitle,
    customerMessage,
  }: {
    tenantId: string;
    trainerId: string;
    customerId: string;
    ptSessionId: string;
    type: NotificationType;
    trainerTitle: string;
    trainerMessage: string;
    customerTitle: string;
    customerMessage: string;
  }) {
    const notifications = [];

    // Check preferences before sending
    const trainerPrefs = await this.getNotificationPreferences(trainerId);
    const customerPrefs = await this.getNotificationPreferences(customerId);

    const shouldNotifyTrainer = this.shouldSendNotification(type, trainerPrefs);
    const shouldNotifyCustomer = this.shouldSendNotification(type, customerPrefs);

    if (shouldNotifyTrainer) {
      const trainerNotif = await this.createNotification({
        tenantId,
        userId: trainerId,
        type,
        title: trainerTitle,
        message: trainerMessage,
        ptSessionId,
      });
      notifications.push(trainerNotif);
    }

    if (shouldNotifyCustomer) {
      const customerNotif = await this.createNotification({
        tenantId,
        userId: customerId,
        type,
        title: customerTitle,
        message: customerMessage,
        ptSessionId,
      });
      notifications.push(customerNotif);
    }

    return notifications;
  }

  /**
   * Check if a notification should be sent based on preferences
   */
  private shouldSendNotification(
    type: NotificationType,
    prefs: any
  ): boolean {
    switch (type) {
      case 'PT_SESSION_CREATED':
      case 'PT_SESSION_UPDATED':
        return prefs.sessionUpdates;
      case 'PT_SESSION_APPROVED':
      case 'PT_SESSION_REJECTED':
        return prefs.sessionApprovals;
      case 'PT_SESSION_CANCELLED':
        return prefs.sessionCancellations;
      case 'PT_SESSION_REMINDER':
        return prefs.ptSessionReminder;
      case 'PT_SESSION_FEEDBACK':
        return prefs.feedbackNotifications;
      case 'CLASS_UPDATED':
        return prefs.classUpdates;
      case 'CLASS_CANCELLED':
        return prefs.classCancellations;
      default:
        return true; // Send by default for other types
    }
  }

  /**
   * Send class update notification to all booked users
   */
  async notifyClassUpdate({
    tenantId,
    classId,
    className,
    changes,
  }: {
    tenantId: string;
    classId: string;
    className: string;
    changes: string;
  }) {
    // Get all users with active bookings for this class
    const bookings = await prisma.booking.findMany({
      where: {
        classId,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      include: {
        user: true,
      },
    });

    const notifications = [];

    for (const booking of bookings) {
      const prefs = await this.getNotificationPreferences(booking.userId);

      if (this.shouldSendNotification('CLASS_UPDATED', prefs)) {
        const notification = await this.createNotification({
          tenantId,
          userId: booking.userId,
          type: 'CLASS_UPDATED',
          title: 'Klasseendring',
          message: `Klassen "${className}" har blitt oppdatert: ${changes}`,
          classId,
        });
        notifications.push(notification);
      }
    }

    return notifications;
  }

  /**
   * Send class cancellation notification to all booked users
   */
  async notifyClassCancellation({
    tenantId,
    classId,
    className,
    reason,
  }: {
    tenantId: string;
    classId: string;
    className: string;
    reason?: string;
  }) {
    // Get all users with active bookings for this class
    const bookings = await prisma.booking.findMany({
      where: {
        classId,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      include: {
        user: true,
      },
    });

    const notifications = [];

    for (const booking of bookings) {
      const prefs = await this.getNotificationPreferences(booking.userId);

      if (this.shouldSendNotification('CLASS_CANCELLED', prefs)) {
        const message = reason
          ? `Klassen "${className}" har blitt avlyst. Grunn: ${reason}`
          : `Klassen "${className}" har blitt avlyst.`;

        const notification = await this.createNotification({
          tenantId,
          userId: booking.userId,
          type: 'CLASS_CANCELLED',
          title: 'Klasse avlyst',
          message,
          classId,
        });
        notifications.push(notification);
      }
    }

    return notifications;
  }
}

export default new NotificationService();
