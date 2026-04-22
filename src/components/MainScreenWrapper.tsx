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
import MomentMapScreen from '../screens/MomentMapScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import AlbumsScreen from '../screens/AlbumsScreen';

interface MapScreenParams {
  latitude: number;
  longitude: number;
  addressName: string;
  provinceName?: string;
  imageUrl?: string;
}

interface UserProfileParams {
  userId: number;
}

export default function MainScreenWrapper() {
  const navigation = useNavigation<any>();
  const [activeScreen, setActiveScreen] = useState('home');
  const [profileNeedsRefresh, setProfileNeedsRefresh] = useState(false);
  const [homeNeedsRefresh, setHomeNeedsRefresh] = useState(false);
  const [exploreNeedsRefresh, setExploreNeedsRefresh] = useState(false);
  const [mapParams, setMapParams] = useState<MapScreenParams | null>(null);
  const [userProfileParams, setUserProfileParams] = useState<UserProfileParams | null>(null);

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
        return <HomeScreen 
          refreshTrigger={homeNeedsRefresh}
          onOpenMap={(params) => {
            setMapParams(params);
            setActiveScreen('map');
          }}
          onPressProfile={(userId) => {
            setUserProfileParams({ userId });
            setActiveScreen('userProfile');
          }}
        />;
      case 'explore':
        return <ExploreScreen 
          refreshTrigger={exploreNeedsRefresh}
          onOpenMap={(params) => {
            setMapParams(params);
            setActiveScreen('map');
          }}
          onPressProfile={(userId) => {
            setUserProfileParams({ userId });
            setActiveScreen('userProfile');
          }}
        />;
      case 'create':
        return <CreateMomentScreen 
          onSuccess={() => {
            // Trigger refresh for all screens
            setHomeNeedsRefresh(prev => !prev);
            setExploreNeedsRefresh(prev => !prev);
            setProfileNeedsRefresh(prev => !prev);
            // Navigate back to home
            setActiveScreen('home');
          }}
        />;
      case 'friends':
        return <FriendsScreen 
          onPressProfile={(userId) => {
            setUserProfileParams({ userId });
            setActiveScreen('userProfile');
          }}
        />;
      case 'notifications':
        return <NotificationsScreen />;
      case 'profile':
        return (
          <ProfileScreen 
            onNavigateToSettings={() => setActiveScreen('settings')}
            refreshTrigger={profileNeedsRefresh}
            onOpenMap={(params) => {
              setMapParams(params);
              setActiveScreen('map');
            }}
            onOpenAlbums={() => setActiveScreen('albums')}
          />
        );
      case 'albums':
        return (
          <AlbumsScreen
            onBack={() => setActiveScreen('profile')}
            onOpenMap={(params) => {
              setMapParams(params);
              setActiveScreen('map');
            }}
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
      case 'map':
        return mapParams ? (
          <MomentMapScreen
            {...mapParams}
            onBack={() => setActiveScreen('home')}
          />
        ) : null;
      case 'userProfile':
        return userProfileParams ? (
          <UserProfileScreen
            userId={userProfileParams.userId}
            onBack={() => setActiveScreen('home')}
            onOpenMap={(params) => {
              setMapParams(params);
              setActiveScreen('map');
            }}
          />
        ) : null;
      default:
        return <HomeScreen onOpenMap={(params) => {
          setMapParams(params);
          setActiveScreen('map');
        }} />;
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
