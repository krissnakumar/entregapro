import { api } from './client';
import type { Notification } from '../types';

export const notificationService = {
  async findAll(): Promise<Notification[]> {
    return api.get<Notification[]>('/notifications');
  },

  async markAsRead(id: string): Promise<Notification> {
    return api.patch<Notification>(`/notifications/${id}/read`, {});
  },

  async markAllAsRead(): Promise<void> {
    return api.patch<void>('/notifications/read-all', {});
  },

  async sendTestPush(): Promise<{ success: boolean; notificationId: string }> {
    return api.post<{ success: boolean; notificationId: string }>('/notifications/test-push', {});
  },
};
