export type NotificationType =
  | 'PT_SESSION_CREATED'
  | 'PT_SESSION_UPDATED'
  | 'PT_SESSION_CANCELLED'
  | 'PT_SESSION_APPROVED'
  | 'PT_SESSION_REJECTED'
  | 'PT_SESSION_REMINDER'
  | 'PT_SESSION_COMPLETED'
  | 'PT_SESSION_FEEDBACK'
  | 'SYSTEM';

export interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  ptSessionId?: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  ptSession?: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    trainer: {
      id: string;
      firstName: string;
      lastName: string;
    };
    customer: {
      id: string;
      firstName: string;
      lastName: string;
    };
  };
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  ptSessionReminder: boolean;
  reminderMinutes: number;
  sessionUpdates: boolean;
  sessionApprovals: boolean;
  sessionCancellations: boolean;
  feedbackNotifications: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreferences | null;
  loading: boolean;
  fetchNotifications: (unreadOnly?: boolean) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  fetchPreferences: () => Promise<void>;
  updatePreferences: (data: Partial<NotificationPreferences>) => Promise<void>;
}
