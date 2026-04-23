import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SPACING, COLORS, LIGHT_COLORS, DARK_COLORS, FONT_SIZE, FONT_WEIGHT, RADIUS, SHADOWS, DIMENSIONS } from '../constants/design';
import { useThemeStore } from '../store/useThemeStore';
import SafeContainer from '../components/ui/SafeContainer';
import Spacer from '../components/ui/Spacer';
import { useNotificationStore } from '../store/useNotificationStore';
import { useMainNavigationStore } from '../store/useMainNavigationStore';
import { NotificationDTO } from '../api/notificationService';
import { getNavigationTargetFromNotification, navigateToTarget } from '../utils/navigationHelper';
import { getImageUrl } from '../utils/uiUtils';

const formatTimeAgo = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'vừa xong';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
  return date.toLocaleDateString('vi-VN');
};

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    fetchNotifications, 
    fetchUnreadCount,
    markAsRead,
    markAllAsRead 
  } = useNotificationStore();
  const { setActiveScreen } = useMainNavigationStore();
  const { mode } = useThemeStore();
  const isDark = mode === 'dark';
  const C = isDark ? DARK_COLORS : LIGHT_COLORS;

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, []);

  const onRefresh = () => {
    fetchNotifications();
    fetchUnreadCount();
  };

  const handleNotificationPress = (item: NotificationDTO) => {
    // Mark as read
    if (!item.isRead) {
      markAsRead(item.id);
    }

    // Navigate to target using global store
    const target = getNavigationTargetFromNotification(item);
    if (target) {
      setActiveScreen(target.screen as any, target.params);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'FRIEND_REQUEST':
        return { name: 'person-add', color: COLORS.primary };
      case 'FRIEND_ACCEPT':
        return { name: 'people', color: COLORS.success };
      case 'MOMENT_REACTION':
        return { name: 'heart', color: COLORS.error };
      case 'MOMENT_COMMENT':
        return { name: 'chatbubble', color: COLORS.info };
      case 'NEW_MESSAGE':
        return { name: 'mail', color: COLORS.warning };
      case 'SOS_ALERT':
        return { name: 'warning', color: COLORS.error };
      default:
        return { name: 'notifications', color: COLORS.gray500 };
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return { borderLeftColor: COLORS.error, borderLeftWidth: 4 };
      case 'NORMAL':
        return {};
      case 'LOW':
        return {};
      default:
        return {};
    }
  };


  const renderNotification = ({ item }: { item: NotificationDTO }) => {
    const icon = getIcon(item.type);
    const timeAgo = formatTimeAgo(item.createdAt);
    const isUnread = !item.isRead;
    
    // Resolve absolute URLs
    const actorAvatarUrl = getImageUrl(item.actorAvatar, 'avatar');
    const thumbnailUrl = getImageUrl(item.thumbnailUrl, 'moment');

    return (
      <TouchableOpacity 
        style={[
          styles.notificationItem,
          { 
            backgroundColor: isDark ? C.surface : C.white,
            borderLeftColor: isUnread ? COLORS.primary : 'transparent',
            borderLeftWidth: isUnread ? 4 : 0,
          }
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.itemMainContent}>
          {/* Avatar / Icon Container */}
          <View style={styles.avatarWrapper}>
            {actorAvatarUrl ? (
              <Image source={{ uri: actorAvatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: `${icon.color}20` }]}>
                <Ionicons name={icon.name as any} size={DIMENSIONS.iconMD} color={icon.color} />
              </View>
            )}
            
            {/* Miniature type icon indicator */}
            {actorAvatarUrl && (
              <View style={[styles.typeMiniIcon, { backgroundColor: icon.color }]}>
                <Ionicons name={icon.name as any} size={10} color={COLORS.white} />
              </View>
            )}
          </View>

          {/* Text Content */}
          <View style={styles.infoContainer}>
            <Text style={[styles.messageText, { color: isDark ? COLORS.gray300 : COLORS.gray700 }]} numberOfLines={3}>
              <Text style={[styles.actorName, { color: C.textPrimary }]}>{item.actorName}</Text>{' '}
              {item.message.replace(item.actorName, '').trim()}
            </Text>
            
            {item.contentPreview && (
              <View style={[styles.previewContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : COLORS.gray50 }]}>
                <Text style={[styles.contentPreview, { color: C.textSecondary }]} numberOfLines={1}>
                  {item.contentPreview}
                </Text>
              </View>
            )}
            
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={12} color={COLORS.gray400} style={{ marginRight: 4 }} />
              <Text style={styles.timeText}>{timeAgo}</Text>
            </View>
          </View>

          {/* Image Thumbnail (if available, e.g. for moments) */}
          {thumbnailUrl && (
            <Image 
              source={{ uri: thumbnailUrl }} 
              style={styles.thumbnail}
              resizeMode="cover"
            />
          )}
        </View>

        {isUnread && <View style={styles.unreadPulse} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeContainer style={[styles.container, { backgroundColor: C.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <View style={styles.headerTitleGroup}>
          <Text style={[styles.title, { color: C.textPrimary }]}>Thông báo</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={markAllAsRead} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[styles.markAllText, { color: C.primary }]}>Đánh dấu tất cả</Text>
        </TouchableOpacity>
      </View>

      {isLoading && notifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="notifications-off-outline" size={48} color={COLORS.gray400} />
              </View>
              <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>Chưa có thông báo</Text>
              <Text style={[styles.emptySubtitle, { color: C.textSecondary }]}>
                Chúng tôi sẽ thông báo cho bạn khi có tin nhắn hoặc hoạt động mới.
              </Text>
            </View>
          }
        />
      )}
    </SafeContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: SPACING.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZE.xxxl,
    fontWeight: FONT_WEIGHT.bold,
  },
  unreadBadge: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
  },
  markAllText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  listContent: {
    paddingVertical: SPACING.md,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.xs,
    borderRadius: RADIUS.lg,
    ...SHADOWS.sm,
    overflow: 'hidden',
  },
  itemMainContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeMiniIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
    marginLeft: SPACING.md,
    justifyContent: 'center',
  },
  actorName: {
    fontWeight: FONT_WEIGHT.bold,
  },
  messageText: {
    fontSize: FONT_SIZE.md,
    lineHeight: 20,
  },
  previewContainer: {
    marginTop: SPACING.xs,
    padding: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
  },
  contentPreview: {
    fontSize: FONT_SIZE.sm,
    fontStyle: 'italic',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  timeText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray500,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    marginLeft: SPACING.md,
  },
  unreadPulse: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: FONT_SIZE.md,
    textAlign: 'center',
    lineHeight: 22,
  },
});
