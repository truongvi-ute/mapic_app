import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { notificationService } from '../api/notificationService';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const pushNotificationService = {
  /**
   * Request permission and get Expo push token
   */
  async registerForPushNotifications(): Promise<string | null> {
    // Check if running in Expo Go (which doesn't support all native modules)
    try {
      if (!Device.isDevice) {
        console.log('⚠️ Push notifications only work on physical devices');
        console.log('ℹ️ Running in simulator/emulator - push notifications disabled');
        return null;
      }

      // Request permission
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('⚠️ Permission for push notifications denied');
        return null;
      }

      // Get Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-project-id', // TODO: Replace with actual project ID from app.json
      });

      console.log('✅ Expo Push Token:', tokenData.data);

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });

        // High priority channel for SOS alerts
        await Notifications.setNotificationChannelAsync('sos-alerts', {
          name: 'SOS Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#FF0000',
          sound: 'sos-alert.mp3',
        });
      }

      // Save token to backend
      await notificationService.savePushToken(tokenData.data);

      return tokenData.data;
    } catch (error: any) {
      // Handle Expo Go limitation gracefully
      if (error?.message?.includes('ExpoPushTokenManager') || 
          error?.message?.includes('native module')) {
        console.log('⚠️ Push notifications require a development build');
        console.log('ℹ️ Running in Expo Go - push notifications disabled');
        console.log('ℹ️ To enable push notifications:');
        console.log('   1. Run: eas build --profile development --platform android');
        console.log('   2. Install the APK on your device');
        console.log('   3. Run: npx expo start --dev-client');
        console.log('');
        console.log('✅ You can still test:');
        console.log('   - Notification list UI');
        console.log('   - Mark as read');
        console.log('   - Settings screen');
        console.log('   - Backend API');
        return null;
      }
      
      console.error('❌ Error registering for push notifications:', error);
      return null;
    }
  },

  /**
   * Add listener for notifications received while app is in foreground
   */
  addNotificationReceivedListener(callback: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(callback);
  },

  /**
   * Add listener for notification taps (when user taps notification)
   */
  addNotificationResponseReceivedListener(
    callback: (response: Notifications.NotificationResponse) => void
  ) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  },

  /**
   * Schedule a local notification (for testing)
   */
  async scheduleLocalNotification(title: string, body: string, data?: any) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: null, // Show immediately
    });
  },

  /**
   * Get last notification response (useful for deep linking on app launch)
   */
  async getLastNotificationResponse() {
    return await Notifications.getLastNotificationResponseAsync();
  },

  /**
   * Set badge count
   */
  async setBadgeCount(count: number) {
    await Notifications.setBadgeCountAsync(count);
  },

  /**
   * Clear all notifications
   */
  async clearAllNotifications() {
    await Notifications.dismissAllNotificationsAsync();
  },
};
