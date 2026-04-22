import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  Image,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAlert } from '../context/AlertContext';
import { useAuthStore } from '../store/useAuthStore';
import albumService, { Album } from '../api/albumService';
import CreateAlbumModal from './CreateAlbumModal';

interface AlbumSelectModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectAlbum: (albumId: number) => void;
  token?: string;
}

export default function AlbumSelectModal({
  visible,
  onClose,
  onSelectAlbum,
  token: propToken,
}: AlbumSelectModalProps) {
  const storeToken = useAuthStore((state) => state.token);
  const token = propToken || storeToken || '';
  
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { showAlert } = useAlert();

  useEffect(() => {
    if (visible) {
      loadAlbums();
    }
  }, [visible]);

  const loadAlbums = async () => {
    try {
      setLoading(true);
      const albumsData = await albumService.getUserAlbums(token);
      setAlbums(albumsData);
    } catch (error) {
      console.error('Error loading albums:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAlbum = (albumId: number) => {
    onSelectAlbum(albumId);
    onClose();
  };

  const handleCreateSuccess = (newAlbum: Album) => {
    setIsCreating(false);
    
    // Auto-select the newly created album
    handleSelectAlbum(newAlbum.id);
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Chọn Album</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Đang tải albums...</Text>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <View style={styles.createContainer}>
                <TouchableOpacity 
                  style={styles.createButton} 
                  onPress={() => setIsCreating(true)}
                >
                  <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
                  <Text style={styles.createButtonText}>Tạo album mới</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={albums}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.albumItem}
                    onPress={() => handleSelectAlbum(item.id)}
                  >
                    <Image
                      source={require('../assets/images/album.png')}
                      style={styles.albumIcon}
                    />
                    <View style={styles.albumInfo}>
                      <Text style={styles.albumTitle}>{item.title}</Text>
                      {item.description && (
                        <Text style={styles.albumDescription} numberOfLines={1}>
                          {item.description}
                        </Text>
                      )}
                      <Text style={styles.albumCount}>
                        {item.itemCount} moment{item.itemCount !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Image
                      source={require('../assets/images/album.png')}
                      style={styles.emptyIcon}
                    />
                    <Text style={styles.emptyText}>Chưa có album nào</Text>
                    <Text style={styles.emptySubtext}>
                      Hãy tạo album đầu tiên để lưu lại những khoảnh khắc của bạn
                    </Text>
                  </View>
                }
              />
            </View>
          )}
        </View>
      </View>

      <CreateAlbumModal
        visible={isCreating}
        onClose={() => setIsCreating(false)}
        onSuccess={handleCreateSuccess}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  albumItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  albumIcon: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  albumInfo: {
    flex: 1,
  },
  albumTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  albumDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  albumCount: {
    fontSize: 12,
    color: '#999',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 64,
    height: 64,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  createContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    backgroundColor: '#fff',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  createButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
});
