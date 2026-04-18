import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';
import { useAuthStore } from '../store/useAuthStore';
import authService from '../api/authService';
import userService from '../api/userService';
import { useMediaUpload } from '../hooks/useMediaUpload';

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
}

export default function ProfileScreen({ onNavigateToSettings }: ProfileScreenProps) {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const logoutStore = useAuthStore((state) => state.logout);
  const [activeTab, setActiveTab] = useState<'my-moments' | 'saved' | 'albums'>('my-moments');
  const [avatarVersion, setAvatarVersion] = useState(Date.now());
  const [coverVersion, setCoverVersion] = useState(Date.now());
  
  const { uploading, progress, uploadSingle } = useMediaUpload();

  const handleLogout = async () => {
    await authService.logout();
    logoutStore();
  };

  const getInitials = () => {
    if (user?.name) {
      const parts = user.name.split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return user.name.substring(0, 2).toUpperCase();
    }
    return user?.email?.[0].toUpperCase() || 'U';
  };

  const buildImageUrl = (path?: string) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    
    const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://192.168.1.26:8080/api';
    const baseUrl = API_URL.replace('/api', '');
    return `${baseUrl}${path}`;
  };

  const handleAvatarPress = () => {
    console.log('[ProfileScreen] handleAvatarPress called');
    Alert.alert(
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
                Alert.alert('Lỗi', 'Không thể chọn ảnh: ' + error.message);
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
              Alert.alert('Lỗi', 'Không thể chụp ảnh: ' + error.message);
            }
          },
        },
        { text: 'Hủy', style: 'cancel' },
      ]
    );
  };

  const handleCoverPress = () => {
    console.log('[ProfileScreen] handleCoverPress called');
    Alert.alert(
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
                Alert.alert('Lỗi', 'Không thể chọn ảnh: ' + error.message);
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
              Alert.alert('Lỗi', 'Không thể chụp ảnh: ' + error.message);
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
      
      const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://192.168.1.26:8080/api';
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
        
        Alert.alert('Thành công', `Cập nhật ảnh ${type === 'avatar' ? 'đại diện' : 'bìa'} thành công`);
      } else {
        const error = await response.text();
        console.error('[ProfileScreen] Upload failed:', error);
        Alert.alert('Lỗi', `Upload thất bại: ${error}`);
      }
    } catch (error: any) {
      console.error('[ProfileScreen] Upload error:', error);
      Alert.alert('Lỗi', error.message || 'Không thể upload ảnh');
    }
  };

  const avatarUrl = buildImageUrl(user?.avatarUrl);
  const coverUrl = buildImageUrl(user?.coverImageUrl);

  console.log('[ProfileScreen] Avatar URL:', avatarUrl, 'Version:', avatarVersion);
  console.log('[ProfileScreen] Cover URL:', coverUrl, 'Version:', coverVersion);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView>
        {/* Cover Image */}
        <View style={styles.coverContainer}>
          {coverUrl ? (
            <Image
              source={{ uri: `${coverUrl}?v=${coverVersion}` }}
              style={styles.coverImage}
              contentFit="cover"
              cachePolicy="none"
            />
          ) : (
            <View style={[styles.coverImage, styles.coverPlaceholder]} />
          )}
        </View>

        {/* Profile Info */}
        <View style={styles.profileInfo}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              {avatarUrl ? (
                <Image
                  source={{ uri: `${avatarUrl}?v=${avatarVersion}` }}
                  style={styles.avatar}
                  contentFit="cover"
                  cachePolicy="none"
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>{getInitials()}</Text>
                </View>
              )}
            </View>

            <View style={styles.nameContainer}>
              <Text style={styles.name}>{user?.name || 'Người dùng'}</Text>
            </View>
          </View>

          {user?.bio && <Text style={styles.bio}>{user.bio}</Text>}

          <View style={styles.infoRow}>
            {user?.gender && (
              <View style={styles.infoItem}>
                <Ionicons name="person-outline" size={16} color="#666" />
                <Text style={styles.infoText}>{GENDER_LABELS[user.gender]}</Text>
              </View>
            )}
            {user?.dateOfBirth && (
              <View style={styles.infoItem}>
                <Ionicons name="calendar-outline" size={16} color="#666" />
                <Text style={styles.infoText}>{formatDate(user.dateOfBirth)}</Text>
              </View>
            )}
            {user?.phone && (
              <View style={styles.infoItem}>
                <Ionicons name="call-outline" size={16} color="#666" />
                <Text style={styles.infoText}>{user.phone}</Text>
              </View>
            )}
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.editButton} onPress={onNavigateToSettings}>
              <Ionicons name="create-outline" size={20} color="#fff" />
              <Text style={styles.editButtonText}>Chỉnh sửa</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingsButton} onPress={onNavigateToSettings}>
              <Ionicons name="settings-outline" size={20} color="#007AFF" />
            </TouchableOpacity>
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
            <Ionicons
              name="grid-outline"
              size={24}
              color={activeTab === 'my-moments' ? '#007AFF' : '#666'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'saved' && styles.activeTab]}
            onPress={() => setActiveTab('saved')}
          >
            <Ionicons
              name="bookmark-outline"
              size={24}
              color={activeTab === 'saved' ? '#007AFF' : '#666'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'albums' && styles.activeTab]}
            onPress={() => setActiveTab('albums')}
          >
            <Ionicons
              name="albums-outline"
              size={24}
              color={activeTab === 'albums' ? '#007AFF' : '#666'}
            />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.emptyText}>Chưa có nội dung</Text>
        </View>
      </ScrollView>
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
    position: 'relative',
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
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    marginTop: -60,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
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
    gap: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  settingsButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
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
  content: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
