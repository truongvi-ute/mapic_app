import { create } from 'zustand';
import { notificationService, NotificationDTO } from '../api/notificationService';
import { safeSoundService } from '../services/safeSoundService';

interface NotificationState {
  notifications: NotificationDTO[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: NotificationDTO) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const response = await notificationService.getNotifications();
      if (response.success) {
        set({ notifications: response.data.content });
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const response = await notificationService.getUnreadCount();
      if (response.success) {
        set({ unreadCount: response.data });
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  },

  markAsRead: async (id: number) => {
    try {
      await notificationService.markAsRead(id);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationService.markAllAsRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  },

  addNotification: (notification: NotificationDTO) => {
    // Play sound and vibration based on priority
    safeSoundService.notificationFeedback(notification.priority || 'NORMAL');
    
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },
}));
