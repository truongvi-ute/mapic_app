import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Platform,
  Linking,
  FlatList,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuthStore } from '../store/useAuthStore';
import { useAlert } from '../context/AlertContext';
import authService from '../api/authService';
import userService from '../api/userService';
import { useMediaUpload } from '../hooks/useMediaUpload';
import MomentCard, { Moment } from '../components/MomentCard';
import { getApiUrl, getBaseUrl, buildMediaUrl } from '../config/api';

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

interface ProfileScreenProps {
  onNavigateToSettings?: () => void;
  refreshTrigger?: boolean;
  onOpenMap?: (params: {
    latitude: number;
    longitude: number;
    addressName: string;
    provinceName?: string;
    imageUrl?: string;
  }) => void;
}

export default function ProfileScreen({ onNavigateToSettings, onOpenMap }: ProfileScreenProps) {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const setUser = useAuthStore((state) => state.setUser);
  const logoutStore = useAuthStore((state) => state.logout);
  const { showAlert } = useAlert();
  const [activeTab, setActiveTab] = useState<'my-moments' | 'albums'>('my-moments');
  const [avatarVersion, setAvatarVersion] = useState(Date.now());
  const [coverVersion, setCoverVersion] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(false);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loadingMoments, setLoadingMoments] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const { uploading, progress, uploadSingle } = useMediaUpload();

  // Load profile khi vào trang
  useEffect(() => {
    loadProfile();
    loadMoments();
  }, []);

  // Load moments khi đổi tab
  useEffect(() => {
    if (activeTab === 'my-moments') {
      loadMoments();
    }
  }, [activeTab]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const profile = await userService.getProfile();
      setUser(profile);
    } catch (error) {
      console.error('[ProfileScreen] Failed to load profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoments = async () => {
    try {
      setLoadingMoments(true);
      const API_URL = getApiUrl();
      
      const response = await fetch(`${API_URL}/moments/my-moments`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[ProfileScreen] Loaded moments:', data.data?.length || 0);
        setMoments(data.data || []);
      } else {
        console.error('[ProfileScreen] Failed to load moments:', response.status);
      }
    } catch (error) {
      console.error('[ProfileScreen] Error loading moments:', error);
    } finally {
      setLoadingMoments(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProfile();
    loadMoments();
  };

  const handleLogout = async () => {
    await authService.logout();
    logoutStore();
  };

  const buildImageUrl = (path?: string) => {
    return buildMediaUrl(path);
  };

  const handleAvatarPress = () => {
    console.log('[ProfileScreen] handleAvatarPress called');
    showAlert(
      'Chọn ảnh đại diện',
      'Bạn muốn chọn từ đâu?',
      [
        {
          text: 'Thư viện',
          onPress: async () => {
            try {
              console.log('[ProfileScreen] Opening native image picker...');
              
              const ImagePickerModule = require('../modules/ImagePickerModule').default;
              const result = await ImagePickerModule.pickImage();

              console.log('[ProfileScreen] Native picker result:', result);

              if (result && result.uri) {
                await uploadImageFromUri(result.uri, 'avatar');
              }
            } catch (error: any) {
              console.error('[ProfileScreen] Native picker error:', error);
              
              if (error.code !== 'E_PICKER_CANCELLED') {
                showAlert('Lỗi', 'Không thể chọn ảnh: ' + error.message);
              }
            }
          },
        },
        {
          text: 'Chụp ảnh',
          onPress: async () => {
            try {
              console.log('[ProfileScreen] Opening camera...');
              
              const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });

              console.log('[ProfileScreen] Camera result:', result);

              if (!result.canceled && result.assets && result.assets[0]) {
                await uploadImageFromUri(result.assets[0].uri, 'avatar');
              }
            } catch (error: any) {
              console.error('[ProfileScreen] Camera error:', error);
              showAlert('Lỗi', 'Không thể chụp ảnh: ' + error.message);
            }
          },
        },
        { text: 'Hủy', style: 'cancel' },
      ]
    );
  };

  const handleCoverPress = () => {
    console.log('[ProfileScreen] handleCoverPress called');
    showAlert(
      'Chọn ảnh bìa',
      'Bạn muốn chọn từ đâu?',
      [
        {
          text: 'Thư viện',
          onPress: async () => {
            try {
              console.log('[ProfileScreen] Opening native image picker...');
              
              const ImagePickerModule = require('../modules/ImagePickerModule').default;
              const result = await ImagePickerModule.pickImage();

              console.log('[ProfileScreen] Native picker result:', result);

              if (result && result.uri) {
                await uploadImageFromUri(result.uri, 'cover');
              }
            } catch (error: any) {
              console.error('[ProfileScreen] Native picker error:', error);
              
              if (error.code !== 'E_PICKER_CANCELLED') {
                showAlert('Lỗi', 'Không thể chọn ảnh: ' + error.message);
              }
            }
          },
        },
        {
          text: 'Chụp ảnh',
          onPress: async () => {
            try {
              console.log('[ProfileScreen] Opening camera...');
              
              const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [16, 9],
                quality: 0.8,
              });

              console.log('[ProfileScreen] Camera result:', result);

              if (!result.canceled && result.assets && result.assets[0]) {
                await uploadImageFromUri(result.assets[0].uri, 'cover');
              }
            } catch (error: any) {
              console.error('[ProfileScreen] Camera error:', error);
              showAlert('Lỗi', 'Không thể chụp ảnh: ' + error.message);
            }
          },
        },
        { text: 'Hủy', style: 'cancel' },
      ]
    );
  };

  const uploadImageFromUri = async (uri: string, type: 'avatar' | 'cover') => {
    try {
      console.log('[ProfileScreen] Uploading', type, 'from URI:', uri);
      
      let fileUri = uri;
      let fileName = `${type}_${Date.now()}.jpg`;
      
      // On Android, if URI is content://, copy to cache first
      if (Platform.OS === 'android' && uri.startsWith('content://')) {
        console.log('[ProfileScreen] Converting content:// URI to file URI');
        const destPath = `${FileSystem.cacheDirectory}${fileName}`;
        
        try {
          await FileSystem.copyAsync({
            from: uri,
            to: destPath,
          });
          fileUri = destPath;
          console.log('[ProfileScreen] File copied to:', fileUri);
        } catch (copyError) {
          console.error('[ProfileScreen] File copy error:', copyError);
          throw new Error('Không thể xử lý file ảnh');
        }
      }
      
      // Get file extension from URI
      const uriParts = fileUri.split('.');
      const fileExtension = uriParts.length > 1 ? uriParts[uriParts.length - 1].toLowerCase() : 'jpg';
      
      // Update filename with correct extension
      if (fileExtension !== 'jpg') {
        fileName = `${type}_${Date.now()}.${fileExtension}`;
      }
      
      // Create FormData
      const formData = new FormData();
      const fileObj: any = {
        uri: Platform.OS === 'android' ? fileUri : fileUri.replace('file://', ''),
        type: `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`,
        name: fileName,
      };
      
      console.log('[ProfileScreen] File object:', fileObj);
      formData.append('file', fileObj);
      
      const API_URL = getApiUrl();
      const token = useAuthStore.getState().token;
      const endpoint = type === 'avatar' ? '/user/upload-avatar' : '/user/upload-cover';
      
      console.log('[ProfileScreen] Uploading to:', `${API_URL}${endpoint}`);
      
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });
      
      console.log('[ProfileScreen] Response status:', response.status);
      
      if (response.ok) {
        console.log('[ProfileScreen] Upload successful');
        
        // Parse response to get the new URL
        const responseData = await response.json();
        console.log('[ProfileScreen] Upload response data:', responseData);
        
        // Clean up cached file on Android
        if (Platform.OS === 'android' && fileUri.startsWith(FileSystem.cacheDirectory || '')) {
          try {
            await FileSystem.deleteAsync(fileUri, { idempotent: true });
            console.log('[ProfileScreen] Cached file cleaned up');
          } catch (cleanupError) {
            console.warn('[ProfileScreen] Failed to cleanup cached file:', cleanupError);
          }
        }
        
        // Get updated profile to ensure we have the latest data
        const profile = await userService.getProfile();
        console.log('[ProfileScreen] Updated profile:', profile);
        console.log('[ProfileScreen] Avatar URL from profile:', profile?.avatarUrl);
        console.log('[ProfileScreen] Cover URL from profile:', profile?.coverImageUrl);
        
        setUser(profile);
        
        if (type === 'avatar') {
          setAvatarVersion(Date.now());
        } else {
          setCoverVersion(Date.now());
        }
        
        showAlert('Thành công', `Cập nhật ảnh ${type === 'avatar' ? 'đại diện' : 'bìa'} thành công`);
      } else {
        const error = await response.text();
        console.error('[ProfileScreen] Upload failed:', error);
        showAlert('Lỗi', `Upload thất bại: ${error}`);
      }
    } catch (error: any) {
      console.error('[ProfileScreen] Upload error:', error);
      showAlert('Lỗi', error.message || 'Không thể upload ảnh');
    }
  };

  const avatarUrl = buildImageUrl(user?.avatarUrl);
  const coverUrl = buildImageUrl(user?.coverImageUrl);

  console.log('[ProfileScreen] Avatar URL:', avatarUrl, 'Version:', avatarVersion);
  console.log('[ProfileScreen] Cover URL:', coverUrl, 'Version:', coverVersion);

  const renderHeader = () => (
    <>
      {/* Cover Image */}
      <View style={styles.coverContainer}>
        <Image
          source={coverUrl ? { uri: `${coverUrl}?v=${coverVersion}` } : require('../assets/images/cover-default.jpg')}
          style={styles.coverImage}
          contentFit="cover"
          cachePolicy={coverUrl ? "none" : "memory-disk"}
        />
      </View>

      {/* Profile Info */}
      <View style={styles.profileInfo}>
        <View style={styles.profileHeader}>
          {/* Avatar - left aligned, half screen width */}
          <View style={styles.avatarContainer}>
            {avatarUrl ? (
              <Image
                source={{ uri: `${avatarUrl}?v=${avatarVersion}` }}
                style={styles.avatar}
                contentFit="cover"
                cachePolicy="none"
              />
            ) : (
              <Image 
                source={require('../assets/images/avatar-default.png')} 
                style={styles.avatar}
              />
            )}
          </View>

          {/* Settings Button - below cover, right aligned */}
          <TouchableOpacity style={styles.settingsButton} onPress={onNavigateToSettings}>
            <Image
              source={require('../assets/images/setting.png')}
              style={styles.settingIcon}
            />
          </TouchableOpacity>
        </View>

        {/* Name - centered below avatar and settings */}
        <Text style={styles.name}>{user?.name || 'Người dùng'}</Text>

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
      </View>

      {/* Upload Progress */}
      {uploading && (
        <View style={styles.uploadProgress}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.uploadText}>Đang tải lên... {progress}%</Text>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my-moments' && styles.activeTab]}
          onPress={() => setActiveTab('my-moments')}
        >
          <Image
            source={require('../assets/images/moment.png')}
            style={styles.tabIcon}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'albums' && styles.activeTab]}
          onPress={() => setActiveTab('albums')}
        >
          <Image
            source={require('../assets/images/album.png')}
            style={styles.tabIcon}
          />
        </TouchableOpacity>
      </View>
    </>
  );

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Image
        source={require('../assets/images/album.png')}
        style={styles.emptyIcon}
      />
      <Text style={styles.emptyText}>
        {activeTab === 'my-moments' && 'Chưa có khoảnh khắc nào'}
        {activeTab === 'albums' && 'Chưa có album nào'}
      </Text>
    </View>
  );

  const baseUrl = getBaseUrl();

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 12, color: '#666' }}>Đang tải thông tin...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {activeTab === 'my-moments' ? (
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
              onPressComment={() => console.log('Comment on moment:', item.id)}
              onPressShare={() => console.log('Share moment:', item.id)}
              onPressMenu={() => {
                showAlert(
                  'Tùy chọn',
                  'Chọn hành động',
                  [
                    { text: 'Chỉnh sửa', onPress: () => console.log('Edit moment:', item.id) },
                    { text: 'Xóa', onPress: () => console.log('Delete moment:', item.id), style: 'destructive' },
                    { text: 'Hủy', style: 'cancel' },
                  ]
                );
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
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {renderHeader()}
          {renderEmptyComponent()}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  coverContainer: {
    height: 200,
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  avatarContainer: {
    marginTop: -60,
  },
  avatar: {
    width: SCREEN_WIDTH * 0.5,
    height: SCREEN_WIDTH * 0.5,
    borderRadius: (SCREEN_WIDTH * 0.5) / 2,
    borderWidth: 4,
    borderColor: '#fff',
  },
  settingsButton: {
    marginTop: 8,
    width: 44,
    height: 44,
    backgroundColor: '#f0f0f0',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingIcon: {
    width: 28,
    height: 28,
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
    textAlign: 'center',
    marginTop: 8,
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
  uploadProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  uploadText: {
    fontSize: 14,
    color: '#666',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabIcon: {
    width: 28,
    height: 28,
  },
  emptyIcon: {
    width: 80,
    height: 80,
  },
  content: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
    textAlign: 'center',
  },
});
