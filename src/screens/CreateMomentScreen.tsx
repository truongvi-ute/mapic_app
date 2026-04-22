import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuthStore } from '../store/useAuthStore';
import { useAlert } from '../context/AlertContext';
import LocationPicker from '../components/LocationPicker';
import { getApiUrl } from '../config/api';

interface MediaItem {
  uri: string;
  type: 'image' | 'video';
}

export default function CreateMomentScreen() {
  const [activeTab, setActiveTab] = useState<'quick' | 'library'>('quick');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationIds, setLocationIds] = useState<{ provinceId: string; districtId: string; wardId: string } | null>(null);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const { showAlert } = useAlert();

  const categories = [
    { id: 'LANDSCAPE', label: 'Phong cảnh', icon: 'image-outline' },
    { id: 'PEOPLE', label: 'Con người', icon: 'people-outline' },
    { id: 'FOOD', label: 'Món ăn', icon: 'restaurant-outline' },
    { id: 'ARCHITECTURE', label: 'Kiến trúc', icon: 'business-outline' },
    { id: 'OTHER', label: 'Khác', icon: 'ellipsis-horizontal-outline' },
  ];

  useEffect(() => {
    if (activeTab === 'quick') {
      requestLocationPermission();
    }
  }, [activeTab]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        getCurrentLocation();
      } else {
        showAlert('Thông báo', 'Cần cấp quyền truy cập vị trí để sử dụng chế độ chụp nhanh');
      }
    } catch (error) {
      console.error('Location permission error:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      
      // Check if location services are enabled
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        showAlert('Thông báo', 'Vui lòng bật dịch vụ định vị trên thiết bị');
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 0,
      });
      
      setLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      // Reverse geocode to get address
      const addresses = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (addresses.length > 0) {
        const addr = addresses[0];
        const addressStr = [addr.street, addr.district, addr.city, addr.region]
          .filter(Boolean)
          .join(', ');
        setAddress(addressStr);
      }
    } catch (error) {
      console.error('Get location error:', error);
      showAlert('Lỗi', 'Không thể lấy vị trí hiện tại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Thông báo', 'Cần cấp quyền truy cập camera');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setMediaItems([...mediaItems, {
          uri: asset.uri,
          type: asset.type === 'video' ? 'video' : 'image',
        }]);
      }
    } catch (error) {
      console.error('Camera error:', error);
      showAlert('Lỗi', 'Không thể mở camera');
    }
  };

  const handlePickFromLibrary = async () => {
    try {
      console.log('[CreateMoment] Opening native image picker...');
      
      const ImagePickerModule = require('../modules/ImagePickerModule').default;
      const result = await ImagePickerModule.pickImage();

      console.log('[CreateMoment] Native picker result:', result);

      if (result && result.uri) {
        setMediaItems([...mediaItems, {
          uri: result.uri,
          type: 'image',
        }]);
      }
    } catch (error: any) {
      console.error('[CreateMoment] Native picker error:', error);
      
      if (error.code !== 'E_PICKER_CANCELLED') {
        showAlert('Lỗi', 'Không thể chọn ảnh: ' + error.message);
      }
    }
  };

  const handleRemoveMedia = (index: number) => {
    setMediaItems(mediaItems.filter((_, i) => i !== index));
  };

  const handlePost = async () => {
    if (mediaItems.length === 0) {
      showAlert('Thông báo', 'Vui lòng chọn ít nhất một ảnh hoặc video');
      return;
    }

    if (!category) {
      showAlert('Thông báo', 'Vui lòng chọn danh mục');
      return;
    }

    // Kiểm tra địa điểm cho tab thư viện
    if (activeTab === 'library' && !location) {
      showAlert('Thông báo', 'Vui lòng chọn địa điểm');
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();

      console.log('[CreateMoment] Starting upload process...');
      console.log('[CreateMoment] Media items count:', mediaItems.length);
      console.log('[CreateMoment] Active tab:', activeTab);
      console.log('[CreateMoment] Location:', location);
      console.log('[CreateMoment] Address:', address);

      // Process and add files
      for (let index = 0; index < mediaItems.length; index++) {
        const item = mediaItems[index];
        let fileUri = item.uri;

        console.log(`[CreateMoment] Processing file ${index + 1}/${mediaItems.length}`);
        console.log(`[CreateMoment] Original URI: ${fileUri}`);

        // On Android, if URI is content://, copy to cache first
        if (Platform.OS === 'android' && item.uri.startsWith('content://')) {
          console.log('[CreateMoment] Converting content:// URI to file URI');
          const fileName = `moment_${Date.now()}_${index}.jpg`;
          const destPath = `${FileSystem.cacheDirectory}${fileName}`;

          try {
            await FileSystem.copyAsync({
              from: item.uri,
              to: destPath,
            });
            fileUri = destPath;
            console.log('[CreateMoment] File copied to:', fileUri);
          } catch (copyError) {
            console.error('[CreateMoment] File copy error:', copyError);
            throw new Error('Không thể xử lý file ảnh');
          }
        }

        const uriParts = fileUri.split('.');
        const fileExtension = uriParts[uriParts.length - 1].toLowerCase();
        const fileName = `moment_${Date.now()}_${index}.${fileExtension}`;

        const file: any = {
          uri: Platform.OS === 'android' ? fileUri : fileUri.replace('file://', ''),
          type: item.type === 'video' ? `video/${fileExtension}` : `image/${fileExtension}`,
          name: fileName,
        };

        console.log(`[CreateMoment] File object:`, file);
        formData.append('files', file);
      }

      // Add metadata
      const metadata = {
        caption: caption || '',
        category,
        isPublic,
        latitude: location?.latitude,
        longitude: location?.longitude,
        addressName: address || '',
        provinceId: locationIds?.provinceId ? parseInt(locationIds.provinceId) : null,
        districtId: locationIds?.districtId ? parseInt(locationIds.districtId) : null,
        communeId: locationIds?.wardId ? parseInt(locationIds.wardId) : null,
      };

      // Gửi metadata dưới dạng string JSON
      formData.append('metadata', JSON.stringify(metadata));

      const API_URL = getApiUrl();

      console.log('[CreateMoment] Uploading to:', `${API_URL}/moments`);
      console.log('[CreateMoment] Metadata:', metadata);
      console.log('[CreateMoment] Files count:', mediaItems.length);
      console.log('[CreateMoment] Token:', token ? 'Present' : 'Missing');

      const response = await fetch(`${API_URL}/moments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // KHÔNG set Content-Type - để fetch tự động set với boundary
        },
        body: formData,
      });

      console.log('[CreateMoment] Response status:', response.status);
      console.log('[CreateMoment] Response headers:', response.headers);

      if (response.ok) {
        // Clean up cached files on Android
        if (Platform.OS === 'android') {
          for (const item of mediaItems) {
            if (item.uri.startsWith(FileSystem.cacheDirectory || '')) {
              try {
                await FileSystem.deleteAsync(item.uri, { idempotent: true });
              } catch (cleanupError) {
                console.warn('[CreateMoment] Failed to cleanup cached file:', cleanupError);
              }
            }
          }
        }

        showAlert('Thành công', 'Đã đăng khoảnh khắc thành công', [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setMediaItems([]);
              setCaption('');
              setCategory('');
            },
          },
        ]);
      } else {
        const error = await response.text();
        console.error('[CreateMoment] Upload failed:', error);
        showAlert('Lỗi', 'Không thể đăng khoảnh khắc');
      }
    } catch (error: any) {
      console.error('[CreateMoment] Post moment error:', error);
      showAlert('Lỗi', error.message || 'Không thể đăng khoảnh khắc');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tạo khoảnh khắc</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'quick' && styles.activeTab]}
          onPress={() => setActiveTab('quick')}
        >
          <Image
            source={require('../assets/images/camera.png')}
            style={styles.tabIcon}
          />
          <Text style={[styles.tabText, activeTab === 'quick' && styles.activeTabText]}>
            Chụp nhanh
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'library' && styles.activeTab]}
          onPress={() => setActiveTab('library')}
        >
          <Image
            source={require('../assets/images/folder-management.png')}
            style={styles.tabIcon}
          />
          <Text style={[styles.tabText, activeTab === 'library' && styles.activeTabText]}>
            Thư viện
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Location Info - Quick Mode */}
        {activeTab === 'quick' && (
          <View style={styles.locationCard}>
            <View style={styles.locationHeader}>
              <Image
                source={require('../assets/images/location.png')}
                style={styles.locationIcon}
              />
              <Text style={styles.locationTitle}>Vị trí hiện tại</Text>
              {loading && <ActivityIndicator size="small" color="#007AFF" />}
              {!loading && (
                <TouchableOpacity onPress={getCurrentLocation}>
                  <Ionicons name="refresh" size={20} color="#007AFF" />
                </TouchableOpacity>
              )}
            </View>
            {address ? (
              <Text style={styles.locationText}>{address}</Text>
            ) : (
              <Text style={styles.locationPlaceholder}>
                {loading ? 'Đang lấy vị trí...' : 'Nhấn biểu tượng làm mới để lấy vị trí'}
              </Text>
            )}
          </View>
        )}

        {/* Location Picker - Library Mode */}
        {activeTab === 'library' && (
          <View style={styles.locationCard}>
            <View style={styles.locationHeader}>
              <Image
                source={require('../assets/images/location.png')}
                style={styles.locationIcon}
              />
              <Text style={styles.locationTitle}>Địa điểm</Text>
            </View>
            <TouchableOpacity
              style={styles.locationSelector}
              onPress={() => setShowLocationPicker(true)}
            >
              {address ? (
                <Text style={styles.locationText}>{address}</Text>
              ) : (
                <View style={styles.locationPlaceholderContainer}>
                  <Text style={styles.locationPlaceholder}>Chọn địa điểm</Text>
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Media Grid */}
        <View style={styles.mediaSection}>
          <Text style={styles.sectionTitle}>Ảnh/Video ({mediaItems.length})</Text>
          <View style={styles.mediaGrid}>
            {mediaItems.map((item, index) => (
              <View key={index} style={styles.mediaItem}>
                <Image source={{ uri: item.uri }} style={styles.mediaImage} />
                {item.type === 'video' && (
                  <View style={styles.videoOverlay}>
                    <Ionicons name="play-circle" size={32} color="#fff" />
                  </View>
                )}
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveMedia(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#f44336" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={styles.addMediaButton}
              onPress={activeTab === 'quick' ? handleTakePhoto : handlePickFromLibrary}
            >
              <Image
                source={
                  activeTab === 'quick'
                    ? require('../assets/images/camera.png')
                    : require('../assets/images/folder-management.png')
                }
                style={styles.addMediaIcon}
              />
              <Text style={styles.addMediaText}>
                {activeTab === 'quick' ? 'Chụp ảnh' : 'Chọn ảnh'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Caption */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nội dung</Text>
          <TextInput
            style={styles.captionInput}
            placeholder="Chia sẻ cảm nghĩ của bạn..."
            value={caption}
            onChangeText={setCaption}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danh mục</Text>
          <TouchableOpacity
            style={styles.categorySelector}
            onPress={() => setShowCategoryModal(true)}
          >
            <View style={styles.categorySelectorContent}>
              {category ? (
                <>
                  <Ionicons
                    name={categories.find(c => c.id === category)?.icon as any}
                    size={20}
                    color="#007AFF"
                  />
                  <Text style={styles.categorySelectorText}>
                    {categories.find(c => c.id === category)?.label}
                  </Text>
                </>
              ) : (
                <Text style={styles.categorySelectorPlaceholder}>Chọn danh mục</Text>
              )}
            </View>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quyền riêng tư</Text>
          <View style={styles.privacyOptions}>
            <TouchableOpacity
              style={[styles.privacyOption, isPublic && styles.privacyOptionActive]}
              onPress={() => setIsPublic(true)}
            >
              <Ionicons
                name="globe-outline"
                size={20}
                color={isPublic ? '#fff' : '#007AFF'}
              />
              <Text style={[styles.privacyText, isPublic && styles.privacyTextActive]}>
                Công khai
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.privacyOption, !isPublic && styles.privacyOptionActive]}
              onPress={() => setIsPublic(false)}
            >
              <Ionicons
                name="people-outline"
                size={20}
                color={!isPublic ? '#fff' : '#007AFF'}
              />
              <Text style={[styles.privacyText, !isPublic && styles.privacyTextActive]}>
                Bạn bè
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Post Button */}
        <TouchableOpacity
          style={[styles.postButton, uploading && styles.postButtonDisabled]}
          onPress={handlePost}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Image
                source={require('../assets/images/share.png')}
                style={styles.postIcon}
              />
              <Text style={styles.postButtonText}>Đăng</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.spacer} />
      </ScrollView>

      {/* Category Modal */}
      <Modal
        visible={showCategoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn danh mục</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.modalItem,
                    category === cat.id && styles.modalItemActive,
                  ]}
                  onPress={() => {
                    setCategory(cat.id);
                    setShowCategoryModal(false);
                  }}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={24}
                    color={category === cat.id ? '#007AFF' : '#666'}
                  />
                  <Text
                    style={[
                      styles.modalItemText,
                      category === cat.id && styles.modalItemTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                  {category === cat.id && (
                    <Ionicons name="checkmark" size={24} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Location Picker Modal */}
      <LocationPicker
        visible={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onSelect={(selectedLocation) => {
          setLocation({
            latitude: selectedLocation.latitude,
            longitude: selectedLocation.longitude,
          });
          setLocationIds({
            provinceId: selectedLocation.provinceId,
            districtId: selectedLocation.districtId,
            wardId: selectedLocation.wardId,
          });
          setAddress(selectedLocation.fullAddress);
          setShowLocationPicker(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabIcon: {
    width: 20,
    height: 20,
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  locationCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  locationIcon: {
    width: 20,
    height: 20,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  locationPlaceholder: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  locationSelector: {
    paddingVertical: 8,
  },
  locationPlaceholderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mediaSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mediaItem: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  addMediaButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  addMediaIcon: {
    width: 32,
    height: 32,
  },
  addMediaText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  captionInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#000',
    minHeight: 100,
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
  },
  categorySelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categorySelectorText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  categorySelectorPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  privacyOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  privacyOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: '#fff',
  },
  privacyOptionActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  privacyText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  privacyTextActive: {
    color: '#fff',
  },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  postButtonDisabled: {
    opacity: 0.6,
  },
  postIcon: {
    width: 35,
    height: 35,
  },
  postButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  spacer: {
    height: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  modalList: {
    padding: 8,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 8,
  },
  modalItemActive: {
    backgroundColor: '#f0f8ff',
  },
  modalItemText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  modalItemTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
});
