import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import AppNavigator from './navigation/AppNavigator';
import { AlertProvider } from './context/AlertContext';
import { useAuthStore } from './store/useAuthStore';
import authService from './api/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const App = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const loginStore = useAuthStore((state) => state.login);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const user = await authService.getCurrentUser();
      
      if (token && user) {
        loginStore(user, token);
      }
    } catch (e) {
      console.error('Failed to load auth state', e);
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
