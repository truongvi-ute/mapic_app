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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { useAlert } from '../context/AlertContext';
import albumService, { Album } from '../api/albumService';
import MomentCard from '../components/MomentCard';
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
}

export default function AlbumsScreen({ onBack, onOpenAlbum, onOpenMap }: AlbumsScreenProps) {
  const token = useAuthStore((state) => state.token);
  const { showAlert } = useAlert();

  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [albumTitle, setAlbumTitle] = useState('');
  const [albumDescription, setAlbumDescription] = useState('');
  const [creating, setCreating] = useState(false);

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
    setAlbumTitle('');
    setAlbumDescription('');
    setModalVisible(true);
  };

  const createAlbum = async () => {
    if (!albumTitle.trim()) {
      showAlert('Lỗi', 'Vui lòng nhập tên album');
      return;
    }

    if (!token) return;

    try {
      setCreating(true);
      await albumService.createAlbum({
        title: albumTitle.trim(),
        description: albumDescription.trim() || undefined,
      }, token);
      setModalVisible(false);
      await loadAlbums();
      showAlert('Thành công', 'Đã tạo album mới!');
    } catch (error: any) {
      showAlert('Lỗi', error.message || 'Không thể tạo album');
    } finally {
      setCreating(false);
    }
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
              showAlert('Tùy chọn', `Chọn hành động với album "${item.title}"`, [
                {
                  text: 'Xem chi tiết',
                  onPress: () => onOpenAlbum?.(item.id),
                },
                {
                  text: 'Xóa album',
                  style: 'destructive',
                  onPress: () => handleDeleteAlbum(item.id, item.title),
                },
                { text: 'Đóng', style: 'cancel' },
              ]);
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
              style={styles.momentsScroll}
              contentContainerStyle={styles.momentsContainer}
              snapToInterval={width * 0.65}
              snapToAlignment="start"
              decelerationRate="fast"
            >
              {item.moments.map((moment) => (
                <View key={moment.id} style={styles.momentCardContainer}>
                  <MomentCard
                    moment={moment}
                    baseUrl={baseUrl}
                    token={token || ''}
                    onPressMap={() => {
                      if (moment.location && onOpenMap) {
                        const provinceName = moment.province?.name || moment.district?.name || '';
                        const firstImage = moment.media && moment.media.length > 0 ? moment.media[0].mediaUrl : undefined;
                        onOpenMap({
                          latitude: moment.location.latitude,
                          longitude: moment.location.longitude,
                          addressName: moment.location.address || moment.location.name,
                          provinceName,
                          imageUrl: firstImage,
                        });
                      }
                    }}
                    onPressLike={() => console.log('Like moment:', moment.id)}
                    onPressComment={() => console.log('Comment on moment:', moment.id)}
                    onPressShare={() => console.log('Share moment:', moment.id)}
                    onPressMenu={() => {
                      showAlert('Tùy chọn', 'Chọn hành động', [
                        {
                          text: 'Xóa khỏi album',
                          style: 'destructive',
                          onPress: () => handleRemoveFromAlbum(item.id, moment.id),
                        },
                        { text: 'Đóng', style: 'cancel' },
                      ]);
                    }}
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
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalContainer}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Tạo Album mới</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#000" />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Tên Album *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Nhập tên album..."
                    value={albumTitle}
                    onChangeText={setAlbumTitle}
                    autoFocus={true}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Mô tả (tùy chọn)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Nhập mô tả..."
                    value={albumDescription}
                    onChangeText={setAlbumDescription}
                    multiline={true}
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      styles.submitButton,
                      (!albumTitle.trim() || creating) && styles.disabledButton,
                    ]}
                    onPress={createAlbum}
                    disabled={creating || !albumTitle.trim()}
                  >
                    {creating ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.submitButtonText}>Tạo</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
    height: 310,
  },
  momentsScroll: {
    flex: 1,
  },
  momentsContainer: {
    paddingHorizontal: 8,
  },
  momentCardContainer: {
    width: width * 0.67,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
  },
  textArea: {
    height: 100,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E5E5EA',
  },
  cancelButtonText: {
    color: '#000',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
});
