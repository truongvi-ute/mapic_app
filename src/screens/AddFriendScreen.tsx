import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { useAlert } from '../context/AlertContext';
import { getApiUrl, buildAvatarUrl, buildCoverUrl } from '../config/api';
import { SPACING, COLORS, LIGHT_COLORS, DARK_COLORS, FONT_SIZE, FONT_WEIGHT, RADIUS, SHADOWS, DIMENSIONS } from '../constants/design';
import { useThemeStore } from '../store/useThemeStore';
import SafeContainer from '../components/ui/SafeContainer';
import Spacer from '../components/ui/Spacer';

interface SearchResult {
  id: number;
  username: string;
  name: string;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  friendshipStatus: 'NONE' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'FRIENDS';
}

interface AddFriendScreenProps {
  onBack: () => void;
  onPressProfile?: (userId: number) => void;
}

export default function AddFriendScreen({ onBack, onPressProfile }: AddFriendScreenProps) {
  const token = useAuthStore((state) => state.token);
  const { showAlert } = useAlert();
  const { mode } = useThemeStore();
  const isDark = mode === 'dark';
  const C = isDark ? DARK_COLORS : LIGHT_COLORS;

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const API_URL = getApiUrl();

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
            <Ionicons name="person-add" size={DIMENSIONS.iconSM} color={COLORS.white} />
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
            <Ionicons name="checkmark" size={DIMENSIONS.iconSM} color={COLORS.white} />
            <Text style={styles.actionButtonText}>Chấp nhận</Text>
          </TouchableOpacity>
        );
      
      case 'FRIENDS':
        return (
          <View style={[styles.actionButton, styles.actionButtonDisabled]}>
            <Ionicons name="checkmark-circle" size={DIMENSIONS.iconSM} color={COLORS.success} />
            <Text style={[styles.actionButtonTextDisabled, { color: COLORS.success }]}>
              Bạn bè
            </Text>
          </View>
        );
      
      default:
        return null;
    }
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => {
    const avatarUri = buildAvatarUrl(item.avatarUrl);
    const coverUri = buildCoverUrl(item.coverImageUrl);

    return (
      <TouchableOpacity 
        style={styles.resultItem}
        onPress={() => onPressProfile?.(item.id)}
        activeOpacity={0.9}
      >
        {/* Cover Background - dùng ảnh bìa thật nếu có, fallback về cover-default */}
        {coverUri ? (
          <Image 
            source={{ uri: coverUri }} 
            style={styles.resultBackground}
          />
        ) : (
          <Image 
            source={require('../assets/images/cover-default.jpg')} 
            style={styles.resultBackground}
          />
        )}
        
        {/* Overlay */}
        <View style={styles.resultOverlay}>
          <View style={styles.resultInfo}>
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
            <View style={styles.resultDetails}>
              <Text style={styles.resultName}>{item.name}</Text>
            </View>
          </View>
          <View onClick={(e) => e.stopPropagation()}>
            {renderActionButton(item)}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeContainer style={[styles.container, { backgroundColor: C.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={DIMENSIONS.iconLG} color={C.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: C.textPrimary }]}>Thêm bạn bè</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.tabContent}>
        <View style={[styles.searchContainer, { backgroundColor: C.surface }]}>
          <View style={[styles.searchInputContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : COLORS.gray50, borderColor: C.border }]}>
            <Image source={require('../assets/images/search.png')} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: C.textPrimary }]}
              placeholder="Nhập tên hoặc username..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={C.textTertiary}
              autoFocus
            />
            {searching && (
              <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: SPACING.sm }} />
            )}
            {searchQuery.length > 0 && !searching && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={DIMENSIONS.iconMD} color={COLORS.gray500} />
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
            <Image
              source={require('../assets/images/search.png')}
              style={styles.emptyIcon}
            />
            <Spacer size="lg" />
            <Text style={styles.emptyTitle}>Không tìm thấy</Text>
            <Spacer size="sm" />
            <Text style={styles.emptyText}>
              Không có người dùng nào khớp với "{searchQuery}"
            </Text>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Image
              source={require('../assets/images/search.png')}
              style={styles.emptyIcon}
            />
            <Spacer size="lg" />
            <Text style={styles.emptyTitle}>Tìm kiếm người dùng</Text>
            <Spacer size="sm" />
            <Text style={styles.emptyText}>
              Nhập tên hoặc username để tìm kiếm bạn bè
            </Text>
          </View>
        )}
      </View>
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
  tabContent: {
    flex: 1,
  },
  searchContainer: {
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  searchIcon: {
    width: DIMENSIONS.iconMD,
    height: DIMENSIONS.iconMD,
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    height: DIMENSIONS.inputHeight,
    fontSize: FONT_SIZE.lg,
    color: COLORS.gray900,
  },
  resultsList: {
    padding: SPACING.lg,
    paddingBottom: SPACING.huge * 2,
  },
  resultItem: {
    height: 120,
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    position: 'relative',
    ...SHADOWS.md,
  },
  resultBackground: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  resultOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  resultInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: DIMENSIONS.avatarLG,
    height: DIMENSIONS.avatarLG,
    borderRadius: DIMENSIONS.avatarLG / 2,
    marginRight: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  resultDetails: {
    flex: 1,
  },
  resultName: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.xl,
    gap: SPACING.xs,
    ...SHADOWS.sm,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
  },
  actionButtonDisabled: {
    backgroundColor: COLORS.gray100,
  },
  actionButtonTextDisabled: {
    color: COLORS.gray500,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
  },
  actionButtonAccept: {
    backgroundColor: COLORS.success,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxxl + SPACING.sm,
  },
  emptyIcon: {
    width: DIMENSIONS.avatarXL - SPACING.lg,
    height: DIMENSIONS.avatarXL - SPACING.lg,
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
