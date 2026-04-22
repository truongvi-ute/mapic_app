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
import { SPACING, COLORS, LIGHT_COLORS, DARK_COLORS, FONT_SIZE, FONT_WEIGHT, RADIUS, SHADOWS, DIMENSIONS } from '../constants/design';
import { useThemeStore } from '../store/useThemeStore';
import SafeContainer from '../components/ui/SafeContainer';
import Spacer from '../components/ui/Spacer';
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
  const { mode } = useThemeStore();
  const isDark = mode === 'dark';
  const C = isDark ? DARK_COLORS : LIGHT_COLORS;

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
    <SafeContainer style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Tạo khoảnh khắc</Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'quick' && styles.activeTab]}
          onPress={() => setActiveTab('quick')}
        >
          <Image source={require('../assets/images/camera.png')} style={styles.tabIcon} />
          <Text style={[styles.tabText, { color: C.textTertiary }, activeTab === 'quick' && { color: C.primary, fontWeight: FONT_WEIGHT.semibold }]}>
            Chụp nhanh
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'library' && styles.activeTab]}
          onPress={() => setActiveTab('library')}
        >
          <Image source={require('../assets/images/folder-management.png')} style={styles.tabIcon} />
          <Text style={[styles.tabText, { color: C.textTertiary }, activeTab === 'library' && { color: C.primary, fontWeight: FONT_WEIGHT.semibold }]}>
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
              {loading && <ActivityIndicator size="small" color={COLORS.primary} />}
              {!loading && (
                <TouchableOpacity onPress={getCurrentLocation}>
                  <Ionicons name="refresh" size={DIMENSIONS.iconSM} color={COLORS.primary} />
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
                  <Ionicons name="chevron-forward" size={DIMENSIONS.iconSM} color={COLORS.gray500} />
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
                  <Ionicons name="close-circle" size={DIMENSIONS.iconLG} color={COLORS.error} />
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
                    size={DIMENSIONS.iconSM}
                    color={COLORS.primary}
                  />
                  <Text style={styles.categorySelectorText}>
                    {categories.find(c => c.id === category)?.label}
                  </Text>
                </>
              ) : (
                <Text style={styles.categorySelectorPlaceholder}>Chọn danh mục</Text>
              )}
            </View>
            <Ionicons name="chevron-down" size={DIMENSIONS.iconSM} color={COLORS.gray500} />
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
                size={DIMENSIONS.iconSM}
                color={isPublic ? COLORS.white : COLORS.primary}
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
                size={DIMENSIONS.iconSM}
                color={!isPublic ? COLORS.white : COLORS.primary}
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
            <ActivityIndicator size="small" color={COLORS.white} />
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

        <Spacer size="xxxl" />
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
                <Ionicons name="close" size={DIMENSIONS.iconLG} color={COLORS.gray500} />
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
                    size={DIMENSIONS.iconLG}
                    color={category === cat.id ? COLORS.primary : COLORS.gray500}
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
                    <Ionicons name="checkmark" size={DIMENSIONS.iconLG} color={COLORS.primary} />
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
    </SafeContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.surface,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  headerTitle: {
    fontSize: FONT_SIZE.xxxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray900,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabIcon: {
    width: DIMENSIONS.iconSM,
    height: DIMENSIONS.iconSM,
  },
  tabText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.gray500,
    fontWeight: FONT_WEIGHT.medium,
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.semibold,
  },
  content: {
    flex: 1,
  },
  locationCard: {
    backgroundColor: COLORS.surface,
    margin: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    ...SHADOWS.sm,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  locationIcon: {
    width: DIMENSIONS.iconSM,
    height: DIMENSIONS.iconSM,
  },
  locationTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray900,
    flex: 1,
  },
  locationText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.gray600,
    lineHeight: FONT_SIZE.md * 1.4,
  },
  locationPlaceholder: {
    fontSize: FONT_SIZE.md,
    color: COLORS.gray400,
    fontStyle: 'italic',
  },
  locationSelector: {
    paddingVertical: SPACING.sm,
  },
  locationPlaceholderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mediaSection: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray900,
    marginBottom: SPACING.md,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  mediaItem: {
    width: 100,
    height: 100,
    borderRadius: RADIUS.sm,
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
    top: SPACING.xs,
    right: SPACING.xs,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
  },
  addMediaButton: {
    width: 100,
    height: 100,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  addMediaIcon: {
    width: DIMENSIONS.iconXL,
    height: DIMENSIONS.iconXL,
  },
  addMediaText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.medium,
  },
  section: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
  },
  captionInput: {
    backgroundColor: COLORS.gray50,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.gray900,
    minHeight: 100,
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.gray50,
    borderRadius: RADIUS.sm,
    padding: SPACING.lg,
  },
  categorySelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  categorySelectorText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.gray900,
    fontWeight: FONT_WEIGHT.medium,
  },
  categorySelectorPlaceholder: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.gray400,
  },
  privacyOptions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  privacyOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
  },
  privacyOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  privacyText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.medium,
  },
  privacyTextActive: {
    color: COLORS.white,
  },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.md,
  },
  postButtonDisabled: {
    opacity: 0.6,
  },
  postIcon: {
    width: 35,
    height: 35,
  },
  postButtonText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.white,
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
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  modalTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray900,
  },
  modalList: {
    padding: SPACING.sm,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADIUS.sm,
  },
  modalItemActive: {
    backgroundColor: COLORS.gray50,
  },
  modalItemText: {
    flex: 1,
    fontSize: FONT_SIZE.lg,
    color: COLORS.gray900,
  },
  modalItemTextActive: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.semibold,
  },
});
