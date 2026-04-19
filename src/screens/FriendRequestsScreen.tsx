import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useAuthStore } from '../store/useAuthStore';
import { useAlert } from '../context/AlertContext';

interface FriendRequest {
  id: number;
  senderId: number;
  senderName: string;
  senderUsername: string;
  senderAvatarUrl: string | null;
  createdAt: string;
}

interface FriendRequestsScreenProps {
  onBack: () => void;
}

export default function FriendRequestsScreen({ onBack }: FriendRequestsScreenProps) {
  const token = useAuthStore((state) => state.token);
  const { showAlert } = useAlert();

  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://192.168.1.26:8080/api';
  const baseUrl = API_URL.replace('/api', '');

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
      const response = await fetch(`${API_URL}/friends/accept/${requestId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        showAlert('Thành công', `Bạn và ${senderName} đã trở thành bạn bè`);
        setRequests((prev) => prev.filter((req) => req.id !== requestId));
      } else {
        const result = await response.json();
        showAlert('Lỗi', result.message || 'Không thể chấp nhận lời mời');
      }
    } catch (error) {
      console.error('[FriendRequestsScreen] Accept error:', error);
      showAlert('Lỗi', 'Không thể kết nối đến server');
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
              const response = await fetch(`${API_URL}/friends/reject/${requestId}`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              if (response.ok) {
                showAlert('Thành công', 'Đã từ chối lời mời kết bạn');
                setRequests((prev) => prev.filter((req) => req.id !== requestId));
              } else {
                showAlert('Lỗi', 'Không thể từ chối lời mời');
              }
            } catch (error) {
              showAlert('Lỗi', 'Không thể kết nối đến server');
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
    const avatarUri = item.senderAvatarUrl
      ? `${baseUrl}${item.senderAvatarUrl}`
      : null;

    return (
      <View style={styles.requestItem}>
        <View style={styles.requestInfo}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={32} color="#999" />
            </View>
          )}
          <View style={styles.requestDetails}>
            <Text style={styles.requestName}>{item.senderName}</Text>
            <Text style={styles.requestUsername}>@{item.senderUsername}</Text>
            <Text style={styles.requestTime}>{getTimeAgo(item.createdAt)}</Text>
          </View>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => handleAccept(item.id, item.senderName)}
          >
            <Ionicons name="checkmark" size={20} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.rejectButton}
            onPress={() => handleReject(item.id, item.senderName)}
          >
            <Ionicons name="close" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="mail-open-outline" size={64} color="#CCC" />
        <Text style={styles.emptyTitle}>Không có lời mời nào</Text>
        <Text style={styles.emptyText}>
          Bạn chưa có lời mời kết bạn nào đang chờ
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Lời mời kết bạn</Text>
        <View style={styles.backButton} />
      </View>

      {loading && requests.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequestItem}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={
            requests.length === 0 ? styles.emptyList : styles.listContent
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  requestItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestDetails: {
    flex: 1,
  },
  requestName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  requestUsername: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  requestTime: {
    fontSize: 12,
    color: '#999',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CD964',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 400,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
