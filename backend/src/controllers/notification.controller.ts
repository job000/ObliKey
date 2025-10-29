import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import notificationService from '../services/notification.service';

export class NotificationController {
  /**
   * Get all notifications for the current user
   */
  async getNotifications(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const tenantId = req.tenantId!;
      const unreadOnly = req.query.unreadOnly === 'true';

      const notifications = await notificationService.getUserNotifications(
        userId,
        tenantId,
        unreadOnly
      );

      res.json({
        success: true,
        data: notifications,
      });
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({
        success: false,
        error: 'Kunne ikke hente varsler',
      });
    }
  }

  /**
   * Get unread count for the current user
   */
  async getUnreadCount(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const tenantId = req.tenantId!;

      const count = await notificationService.getUnreadCount(userId, tenantId);

      res.json({
        success: true,
        data: { count },
      });
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({
        success: false,
        error: 'Kunne ikke hente antall uleste varsler',
      });
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { notificationId } = req.params;
      const userId = req.user!.userId;

      const notification = await notificationService.markAsRead(
        notificationId,
        userId
      );

      res.json({
        success: true,
        data: notification,
        message: 'Varsel markert som lest',
      });
    } catch (error) {
      console.error('Mark as read error:', error);
      res.status(404).json({
        success: false,
        error: 'Varsel ikke funnet',
      });
    }
  }

  /**
   * Mark all notifications as read for the current user
   */
  async markAllAsRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const tenantId = req.tenantId!;

      await notificationService.markAllAsRead(userId, tenantId);

      res.json({
        success: true,
        message: 'Alle varsler markert som lest',
      });
    } catch (error) {
      console.error('Mark all as read error:', error);
      res.status(500).json({
        success: false,
        error: 'Kunne ikke markere varsler som lest',
      });
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { notificationId } = req.params;
      const userId = req.user!.userId;

      await notificationService.deleteNotification(notificationId, userId);

      res.json({
        success: true,
        message: 'Varsel slettet',
      });
    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(404).json({
        success: false,
        error: 'Varsel ikke funnet',
      });
    }
  }

  /**
   * Get notification preferences for the current user
   */
  async getPreferences(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;

      const preferences = await notificationService.getNotificationPreferences(
        userId
      );

      res.json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      console.error('Get preferences error:', error);
      res.status(500).json({
        success: false,
        error: 'Kunne ikke hente varslingsinnstillinger',
      });
    }
  }

  /**
   * Update notification preferences for the current user
   */
  async updatePreferences(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const {
        ptSessionReminder,
        reminderMinutes,
        sessionUpdates,
        sessionApprovals,
        sessionCancellations,
        feedbackNotifications,
        classUpdates,
        classCancellations,
      } = req.body;

      const preferences = await notificationService.updateNotificationPreferences(
        userId,
        {
          ptSessionReminder,
          reminderMinutes,
          sessionUpdates,
          sessionApprovals,
          sessionCancellations,
          feedbackNotifications,
          classUpdates,
          classCancellations,
        }
      );

      res.json({
        success: true,
        data: preferences,
        message: 'Varslingsinnstillinger oppdatert',
      });
    } catch (error) {
      console.error('Update preferences error:', error);
      res.status(500).json({
        success: false,
        error: 'Kunne ikke oppdatere varslingsinnstillinger',
      });
    }
  }
}
