import { useEffect } from 'react';
import { connectSocket, onNotificationReceived } from './tracking';
import { useNotificationStore } from '../store/notificationStore';
import { getAuthToken } from '../store/authStore';
import { setupPushNotifications } from './pushNotifications';

/**
 * Sets up the Socket.IO connection for real-time notifications and
 * registers for Expo push notifications. Call once from App.tsx
 * when the user is authenticated.
 */
export function useRealtimeNotifications(userId?: string | null) {
  const addNotification = useNotificationStore((s) => s.addNotification);

  useEffect(() => {
    if (!userId) return;

    // Connect an authenticated socket; the backend auto-joins user rooms.
    connectSocket(undefined, getAuthToken());

    const unsub = onNotificationReceived((data) => {
      addNotification({
        id: data.id,
        userId: data.userId,
        title: data.title,
        message: data.message,
        isRead: data.isRead ?? false,
        createdAt: data.createdAt,
      });
    });

    // Set up push notifications
    void setupPushNotifications(userId);

    return () => {
      unsub();
    };
  }, [userId, addNotification]);
}
