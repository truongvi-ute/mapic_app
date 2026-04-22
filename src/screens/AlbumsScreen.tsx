import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
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
import { getBaseUrl } from '../config/api';

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
      <View style={styles.albumCard}>
        {/* Album Header */}
        <View style={styles.albumHeader}>
          <View style={styles.albumHeaderInfo}>
            <View style={styles.albumTitleRow}>
              <Image
                source={require('../assets/images/album.png')}
                style={styles.albumHeaderIcon}
              />
              <View style={styles.albumHeaderText}>
                <Text style={styles.albumTitle}>{item.title}</Text>
                {item.description && (
                  <Text style={styles.albumDescription} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}
              </View>
            </View>
            <Text style={styles.albumCount}>
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
            <Ionicons name="ellipsis-horizontal" size={24} color="#666" />
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
                    onPressLike={() => console.log('Like moment:', moment.id)}
                  />
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyAlbum}>
              <Ionicons name="add-circle-outline" size={64} color="#C7C7CC" />
              <Text style={styles.emptyText}>Album chưa có moment nào</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Albums</Text>
        <TouchableOpacity onPress={handleCreateAlbum} style={styles.createButton}>
          <Ionicons name="add" size={28} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
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
              <Text style={styles.emptyStateText}>Chưa có album nào</Text>
              <Text style={styles.emptyStateSubtext}>
                Tạo album đầu tiên để tổ chức moments của bạn
              </Text>
              <TouchableOpacity
                style={styles.createFirstButton}
                onPress={handleCreateAlbum}
              >
                <Ionicons name="add" size={20} color="#fff" />
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

      {/* Full Moment Card Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={!!selectedMoment}
        onRequestClose={() => setSelectedMoment(null)}
      >
        <Pressable 
          style={styles.momentModalOverlay} 
          onPress={() => setSelectedMoment(null)}
        >
          <Pressable style={{ width: '100%' }}>
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
                  onPressLike={() => {
                    // MomentCard handles API internally, update both selectedMoment and albums state
                    if (selectedMoment) {
                      const newUserReacted = !selectedMoment.userReacted;
                      const newReactionCount = selectedMoment.userReacted 
                        ? (selectedMoment.reactionCount || 1) - 1 
                        : (selectedMoment.reactionCount || 0) + 1;
                      
                      // Update selectedMoment for modal display
                      setSelectedMoment(prev => prev ? {
                        ...prev,
                        userReacted: newUserReacted,
                        reactionCount: newReactionCount,
                      } : null);
                      
                      // Update albums state so mini cards reflect the change
                      setAlbums(prevAlbums =>
                        prevAlbums.map(album => ({
                          ...album,
                          moments: album.moments?.map(m =>
                            m.id === selectedMoment.id
                              ? { ...m, userReacted: newUserReacted, reactionCount: newReactionCount }
                              : m
                          ),
                        }))
                      );
                    }
                  }}
                  onPressComment={() => {
                    if (selectedMoment) {
                      setCommentMomentId(selectedMoment.id);
                      setCommentModalVisible(true);
                    }
                  }}
                  onPressShare={() => console.log('Share full moment:', selectedMoment.id)}
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
          </Pressable>
        </Pressable>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  createButton: {
    padding: 8,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  albumCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  albumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 12,
  },
  albumHeaderInfo: {
    flex: 1,
  },
  albumTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  albumHeaderIcon: {
    width: 32,
    height: 32,
    marginRight: 12,
  },
  albumHeaderText: {
    flex: 1,
  },
  albumTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  albumDescription: {
    fontSize: 14,
    color: '#666',
  },
  albumCount: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  menuButton: {
    padding: 8,
  },
  albumContent: {
    height: width * 0.45 + 16, // Height to fit square card + padding
  },
  momentsScroll: {
    flex: 1,
  },
  momentsContainer: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  momentCardContainer: {
    width: width * 0.45,
    height: width * 0.45,
    paddingHorizontal: 4,
  },
  emptyAlbum: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  createFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  createFirstButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  momentModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
});
