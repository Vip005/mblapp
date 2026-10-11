import { Notification } from '../../types';
import { storage, STORAGE_KEYS } from '../../utils/storage';

export const notificationService = {
  getNotificationKey(customerId?: string | number): string {
    return customerId ? STORAGE_KEYS.customerNotifications(customerId) : STORAGE_KEYS.NOTIFICATIONS;
  },

  async getNotifications(customerId?: string | number): Promise<Notification[]> {
    const key = this.getNotificationKey(customerId);
    const saved = await storage.get<Notification[] | null>(key, null);
    if (!saved) {
      return [];
    }
    return saved;
  },

  async markAsRead(id: string, customerId?: string | number): Promise<Notification[]> {
    const key = this.getNotificationKey(customerId);
    const current = await this.getNotifications(customerId);
    const updated = current.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    await storage.set(key, updated);
    return updated;
  },

  async markAllAsRead(customerId?: string | number): Promise<Notification[]> {
    const key = this.getNotificationKey(customerId);
    const current = await this.getNotifications(customerId);
    const updated = current.map((n) => ({ ...n, isRead: true }));
    await storage.set(key, updated);
    return updated;
  },

  async deleteNotification(id: string, customerId?: string | number): Promise<Notification[]> {
    const key = this.getNotificationKey(customerId);
    const current = await this.getNotifications(customerId);
    const updated = current.filter((n) => n.id !== id);
    await storage.set(key, updated);
    return updated;
  },

  async clearNotifications(customerId?: string | number): Promise<void> {
    const key = this.getNotificationKey(customerId);
    await storage.remove(key);
  },
};
