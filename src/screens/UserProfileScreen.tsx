import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuthStore } from '../store/useAuthStore';
import { useAlert } from '../context/AlertContext';
import reportService from '../api/reportService';
import albumService from '../api/albumService';
import momentService from '../api/momentService';
import MomentCard, { Moment } from '../components/MomentCard';
import { getApiUrl, getBaseUrl, buildMediaUrl } from '../config/api';
import AlbumSelectModal from '../components/AlbumSelectModal';
import CommentModal from '../components/CommentModal';
import EditCaptionModal from '../components/EditCaptionModal';
import chatService from '../api/chatService';

const GENDER_LABELS: { [key: string]: string } = {
  MALE: 'Nam',
  FEMALE: 'Nữ',
  OTHER: 'Khác',
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

interface UserProfile {
  id: number;
  username: string;
  name: string;
  email: string;
  phone?: string;
  bio?: string;
  dateOfBirth?: string;
  gender?: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  friendshipStatus: 'NONE' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'FRIENDS';
}

interface UserProfileScreenProps {
  userId: number;
  onBack: () => void;
  onOpenMap?: (params: {
    latitude: number;
    longitude: number;
    addressName: string;
    provinceName?: string;
    imageUrl?: string;
    caption?: string;
  }) => void;
  onOpenChat?: (conversation: any) => void;
}

export default function UserProfileScreen({ userId, onBack, onOpenMap, onOpenChat }: UserProfileScreenProps) {
  const token = useAuthStore((state) => state.token);
  const currentUser = useAuthStore((state) => state.user);
  const { showAlert } = useAlert();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMoments, setLoadingMoments] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [albumModalVisible, setAlbumModalVisible] = useState(false);
  const [selectedMomentId, setSelectedMomentId] = useState<number | null>(null);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedMomentForComment, setSelectedMomentForComment] = useState<number | null>(null);
  const [editCaptionModalVisible, setEditCaptionModalVisible] = useState(false);
  const [editingMoment, setEditingMoment] = useState<Moment | null>(null);

  const API_URL = getApiUrl();
  const baseUrl = getBaseUrl();

  useEffect(() => {
    loadUserProfile();
    loadUserMoments();
  }, [userId]);

  const loadUserProfile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.data);
      } else {
        showAlert('Lỗi', 'Không thể tải thông tin người dùng');
      }
    } catch (error) {
      console.error('[UserProfile] Failed to load profile:', error);
      showAlert('Lỗi', 'Không thể kết nối đến server');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserMoments = async () => {
    try {
      setLoadingMoments(true);
      const response = await fetch(`${API_URL}/moments/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMoments(data.data || []);
      }
    } catch (error) {
      console.error('[UserProfile] Failed to load moments:', error);
    } finally {
      setLoadingMoments(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUserProfile();
    loadUserMoments();
  };

  const handleAddToAlbum = (momentId: number) => {
    setSelectedMomentId(momentId);
    setAlbumModalVisible(true);
  };

  const handleOpenComment = (momentId: number) => {
    setSelectedMomentForComment(momentId);
    setCommentModalVisible(true);
  };

  const showReportDialog = (momentId: number) => {
    showAlert(
      'Báo cáo bài viết',
      'Chọn lý do báo cáo:',
      [
        { text: 'Nội dung sai lệch', onPress: () => submitReport(momentId, 'nội dung sai lệch') },
        { text: 'Vi phạm tiêu chuẩn cộng đồng', onPress: () => submitReport(momentId, 'vi phạm tiêu chuẩn cộng đồng') },
        { text: 'Ngôn từ thù ghét', onPress: () => submitReport(momentId, 'ngôn từ thù ghét') },
        { text: 'Khác', onPress: () => submitReport(momentId, 'khác') },
        { text: 'Hủy', style: 'cancel' }
      ]
    );
  };

  const submitReport = async (momentId: number, reason: string) => {
    if (!token) return;
    try {
      await reportService.submitReport({
        targetId: momentId,
        targetType: 'MOMENT',
        reason
      }, token);
      showAlert('Thành công', 'Cảm ơn bạn đã báo cáo. Chúng tôi sẽ xem xét.');
    } catch (error) {
      console.error('Failed to report', error);
      showAlert('Lỗi', 'Không thể gửi báo cáo');
    }
  };

  const handleSelectAlbum = async (albumId: number) => {
    if (!selectedMomentId || !token) return;

    try {
      await albumService.addMomentToAlbum(albumId, selectedMomentId, token);
      showAlert('Thành công', 'Đã thêm moment vào album');
    } catch (error: any) {
      showAlert('Lỗi', error.message || 'Không thể thêm moment vào album');
    }
  };

  const handleDeleteMoment = async (momentId: number) => {
    if (!token) return;

    console.log('[UserProfileScreen] Delete moment:', momentId);

    showAlert('Xác nhận', 'Bạn có chắc muốn xóa moment này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            console.log('[UserProfileScreen] Calling deleteMoment API for moment:', momentId);
            await momentService.deleteMoment(momentId, token);
            console.log('[UserProfileScreen] Delete successful, removing from local state');
            // Remove from local state
            setMoments(prev => prev.filter(m => m.id !== momentId));
            showAlert('Thành công', 'Đã xóa moment');
          } catch (error: any) {
            console.error('[UserProfileScreen] Delete failed:', error);
            showAlert('Lỗi', error.message || 'Không thể xóa moment');
          }
        },
      },
    ]);
  };

  const handleEditCaption = (moment: Moment) => {
    setEditingMoment(moment);
    setEditCaptionModalVisible(true);
  };

  const handleSaveCaption = async (newCaption: string) => {
    if (!editingMoment || !token) return;

    try {
      const updatedMoment = await momentService.updateMomentContent(
        editingMoment.id,
        newCaption,
        token
      );
      
      // Update local state
      setMoments(prev =>
        prev.map(m => (m.id === editingMoment.id ? { ...m, content: newCaption } : m))
      );
      
      showAlert('Thành công', 'Đã cập nhật caption');
    } catch (error: any) {
      showAlert('Lỗi', error.message || 'Không thể cập nhật caption');
      throw error;
    }
  };

  const handleSendFriendRequest = async () => {
    try {
      setActionLoading(true);
      const response = await fetch(`${API_URL}/friends/request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ receiverId: userId }),
      });

      if (response.ok) {
        showAlert('Thành công', `Đã gửi lời mời kết bạn đến ${user?.name}`);
        loadUserProfile(); // Reload to update friendship status
      } else {
        const result = await response.json();
        showAlert('Lỗi', result.message || 'Không thể gửi lời mời kết bạn');
      }
    } catch (error) {
      showAlert('Lỗi', 'Không thể kết nối đến server');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnfriend = async () => {
    showAlert(
      'Xác nhận',
      `Bạn có chắc muốn hủy kết bạn với ${user?.name}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              const response = await fetch(`${API_URL}/friends/${userId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              if (response.ok) {
                showAlert('Thành công', 'Đã hủy kết bạn');
                loadUserProfile();
              } else {
                showAlert('Lỗi', 'Không thể hủy kết bạn');
              }
            } catch (error) {
              showAlert('Lỗi', 'Không thể kết nối đến server');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleMessage = async () => {
    try {
      if (!token) return;
      setActionLoading(true);
      const conversation = await chatService.openDirectChat(userId, token);
      onOpenChat?.(conversation);
    } catch (error) {
      showAlert('Lỗi', 'Không thể mở cuộc trò chuyện');
    } finally {
      setActionLoading(false);
    }
  };

  const renderActionButtons = () => {
    if (!user) return null;

    // Check if viewing own profile
    const isOwnProfile = currentUser?.id === userId;
    
    // Don't show action buttons for own profile
    if (isOwnProfile) {
      return null;
    }

    if (user.friendshipStatus === 'FRIENDS') {
      return (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.messageButton}
            onPress={handleMessage}
            disabled={actionLoading}
          >
            <Image
              source={require('../assets/images/message.png')}
              style={styles.actionIcon}
            />
            <Text style={styles.messageButtonText}>Nhắn tin</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.unfriendButton}
            onPress={handleUnfriend}
            disabled={actionLoading}
          >
            <Image
              source={require('../assets/images/unfriend.png')}
              style={styles.unfriendIcon}
            />
          </TouchableOpacity>
        </View>
      );
    } else if (user.friendshipStatus === 'PENDING_SENT') {
      return (
        <View style={styles.actionButtons}>
          <View style={styles.pendingButton}>
            <Ionicons name="time" size={20} color="#666" />
            <Text style={styles.pendingButtonText}>Đã gửi lời mời</Text>
          </View>
        </View>
      );
    } else if (user.friendshipStatus === 'PENDING_RECEIVED') {
      return (
        <View style={styles.actionButtons}>
          <View style={styles.pendingButton}>
            <Ionicons name="mail" size={20} color="#007AFF" />
            <Text style={styles.pendingButtonText}>Đã nhận lời mời</Text>
          </View>
        </View>
      );
    } else {
      return (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.addFriendButton}
            onPress={handleSendFriendRequest}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="person-add" size={20} color="#fff" />
                <Text style={styles.addFriendButtonText}>Kết bạn</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      );
    }
  };

  const renderHeader = () => (
    <>
      {/* Cover Image */}
      <View style={styles.coverContainer}>
        <Image
          source={user?.coverImageUrl ? { uri: buildMediaUrl(user.coverImageUrl) || undefined } : require('../assets/images/cover-default.jpg')}
          style={styles.coverImage}
          contentFit="cover"
        />
      </View>

      {/* Profile Info */}
      <View style={styles.profileInfo}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {user?.avatarUrl ? (
              <Image
                source={{ uri: buildMediaUrl(user.avatarUrl) || undefined }}
                style={styles.avatar}
                contentFit="cover"
              />
            ) : (
              <Image
                source={require('../assets/images/avatar-default.png')}
                style={styles.avatar}
              />
            )}
          </View>

          <View style={styles.nameContainer}>
            <Text style={styles.name}>{user?.name || 'Người dùng'}</Text>
          </View>
        </View>

        {user?.bio && <Text style={styles.bio}>{user.bio}</Text>}

        <View style={styles.infoRow}>
          {user?.gender && (
            <View style={styles.infoItem}>
              <Ionicons name="person-outline" size={20} color="#666" />
              <Text style={styles.infoText}>{GENDER_LABELS[user.gender]}</Text>
            </View>
          )}
          {user?.dateOfBirth && (
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={20} color="#666" />
              <Text style={styles.infoText}>{formatDate(user.dateOfBirth)}</Text>
            </View>
          )}
          {user?.phone && (
            <View style={styles.infoItem}>
              <Ionicons name="call-outline" size={20} color="#666" />
              <Text style={styles.infoText}>{user.phone}</Text>
            </View>
          )}
        </View>

        {renderActionButtons()}
      </View>

      {/* Moments Header */}
      <View style={styles.momentsHeader}>
        <Image
          source={require('../assets/images/moment.png')}
          style={styles.momentIcon}
        />
        <Text style={styles.momentsHeaderText}>Khoảnh khắc</Text>
      </View>
    </>
  );

  const renderEmptyComponent = () => {
    const isOwnProfile = currentUser?.id === userId;
    
    return (
      <View style={styles.emptyContainer}>
        <Image
          source={require('../assets/images/moment.png')}
          style={styles.emptyIcon}
        />
        <Text style={styles.emptyText}>
          {isOwnProfile || user?.friendshipStatus === 'FRIENDS'
            ? 'Chưa có khoảnh khắc nào'
            : 'Chỉ bạn bè mới có thể xem khoảnh khắc'}
        </Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 12, color: '#666' }}>Đang tải thông tin...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trang cá nhân</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={moments}
        renderItem={({ item }) => (
          <MomentCard
            moment={item}
            baseUrl={baseUrl}
            token={token || ''}
            onPressMap={() => {
              if (item.location && onOpenMap) {
                const provinceName = item.province?.name || item.district?.name || '';
                const firstImage = item.media && item.media.length > 0 ? item.media[0].mediaUrl : undefined;
                console.log('[UserProfileScreen] Opening map with media:', item.media?.length || 0);
                onOpenMap({
                  latitude: item.location.latitude,
                  longitude: item.location.longitude,
                  addressName: item.location.address || item.location.name,
                  provinceName,
                  imageUrl: firstImage,
                });
              }
            }}
            onPressLike={() => console.log('Like moment:', item.id)}
            onPressComment={() => handleOpenComment(item.id)}
            onPressShare={() => console.log('Share moment:', item.id)}
            onPressMenu={() => {
              const isOwnMoment = item.author.id === currentUser?.id;
              
              const menuOptions: any[] = [];
              
              if (isOwnMoment) {
                menuOptions.push(
                  { text: 'Chỉnh sửa caption', onPress: () => handleEditCaption(item) },
                  { text: 'Thêm vào album', onPress: () => handleAddToAlbum(item.id) },
                  { text: 'Xóa', onPress: () => handleDeleteMoment(item.id), style: 'destructive' }
                );
              } else {
                menuOptions.push(
                  { text: 'Thêm vào album', onPress: () => handleAddToAlbum(item.id) },
                  { text: 'Báo cáo', onPress: () => showReportDialog(item.id), style: 'destructive' }
                );
              }
              
              menuOptions.push({ text: 'Hủy', style: 'cancel' });
              
              showAlert('Tùy chọn', 'Chọn hành động', menuOptions);
            }}
          />
        )}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={loadingMoments ? null : renderEmptyComponent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={moments.length === 0 ? { flexGrow: 1 } : undefined}
      />
      
      <AlbumSelectModal
        visible={albumModalVisible}
        onClose={() => {
          setAlbumModalVisible(false);
          setSelectedMomentId(null);
        }}
        onSelectAlbum={handleSelectAlbum}
        token={token || ''}
      />

      {selectedMomentForComment && (
        <CommentModal
          visible={commentModalVisible}
          momentId={selectedMomentForComment}
          onClose={() => setCommentModalVisible(false)}
          onCommentAdded={() => {
            // Update the local list to reflect comment count increment
            setMoments(prev => prev.map(m => 
              m.id === selectedMomentForComment 
                ? { ...m, commentCount: (m.commentCount || 0) + 1 } 
                : m
            ));
          }}
        />
      )}

      {editingMoment && (
        <EditCaptionModal
          visible={editCaptionModalVisible}
          initialCaption={editingMoment.content}
          onClose={() => {
            setEditCaptionModalVisible(false);
            setEditingMoment(null);
          }}
          onSave={handleSaveCaption}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#007AFF',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  coverContainer: {
    height: 200,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    backgroundColor: '#e1e8ed',
  },
  profileInfo: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    marginTop: -60,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#fff',
  },
  nameContainer: {
    flex: 1,
    marginLeft: 12,
    marginTop: 20,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  bio: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  actionIcon: {
    width: 20,
    height: 20,
  },
  unfriendIcon: {
    width: 24,
    height: 24,
  },
  momentIcon: {
    width: 24,
    height: 24,
  },
  emptyIcon: {
    width: 80,
    height: 80,
  },
  addFriendButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  addFriendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  messageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  unfriendButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF3B30',
    borderRadius: 8,
  },
  pendingButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  pendingButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  momentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
    backgroundColor: '#f8f8f8',
  },
  momentsHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
    textAlign: 'center',
  },
});
