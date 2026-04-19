import React, { useState } from 'react';
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
import Constants from 'expo-constants';
import { useAuthStore } from '../store/useAuthStore';
import { useAlert } from '../context/AlertContext';

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
  const currentUser = useAuthStore((state) => state.user);
  const { showAlert } = useAlert();

  const [activeTab, setActiveTab] = useState<'search' | 'qr'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://192.168.1.26:8080/api';
  const baseUrl = API_URL.replace('/api', '');

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) {
      showAlert('Thông báo', 'Vui lòng nhập ít nhất 2 ký tự');
      return;
    }

    try {
      setSearching(true);

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

      if (response.ok) {
        const result = await response.json();
        setSearchResults(result.data || []);
        
        if (result.data.length === 0) {
          showAlert('Thông báo', 'Không tìm thấy người dùng nào');
        }
      } else {
        showAlert('Lỗi', 'Không thể tìm kiếm người dùng');
      }
    } catch (error) {
      console.error('[AddFriendScreen] Search error:', error);
      showAlert('Lỗi', 'Không thể kết nối đến server');
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
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={28} color="#999" />
            </View>
          )}
          <View style={styles.resultDetails}>
            <Text style={styles.resultName}>{item.name}</Text>
            <Text style={styles.resultUsername}>@{item.username}</Text>
          </View>
        </View>
        {renderActionButton(item)}
      </View>
    );
  };

  const renderSearchTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Nhập tên hoặc username..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            placeholderTextColor="#999"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearch}
          disabled={searching}
        >
          {searching ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.searchButtonText}>Tìm</Text>
          )}
        </TouchableOpacity>
      </View>

      {searchResults.length > 0 ? (
        <FlatList
          data={searchResults}
          renderItem={renderSearchResult}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.resultsList}
        />
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
  );

  const renderQRTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.qrContainer}>
        <View style={styles.qrSection}>
          <Text style={styles.qrTitle}>Mã QR của bạn</Text>
          <Text style={styles.qrSubtitle}>
            Cho bạn bè quét mã này để kết bạn
          </Text>
          <View style={styles.qrCodePlaceholder}>
            <Ionicons name="qr-code" size={120} color="#007AFF" />
            <Text style={styles.qrCodeText}>
              {currentUser?.username || 'user'}
            </Text>
          </View>
          <Text style={styles.qrNote}>
            Chức năng tạo mã QR đang được phát triển
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.qrSection}>
          <Text style={styles.qrTitle}>Quét mã QR</Text>
          <Text style={styles.qrSubtitle}>
            Quét mã QR của bạn bè để kết bạn nhanh
          </Text>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => showAlert('Thông báo', 'Chức năng quét QR đang được phát triển')}
          >
            <Ionicons name="scan" size={32} color="#FFF" />
            <Text style={styles.scanButtonText}>Mở máy quét</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

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

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'search' && styles.tabActive]}
          onPress={() => setActiveTab('search')}
        >
          <Ionicons
            name="search"
            size={20}
            color={activeTab === 'search' ? '#007AFF' : '#999'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'search' && styles.tabTextActive,
            ]}
          >
            Tìm kiếm
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'qr' && styles.tabActive]}
          onPress={() => setActiveTab('qr')}
        >
          <Ionicons
            name="qr-code"
            size={20}
            color={activeTab === 'qr' ? '#007AFF' : '#999'}
          />
          <Text
            style={[styles.tabText, activeTab === 'qr' && styles.tabTextActive]}
          >
            Mã QR
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'search' ? renderSearchTab() : renderQRTab()}
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    color: '#999',
  },
  tabTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  searchInputContainer: {
    flex: 1,
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
  searchButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
  },
  searchButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
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
  avatarPlaceholder: {
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
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
  qrContainer: {
    flex: 1,
    padding: 16,
  },
  qrSection: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  qrSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  qrCodePlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
  },
  qrCodeText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  qrNote: {
    marginTop: 16,
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  divider: {
    height: 16,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
  },
  scanButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
