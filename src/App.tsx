import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import AppNavigator from './navigation/AppNavigator';
import { AlertProvider } from './context/AlertContext';
import { useAuthStore } from './store/useAuthStore';
import authService from './api/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setupAxiosInterceptor } from './api/axiosInterceptor';

const App = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const loginStore = useAuthStore((state) => state.login);

  useEffect(() => {
    // Setup axios interceptor để tự động logout khi nhận 401
    setupAxiosInterceptor();
    
    checkAuth();
  }, []);

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
      </AlertProvider>
    </SafeAreaProvider>
  );
};

export default App;
