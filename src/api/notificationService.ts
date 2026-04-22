import api from './api';

export interface NotificationDTO {
  id: number;
  actorId: number;
  actorName: string;
  actorAvatar: string | null;
  recipientId: number;
  type: string;
  targetType: string;
  targetId: number;
  isRead: boolean;
  createdAt: string;
  message: string;
  // New fields for enhancement
  priority: 'HIGH' | 'NORMAL' | 'LOW';
  thumbnailUrl?: string | null;
  contentPreview?: string | null;
  actorIds?: number[];
  actorCount?: number;
  actorAvatars?: string[];
}

export const notificationService = {
  getNotifications: async (page = 0, size = 20) => {
    const response = await api.get(`/notifications?page=${page}&size=${size}`);
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  },

  markAsRead: async (id: number) => {
    const response = await api.put(`/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.put('/notifications/read-all');
    return response.data;
  },

  // Save Expo push token
  savePushToken: async (pushToken: string) => {
    const response = await api.post('/user/push-token', { pushToken });
    return response.data;
  }
};
