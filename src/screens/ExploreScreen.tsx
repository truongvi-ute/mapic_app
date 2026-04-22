import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { useAlert } from '../context/AlertContext';
import reportService from '../api/reportService';
import MomentCard, { Moment } from '../components/MomentCard';
import { vietnamLocations } from '../data/vietnamLocations';
import { getApiUrl, getBaseUrl } from '../config/api';
import AlbumSelectModal from '../components/AlbumSelectModal';
import CommentModal from '../components/CommentModal';
import albumService from '../api/albumService';

type SortOption = 'newest' | 'popular';
type CategoryOption = 'all' | 'LANDSCAPE' | 'PEOPLE' | 'FOOD' | 'ARCHITECTURE' | 'OTHER';

interface PageInfo {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

interface ExploreScreenProps {
  refreshTrigger?: boolean;
  highlightMomentId?: number;
  onBack?: () => void;
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

export default function ExploreScreen({ refreshTrigger, highlightMomentId, onBack, onOpenMap, onPressProfile }: ExploreScreenProps) {
  const token = useAuthStore((state) => state.token);
  const { showAlert } = useAlert();

  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // Filters
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryOption>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showProvinceModal, setShowProvinceModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [albumModalVisible, setAlbumModalVisible] = useState(false);
  const [selectedMomentId, setSelectedMomentId] = useState<number | null>(null);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedMomentForComment, setSelectedMomentForComment] = useState<number | null>(null);
  const flatListRef = useRef<FlatList>(null);
  // activeHighlight: chỉ hiển thị khung xanh cho đến khi user chọn filter
  const [activeHighlight, setActiveHighlight] = useState<number | undefined>(highlightMomentId);
  // ref để đọc giá trị mới nhất trong useEffect mà không trigger re-run
  const activeHighlightRef = useRef<number | undefined>(highlightMomentId);

  const API_URL = getApiUrl();
  const baseUrl = getBaseUrl();

  const categories = [
    { id: 'all', label: 'Tất cả', icon: 'apps' },
    { id: 'LANDSCAPE', label: 'Phong cảnh', icon: 'image' },
    { id: 'PEOPLE', label: 'Con người', icon: 'people' },
    { id: 'FOOD', label: 'Món ăn', icon: 'restaurant' },
    { id: 'ARCHITECTURE', label: 'Kiến trúc', icon: 'business' },
    { id: 'OTHER', label: 'Khác', icon: 'ellipsis-horizontal' },
  ];

  useEffect(() => {
    loadMoments(0, false, activeHighlightRef.current);
  }, [selectedProvince, selectedCategory, sortBy, refreshTrigger]);

  // Scroll lên đầu khi có highlighted moment (nó đã được đặt ở index 0)
  useEffect(() => {
    if (!highlightMomentId || moments.length === 0) return;
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 200);
  }, [highlightMomentId, moments.length > 0]);

  const loadMoments = async (page: number, append: boolean = false, pinnedMomentId?: number) => {
    if (append && loadingMore) return;
    if (!append && loading) return;

    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      // Build query params
      const params = new URLSearchParams({
        page: page.toString(),
        size: '10',
        sort: sortBy,
      });

      if (selectedProvince) {
        params.append('provinceId', selectedProvince);
      }

      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }

