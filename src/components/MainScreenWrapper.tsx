import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import FloatingActionMenu from './FloatingActionMenu';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import ExploreScreen from '../screens/ExploreScreen';
import CreateMomentScreen from '../screens/CreateMomentScreen';
import FriendsScreen from '../screens/FriendsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import EditProfileScreen from '../screens/EditProfileScreen';

export default function MainScreenWrapper() {
  const navigation = useNavigation<any>();
  const [activeScreen, setActiveScreen] = useState('home');
  const [profileNeedsRefresh, setProfileNeedsRefresh] = useState(false);

  const menuItems = [
    {
      id: 'home',
      label: 'Trang chủ',
      icon: 'home' as const,
      onPress: () => setActiveScreen('home'),
    },
    {
      id: 'explore',
      label: 'Khám phá',
      icon: 'compass' as const,
      onPress: () => setActiveScreen('explore'),
    },
    {
      id: 'create',
      label: 'Tạo mới',
      icon: 'add-circle' as const,
      onPress: () => setActiveScreen('create'),
      color: '#007AFF',
    },
    {
      id: 'friends',
      label: 'Bạn bè',
      icon: 'people' as const,
      onPress: () => setActiveScreen('friends'),
    },
    {
      id: 'notifications',
      label: 'Thông báo',
      icon: 'notifications' as const,
      onPress: () => setActiveScreen('notifications'),
    },
    {
      id: 'profile',
      label: 'Cá nhân',
      icon: 'person' as const,
      onPress: () => setActiveScreen('profile'),
    },
  ];

  const renderScreen = () => {
    switch (activeScreen) {
      case 'home':
        return <HomeScreen />;
      case 'explore':
        return <ExploreScreen />;
      case 'create':
        return <CreateMomentScreen />;
      case 'friends':
        return <FriendsScreen />;
      case 'notifications':
        return <NotificationsScreen />;
      case 'profile':
        return (
          <ProfileScreen 
            onNavigateToSettings={() => setActiveScreen('settings')}
            refreshTrigger={profileNeedsRefresh}
          />
        );
      case 'settings':
        return (
          <SettingsScreen 
            onBack={() => setActiveScreen('profile')}
            onNavigateToEditProfile={() => setActiveScreen('edit-profile')}
            onNavigateToVerifyOTP={(email, type) => {
              navigation.navigate('VerifyOTP', { email, type });
            }}
          />
        );
      case 'edit-profile':
        return (
          <EditProfileScreen
            onBack={() => setActiveScreen('settings')}
            onSaveSuccess={() => setProfileNeedsRefresh(!profileNeedsRefresh)}
          />
        );
      default:
        return <HomeScreen />;
    }
  };

  return (
    <View style={styles.container}>
      {renderScreen()}
      <FloatingActionMenu items={menuItems} activeItem={activeScreen} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
