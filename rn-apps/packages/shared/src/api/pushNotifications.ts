import { Platform } from 'react-native';
import { api } from './client';
import { logger } from '../config/logger';

let expoNotifications: any = null;
let registered = false;

export async function setupPushNotifications(): Promise<string | null> {
  if (registered) return null;

  try {
    expoNotifications = require('expo-notifications');

    // Configure how notifications are shown when app is foregrounded
    expoNotifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // Request permission
    const { status: existingStatus } = await expoNotifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await expoNotifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      logger.warn('Push notification permission not granted');
      return null;
    }

    // Get Expo push token
    const tokenData = await expoNotifications.getExpoPushTokenAsync();
    const pushToken = tokenData.data;

    // Register with server
    await api.post('/notifications/push-token', { token: pushToken });
    logger.info('Push token registered');

    // Set up notification response listener (tap to open)
    expoNotifications.addNotificationResponseReceivedListener((response: any) => {
      const data = response.notification?.request?.content?.data;
      logger.info('Notification tapped', data);
    });

    registered = true;
    return pushToken;
  } catch (err) {
    logger.warn('Push notifications not available on this platform');
    return null;
  }
}
