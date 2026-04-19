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
  TextInput,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useAuthStore } from '../store/useAuthStore';
import { useAlert } from '../context/AlertContext';
import AddFriendScreen from './AddFriendScreen';
import FriendRequestsScreen from './FriendRequestsScreen';

interface Friend {
  id: number;
  username: string;
  name: string;
  avatarUrl: string | null;
  friendsSince: string;
}

export default function FriendsScreen() {
  const token = useAuthStore((state) => state.token);
  const { showAlert } = useAlert();
  
  const [friends, setFriends] = useState<Friend[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://192.168.1.26:8080/api';
  const baseUrl = API_URL.replace('/api', '');

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
    const avatarUri = item.avatarUrl
      ? `${baseUrl}${item.avatarUrl}`
      : null;

    return (
      <TouchableOpacity style={styles.friendItem}>
        <View style={styles.friendInfo}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={32} color="#999" />
            </View>
          )}
          <View style={styles.friendDetails}>
            <Text style={styles.friendName}>{item.name}</Text>
            <Text style={styles.friendUsername}>@{item.username}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => {
            showAlert('Tùy chọn', `Chọn hành động với ${item.name}`, [
              {
                text: 'Nhắn tin',
                onPress: () => console.log('Message:', item.id),
              },
              {
                text: 'Xem trang cá nhân',
                onPress: () => console.log('View profile:', item.id),
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
          <Ionicons name="ellipsis-horizontal" size={24} color="#666" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;

    if (searchQuery.trim()) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="search" size={64} color="#CCC" />
          <Text style={styles.emptyTitle}>Không tìm thấy</Text>
          <Text style={styles.emptyText}>
            Không có bạn bè nào khớp với "{searchQuery}"
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={64} color="#CCC" />
        <Text style={styles.emptyTitle}>Chưa có bạn bè</Text>
        <Text style={styles.emptyText}>
          Hãy bắt đầu kết nối với mọi người!
        </Text>
        <TouchableOpacity
          style={styles.addFriendButton}
          onPress={() => setShowAddFriend(true)}
        >
          <Ionicons name="person-add" size={20} color="#FFF" />
          <Text style={styles.addFriendButtonText}>Thêm bạn bè</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (showAddFriend) {
    return <AddFriendScreen onBack={() => setShowAddFriend(false)} />;
  }

  if (showRequests) {
    return (
      <FriendRequestsScreen
        onBack={() => {
          setShowRequests(false);
          loadPendingRequestsCount();
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Bạn bè</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.requestButton}
            onPress={() => setShowRequests(true)}
          >
            <Ionicons name="mail" size={24} color="#007AFF" />
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
            <Ionicons name="person-add" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm bạn bè..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {loading && friends.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredFriends}
          renderItem={renderFriendItem}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={
            filteredFriends.length === 0 ? styles.emptyList : styles.listContent
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
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
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
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
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
    backgroundColor: '#FFFFFF',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#000',
  },
  listContent: {
    paddingBottom: 80,
  },
  friendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  friendInfo: {
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
  friendDetails: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  friendUsername: {
    fontSize: 14,
    color: '#666',
  },
  menuButton: {
    padding: 8,
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
    marginBottom: 24,
  },
  addFriendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  addFriendButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
