import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions,
  Image,
  ScrollView,
  Pressable,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { useAlert } from '../context/AlertContext';
import albumService, { Album } from '../api/albumService';
import MiniMomentCard from '../components/MiniMomentCard';
import MomentCard, { Moment } from '../components/MomentCard';
import CreateAlbumModal from '../components/CreateAlbumModal';
import ShareTargetModal from '../components/ShareTargetModal';
import CommentModal from '../components/CommentModal';
import { getBaseUrl, getApiUrl } from '../config/api';
import { SPACING, COLORS, LIGHT_COLORS, DARK_COLORS, FONT_SIZE, FONT_WEIGHT, RADIUS, SHADOWS, DIMENSIONS } from '../constants/design';
import { useThemeStore } from '../store/useThemeStore';
import SafeContainer from '../components/ui/SafeContainer';
import Spacer from '../components/ui/Spacer';

const { width } = Dimensions.get('window');

interface AlbumsScreenProps {
  onBack: () => void;
  onOpenAlbum?: (albumId: number) => void;
  onOpenMap?: (params: {
    latitude: number;
    longitude: number;
    addressName: string;
    provinceName?: string;
    imageUrl?: string;
  }) => void;
  onOpenProfile?: (userId: number) => void;
}

export default function AlbumsScreen({ onBack, onOpenAlbum, onOpenMap, onOpenProfile }: AlbumsScreenProps) {
  const token = useAuthStore((state) => state.token);
  const { showAlert } = useAlert();
  const { mode } = useThemeStore();
  const isDark = mode === 'dark';
  const C = isDark ? DARK_COLORS : LIGHT_COLORS;

  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<Album | undefined>(undefined);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareTargetId, setShareTargetId] = useState<number | null>(null);
  const [selectedMoment, setSelectedMoment] = useState<Moment | null>(null);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [commentMomentId, setCommentMomentId] = useState<number | null>(null);

  const baseUrl = getBaseUrl();

  useEffect(() => {
    loadAlbums();
  }, []);

  const loadAlbums = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const albumsData = await albumService.getUserAlbums(token);

      // Load first 5 moments for each album as preview
      const albumsWithMoments = await Promise.all(
        albumsData.map(async (album) => {
          if (album.itemCount > 0) {
            try {
              const details = await albumService.getAlbumDetails(album.id, token);
              return {
                ...album,
                moments: details.moments?.slice(0, 5) || [],
              };
            } catch (error) {
              console.error(`Error loading moments for album ${album.id}:`, error);
              return {
                ...album,
                moments: [],
              };
            }
          }
          return {
            ...album,
            moments: [],
          };
        })
      );

      setAlbums(albumsWithMoments);
    } catch (error) {
      console.error('Error loading albums:', error);
      showAlert('Lỗi', 'Không thể tải danh sách album');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlbum = () => {
    setEditingAlbum(undefined);
    setModalVisible(true);
  };

  const handleSuccess = async (resultAlbum: Album) => {
    setModalVisible(false);
    await loadAlbums();
    showAlert('Thành công', editingAlbum ? 'Đã cập nhật album!' : 'Đã tạo album mới!');
    setEditingAlbum(undefined);
  };

  const handleDeleteAlbum = (albumId: number, albumTitle: string) => {
    showAlert('Xác nhận', `Bạn có chắc muốn xóa album "${albumTitle}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          if (!token) return;
          try {
            await albumService.deleteAlbum(albumId, token);
            await loadAlbums();
            showAlert('Thành công', 'Đã xóa album');
          } catch (error) {
            showAlert('Lỗi', 'Không thể xóa album');
          }
        },
      },
    ]);
  };

  const handleRemoveFromAlbum = async (albumId: number, momentId: number) => {
    showAlert('Xác nhận', 'Bạn có chắc muốn loại bỏ moment này khỏi album?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          if (!token) return;
          try {
            await albumService.removeMomentFromAlbum(albumId, momentId, token);
            await loadAlbums();
            showAlert('Thành công', 'Đã xóa moment khỏi album');
          } catch (error: any) {
            showAlert('Lỗi', 'Không thể xóa moment khỏi album');
          }
        },
      },
    ]);
  };

  const handleMoveMoment = async (albumId: number, momentId: number, direction: 'left' | 'right') => {
    if (!token) return;

    // Optimistic update: swap positions in UI instantly
    setAlbums(prevAlbums =>
      prevAlbums.map(album => {
        if (album.id === albumId && album.moments) {
          const newMoments = [...album.moments];
          const currentIndex = newMoments.findIndex(m => m.id === momentId);
          if (currentIndex === -1) return album;
          const targetIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
          if (targetIndex >= 0 && targetIndex < newMoments.length) {
            [newMoments[currentIndex], newMoments[targetIndex]] = [newMoments[targetIndex], newMoments[currentIndex]];
          }
          return { ...album, moments: newMoments };
        }
        return album;
      })
    );

    // Persist to backend
    try {
      await albumService.reorderMomentInAlbum(albumId, momentId, direction, token);
    } catch (error: any) {
      // On error, reload to get correct order from server
      showAlert('Lỗi', 'Không thể cập nhật thứ tự');
      await loadAlbums();
    }
  };

  const handleNavigateWithAlbum = (album: Album) => {
    if (!album.moments || album.moments.length === 0) {
      showAlert('Thông báo', 'Album cần có ít nhất 1 moment để điều hướng');
      return;
    }

    const momentsWithLocation = album.moments.filter(
      m => m.location?.latitude && m.location?.longitude
    );

    if (momentsWithLocation.length === 0) {
      showAlert('Thông báo', 'Các moment trong album chưa có dữ liệu vị trí');
      return;
    }

    // Build Google Maps URL:
    // Origin: current location (empty = uses device GPS)
    // Waypoints: moment 0..n-2
    // Destination: last moment
    const destination = momentsWithLocation[momentsWithLocation.length - 1];
    const destCoord = `${destination.location!.latitude},${destination.location!.longitude}`;

    if (momentsWithLocation.length === 1) {
      // Single stop - just navigate to it
      const url = `https://www.google.com/maps/dir/?api=1&destination=${destCoord}&travelmode=driving`;
      Linking.openURL(url).catch(() =>
        showAlert('Lỗi', 'Không thể mở Google Maps')
      );
      return;
    }

    // Multiple stops: origin = current location (blank), waypoints = moment 1..n-2, destination = last moment
    const waypoints = momentsWithLocation
      .slice(0, -1)
      .map(m => `${m.location!.latitude},${m.location!.longitude}`)
      .join('|');

    const url = `https://www.google.com/maps/dir/?api=1&destination=${destCoord}&waypoints=${encodeURIComponent(waypoints)}&travelmode=driving`;
    Linking.openURL(url).catch(() =>
      showAlert('Lỗi', 'Không thể mở Google Maps')
    );
  };

  const renderAlbumCard = ({ item }: { item: Album }) => {
    return (
      <View style={[styles.albumCard, { backgroundColor: C.surface }]}>
        {/* Album Header */}
        <View style={styles.albumHeader}>
          <View style={styles.albumHeaderInfo}>
            <View style={styles.albumTitleRow}>
              <Image source={require('../assets/images/album.png')} style={styles.albumHeaderIcon} />
              <View style={styles.albumHeaderText}>
                <Text style={[styles.albumTitle, { color: C.textPrimary }]}>{item.title}</Text>
                {item.description && (
                  <Text style={[styles.albumDescription, { color: C.textSecondary }]} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}
              </View>
            </View>
            <Text style={[styles.albumCount, { color: C.textTertiary }]}>
              {item.itemCount} moment{item.itemCount !== 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => {
              const hasMoments = item.moments && item.moments.length > 0;
              const menuOptions: any[] = [
                {
                  text: 'Chỉnh sửa',
                  onPress: () => {
                    setEditingAlbum(item);
                    setModalVisible(true);
                  },
                },
                {
                  text: 'Chia sẻ qua tin nhắn',
                  onPress: () => {
                    setShareTargetId(item.id);
                    setShareModalVisible(true);
                  },
                },
              ];

              if (hasMoments) {
                menuOptions.push({
                  text: 'Google Maps',
                  onPress: () => handleNavigateWithAlbum(item),
                });
              }

              menuOptions.push({
                text: 'Xóa album',
                style: 'destructive',
                onPress: () => handleDeleteAlbum(item.id, item.title),
              });
              menuOptions.push({ text: 'Đóng', style: 'cancel' });

              showAlert('Tùy chọn', `Chọn hành động với album "${item.title}"`, menuOptions);
            }}
          >
            <Ionicons name="ellipsis-horizontal" size={DIMENSIONS.iconLG} color={COLORS.gray600} />
          </TouchableOpacity>
        </View>

        {/* Album Content - Moments Scroll */}
        <View style={styles.albumContent}>
          {item.moments && item.moments.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
              style={styles.momentsScroll}
              contentContainerStyle={styles.momentsContainer}
              snapToInterval={width * 0.45}
              snapToAlignment="start"
              decelerationRate="fast"
            >
              {item.moments.map((moment) => (
                <View key={moment.id} style={styles.momentCardContainer}>
                  <MiniMomentCard
                    moment={moment}
                    token={token || ''}
                    onPress={() => setSelectedMoment(moment)}
                    onPressLike={undefined} // Để MiniMomentCard tự xử lý
                  />
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyAlbum}>
              <Ionicons name="add-circle-outline" size={DIMENSIONS.avatarXL - SPACING.lg} color={COLORS.gray300} />
              <Spacer size="md" />
              <Text style={styles.emptyText}>Album chưa có moment nào</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeContainer style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={DIMENSIONS.iconLG} color={C.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Albums</Text>
        <TouchableOpacity onPress={handleCreateAlbum} style={styles.createButton}>
          <Ionicons name="add" size={DIMENSIONS.iconXL - SPACING.xs} color={C.primary} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Spacer size="md" />
          <Text style={styles.loadingText}>Đang tải albums...</Text>
        </View>
      ) : (
        <FlatList
          data={albums}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderAlbumCard}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Image
                source={require('../assets/images/album.png')}
                style={styles.emptyIcon}
              />
              <Spacer size="lg" />
              <Text style={styles.emptyStateText}>Chưa có album nào</Text>
              <Spacer size="sm" />
              <Text style={styles.emptyStateSubtext}>
                Tạo album đầu tiên để tổ chức moments của bạn
              </Text>
              <Spacer size="xl" />
              <TouchableOpacity
                style={styles.createFirstButton}
                onPress={handleCreateAlbum}
              >
                <Ionicons name="add" size={DIMENSIONS.iconMD} color={COLORS.white} />
                <Text style={styles.createFirstButtonText}>Tạo Album</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Create Album Modal */}
      <CreateAlbumModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setEditingAlbum(undefined);
        }}
        onSuccess={handleSuccess}
        initialAlbum={editingAlbum}
      />

      {/* Share Target Modal */}
      {shareTargetId && (
        <ShareTargetModal
          visible={shareModalVisible}
          onClose={() => {
            setShareModalVisible(false);
            setShareTargetId(null);
          }}
          shareType="ALBUM"
          referenceId={shareTargetId}
        />
      )}

      <Modal
        animationType="fade"
        transparent={true}
        visible={!!selectedMoment}
        onRequestClose={() => setSelectedMoment(null)}
      >
        <View style={styles.momentModalOverlay}>
          {/* Close button */}
          <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedMoment(null)} activeOpacity={0.8}>
            <Ionicons name="close" size={22} color="#FFF" />
          </TouchableOpacity>

          <View style={{ width: '100%' }}>
              {selectedMoment && (
                <MomentCard
                  moment={selectedMoment}
                  baseUrl={baseUrl}
                  token={token || ''}
                  onPressMap={() => {
                    if (selectedMoment.location && onOpenMap) {
                      const provinceName = selectedMoment.province?.name || selectedMoment.district?.name || '';
                      const firstImage = selectedMoment.media && selectedMoment.media.length > 0 ? selectedMoment.media[0].mediaUrl : undefined;
                      onOpenMap({
                        latitude: selectedMoment.location.latitude,
                        longitude: selectedMoment.location.longitude,
                        addressName: selectedMoment.location.address || selectedMoment.location.name,
                        provinceName,
                        imageUrl: firstImage,
                      });
                    }
                    setSelectedMoment(null);
                  }}
                  onPressComment={() => {
                    if (selectedMoment) {
                      setCommentMomentId(selectedMoment.id);
                      setCommentModalVisible(true);
                    }
                  }}
                  onPressShare={() => {
                    // TODO: Implement share functionality
                    showAlert('Thông báo', 'Chức năng chia sẻ đang được phát triển');
                  }}
                  onPressMenu={() => {
                    const parentAlbum = albums.find(a => a.moments?.some(m => m.id === selectedMoment.id));
                    const options: any[] = [];
                    if (parentAlbum && parentAlbum.moments) {
                      const currentIndex = parentAlbum.moments.findIndex(m => m.id === selectedMoment.id);
                      if (currentIndex > 0) {
                        options.push({
                          text: 'Chuyển sang trái',
                          onPress: () => handleMoveMoment(parentAlbum.id, selectedMoment.id, 'left'),
                        });
                      }
                      if (currentIndex < parentAlbum.moments.length - 1) {
                        options.push({
                          text: 'Chuyển sang phải',
                          onPress: () => handleMoveMoment(parentAlbum.id, selectedMoment.id, 'right'),
                        });
                      }
                      options.push({
                        text: 'Xóa khỏi album',
                        style: 'destructive',
                        onPress: () => {
                          handleRemoveFromAlbum(parentAlbum.id, selectedMoment.id);
                          setSelectedMoment(null);
                        },
                      });
                    }
                    options.push({ text: 'Đóng', style: 'cancel' });
                    showAlert('Tùy chọn', 'Chọn hành động', options);
                  }}
                />
              )}
          </View>
        </View>
      </Modal>
      {/* Comment Modal */}
      {commentMomentId && (
        <CommentModal
          visible={commentModalVisible}
          momentId={commentMomentId}
          onClose={() => {
            setCommentModalVisible(false);
            setCommentMomentId(null);
          }}
          onCommentAdded={() => {
            // Update both selectedMoment and albums state
            setSelectedMoment(prev => prev ? {
              ...prev,
              commentCount: (prev.commentCount || 0) + 1,
            } : null);
            
            // Update albums state so mini cards reflect the change
            setAlbums(prevAlbums =>
              prevAlbums.map(album => ({
                ...album,
                moments: album.moments?.map(m =>
                  m.id === commentMomentId
                    ? { ...m, commentCount: (m.commentCount || 0) + 1 }
                    : m
                ),
              }))
            );
          }}
        />
      )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
    ...SHADOWS.sm,
  },
  backButton: {
    padding: SPACING.sm,
  },
  headerTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray900,
  },
  createButton: {
    padding: SPACING.sm,
  },
  content: {
    flexGrow: 1,
    paddingBottom: SPACING.lg,
  },
  albumCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  albumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  albumHeaderInfo: {
    flex: 1,
  },
  albumTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  albumHeaderIcon: {
    width: DIMENSIONS.iconXL,
    height: DIMENSIONS.iconXL,
    marginRight: SPACING.md,
  },
  albumHeaderText: {
    flex: 1,
  },
  albumTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray900,
    marginBottom: SPACING.xs,
  },
  albumDescription: {
    fontSize: FONT_SIZE.md,
    color: COLORS.gray600,
  },
  albumCount: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray500,
    fontWeight: FONT_WEIGHT.medium,
  },
  menuButton: {
    padding: SPACING.sm,
  },
  albumContent: {
    height: width * 0.45 + SPACING.lg, // Height to fit square card + padding
  },
  momentsScroll: {
    flex: 1,
  },
  momentsContainer: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  momentCardContainer: {
    width: width * 0.45,
    height: width * 0.45,
    paddingHorizontal: SPACING.xs,
  },
  emptyAlbum: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
  },
  emptyText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.gray500,
    fontWeight: FONT_WEIGHT.medium,
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.huge + SPACING.xl,
    paddingHorizontal: SPACING.xxxl,
  },
  emptyIcon: {
    width: DIMENSIONS.avatarXL,
    height: DIMENSIONS.avatarXL,
  },
  emptyStateText: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray900,
  },
  emptyStateSubtext: {
    fontSize: FONT_SIZE.md,
    color: COLORS.gray600,
    textAlign: 'center',
  },
  createFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.xl,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  createFirstButtonText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.white,
  },
  momentModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 52,
    right: 16,
    zIndex: 100,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  submitButtonText: {
    color: COLORS.white,
    fontWeight: FONT_WEIGHT.semibold,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
