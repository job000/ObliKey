import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Notification, NotificationPreferences, NotificationContextType } from '../types/notification';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchNotifications = async (unreadOnly: boolean = false) => {
    // Don't fetch if not authenticated
    if (!user) {
      return;
    }

    try {
      setLoading(true);
      const response = await api.getNotifications(unreadOnly);
      if (response.success) {
        setNotifications(response.data || []);
      }
    } catch (error: any) {
      // Silently handle 403 errors
      if (error?.response?.status === 403) {
        console.log('[Notifications] Access denied');
        return;
      }
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    // Don't fetch if not authenticated
    if (!user) {
      return;
    }

    try {
      const response = await api.getNotificationsUnreadCount();
      if (response.success) {
        setUnreadCount(response.data?.count || 0);
      }
    } catch (error: any) {
      // Silently handle 403 errors (likely due to deactivated tenant)
      if (error?.response?.status === 403) {
        console.log('[Notifications] Tenant is deactivated or access denied');
        setUnreadCount(0);
        return;
      }
      console.error('Failed to fetch unread count:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await api.markNotificationAsRead(notificationId);
      if (response.success) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
        );
        await fetchUnreadCount();
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await api.markAllNotificationsAsRead();
      if (response.success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await api.deleteNotification(notificationId);
      if (response.success) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        await fetchUnreadCount();
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const fetchPreferences = async () => {
    // Don't fetch if not authenticated
    if (!user) {
      return;
    }

    try {
      const response = await api.getNotificationPreferences();
      if (response.success) {
        setPreferences(response.data);
      }
    } catch (error: any) {
      // Silently handle 403 errors
      if (error?.response?.status === 403) {
        console.log('[Notifications] Access denied to preferences');
        return;
      }
      console.error('Failed to fetch notification preferences:', error);
    }
  };

  const updatePreferences = async (data: Partial<NotificationPreferences>) => {
    try {
      const response = await api.updateNotificationPreferences(data);
      if (response.success) {
        setPreferences(response.data);
      }
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      throw error;
    }
  };

  // Only fetch notifications when user is logged in
  useEffect(() => {
    if (!user) {
      // Reset state when user logs out
      setNotifications([]);
      setUnreadCount(0);
      setPreferences(null);
      return;
    }

    fetchNotifications();
    fetchUnreadCount();
    fetchPreferences();

    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 60000);

    return () => clearInterval(interval);
  }, [user]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    preferences,
    loading,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    fetchPreferences,
    updatePreferences,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
