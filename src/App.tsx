import React, { useEffect, useState, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import Toast from 'react-native-toast-message';
import AppNavigator from './navigation/AppNavigator';
import { AlertProvider } from './context/AlertContext';
import { useAuthStore } from './store/useAuthStore';
import { useNotificationStore } from './store/useNotificationStore';
import authService from './api/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setupAxiosInterceptor } from './api/axiosInterceptor';
import { safePushNotificationService } from './services/safePushNotificationService';
import { safeSoundService } from './services/safeSoundService';
import { NotificationDTO } from './api/notificationService';

const App = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const loginStore = useAuthStore((state) => state.login);
  const user = useAuthStore((state) => state.user);
  const addNotification = useNotificationStore((state) => state.addNotification);
  const fetchUnreadCount = useNotificationStore((state) => state.fetchUnreadCount);
  
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    // Setup axios interceptor để tự động logout khi nhận 401
    setupAxiosInterceptor();
    
    // Initialize sound service (safe version)
    safeSoundService.initialize();
    
    checkAuth();

    // Cleanup
    return () => {
      safeSoundService.cleanup();
      try {
        if (notificationListener.current) {
          safePushNotificationService.removeNotificationSubscription(notificationListener.current);
        }
        if (responseListener.current) {
          safePushNotificationService.removeNotificationSubscription(responseListener.current);
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    };
  }, []);

  // Setup push notifications after user is authenticated
  useEffect(() => {
    if (user) {
      setupPushNotifications();
    }
  }, [user]);

  const setupPushNotifications = async () => {
    try {
      // Check if push notifications are available
      const available = await safePushNotificationService.isAvailable();
      if (!available) {
        console.log('ℹ️ Continuing without push notification support');
        return;
      }

      // Register for push notifications
      const token = await safePushNotificationService.registerForPushNotifications();
      
      if (!token) {
        console.log('⚠️ Push notifications not available - continuing without push support');
        return;
      }
      
      console.log('✅ Push notification setup complete, token:', token);

      // Listen for notifications received while app is in foreground
      notificationListener.current = safePushNotificationService.addNotificationReceivedListener(
        (notification) => {
          console.log('Notification received in foreground:', notification);
          
          // Show toast
          const data = notification.request.content.data as any;
          Toast.show({
            type: 'info',
            text1: notification.request.content.title || 'Thông báo mới',
            text2: notification.request.content.body,
            visibilityTime: 4000,
            autoHide: true,
            topOffset: 60,
            onPress: () => {
              // Handle navigation if needed
              Toast.hide();
            },
          });

          // Add to store (will play sound/vibration)
          if (data && data.notification) {
            addNotification(data.notification as NotificationDTO);
          }

          // Update badge count
          fetchUnreadCount();
        }
      );

      // Listen for notification taps
      responseListener.current = safePushNotificationService.addNotificationResponseReceivedListener(
        (response) => {
          console.log('Notification tapped:', response);
          
          // Handle deep linking
          const data = response.notification.request.content.data as any;
          if (data && data.notification) {
            // Navigation will be handled by NotificationsScreen
            // Just add to store
            addNotification(data.notification as NotificationDTO);
          }
        }
      );

      // Check for notification that opened the app
      const lastResponse = await safePushNotificationService.getLastNotificationResponse();
      if (lastResponse) {
        console.log('App opened from notification:', lastResponse);
        // Handle deep linking from killed state
      }
    } catch (error: any) {
      // Gracefully handle push notification setup errors
      console.log('⚠️ Push notification setup failed:', error.message || error);
      console.log('ℹ️ App will continue without push notification support');
    }
  };

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        setIsInitializing(false);
        return;
      }
      
      // Verify token với server - chỉ lấy thông tin cơ bản
      const response = await authService.verifyToken();
      
      if (response.success && response.data) {
        const { token: validToken, ...user } = response.data;
        loginStore(user, validToken);
      } else {
        // Token không hợp lệ, xóa dữ liệu cũ
        console.log('Token verification failed, clearing auth data');
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
      }
    } catch (e: any) {
      console.log('[App] Token verification error:', e.message || e);
      
      // Kiểm tra loại lỗi
      if (e.response) {
        // Server trả về response (401, 403, etc.)
        const status = e.response.status;
        
        if (status === 400 || status === 401 || status === 403) {
          // Token không hợp lệ, hết hạn hoặc bad request → logout
          console.log('Token invalid or expired (status: ' + status + '), logging out');
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('user');
        } else {
          // Lỗi server khác (500, etc.) → giữ token, cho phép retry
          console.log('Server error (status: ' + status + '), keeping token for retry');
          const storedUser = await AsyncStorage.getItem('user');
          const storedToken = await AsyncStorage.getItem('token');
          
          if (storedUser && storedToken) {
            try {
              const user = JSON.parse(storedUser);
              loginStore(user, storedToken);
            } catch (parseError) {
              console.error('Failed to parse stored user', parseError);
              await AsyncStorage.removeItem('token');
              await AsyncStorage.removeItem('user');
            }
          }
        }
      } else if (e.request) {
        // Request được gửi nhưng không nhận được response (network error)
        console.log('Network error, keeping token for offline mode');
        
        // Giữ token cũ để có thể retry sau
        const storedUser = await AsyncStorage.getItem('user');
        const storedToken = await AsyncStorage.getItem('token');
        
        if (storedUser && storedToken) {
          try {
            const user = JSON.parse(storedUser);
            loginStore(user, storedToken);
          } catch (parseError) {
            console.error('Failed to parse stored user', parseError);
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('user');
          }
        }
      } else {
        // Lỗi khác (setup error, etc.) → xóa token
        console.log('Unknown error, clearing auth data');
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
      }
    } finally {
      setIsInitializing(false);
    }
  };

  if (isInitializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AlertProvider>
        <StatusBar style="auto" />
        <AppNavigator />
        <Toast />
      </AlertProvider>
    </SafeAreaProvider>
  );
};

export default App;
