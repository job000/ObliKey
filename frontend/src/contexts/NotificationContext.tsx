import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Notification, NotificationPreferences, NotificationContextType } from '../types/notification';
import { api, storage } from '../services/api';

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const fetchNotifications = async (unreadOnly: boolean = false) => {
    try {
      setLoading(true);
      const response = await api.getNotifications(unreadOnly);
      if (response.success) {
        setNotifications(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await api.getNotificationsUnreadCount();
      if (response.success) {
        setUnreadCount(response.data?.count || 0);
      }
    } catch (error) {
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
    try {
      const response = await api.getNotificationPreferences();
      if (response.success) {
        setPreferences(response.data);
      }
    } catch (error) {
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

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = await storage.getItem('token');
      setIsAuthenticated(!!token);
    };
    checkAuth();
  }, []);

  // Only fetch notifications when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    fetchNotifications();
    fetchUnreadCount();
    fetchPreferences();

    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 60000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

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
