import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { useAlert } from '../context/AlertContext';
import { getApiUrl, buildAvatarUrl, buildCoverUrl } from '../config/api';
import { SPACING, COLORS, LIGHT_COLORS, DARK_COLORS, FONT_SIZE, FONT_WEIGHT, RADIUS, SHADOWS, DIMENSIONS } from '../constants/design';
import { useThemeStore } from '../store/useThemeStore';
import SafeContainer from '../components/ui/SafeContainer';
import Spacer from '../components/ui/Spacer';

interface FriendRequest {
  id: number;
  senderId: number;
  senderName: string;
  senderUsername: string;
  senderAvatarUrl: string | null;
  senderCoverUrl: string | null;
  createdAt: string;
}

interface FriendRequestsScreenProps {
  onBack: () => void;
  onPressProfile?: (userId: number) => void;
}

export default function FriendRequestsScreen({ onBack, onPressProfile }: FriendRequestsScreenProps) {
  const token = useAuthStore((state) => state.token);
  const { showAlert } = useAlert();
  const { mode } = useThemeStore();
  const isDark = mode === 'dark';
  const C = isDark ? DARK_COLORS : LIGHT_COLORS;

  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const API_URL = getApiUrl();

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    if (loading) return;

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/friends/requests/pending`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setRequests(result.data || []);
      } else {
        showAlert('Lỗi', 'Không thể tải danh sách lời mời');
      }
    } catch (error) {
      console.error('[FriendRequestsScreen] Error loading requests:', error);
      showAlert('Lỗi', 'Không thể kết nối đến server');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRequests();
  }, []);

  const handleAccept = async (requestId: number, senderName: string) => {
    try {
      // Xóa ngay khỏi UI để tránh duplicate key
      setRequests((prev) => prev.filter((req) => req.id !== requestId));
      
      const response = await fetch(`${API_URL}/friends/accept/${requestId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        showAlert('Thành công', `Bạn và ${senderName} đã trở thành bạn bè`);
      } else {
        const result = await response.json();
        showAlert('Lỗi', result.message || 'Không thể chấp nhận lời mời');
        // Reload lại nếu lỗi
        loadRequests();
      }
    } catch (error) {
      console.error('[FriendRequestsScreen] Accept error:', error);
      showAlert('Lỗi', 'Không thể kết nối đến server');
      // Reload lại nếu lỗi
      loadRequests();
    }
  };

  const handleReject = async (requestId: number, senderName: string) => {
    showAlert(
      'Xác nhận',
      `Bạn có chắc muốn từ chối lời mời từ ${senderName}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Từ chối',
          style: 'destructive',
          onPress: async () => {
            try {
              // Xóa ngay khỏi UI để tránh duplicate key
              setRequests((prev) => prev.filter((req) => req.id !== requestId));
              
              const response = await fetch(`${API_URL}/friends/reject/${requestId}`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              if (response.ok) {
                showAlert('Thành công', 'Đã từ chối lời mời kết bạn');
              } else {
                showAlert('Lỗi', 'Không thể từ chối lời mời');
                // Reload lại nếu lỗi
                loadRequests();
              }
            } catch (error) {
              showAlert('Lỗi', 'Không thể kết nối đến server');
              // Reload lại nếu lỗi
              loadRequests();
            }
          },
        },
      ]
    );
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 30) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  const renderRequestItem = ({ item }: { item: FriendRequest }) => {
    const avatarUri = buildAvatarUrl(item.senderAvatarUrl);
    const coverUri = buildCoverUrl(item.senderCoverUrl);

    return (
      <TouchableOpacity 
        style={styles.requestItem}
        onPress={() => onPressProfile?.(item.senderId)}
        activeOpacity={0.9}
      >
        {/* Cover Background - dùng ảnh bìa thật nếu có, fallback về cover-default */}
        {coverUri ? (
          <Image 
            source={{ uri: coverUri }} 
            style={styles.requestBackground}
          />
        ) : (
          <Image 
            source={require('../assets/images/cover-default.jpg')} 
            style={styles.requestBackground}
          />
        )}
        
        {/* Overlay */}
        <View style={styles.requestOverlay}>
          <View style={styles.requestInfo}>
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
            <View style={styles.requestDetails}>
              <Text style={styles.requestName}>{item.senderName}</Text>
              <Text style={styles.requestTime}>{getTimeAgo(item.createdAt)}</Text>
            </View>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={(e) => {
                e.stopPropagation();
                handleAccept(item.id, item.senderName);
              }}
            >
              <Ionicons name="checkmark" size={DIMENSIONS.iconLG} color={COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={(e) => {
                e.stopPropagation();
                handleReject(item.id, item.senderName);
              }}
            >
              <Ionicons name="close" size={DIMENSIONS.iconLG} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="mail-open-outline" size={DIMENSIONS.avatarXL - SPACING.lg} color={COLORS.gray300} />
        <Spacer size="lg" />
        <Text style={styles.emptyTitle}>Không có lời mời nào</Text>
        <Spacer size="sm" />
        <Text style={styles.emptyText}>
          Bạn chưa có lời mời kết bạn nào đang chờ
        </Text>
      </View>
    );
  };

  return (
    <SafeContainer style={[styles.container, { backgroundColor: C.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={DIMENSIONS.iconLG} color={C.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: C.textPrimary }]}>Lời mời kết bạn</Text>
        <View style={styles.backButton} />
      </View>

      {loading && requests.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Spacer size="md" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequestItem}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={
            requests.length === 0 ? styles.emptyList : styles.listContent
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
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
    ...SHADOWS.sm,
  },
  backButton: {
    width: DIMENSIONS.buttonHeight - SPACING.sm,
    height: DIMENSIONS.buttonHeight - SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray900,
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.huge * 2,
  },
  requestItem: {
    height: 140,
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    position: 'relative',
    ...SHADOWS.md,
  },
  requestBackground: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  requestOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: DIMENSIONS.avatarXL - SPACING.sm,
    height: DIMENSIONS.avatarXL - SPACING.sm,
    borderRadius: (DIMENSIONS.avatarXL - SPACING.sm) / 2,
    marginRight: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  requestDetails: {
    flex: 1,
  },
  requestName: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  requestTime: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.white,
    opacity: 0.8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  acceptButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  rejectButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
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
    padding: SPACING.xxxl + SPACING.sm,
    minHeight: 400,
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
});
