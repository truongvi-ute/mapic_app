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
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useAlert } from '../context/AlertContext';
import reportService from '../api/reportService';
import momentService from '../api/momentService';
import MomentCard, { Moment } from '../components/MomentCard';
import { getApiUrl, getBaseUrl } from '../config/api';
import AlbumSelectModal from '../components/AlbumSelectModal';
import CommentModal from '../components/CommentModal';
import EditCaptionModal from '../components/EditCaptionModal';
import albumService from '../api/albumService';

interface PageInfo {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
}

interface HomeScreenProps {
  refreshTrigger?: boolean;
  onOpenMap?: (params: {
    latitude: number;
    longitude: number;
    addressName: string;
    provinceName?: string;
    imageUrl?: string;
    caption?: string;
  }) => void;
  onPressProfile?: (userId: number) => void;
}

export default function HomeScreen({ refreshTrigger, onOpenMap, onPressProfile }: HomeScreenProps) {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const { showAlert } = useAlert();
  
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [albumModalVisible, setAlbumModalVisible] = useState(false);
  const [selectedMomentId, setSelectedMomentId] = useState<number | null>(null);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedMomentForComment, setSelectedMomentForComment] = useState<number | null>(null);
  const [editCaptionModalVisible, setEditCaptionModalVisible] = useState(false);
  const [editingMoment, setEditingMoment] = useState<Moment | null>(null);

  const API_URL = getApiUrl();
  const baseUrl = getBaseUrl();

  useEffect(() => {
    loadFeed(0, false);
  }, [refreshTrigger]); // Reload when refreshTrigger changes

  const loadFeed = async (page: number, append: boolean = false) => {
    if (append && loadingMore) return;
    if (!append && loading) return;

    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      console.log(`[HomeScreen] Loading feed page ${page}`);

      const response = await fetch(`${API_URL}/moments/feed?page=${page}&size=10`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        const data = result.data;
        
        console.log(`[HomeScreen] Loaded ${data.content.length} moments (page ${page})`);
        
        setPageInfo({
          pageNumber: data.pageNumber,
          pageSize: data.pageSize,
          totalElements: data.totalElements,
          totalPages: data.totalPages,
          first: data.first,
          last: data.last,
          hasNext: data.hasNext,
          hasPrevious: data.hasPrevious,
        });

        if (append) {
          setMoments(prev => [...prev, ...data.content]);
        } else {
          setMoments(data.content);
        }
        
        setCurrentPage(page);
      } else {
        console.error('[HomeScreen] Failed to load feed:', response.status);
        showAlert('Lỗi', 'Không thể tải dữ liệu');
      }
    } catch (error) {
      console.error('[HomeScreen] Error loading feed:', error);
      showAlert('Lỗi', 'Không thể kết nối đến server');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFeed(0, false);
  }, []);

  const onEndReached = useCallback(() => {
    if (pageInfo && pageInfo.hasNext && !loadingMore) {
      console.log('[HomeScreen] Loading next page:', currentPage + 1);
      loadFeed(currentPage + 1, true);
    }
  }, [pageInfo, loadingMore, currentPage]);

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

    console.log('[HomeScreen] Delete moment:', momentId);

    showAlert('Xác nhận', 'Bạn có chắc muốn xóa moment này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            console.log('[HomeScreen] Calling deleteMoment API for moment:', momentId);
            await momentService.deleteMoment(momentId, token);
            console.log('[HomeScreen] Delete successful, removing from local state');
            // Remove from local state
            setMoments(prev => prev.filter(m => m.id !== momentId));
            showAlert('Thành công', 'Đã xóa moment');
          } catch (error: any) {
            console.error('[HomeScreen] Delete failed:', error);
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

  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.footerText}>Đang tải thêm...</Text>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📷</Text>
        <Text style={styles.emptyTitle}>Chưa có khoảnh khắc nào</Text>
        <Text style={styles.emptyText}>
          Hãy bắt đầu chia sẻ những khoảnh khắc đẹp của bạn!
        </Text>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>MAPIC</Text>
      <Text style={styles.subtitle}>Khám phá khoảnh khắc</Text>
    </View>
  );

  if (loading && moments.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <FlatList
        data={moments}
        renderItem={({ item }) => (
          <MomentCard
            moment={item}
            baseUrl={baseUrl}
            token={token || ''}
            onPressProfile={() => onPressProfile?.(item.author.id)}
            onPressMap={() => {
              if (item.location && onOpenMap) {
                const provinceName = item.province?.name || item.district?.name || '';
                const firstImage = item.media && item.media.length > 0 ? item.media[0].mediaUrl : undefined;
                console.log('[HomeScreen] Opening map with:', {
                  location: item.location,
                  provinceName,
                  firstImage,
                  mediaCount: item.media?.length || 0,
                });
                onOpenMap({
                  latitude: item.location.latitude,
                  longitude: item.location.longitude,
                  addressName: item.location.address || item.location.name,
                  provinceName: provinceName || undefined,
                  imageUrl: firstImage,
                });
              }
            }}
            onPressLike={() => console.log('Like moment:', item.id)}
            onPressComment={() => handleOpenComment(item.id)}
            onPressShare={() => console.log('Share moment:', item.id)}
            onPressMenu={() => {
              const isOwnMoment = item.author.id === user?.id;
              
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
        keyExtractor={(item, index) => `${item.id}-${index}`}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        contentContainerStyle={moments.length === 0 ? styles.emptyList : undefined}
      />
      
      <AlbumSelectModal
        visible={albumModalVisible}
        onClose={() => {
          setAlbumModalVisible(false);
          setSelectedMomentId(null);
        }}
        onSelectAlbum={handleSelectAlbum}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
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
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
});
