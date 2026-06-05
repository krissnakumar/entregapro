import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { api } from './client';
import { logger } from '../config/logger';

let expoNotifications: any = null;
let registeredForUserId: string | null = null;
let responseListenerAttached = false;

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android' || !expoNotifications) return;

  await expoNotifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: expoNotifications.AndroidImportance?.MAX ?? 5,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#2563EB',
    lockscreenVisibility: expoNotifications.AndroidNotificationVisibility?.PUBLIC,
    sound: 'default',
  });
}

export async function setupPushNotifications(userId?: string | null): Promise<string | null> {
  if (!userId) return null;
  if (registeredForUserId === userId) return null;

  try {
    expoNotifications = require('expo-notifications');
    await ensureAndroidChannel();

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
      const { status } = await expoNotifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      logger.warn('Push notification permission not granted');
      return null;
    }

    // Get Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) {
      logger.warn('EAS Project ID not found in expo config');
      return null;
    }

    const tokenData = await expoNotifications.getExpoPushTokenAsync({
      projectId,
    });
    const pushToken = tokenData.data;

    // Register with server
    await api.post('/notifications/push-token', { token: pushToken });
    logger.info('Push token registered successfully');

    // Set up notification response listener (tap to open)
    if (!responseListenerAttached) {
      expoNotifications.addNotificationResponseReceivedListener((response: any) => {
        const data = response.notification?.request?.content?.data;
        logger.info('Notification tapped', data);
      });
      responseListenerAttached = true;
    }

    registeredForUserId = userId;
    return pushToken;
  } catch (err) {
    logger.warn('Push notifications setup failed:', err);
    return null;
  }
}
