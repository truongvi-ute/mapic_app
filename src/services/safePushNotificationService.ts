/**
 * Safe Push Notification Service
 * Wraps expo-notifications to work gracefully in Expo Go
 */

import { Platform } from 'react-native';

// Check if we're in a development build or Expo Go
const isExpoGo = () => {
  try {
    // In Expo Go, Constants.appOwnership will be 'expo'
    // In development build, it will be null or undefined
    const Constants = require('expo-constants').default;
    return Constants.appOwnership === 'expo';
  } catch {
    return true; // Assume Expo Go if we can't check
  }
};

// Lazy load expo-notifications only when needed
let Notifications: any = null;
let Device: any = null;

const loadModules = async () => {
  if (Notifications && Device) return true;
  
  try {
    Notifications = await import('expo-notifications');
    Device = await import('expo-device');
    return true;
  } catch (error) {
    console.log('⚠️ Could not load notification modules (expected in Expo Go)');
    return false;
  }
};

export const safePushNotificationService = {
  /**
   * Check if push notifications are available
   */
  async isAvailable(): Promise<boolean> {
    if (isExpoGo()) {
      console.log('⚠️ Running in Expo Go - push notifications not available');
      return false;
    }
    
    const loaded = await loadModules();
    if (!loaded) return false;
    
    if (!Device.isDevice) {
      console.log('⚠️ Push notifications only work on physical devices');
      return false;
    }
    
    return true;
  },

  /**
   * Register for push notifications (safe version)
   */
  async registerForPushNotifications(): Promise<string | null> {
    const available = await this.isAvailable();
    if (!available) {
      console.log('ℹ️ Push notifications disabled - app will work without them');
      console.log('✅ You can still test:');
      console.log('   - Notification list UI');
      console.log('   - Mark as read');
      console.log('   - Settings screen');
      console.log('   - Backend API');
      return null;
    }

    try {
      // Import the actual service
      const { pushNotificationService } = await import('./pushNotificationService');
      return await pushNotificationService.registerForPushNotifications();
    } catch (error: any) {
      console.log('⚠️ Push notification registration failed:', error.message);
      return null;
    }
  },

  /**
   * Add notification received listener (safe version)
   */
  addNotificationReceivedListener(callback: (notification: any) => void): any {
    if (!Notifications) {
      console.log('⚠️ Notification listeners not available');
      return { remove: () => {} };
    }

    try {
      return Notifications.addNotificationReceivedListener(callback);
    } catch (error) {
      console.log('⚠️ Could not add notification listener');
      return { remove: () => {} };
    }
  },

  /**
   * Add notification response listener (safe version)
   */
  addNotificationResponseReceivedListener(callback: (response: any) => void): any {
    if (!Notifications) {
      console.log('⚠️ Notification listeners not available');
      return { remove: () => {} };
    }

    try {
      return Notifications.addNotificationResponseReceivedListener(callback);
    } catch (error) {
      console.log('⚠️ Could not add notification response listener');
      return { remove: () => {} };
    }
  },

  /**
   * Get last notification response (safe version)
   */
  async getLastNotificationResponse(): Promise<any | null> {
    if (!Notifications) return null;

    try {
      return await Notifications.getLastNotificationResponseAsync();
    } catch (error) {
      return null;
    }
  },

  /**
   * Remove notification subscription (safe version)
   */
  removeNotificationSubscription(subscription: any): void {
    if (!Notifications || !subscription) return;

    try {
      Notifications.removeNotificationSubscription(subscription);
    } catch (error) {
      // Ignore errors
    }
  },
};

export default safePushNotificationService;
