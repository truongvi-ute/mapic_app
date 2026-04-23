import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { SPACING, COLORS, LIGHT_COLORS, DARK_COLORS, FONT_SIZE, FONT_WEIGHT, RADIUS, SHADOWS, DIMENSIONS } from '../constants/design';
import { useThemeStore } from '../store/useThemeStore';
import SafeContainer from '../components/ui/SafeContainer';
import Spacer from '../components/ui/Spacer';
import { useAuthStore } from '../store/useAuthStore';
import { useAlert } from '../context/AlertContext';
import chatService from '../api/chatService';
import AddFriendScreen from './AddFriendScreen';
import FriendRequestsScreen from './FriendRequestsScreen';
import { getApiUrl, buildAvatarUrl, buildCoverUrl } from '../config/api';

interface Friend {
  id: number;
  username: string;
  name: string;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  friendsSince: string;
}

interface FriendsScreenProps {
  onPressProfile?: (userId: number) => void;
  onOpenChat?: (conversation: any) => void;
}

export default function FriendsScreen({ onPressProfile, onOpenChat }: FriendsScreenProps) {
  const token = useAuthStore((state) => state.token);
  const { showAlert } = useAlert();
  const { mode } = useThemeStore();
  const isDark = mode === 'dark';
  const C = isDark ? DARK_COLORS : LIGHT_COLORS;
  
  const [friends, setFriends] = useState<Friend[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  const API_URL = getApiUrl();

  const [refreshKey, setRefreshKey] = useState(Date.now());

  useEffect(() => {
    loadFriends();
    loadPendingRequestsCount();
  }, []);

  useEffect(() => {
    filterFriends();
  }, [searchQuery, friends]);

  const loadFriends = async () => {
    if (loading) return;

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/friends`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setFriends(result.data || []);
        setRefreshKey(Date.now()); // Update refresh key when data loads
      } else {
        showAlert('Lỗi', 'Không thể tải danh sách bạn bè');
      }
    } catch (error) {
      console.error('[FriendsScreen] Error loading friends:', error);
      showAlert('Lỗi', 'Không thể kết nối đến server');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadPendingRequestsCount = async () => {
    try {
      const response = await fetch(`${API_URL}/friends/requests/pending/count`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setPendingRequestsCount(result.data || 0);
      }
    } catch (error) {
      console.error('[FriendsScreen] Error loading pending count:', error);
    }
  };

  const filterFriends = () => {
    if (!searchQuery.trim()) {
      setFilteredFriends(friends);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = friends.filter(
      (friend) =>
        friend.name.toLowerCase().includes(query) ||
        friend.username.toLowerCase().includes(query)
    );
    setFilteredFriends(filtered);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFriends();
    loadPendingRequestsCount();
  }, []);

  const handleUnfriend = (friendId: number, friendName: string) => {
    showAlert(
      'Xác nhận',
      `Bạn có chắc muốn hủy kết bạn với ${friendName}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/friends/${friendId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              if (response.ok) {
                setFriends((prev) => prev.filter((f) => f.id !== friendId));
                showAlert('Thành công', 'Đã hủy kết bạn');
              } else {
                showAlert('Lỗi', 'Không thể hủy kết bạn');
              }
            } catch (error) {
              showAlert('Lỗi', 'Không thể kết nối đến server');
            }
          },
        },
      ]
    );
  };

  const renderFriendItem = ({ item }: { item: Friend }) => {
    const avatarUri = buildAvatarUrl(item.avatarUrl);
    const coverUri = buildCoverUrl(item.coverImageUrl);

    return (
      <TouchableOpacity 
        style={styles.friendItem}
        onPress={() => onPressProfile?.(item.id)}
        activeOpacity={0.9}
      >
        {/* Cover — dùng ảnh bìa thật nếu có, fallback về cover-default */}
        {coverUri ? (
          <Image 
            source={{ uri: coverUri }} 
            style={styles.friendBackground}
          />
        ) : (
          <Image 
            source={require('../assets/images/cover-default.jpg')} 
            style={styles.friendBackground}
          />
        )}
        
        {/* Overlay */}
        <View style={styles.friendOverlay}>
          <View style={styles.friendInfo}>
            {avatarUri ? (
              <Image 
                source={{ uri: avatarUri }} 
                style={styles.avatar}
              />
            ) : (
              <Image 
                source={require('../assets/images/avatar-default.png')} 
                style={styles.avatar}
              />
            )}
            <View style={styles.friendDetails}>
              <Text style={styles.friendName}>{item.name}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => {
              showAlert('Tùy chọn', `Chọn hành động với ${item.name}`, [
                {
                  text: 'Nhắn tin',
                  onPress: async () => {
                    try {
                      if (!token) return;
                      const conversation = await chatService.openDirectChat(item.id, token);
                      onOpenChat?.(conversation);
                    } catch (error) {
                      showAlert('Lỗi', 'Không thể mở cuộc trò chuyện');
                    }
                  },
                },
                {
                  text: 'Xem trang cá nhân',
                  onPress: () => onPressProfile?.(item.id),
                },
                {
                  text: 'Hủy kết bạn',
                  style: 'destructive',
                  onPress: () => handleUnfriend(item.id, item.name),
                },
                { text: 'Đóng', style: 'cancel' },
              ]);
            }}
          >
            <Ionicons name="ellipsis-horizontal" size={DIMENSIONS.iconLG} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;

    if (searchQuery.trim()) {
      return (
        <View style={styles.emptyContainer}>
          <Image
            source={require('../assets/images/search.png')}
            style={styles.emptyIcon}
          />
          <Text style={styles.emptyTitle}>Không tìm thấy</Text>
          <Text style={styles.emptyText}>
            Không có bạn bè nào khớp với "{searchQuery}"
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={64} color={COLORS.gray300} />
        <Spacer size="lg" />
        <Text style={styles.emptyTitle}>Chưa có bạn bè</Text>
        <Spacer size="sm" />
        <Text style={styles.emptyText}>
          Hãy bắt đầu kết nối với mọi người!
        </Text>
        <Spacer size="xxl" />
        <TouchableOpacity
          style={styles.addFriendButton}
          onPress={() => setShowAddFriend(true)}
        >
          <Ionicons name="person-add" size={DIMENSIONS.iconSM} color={COLORS.white} />
          <Text style={styles.addFriendButtonText}>Thêm bạn bè</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (showAddFriend) {
    return <AddFriendScreen onBack={() => setShowAddFriend(false)} onPressProfile={onPressProfile} />;
  }

  if (showRequests) {
    return (
      <FriendRequestsScreen
        onBack={() => {
          setShowRequests(false);
          loadPendingRequestsCount();
        }}
        onPressProfile={onPressProfile}
      />
    );
  }

  return (
    <SafeContainer style={[styles.container, { backgroundColor: C.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Text style={[styles.title, { color: C.textPrimary }]}>Bạn bè</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.requestButton}
            onPress={() => setShowRequests(true)}
          >
            <Image
              source={require('../assets/images/letter.png')}
              style={styles.headerIcon}
            />
            {pendingRequestsCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddFriend(true)}
          >
            <Image
              source={require('../assets/images/add-friend.png')}
              style={styles.headerIcon}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Image
          source={require('../assets/images/search.png')}
          style={styles.searchIcon}
        />
        <TextInput
          style={[styles.searchInput, { color: C.textPrimary }]}
          placeholder="Tìm kiếm bạn bè..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={C.textTertiary}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={DIMENSIONS.iconSM} color={COLORS.gray400} />
          </TouchableOpacity>
        )}
      </View>

      {loading && friends.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Spacer size="md" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredFriends}
          renderItem={renderFriendItem}
          keyExtractor={(item, index) => `friend-${item.id}-${index}`}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={
            filteredFriends.length === 0 ? styles.emptyList : styles.listContent
          }
        />
      )}
    </SafeContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FONT_SIZE.xxxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray900,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  headerIcon: {
    width: DIMENSIONS.iconLG,
    height: DIMENSIONS.iconLG,
  },
  requestButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: COLORS.error,
    borderRadius: RADIUS.sm,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    margin: SPACING.lg,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  searchIcon: {
    width: DIMENSIONS.iconSM,
    height: DIMENSIONS.iconSM,
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    height: DIMENSIONS.inputHeight,
    fontSize: FONT_SIZE.lg,
    color: COLORS.gray900,
  },
  listContent: {
    paddingBottom: 80,
  },
  friendItem: {
    height: 120,
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    position: 'relative',
    ...SHADOWS.md,
  },
  friendBackground: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  friendOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.gray600,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.huge,
    minHeight: 400,
  },
  emptyIcon: {
    width: 64,
    height: 64,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray900,
  },
  emptyText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.gray600,
    textAlign: 'center',
    lineHeight: FONT_SIZE.md * 1.4,
  },
  addFriendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.round,
    gap: SPACING.sm,
  },
  addFriendButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
  },
});
