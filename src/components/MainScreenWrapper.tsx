import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import FloatingActionMenu from './FloatingActionMenu';
import albumService from '../api/albumService';
import momentService from '../api/momentService';
import MomentCard from './MomentCard';
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
import CommentModal from './CommentModal';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import { useWebSocketStore } from '../store/useWebSocketStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { useMainNavigationStore } from '../store/useMainNavigationStore';
import { useSOSStore } from '../store/sosStore';
import SOSActiveScreen from '../screens/SOSActiveScreen';
import SOSReceivedAlert from '../components/SOSReceivedAlert';
import { getBaseUrl } from '../config/api';
import { SOSAlertStatus } from '../types/sos';
import { pushNotificationService } from '../services/pushNotificationService';

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

  // Shared moment modal state (giống AlbumsScreen)
  const [selectedMoment, setSelectedMoment] = useState<any | null>(null);

  // Comment modal state
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedMomentForComment, setSelectedMomentForComment] = useState<number | null>(null);

  const token = useAuthStore((s) => s.token);
  const currentUser = useAuthStore((s) => s.user);
  const { connect, disconnect } = useChatStore();
  const { connect: connectMapWS, disconnect: disconnectMapWS, subscribe } = useWebSocketStore();
  const { addNotification, fetchUnreadCount } = useNotificationStore();
  const {
    activeAlert,
    receivedAlerts,
    fetchActiveAlerts,
    addReceivedAlert,
    markAlertAsViewed
  } = useSOSStore();
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

            // Handle SOS specific notification
            if (notification.type === 'SOS_ALERT') {
              console.log('[SOS] Emergency alert received via WS!');
              addReceivedAlert({
                id: notification.targetId,
                senderId: notification.actorId,
                senderName: notification.actorName,
                senderAvatar: notification.actorAvatar,
                triggeredAt: notification.createdAt,
                status: SOSAlertStatus.ACTIVE,
                message: notification.message,
                locationStatus: 'ACCURATE', // Default for alerts
                recipientCount: 0
              });

              // Trigger a local push notification immediately
              pushNotificationService.scheduleLocalNotification(
                '⚠️ CẢNH BÁO SOS KHẨN CẤP',
                `${notification.actorName} đang cần bạn giúp đỡ!`,
                { type: 'SOS_ALERT', alertId: notification.targetId }
              );
            } else {
              // Show local alert/toast for other notifications
              showAlert('Thông báo mới', notification.message, [
                { text: 'Xem', onPress: () => setActiveScreen('notifications') },
                { text: 'Đóng', style: 'cancel' }
              ]);
            }
          } catch (e) {
            console.error('[WS Notification] Parse error:', e);
          }
        });
      });
      fetchUnreadCount();
      fetchActiveAlerts();
    }
    return () => {
      disconnect();
      disconnectMapWS();
    };
  }, [token]);

  // Helper function to handle profile navigation
  const handleOpenProfile = useCallback((userId: number) => {
    // If clicking on own profile, go to Profile tab
    if (currentUser?.id === userId) {
      setActiveScreen('profile');
    } else {
      // Otherwise, open UserProfileScreen
      setUserProfileParams({ userId });
      setActiveScreen('userProfile');
    }
  }, [currentUser?.id, setActiveScreen]);

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
          // If we have a full conversation object, use it
          if (screenParams.conversation) {
            setChatParams(screenParams.conversation);
          }
          // If we only have userId (from notification), create a minimal conversation
          else if (screenParams.userId) {
            setChatParams({
              id: 0, // Will be created when first message is sent
              isGroup: false,
              participants: [
                { userId: screenParams.userId }, // Friend
                { userId: currentUser?.id } // Current user
              ],
              title: null,
              creatorId: null,
              createdAt: new Date().toISOString(),
              lastMessage: null
            });
          }
          break;
        case 'map':
          if (screenParams.latitude) setMapParams(screenParams);
          break;
      }
    }
  }, [activeScreen, screenParams, currentUser?.id]);

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

  const onOpenChat = useCallback((conversation: any, currentTab?: 'direct' | 'group') => {
    if (currentTab) {
      setCurrentChatTab(currentTab);
    }
    setChatParams(conversation);
    setActiveScreen('chat-room');
  }, [setActiveScreen]);

  // Mở moment từ chat → mở modal với MomentCard (giống AlbumsScreen)
  const onPressMoment = useCallback(async (momentId: number) => {
    if (!token) return;

    try {
      // Fetch moment data từ API
      const moment = await momentService.getMomentById(momentId, token);
      if (moment) {
        setSelectedMoment(moment);
      }
    } catch (error) {
      console.error('Error fetching shared moment:', error);
      showAlert('Lỗi', 'Không thể tải moment này');
    }
  }, [token, showAlert]);

  // Lưu album được chia sẻ vào album của mình rồi mở AlbumsScreen
  const onPressAlbum = useCallback(async (albumId: number) => {
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
  }, [token, setActiveScreen, showAlert]);

  const handleOpenMap = useCallback((params: any) => {
    setMapParams(params);
    setActiveScreen('map');
  }, [setActiveScreen]);

  const handleOpenAlbums = useCallback(() => {
    setActiveScreen('albums');
  }, [setActiveScreen]);

  const handleBackToHome = useCallback(() => {
    setActiveScreen('home');
  }, [setActiveScreen]);

  const handleBackToProfile = useCallback(() => {
    setActiveScreen('profile');
  }, [setActiveScreen]);

  const handleBackToChat = useCallback(() => {
    setChatListRefresh((n) => n + 1);
    setActiveScreen('chat');
  }, [setActiveScreen]);

  const handleNavigateToSettings = useCallback(() => {
    setActiveScreen('settings');
  }, [setActiveScreen]);

  const handleNavigateToEditProfile = useCallback(() => {
    setActiveScreen('edit-profile');
  }, [setActiveScreen]);

  const handleNavigateToNotifications = useCallback(() => {
    setActiveScreen('notifications');
  }, [setActiveScreen]);

  const renderScreen = () => {
    switch (activeScreen) {
      case 'home':
        return <HomeScreen
          refreshTrigger={homeNeedsRefresh}
          onOpenMap={handleOpenMap}
          onPressProfile={handleOpenProfile}
        />;
      case 'explore':
        return <ExploreScreen
          refreshTrigger={exploreNeedsRefresh}
          highlightMomentId={sharedMomentId ?? undefined}
          onOpenMap={handleOpenMap}
          onPressProfile={handleOpenProfile}
        />;
      case 'explore-moment':
        return <ExploreScreen
          highlightMomentId={sharedMomentId ?? undefined}
          onBack={() => {
            setSharedMomentId(null);
            setActiveScreen('chat-room');
          }}
          onOpenMap={handleOpenMap}
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
            onBack={handleBackToHome}
            onOpenChat={onOpenChat}
            refreshTrigger={chatListRefresh}
            initialTab={currentChatTab}
          />
        );
      case 'chat-room':
        // Extract friendId from conversation participants (for direct chats)
        const friendIdFromConv = chatParams?.participants?.find(
          (p: any) => p.userId !== currentUser?.id
        )?.userId;

        return (
          <ChatRoomScreen
            conversation={chatParams}
            friendId={friendIdFromConv}
            onBack={handleBackToChat}
            onPressMoment={onPressMoment}
            onPressAlbum={onPressAlbum}
          />
        );
      case 'profile':
        return (
          <ProfileScreen
            onNavigateToSettings={handleNavigateToSettings}
            refreshTrigger={profileNeedsRefresh}
            onOpenMap={handleOpenMap}
            onOpenAlbums={handleOpenAlbums}
          />
        );
      case 'albums':
        return (
          <AlbumsScreen
            onBack={handleBackToProfile}
            onOpenMap={handleOpenMap}
          />
        );
      case 'settings':
        return (
          <SettingsScreen
            onBack={handleBackToProfile}
            onNavigateToEditProfile={handleNavigateToEditProfile}
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
            onNavigateToNotifications={handleNavigateToNotifications}
          />
        );
      case 'map':
      case 'moment-map':
        if (!mapParams) {
          // If no map params, go back to home
          setActiveScreen('home');
          return null;
        }
        return (
          <MomentMapScreen
            {...mapParams}
            onBack={handleBackToHome}
          />
        );
      case 'userProfile':
        if (!userProfileParams?.userId) {
          // If no userId, go back to home
          setActiveScreen('home');
          return null;
        }
        return (
          <UserProfileScreen
            userId={userProfileParams.userId}
            onBack={handleBackToHome}
            onOpenChat={onOpenChat}
            onOpenMap={handleOpenMap}
          />
        );
      default:
        return <HomeScreen
          refreshTrigger={homeNeedsRefresh}
          onOpenMap={handleOpenMap}
          onPressProfile={handleOpenProfile}
        />;
    }
  };

  return (
    <View style={styles.container}>
      {renderScreen()}
      {activeScreen !== 'chat-room' && !activeAlert && (
        <FloatingActionMenu items={menuItems} activeItem={activeScreen} />
      )}

      {/* Shared Moment Modal (giống AlbumsScreen) */}
      <Modal
        visible={!!selectedMoment}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedMoment(null)}
      >
        <View style={styles.momentModalOverlay}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={() => setSelectedMoment(null)}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={22} color="#FFF" />
          </TouchableOpacity>

          <View style={{ width: '100%' }}>
            {selectedMoment && (
              <MomentCard
                moment={selectedMoment}
                baseUrl={getBaseUrl()}
                token={token || ''}
                onPressProfile={() => {
                  // Mở trang cá nhân của người đăng moment
                  setUserProfileParams({ userId: selectedMoment.author.id });
                  setActiveScreen('userProfile');
                  setSelectedMoment(null);
                }}
                onPressComment={() => {
                  // Mở CommentModal
                  setSelectedMomentForComment(selectedMoment.id);
                  setCommentModalVisible(true);
                  setSelectedMoment(null); // Đóng moment modal trước
                }}
                onPressMap={() => {
                  if (selectedMoment.location) {
                    const provinceName = selectedMoment.province?.name || selectedMoment.district?.name || '';
                    const firstImage = selectedMoment.media && selectedMoment.media.length > 0 ? selectedMoment.media[0].mediaUrl : undefined;
                    setMapParams({
                      latitude: selectedMoment.location.latitude,
                      longitude: selectedMoment.location.longitude,
                      addressName: selectedMoment.location.address || selectedMoment.location.name,
                      provinceName,
                      imageUrl: firstImage,
                    });
                    setActiveScreen('map');
                  }
                  setSelectedMoment(null);
                }}
                onPressLike={undefined} // Để MomentCard tự xử lý
                onPressShare={() => {
                  // TODO: Implement share functionality
                  showAlert('Thông báo', 'Chức năng chia sẻ đang được phát triển');
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Comment Modal */}
      <CommentModal
        visible={commentModalVisible}
        momentId={selectedMomentForComment}
        onClose={() => {
          setCommentModalVisible(false);
          setSelectedMomentForComment(null);
        }}
      />

      {/* SOS Active Overlay (Full screen) */}
      {activeAlert && <SOSActiveScreen />}

      {/* SOS Received Notifications (Floating alerts) */}
      {receivedAlerts.map(alert => (
        <SOSReceivedAlert
          key={`sos-alert-${alert.id}`}
          alert={alert}
          onViewLocation={() => {
            setMapParams({
              latitude: alert.latitude || 0,
              longitude: alert.longitude || 0,
              addressName: alert.senderName,
              caption: 'Đang gửi tín hiệu SOS'
            });
            setActiveScreen('map');
            markAlertAsViewed(alert.id);
          }}
          onDismiss={() => markAlertAsViewed(alert.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  momentModalOverlay: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
});
