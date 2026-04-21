import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { useAlert } from '../context/AlertContext';
import { getApiUrl, getBaseUrl } from '../config/api';

interface SearchResult {
  id: number;
  username: string;
  name: string;
  avatarUrl: string | null;
  friendshipStatus: 'NONE' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'FRIENDS';
}

interface AddFriendScreenProps {
  onBack: () => void;
}

export default function AddFriendScreen({ onBack }: AddFriendScreenProps) {
  const token = useAuthStore((state) => state.token);
  const { showAlert } = useAlert();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const API_URL = getApiUrl();
  const baseUrl = getBaseUrl();

  // Realtime search with debounce
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (searchQuery.trim().length >= 2) {
      const timeout = setTimeout(() => {
        handleSearch();
      }, 500); // Debounce 500ms
      setSearchTimeout(timeout);
    } else {
      setSearchResults([]);
    }

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchQuery]);

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) {
      return;
    }

    try {
      setSearching(true);

      console.log('[AddFriendScreen] Searching for:', searchQuery);

      const response = await fetch(
        `${API_URL}/friends/search?query=${encodeURIComponent(searchQuery)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('[AddFriendScreen] Search response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('[AddFriendScreen] Search results:', result);
        setSearchResults(result.data || []);
      } else {
        const errorText = await response.text();
        console.error('[AddFriendScreen] Search failed:', response.status, errorText);
      }
    } catch (error) {
      console.error('[AddFriendScreen] Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (userId: number, userName: string) => {
    try {
      const response = await fetch(`${API_URL}/friends/request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ receiverId: userId }),
      });

      if (response.ok) {
        showAlert('Thành công', `Đã gửi lời mời kết bạn đến ${userName}`);
        
        // Update local state
        setSearchResults((prev) =>
          prev.map((user) =>
            user.id === userId
              ? { ...user, friendshipStatus: 'PENDING_SENT' }
              : user
          )
        );
      } else {
        const result = await response.json();
        showAlert('Lỗi', result.message || 'Không thể gửi lời mời kết bạn');
      }
    } catch (error) {
      console.error('[AddFriendScreen] Send request error:', error);
      showAlert('Lỗi', 'Không thể kết nối đến server');
    }
  };

  const handleCancelRequest = async (userId: number) => {
    // TODO: Implement cancel request API
    showAlert('Thông báo', 'Chức năng hủy lời mời đang được phát triển');
  };

  const handleAcceptRequest = async (userId: number) => {
    // TODO: Implement accept request API
    showAlert('Thông báo', 'Chức năng chấp nhận lời mời đang được phát triển');
  };

  const renderActionButton = (user: SearchResult) => {
    switch (user.friendshipStatus) {
      case 'NONE':
        return (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleSendRequest(user.id, user.name)}
          >
            <Ionicons name="person-add" size={18} color="#FFF" />
            <Text style={styles.actionButtonText}>Kết bạn</Text>
          </TouchableOpacity>
        );
      
      case 'PENDING_SENT':
        return (
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonDisabled]}
            onPress={() => handleCancelRequest(user.id)}
          >
            <Text style={styles.actionButtonTextDisabled}>Đã gửi</Text>
          </TouchableOpacity>
        );
      
      case 'PENDING_RECEIVED':
        return (
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonAccept]}
            onPress={() => handleAcceptRequest(user.id)}
          >
            <Ionicons name="checkmark" size={18} color="#FFF" />
            <Text style={styles.actionButtonText}>Chấp nhận</Text>
          </TouchableOpacity>
        );
      
      case 'FRIENDS':
        return (
          <View style={[styles.actionButton, styles.actionButtonDisabled]}>
            <Ionicons name="checkmark-circle" size={18} color="#4CD964" />
            <Text style={[styles.actionButtonTextDisabled, { color: '#4CD964' }]}>
              Bạn bè
            </Text>
          </View>
        );
      
      default:
        return null;
    }
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => {
    const avatarUri = item.avatarUrl ? `${baseUrl}${item.avatarUrl}` : null;

    return (
      <View style={styles.resultItem}>
        <View style={styles.resultInfo}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <Image 
              source={require('../assets/images/avatar-default.png')} 
              style={styles.avatar}
            />
          )}
          <View style={styles.resultDetails}>
            <Text style={styles.resultName}>{item.name}</Text>
          </View>
        </View>
        {renderActionButton(item)}
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
        <Text style={styles.title}>Thêm bạn bè</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.tabContent}>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Nhập tên hoặc username..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
              autoFocus
            />
            {searching && (
              <ActivityIndicator size="small" color="#007AFF" style={{ marginRight: 8 }} />
            )}
            {searchQuery.length > 0 && !searching && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {searchResults.length > 0 ? (
          <FlatList
            data={searchResults}
            renderItem={renderSearchResult}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.resultsList}
          />
        ) : searchQuery.trim().length >= 2 && !searching ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={64} color="#CCC" />
            <Text style={styles.emptyTitle}>Không tìm thấy</Text>
            <Text style={styles.emptyText}>
              Không có người dùng nào khớp với "{searchQuery}"
            </Text>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={64} color="#CCC" />
            <Text style={styles.emptyTitle}>Tìm kiếm người dùng</Text>
            <Text style={styles.emptyText}>
              Nhập tên hoặc username để tìm kiếm bạn bè
            </Text>
          </View>
        )}
      </View>
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
  tabContent: {
    flex: 1,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
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
  resultsList: {
    padding: 16,
    paddingBottom: 80,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  resultInfo: {
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
  resultDetails: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  resultUsername: {
    fontSize: 14,
    color: '#666',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonDisabled: {
    backgroundColor: '#F0F0F0',
  },
  actionButtonTextDisabled: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonAccept: {
    backgroundColor: '#4CD964',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
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
