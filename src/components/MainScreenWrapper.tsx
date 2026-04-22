import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import FloatingActionMenu from './FloatingActionMenu';
import albumService from '../api/albumService';
import { useAlert } from '../context/AlertContext';

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
import ChatsListScreen from '../screens/ChatsListScreen';
import ChatRoomScreen from '../screens/ChatRoomScreen';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';

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
  const [chatParams, setChatParams] = useState<any>(null); // ConversationDto
  const [chatListRefresh, setChatListRefresh] = useState(0);
  const [currentChatTab, setCurrentChatTab] = useState<'direct' | 'group'>('direct');
  const [sharedMomentId, setSharedMomentId] = useState<number | null>(null);
  const [sharedAlbumId, setSharedAlbumId] = useState<number | null>(null);

  const token = useAuthStore((s) => s.token);
  const currentUser = useAuthStore((s) => s.user);
  const { connect, disconnect } = useChatStore();
  const { showAlert } = useAlert();

  // Connect STOMP when app loads
  React.useEffect(() => {
    if (token) connect(token);
    return () => disconnect();
  }, [token]);

  // Helper function to handle profile navigation
  const handleOpenProfile = (userId: number) => {
    // If clicking on own profile, go to Profile tab
    if (currentUser?.id === userId) {
      setActiveScreen('profile');
    } else {
      // Otherwise, open UserProfileScreen
      setUserProfileParams({ userId });
      setActiveScreen('userProfile');
    }
  };

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
      id: 'chat',
      label: 'Tin nhắn',
      icon: 'message' as const,
      onPress: () => setActiveScreen('chat'),
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

  const onOpenChat = (conversation: any, currentTab?: 'direct' | 'group') => {
    if (currentTab) {
      setCurrentChatTab(currentTab);
    }
    setChatParams(conversation);
    setActiveScreen('chat-room');
  };

  // Mở moment từ chat → navigate đến Explore với momentId highlight
  const onPressMoment = (momentId: number) => {
    setSharedMomentId(momentId);
    setActiveScreen('explore-moment');
  };

  // Lưu album được chia sẻ vào album của mình rồi mở AlbumsScreen
  const onPressAlbum = async (albumId: number) => {
    if (!token) return;
    try {
      await albumService.saveSharedAlbum(albumId, token);
      showAlert('Đã lưu album', 'Album đã được thêm vào bộ sưu tập của bạn', [
        {
          text: 'Xem ngay',
          onPress: () => {
            setSharedAlbumId(albumId);
            setActiveScreen('albums');
          },
        },
        { text: 'Đóng', style: 'cancel' },
      ]);
    } catch (e: any) {
      // Nếu là album của chính mình thì chỉ mở xem
      if (e.message?.includes('album của bạn')) {
        setActiveScreen('albums');
      } else {
        showAlert('Lỗi', e.message || 'Không thể lưu album');
      }
    }
  };

  const renderScreen = () => {
    switch (activeScreen) {
      case 'home':
        return <HomeScreen 
          refreshTrigger={homeNeedsRefresh}
          onOpenMap={(params) => {
            setMapParams(params);
            setActiveScreen('map');
          }}
          onPressProfile={handleOpenProfile}
        />;
      case 'explore':
        return <ExploreScreen 
          refreshTrigger={exploreNeedsRefresh}
          highlightMomentId={sharedMomentId ?? undefined}
          onOpenMap={(params) => {
            setMapParams(params);
            setActiveScreen('map');
          }}
          onPressProfile={handleOpenProfile}
        />;
      case 'explore-moment':
        return <ExploreScreen
          highlightMomentId={sharedMomentId ?? undefined}
          onBack={() => {
            setSharedMomentId(null);
            setActiveScreen('chat-room');
          }}
          onOpenMap={(params) => {
            setMapParams(params);
            setActiveScreen('map');
          }}
          onPressProfile={handleOpenProfile}
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
          onPressProfile={handleOpenProfile}
          onOpenChat={onOpenChat}
        />;
      case 'notifications':
        return <NotificationsScreen />;
      case 'chat':
        return (
          <ChatsListScreen
            onBack={() => setActiveScreen('home')}
            onOpenChat={onOpenChat}
            refreshTrigger={chatListRefresh}
            initialTab={currentChatTab}
          />
        );
      case 'chat-room':
        return chatParams ? (
          <ChatRoomScreen
            conversation={chatParams}
            onBack={() => {
              setChatListRefresh((n) => n + 1);
              setActiveScreen('chat');
            }}
            onPressMoment={onPressMoment}
            onPressAlbum={onPressAlbum}
          />
        ) : null;
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
            onOpenChat={onOpenChat}
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
      {activeScreen !== 'chat-room' && (
        <FloatingActionMenu items={menuItems} activeItem={activeScreen} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