      const response = await fetch(`${API_URL}/moments/explore?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        const data = result.data;

        if (!data || !Array.isArray(data.content)) {
          setPageInfo({ pageNumber: 0, pageSize: 10, totalElements: 0, totalPages: 0, hasNext: false });
          setMoments([]);
          return;
        }

        setPageInfo({
          pageNumber: data.pageNumber,
          pageSize: data.pageSize,
          totalElements: data.totalElements,
          totalPages: data.totalPages,
          hasNext: data.hasNext,
        });

        let content: Moment[] = data.content;

        // Nếu có pinnedMomentId: fetch moment đó và đặt lên đầu, loại khỏi list thường
        if (pinnedMomentId && !append) {
          try {
            const pinRes = await fetch(`${API_URL}/moments/${pinnedMomentId}`, {
              headers: { 'Authorization': `Bearer ${token}` },
            });
            if (pinRes.ok) {
              const pinJson = await pinRes.json();
              const pinned: Moment = pinJson.data;
              // Loại moment đó khỏi list thường nếu có, rồi đặt lên đầu
              content = [pinned, ...content.filter((m) => m.id !== pinnedMomentId)];
            }
          } catch {
            // Nếu fetch fail thì vẫn hiển thị list bình thường
          }
        }

        if (append) {
          setMoments((prev) => [...prev, ...content]);
        } else {
          setMoments(content);
        }

        setCurrentPage(page);
      } else {
        showAlert('Lỗi', 'Không thể tải dữ liệu');
      }
    } catch (error) {
      showAlert('Lỗi', `Không thể kết nối đến server: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadMoments(0, false);
  }, [selectedProvince, selectedCategory, sortBy]);

  const onEndReached = useCallback(() => {
    if (pageInfo && pageInfo.hasNext && !loadingMore) {
      loadMoments(currentPage + 1, true);
    }
  }, [pageInfo, loadingMore, currentPage]);

  const handleProvinceSelect = (provinceId: string | null) => {
    setSelectedProvince(provinceId);
    setShowProvinceModal(false);
    setActiveHighlight(undefined);
    activeHighlightRef.current = undefined;
  };

  const handleCategorySelect = (category: CategoryOption) => {
    setSelectedCategory(category);
    setShowCategoryModal(false);
    setActiveHighlight(undefined);
    activeHighlightRef.current = undefined;
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

  const renderFilterBar = () => (
    <View style={styles.filterBar}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {/* Province Filter */}
        <TouchableOpacity
          style={[styles.filterButton, selectedProvince && styles.filterButtonActive]}
          onPress={() => setShowProvinceModal(true)}
        >
          <Image
            source={require('../assets/images/province.png')}
            style={styles.filterIcon}
          />
          <Text style={[styles.filterButtonText, selectedProvince && styles.filterButtonTextActive]}>
            {selectedProvince
              ? vietnamLocations.find((p) => p.code === selectedProvince)?.name || 'Tỉnh/TP'
              : 'Tỉnh/TP'}
          </Text>
          {selectedProvince && (
            <TouchableOpacity onPress={() => handleProvinceSelect(null)}>
              <Ionicons name="close-circle" size={16} color="#FFF" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Category Filter */}
        <TouchableOpacity
          style={[styles.filterButton, selectedCategory !== 'all' && styles.filterButtonActive]}
          onPress={() => setShowCategoryModal(true)}
        >
          <Image
            source={require('../assets/images/category.png')}
            style={styles.filterIcon}
          />
          <Text style={[styles.filterButtonText, selectedCategory !== 'all' && styles.filterButtonTextActive]}>
            {categories.find((c) => c.id === selectedCategory)?.label}
          </Text>
        </TouchableOpacity>

        {/* Sort Options */}
        <TouchableOpacity
          style={[styles.filterButton, sortBy === 'newest' && styles.filterButtonActive]}
          onPress={() => { setSortBy('newest'); setActiveHighlight(undefined); activeHighlightRef.current = undefined; }}
        >
          <Image
            source={require('../assets/images/recent.png')}
            style={styles.filterIcon}
          />
          <Text style={[styles.filterButtonText, sortBy === 'newest' && styles.filterButtonTextActive]}>
            Mới nhất
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, sortBy === 'popular' && styles.filterButtonActive]}
          onPress={() => { setSortBy('popular'); setActiveHighlight(undefined); activeHighlightRef.current = undefined; }}
        >
          <Image
            source={require('../assets/images/trending.png')}
            style={styles.filterIcon}
          />
          <Text style={[styles.filterButtonText, sortBy === 'popular' && styles.filterButtonTextActive]}>
            Phổ biến
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderProvinceModal = () => (
    <Modal
      visible={showProvinceModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowProvinceModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Chọn tỉnh/thành phố</Text>
            <TouchableOpacity onPress={() => setShowProvinceModal(false)}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalList}>
            <TouchableOpacity
              style={[styles.modalItem, !selectedProvince && styles.modalItemActive]}
              onPress={() => handleProvinceSelect(null)}
            >
              <Text style={[styles.modalItemText, !selectedProvince && styles.modalItemTextActive]}>
                Tất cả
              </Text>
              {!selectedProvince && <Ionicons name="checkmark" size={20} color="#007AFF" />}
            </TouchableOpacity>
            {vietnamLocations.map((province) => (
              <TouchableOpacity
                key={province.code}
                style={[styles.modalItem, selectedProvince === province.code && styles.modalItemActive]}
                onPress={() => handleProvinceSelect(province.code)}
              >
                <Text
                  style={[
                    styles.modalItemText,
                    selectedProvince === province.code && styles.modalItemTextActive,
                  ]}
                >
                  {province.name}
                </Text>
                {selectedProvince === province.code && (
                  <Ionicons name="checkmark" size={20} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderCategoryModal = () => (
    <Modal
      visible={showCategoryModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowCategoryModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Chọn danh mục</Text>
            <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalList}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[styles.modalItem, selectedCategory === category.id && styles.modalItemActive]}
                onPress={() => handleCategorySelect(category.id as CategoryOption)}
              >
                <View style={styles.modalItemLeft}>
                  <Ionicons
                    name={category.icon as any}
                    size={20}
                    color={selectedCategory === category.id ? '#007AFF' : '#666'}
                  />
                  <Text
                    style={[
                      styles.modalItemText,
                      selectedCategory === category.id && styles.modalItemTextActive,
                    ]}
                  >
                    {category.label}
                  </Text>
                </View>
                {selectedCategory === category.id && (
                  <Ionicons name="checkmark" size={20} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

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
        <Image
          source={require('../assets/images/search.png')}
          style={styles.emptyIcon}
        />
        <Text style={styles.emptyTitle}>Không tìm thấy khoảnh khắc</Text>
        <Text style={styles.emptyText}>
          Thử thay đổi bộ lọc để xem thêm kết quả
        </Text>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {onBack && (
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
      )}
      <Text style={styles.title}>Khám phá</Text>
      <Text style={styles.subtitle}>
        {pageInfo ? `${pageInfo.totalElements} khoảnh khắc` : 'Đang tải...'}
      </Text>
    </View>
  );

  if (loading && moments.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        {renderHeader()}
        {renderFilterBar()}
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
        ref={flatListRef}
        data={moments}
        renderItem={({ item }) => (
          <View style={activeHighlight === item.id ? styles.highlightedMoment : undefined}>
            <MomentCard
              moment={item}
              baseUrl={baseUrl}
              token={token}
              onPressProfile={() => onPressProfile?.(item.author.id)}
            onPressMap={() => {
              if (item.location && onOpenMap) {
                const provinceName = item.province?.name || item.district?.name || '';
                const firstImage = item.media && item.media.length > 0 ? item.media[0].mediaUrl : undefined;
                console.log('[ExploreScreen] Opening map with media:', item.media?.length || 0);
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
              showAlert(
                'Tùy chọn',
                'Chọn hành động',
                [
                  { text: 'Thêm vào album', onPress: () => handleAddToAlbum(item.id) },
                  { text: 'Báo cáo', onPress: () => showReportDialog(item.id), style: 'destructive' },
                  { text: 'Hủy', style: 'cancel' },
                ]
              );
            }}
          />
          </View>
        )}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        ListHeaderComponent={
          <>
            {renderHeader()}
            {renderFilterBar()}
          </>
        }
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        contentContainerStyle={moments.length === 0 ? styles.emptyList : undefined}
      />
      {renderProvinceModal()}
      {renderCategoryModal()}
      <AlbumSelectModal
        visible={albumModalVisible}
        onClose={() => setAlbumModalVisible(false)}
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
  backBtn: {
    marginBottom: 8,
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
  filterBar: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    marginRight: 8,
    gap: 6,
  },
  filterIcon: {
    width: 16,
    height: 16,
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#FFF',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  modalList: {
    maxHeight: 500,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalItemActive: {
    backgroundColor: '#F0F8FF',
  },
  modalItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalItemText: {
    fontSize: 16,
    color: '#000',
  },
  modalItemTextActive: {
    color: '#007AFF',
    fontWeight: '500',
  },
  highlightedMoment: {
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 12,
    marginHorizontal: 4,
    overflow: 'hidden',
  },
});
