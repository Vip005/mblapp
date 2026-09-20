import { Notification } from '../../types';
import { initialNotifications } from '../../data/notifications';
import { storage, STORAGE_KEYS } from '../../utils/storage';

export const notificationService = {
  async getNotifications(): Promise<Notification[]> {
    const saved = await storage.get<Notification[] | null>(STORAGE_KEYS.NOTIFICATIONS, null);
    if (!saved) {
      await storage.set(STORAGE_KEYS.NOTIFICATIONS, initialNotifications);
      return [...initialNotifications];
    }
    return saved;
  },

  async markAsRead(id: string): Promise<Notification[]> {
    const current = await this.getNotifications();
    const updated = current.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    await storage.set(STORAGE_KEYS.NOTIFICATIONS, updated);
    return updated;
  },

  async markAllAsRead(): Promise<Notification[]> {
    const current = await this.getNotifications();
    const updated = current.map((n) => ({ ...n, isRead: true }));
    await storage.set(STORAGE_KEYS.NOTIFICATIONS, updated);
    return updated;
  },

  async deleteNotification(id: string): Promise<Notification[]> {
    const current = await this.getNotifications();
    const updated = current.filter((n) => n.id !== id);
    await storage.set(STORAGE_KEYS.NOTIFICATIONS, updated);
    return updated;
  },
};
