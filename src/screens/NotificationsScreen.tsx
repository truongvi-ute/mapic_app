import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
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
        return { name: 'person-add', color: '#007AFF' };
      case 'FRIEND_ACCEPT':
        return { name: 'people', color: '#34C759' };
      case 'MOMENT_REACTION':
        return { name: 'heart', color: '#FF2D55' };
      case 'MOMENT_COMMENT':
        return { name: 'chatbubble', color: '#5856D6' };
      case 'NEW_MESSAGE':
        return { name: 'mail', color: '#FF9500' };
      case 'SOS_ALERT':
        return { name: 'warning', color: '#FF3B30' };
      default:
        return { name: 'notifications', color: '#8E8E93' };
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return { borderLeftColor: '#FF3B30', borderLeftWidth: 4 };
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
          !item.isRead && styles.unreadItem,
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
              <Ionicons name={icon.name as any} size={24} color="#FFF" />
            </View>
          )}
          {!item.isRead && <View style={styles.unreadDot} />}
        </View>

        {/* Content */}
        <View style={styles.infoContainer}>
          <Text style={styles.messageText}>
            <Text style={styles.actorName}>{item.actorName}</Text>{' '}
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
           <Ionicons name={icon.name as any} size={16} color={icon.color} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Thông báo</Text>
          {unreadCount > 0 && (
            <Text style={styles.subtitle}>Bạn có {unreadCount} thông báo mới</Text>
          )}
        </View>
        <TouchableOpacity onPress={markAllAsRead}>
          <Text style={styles.markAllText}>Đánh dấu tất cả</Text>
        </TouchableOpacity>
      </View>

      {isLoading && notifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
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
              <Ionicons name="notifications-off-outline" size={64} color="#C7C7CC" />
              <Text style={styles.emptyText}>Chưa có thông báo nào</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#000000',
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  markAllText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 5,
  },
  listContent: {
    paddingVertical: 10,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadItem: {
    backgroundColor: '#F0F7FF',
  },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 10,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
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
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
  },
  actorName: {
    fontWeight: 'bold',
    color: '#000000',
  },
  messageText: {
    fontSize: 15,
    color: '#3A3A3C',
    lineHeight: 20,
  },
  contentPreview: {
    fontSize: 13,
    color: '#8E8E93',
    fontStyle: 'italic',
    marginTop: 4,
    lineHeight: 18,
  },
  timeText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  typeIcon: {
    marginLeft: 10,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 10,
  },
});
