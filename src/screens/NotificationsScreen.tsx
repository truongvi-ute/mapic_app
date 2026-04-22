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
    const priorityStyle = getPriorityStyle(item.priority);

    return (
      <TouchableOpacity 
        style={[
          styles.notificationItem,
          { backgroundColor: item.isRead ? C.surface : (isDark ? 'rgba(67,97,238,0.12)' : C.gray50) },
          priorityStyle
        ]}
        onPress={() => handleNotificationPress(item)}
      >
        {/* Thumbnail (if available) */}
        {item.thumbnailUrl && (
          <Image 
            source={{ uri: item.thumbnailUrl }} 
            style={styles.thumbnail}
          />
        )}

        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {item.actorAvatar ? (
            <Image source={{ uri: item.actorAvatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: icon.color }]}>
              <Ionicons name={icon.name as any} size={DIMENSIONS.iconLG} color={COLORS.white} />
            </View>
          )}
          {!item.isRead && <View style={styles.unreadDot} />}
        </View>

        {/* Content */}
        <View style={styles.infoContainer}>
          <Text style={[styles.messageText, { color: C.textSecondary }]}>
            <Text style={[styles.actorName, { color: C.textPrimary }]}>{item.actorName}</Text>{' '}
            {item.message.replace(item.actorName, '').trim()}
          </Text>
          
          {/* Content preview (for comments) */}
          {item.contentPreview && (
            <Text style={styles.contentPreview} numberOfLines={2}>
              "{item.contentPreview}"
            </Text>
          )}
          
          <Text style={styles.timeText}>{timeAgo}</Text>
        </View>

        {/* Type icon */}
        <View style={styles.typeIcon}>
           <Ionicons name={icon.name as any} size={DIMENSIONS.iconSM} color={icon.color} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeContainer style={[styles.container, { backgroundColor: C.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <View>
          <Text style={[styles.title, { color: C.textPrimary }]}>Thông báo</Text>
          {unreadCount > 0 && (
            <Text style={[styles.subtitle, { color: C.textSecondary }]}>Bạn có {unreadCount} thông báo mới</Text>
          )}
        </View>
        <TouchableOpacity onPress={markAllAsRead}>
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
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Ionicons name="notifications-off-outline" size={64} color={COLORS.gray300} />
              <Spacer size="md" />
              <Text style={styles.emptyText}>Chưa có thông báo nào</Text>
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
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  title: {
    fontSize: FONT_SIZE.massive,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray900,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.gray500,
    marginTop: 2,
  },
  markAllText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.semibold,
    marginBottom: SPACING.xs,
  },
  listContent: {
    paddingVertical: SPACING.sm,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.sm,
    marginVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  unreadItem: {
    backgroundColor: COLORS.gray50,
  },
  thumbnail: {
    width: DIMENSIONS.avatarLG,
    height: DIMENSIONS.avatarLG,
    borderRadius: RADIUS.sm,
    marginRight: SPACING.sm,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: DIMENSIONS.avatarLG,
    height: DIMENSIONS.avatarLG,
    borderRadius: DIMENSIONS.avatarLG / 2,
  },
  avatarPlaceholder: {
    width: DIMENSIONS.avatarLG,
    height: DIMENSIONS.avatarLG,
    borderRadius: DIMENSIONS.avatarLG / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  infoContainer: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  actorName: {
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray900,
  },
  messageText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.gray700,
    lineHeight: FONT_SIZE.md * 1.4,
  },
  contentPreview: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray500,
    fontStyle: 'italic',
    marginTop: SPACING.xs,
    lineHeight: FONT_SIZE.sm * 1.4,
  },
  timeText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray500,
    marginTop: SPACING.xs,
  },
  typeIcon: {
    marginLeft: SPACING.sm,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.gray500,
  },
});
