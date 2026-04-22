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
import { useAuthStore } from '../store/useAuthStore';
import { useAlert } from '../context/AlertContext';
import AddFriendScreen from './AddFriendScreen';
import FriendRequestsScreen from './FriendRequestsScreen';
import { getApiUrl, getBaseUrl } from '../config/api';

interface Friend {
  id: number;
  username: string;
  name: string;
  avatarUrl: string | null;
  friendsSince: string;
}

interface FriendsScreenProps {
  onPressProfile?: (userId: number) => void;
}

export default function FriendsScreen({ onPressProfile }: FriendsScreenProps) {
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

  const API_URL = getApiUrl();
  const baseUrl = getBaseUrl();

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
      <TouchableOpacity 
        style={styles.friendItem}
        onPress={() => onPressProfile?.(item.id)}
        activeOpacity={0.9}
      >
        {/* Cover Background - using cover-default if no cover */}
        <Image 
          source={require('../assets/images/cover-default.jpg')} 
          style={styles.friendBackground}
        />
        
        {/* Overlay */}
        <View style={styles.friendOverlay}>
          <View style={styles.friendInfo}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
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
                  onPress: () => console.log('Message:', item.id),
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
            <Ionicons name="ellipsis-horizontal" size={24} color="#FFF" />
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Bạn bè</Text>
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

      <View style={styles.searchContainer}>
        <Image
          source={require('../assets/images/search.png')}
          style={styles.searchIcon}
        />
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
  headerIcon: {
    width: 24,
    height: 24,
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
    width: 20,
    height: 20,
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
    height: 120,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
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
    padding: 16,
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
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
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
  emptyIcon: {
    width: 64,
    height: 64,
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
