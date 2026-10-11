import React, { createContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { Notification } from '../types';
import { notificationService } from '../services/api/notificationService';
import { useAuth } from '../hooks/useAuth';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  clearNotifications: () => void;
}

export const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  isLoading: true,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  deleteNotification: async () => {},
  refreshNotifications: async () => {},
  clearNotifications: () => {},
});

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    if (user?.id) {
      notificationService.clearNotifications(user.id);
    }
  }, [user?.id]);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const list = await notificationService.getNotifications(user.id);
      setNotifications(list);
    } catch (e) {
      console.warn('Failed to load notifications:', e);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const markAsRead = async (id: string) => {
    const updated = await notificationService.markAsRead(id, user?.id);
    setNotifications(updated);
  };

  const markAllAsRead = async () => {
    const updated = await notificationService.markAllAsRead(user?.id);
    setNotifications(updated);
  };

  const deleteNotification = async (id: string) => {
    const updated = await notificationService.deleteNotification(id, user?.id);
    setNotifications(updated);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        refreshNotifications: loadNotifications,
        clearNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
