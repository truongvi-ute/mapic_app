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
import MapScreen from '../screens/MapScreen';
import MomentMapScreen from '../screens/MomentMapScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import AlbumsScreen from '../screens/AlbumsScreen';
import ChatsListScreen from '../screens/ChatsListScreen';
import ChatRoomScreen from '../screens/ChatRoomScreen';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import { useWebSocketStore } from '../store/useWebSocketStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { useMainNavigationStore } from '../store/useMainNavigationStore';

interface MapScreenParams {
  latitude: number;
  longitude: number;
  addressName: string;
  provinceName?: string;
  imageUrl?: string;
  caption?: string;
}

interface UserProfileParams {
  userId: number;
}

export default function MainScreenWrapper() {
  const navigation = useNavigation<any>();
  const { activeScreen, setActiveScreen, screenParams } = useMainNavigationStore();
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
  const { connect: connectMapWS, disconnect: disconnectMapWS, subscribe } = useWebSocketStore();
  const { addNotification, fetchUnreadCount } = useNotificationStore();
  const { showAlert } = useAlert();

  // Connect STOMP when app loads
  React.useEffect(() => {
    if (token) {
      connect(token);
      connectMapWS(token, () => {
        // Subscribe to notifications when Map WS is connected
        const sub = subscribe('/user/queue/notifications', (msg) => {
          try {
            const notification = JSON.parse(msg.body);
            console.log('[WS Notification] Received:', notification);
            addNotification(notification);
            
            // Show local alert/toast
            showAlert('Thông báo mới', notification.message, [
              { text: 'Xem', onPress: () => setActiveScreen('notifications') },
              { text: 'Đóng', style: 'cancel' }
            ]);
          } catch (e) {
            console.error('[WS Notification] Parse error:', e);
          }
        });
      });
      fetchUnreadCount();
    }
    return () => {
      disconnect();
      disconnectMapWS();
    };
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

  // Sync global navigation params to local state
  React.useEffect(() => {
    if (!activeScreen) return;

    if (screenParams) {
      switch (activeScreen) {
        case 'userProfile':
          if (screenParams.userId) setUserProfileParams({ userId: screenParams.userId });
          break;
        case 'explore-moment':
          if (screenParams.momentId) setSharedMomentId(screenParams.momentId);
          break;
        case 'chat-room':
          // If we only have userId, we might need to fetch the conversation
          // or wrap it in a mock object if ChatRoomScreen can handle it.
          // For now, assume it's a conversation object or userId.
          if (screenParams.userId) {
            setChatParams({ 
              id: 0, // Mock ID or fetch needed
              participants: [{ user: { id: screenParams.userId } }] 
            });
          } else {
            setChatParams(screenParams);
          }
          break;
        case 'map':
          if (screenParams.latitude) setMapParams(screenParams);
          break;
      }
    }
  }, [activeScreen, screenParams]);

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
      id: 'map',
      label: 'Bản đồ',
      icon: 'map' as const,
      onPress: () => setActiveScreen('main-map'),
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
            setHomeNeedsRefresh(prev => !prev);
            setExploreNeedsRefresh(prev => !prev);
            setProfileNeedsRefresh(prev => !prev);
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
        return (
          <ChatRoomScreen
            conversation={chatParams}
            friendId={chatParams?.userId}
            onBack={() => {
              setChatListRefresh((n) => n + 1);
              setActiveScreen('chat');
            }}
          />
        );
      case 'profile':
        return (
          <ProfileScreen 
            onNavigateToSettings={() => setActiveScreen('settings')}
            refreshTrigger={profileNeedsRefresh}
            onOpenMap={(params) => setActiveScreen('map', params)}
            onOpenAlbums={() => setActiveScreen('albums')}
          />
        );
      case 'albums':
        return (
          <AlbumsScreen
            onBack={() => setActiveScreen('profile')}
            onOpenMap={(params) => setActiveScreen('map', params)}
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
      case 'main-map':
        return (
          <MapScreen
            onNavigateToNotifications={() => setActiveScreen('notifications')}
          />
        );
      case 'map':
      case 'moment-map':
        return (
          <MomentMapScreen
            {...mapParams}
            onBack={() => setActiveScreen('home')}
          />
        );
      case 'userProfile':
        return (
          <UserProfileScreen 
            userId={userProfileParams?.userId}
            onBack={() => setActiveScreen('home')}
          />
        );
      default:
        return <HomeScreen 
          refreshTrigger={homeNeedsRefresh}
          onOpenMap={(params) => {
            setMapParams(params);
            setActiveScreen('map');
          }}
          onPressProfile={handleOpenProfile}
        />;
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
