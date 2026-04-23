import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/useAuthStore';
import { useAlert } from '../context/AlertContext';
import reportService from '../api/reportService';
import momentService from '../api/momentService';
import MomentCard, { Moment } from '../components/MomentCard';
import { vietnamLocations } from '../data/vietnamLocations';
import { getApiUrl, getBaseUrl } from '../config/api';
import AlbumSelectModal from '../components/AlbumSelectModal';
import CommentModal from '../components/CommentModal';
import EditCaptionModal from '../components/EditCaptionModal';
import ReportInputModal from '../components/ReportInputModal';
import albumService from '../api/albumService';
import { SPACING, COLORS, LIGHT_COLORS, DARK_COLORS, FONT_SIZE, FONT_WEIGHT, RADIUS, SHADOWS } from '../constants/design';
import { useThemeStore } from '../store/useThemeStore';
import Spacer from '../components/ui/Spacer';

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
  const currentUser = useAuthStore((state) => state.user);
  const { showAlert } = useAlert();
  const { mode } = useThemeStore();
  const isDark = mode === 'dark';
  const C = isDark ? DARK_COLORS : LIGHT_COLORS;
  const insets = useSafeAreaInsets();

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
  const [editCaptionModalVisible, setEditCaptionModalVisible] = useState(false);
  const [editingMoment, setEditingMoment] = useState<Moment | null>(null);
  const [reportInputVisible, setReportInputVisible] = useState(false);
  const [reportingMomentId, setReportingMomentId] = useState<number | null>(null);
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
        { text: 'Nội dung sai lệch', onPress: () => submitReport(momentId, 'Bài viết có nội dung sai lệch hoặc không chính xác') },
        { text: 'Vi phạm tiêu chuẩn cộng đồng', onPress: () => submitReport(momentId, 'Bài viết vi phạm tiêu chuẩn cộng đồng') },
        { text: 'Ngôn từ thù ghét', onPress: () => submitReport(momentId, 'Bài viết chứa ngôn từ thù ghét hoặc phân biệt đối xử') },
        { text: 'Khác', onPress: () => {
          setReportingMomentId(momentId);
          setReportInputVisible(true);
        }},
        { text: 'Hủy', style: 'cancel' }
      ]
    );
  };

  const handleCustomReasonSubmit = (reason: string) => {
    if (reportingMomentId) {
      submitReport(reportingMomentId, reason);
      setReportingMomentId(null);
    }
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

    console.log('[ExploreScreen] Delete moment:', momentId);

    showAlert('Xác nhận', 'Bạn có chắc muốn xóa moment này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            console.log('[ExploreScreen] Calling deleteMoment API for moment:', momentId);
            await momentService.deleteMoment(momentId, token);
            console.log('[ExploreScreen] Delete successful, removing from local state');
            // Remove from local state
            setMoments(prev => prev.filter(m => m.id !== momentId));
            showAlert('Thành công', 'Đã xóa moment');
          } catch (error: any) {
            console.error('[ExploreScreen] Delete failed:', error);
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
            Hot Trend
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
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Spacer size="sm" />
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
    <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
      <View style={styles.headerTitleRow}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={C.textPrimary} />
          </TouchableOpacity>
        )}
        <Text style={[styles.title, { color: C.textPrimary }]}>Khám phá</Text>
      </View>
    </View>
  );

  if (loading && moments.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: C.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        {renderHeader()}
        {renderFilterBar()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
          <Spacer size="md" />
          <Text style={[styles.loadingText, { color: C.textSecondary }]}>Đang tải...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: C.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
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
            onPressLike={undefined} // Để MomentCard tự xử lý
            onPressComment={() => handleOpenComment(item.id)}
            onPressShare={() => {
              // TODO: Implement share functionality
              showAlert('Thông báo', 'Chức năng chia sẻ đang được phát triển');
            }}
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
        contentContainerStyle={[
          moments.length === 0 ? styles.emptyList : undefined,
          { paddingBottom: insets.bottom + SPACING.lg }
        ]}
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
      
      <ReportInputModal
        visible={reportInputVisible}
        onClose={() => {
          setReportInputVisible(false);
          setReportingMomentId(null);
        }}
        onSubmit={handleCustomReasonSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
    ...SHADOWS.sm,
  },
  backBtn: {
    marginBottom: SPACING.sm,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZE.xxxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray900,
  },
  filterBar: {
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
    ...SHADOWS.sm,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.gray100,
    marginRight: SPACING.sm,
    gap: SPACING.xs,
  },
  filterIcon: {
    width: 16,
    height: 16,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.medium,
  },
  filterButtonTextActive: {
    color: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.gray600,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.huge,
    minHeight: 400,
  },
  emptyIcon: {
    width: 64,
    height: 64,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray900,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.gray600,
    textAlign: 'center',
    lineHeight: FONT_SIZE.md * 1.5,
  },
  footerLoader: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  footerText: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZE.md,
    color: COLORS.gray600,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '80%',
    ...SHADOWS.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  modalTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray900,
  },
  modalList: {
    maxHeight: 500,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  modalItemActive: {
    backgroundColor: COLORS.primary + '10', // 10% opacity
  },
  modalItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  modalItemText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.gray900,
  },
  modalItemTextActive: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.medium,
  },
  highlightedMoment: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    marginHorizontal: SPACING.xs,
    overflow: 'hidden',
  },
});
