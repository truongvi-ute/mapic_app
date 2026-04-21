import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuthStore } from '../store/useAuthStore';
import { useAlert } from '../context/AlertContext';
import authService from '../api/authService';
import userService from '../api/userService';
import { getApiUrl } from '../config/api';

interface SettingsScreenProps {
  onBack: () => void;
  onNavigateToEditProfile: () => void;
  onNavigateToVerifyOTP?: (email: string, type: string) => void;
}

export default function SettingsScreen({ onBack, onNavigateToEditProfile, onNavigateToVerifyOTP }: SettingsScreenProps) {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const logoutStore = useAuthStore((state) => state.logout);
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleEditProfile = () => {
    onNavigateToEditProfile();
  };

  const handleChangeImages = () => {
    showAlert(
      'Đổi ảnh',
      'Chọn loại ảnh bạn muốn thay đổi',
      [
        {
          text: 'Ảnh đại diện',
          onPress: () => handleImageSelection('avatar'),
        },
        {
          text: 'Ảnh bìa',
          onPress: () => handleImageSelection('cover'),
        },
        { text: 'Hủy', style: 'cancel' },
      ]
    );
  };

  const handleImageSelection = (type: 'avatar' | 'cover') => {
    showAlert(
      `Chọn ${type === 'avatar' ? 'ảnh đại diện' : 'ảnh bìa'}`,
      'Bạn muốn chọn từ đâu?',
      [
        {
          text: 'Thư viện',
          onPress: async () => {
            try {
              const ImagePickerModule = require('../modules/ImagePickerModule').default;
              const result = await ImagePickerModule.pickImage();

              if (result && result.uri) {
                await uploadImageFromUri(result.uri, type);
              }
            } catch (error: any) {
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
              const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: type === 'avatar' ? [1, 1] : [16, 9],
                quality: 0.8,
              });

              if (!result.canceled && result.assets && result.assets[0]) {
                await uploadImageFromUri(result.assets[0].uri, type);
              }
            } catch (error: any) {
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
      setUploading(true);
      
      let fileUri = uri;
      let fileName = `${type}_${Date.now()}.jpg`;
      
      // On Android, if URI is content://, copy to cache first
      if (Platform.OS === 'android' && uri.startsWith('content://')) {
        const destPath = `${FileSystem.cacheDirectory}${fileName}`;
        
        try {
          await FileSystem.copyAsync({
            from: uri,
            to: destPath,
          });
          fileUri = destPath;
        } catch (copyError) {
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
      
      formData.append('file', fileObj);
      
      const API_URL = getApiUrl();
      const token = useAuthStore.getState().token;
      const endpoint = type === 'avatar' ? '/user/upload-avatar' : '/user/upload-cover';
      
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });
      
      if (response.ok) {
        // Clean up cached file on Android
        if (Platform.OS === 'android' && fileUri.startsWith(FileSystem.cacheDirectory || '')) {
          try {
            await FileSystem.deleteAsync(fileUri, { idempotent: true });
          } catch (cleanupError) {
            console.warn('Failed to cleanup cached file:', cleanupError);
          }
        }
        
        // Get updated profile
        const profile = await userService.getProfile();
        setUser(profile);
        
        showAlert('Thành công', `Cập nhật ${type === 'avatar' ? 'ảnh đại diện' : 'ảnh bìa'} thành công`);
      } else {
        const error = await response.text();
        showAlert('Lỗi', `Upload thất bại: ${error}`);
      }
    } catch (error: any) {
      showAlert('Lỗi', error.message || 'Không thể upload ảnh');
    } finally {
      setUploading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user?.email) {
      showAlert('Lỗi', 'Không tìm thấy thông tin email');
      return;
    }

    showAlert(
      'Đổi mật khẩu',
      'Bạn sẽ nhận được mã OTP qua email để xác thực',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Tiếp tục',
          onPress: async () => {
            setLoading(true);
            try {
              const response = await authService.changePassword(user.email);
              if (response.success) {
                showAlert('Thành công', response.message, [
                  {
                    text: 'Tiếp tục',
                    onPress: () => {
                      if (onNavigateToVerifyOTP) {
                        onNavigateToVerifyOTP(user.email, 'CHANGE_PASSWORD');
                      }
                    }
                  }
                ]);
              } else {
                showAlert('Lỗi', response.message);
              }
            } catch (error: any) {
              const errorMessage = error.response?.data?.message || error.message || 'Không thể gửi OTP';
              showAlert('Lỗi', errorMessage);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    showAlert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            await authService.logout();
            logoutStore();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#007AFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cài đặt</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tài khoản</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleEditProfile}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: '#e3f2fd' }]}>
                <Ionicons name="create-outline" size={22} color="#007AFF" />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemText}>Chỉnh sửa thông tin</Text>
                <Text style={styles.menuItemDescription}>Cập nhật tên, bio, ngày sinh</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleChangeImages}
            disabled={uploading}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: '#f3e5f5' }]}>
                <Ionicons name="image-outline" size={22} color="#9c27b0" />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemText}>Đổi ảnh đại diện & bìa</Text>
                <Text style={styles.menuItemDescription}>Cập nhật ảnh hồ sơ của bạn</Text>
              </View>
            </View>
            {uploading ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Ionicons name="chevron-forward" size={20} color="#999" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleChangePassword}
            disabled={loading}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: '#fff3e0' }]}>
                <Ionicons name="lock-closed-outline" size={22} color="#ff9800" />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemText}>Đổi mật khẩu</Text>
                <Text style={styles.menuItemDescription}>Thay đổi mật khẩu đăng nhập</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông báo</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => showAlert('Thông báo', 'Tính năng đang phát triển')}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: '#fce4ec' }]}>
                <Ionicons name="notifications-outline" size={22} color="#e91e63" />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemText}>Thông báo</Text>
                <Text style={styles.menuItemDescription}>Quản lý thông báo push</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Về ứng dụng</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => showAlert('MAPIC', 'Version 1.0.0\n\nỨng dụng mạng xã hội dựa trên vị trí')}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: '#e0f2f1' }]}>
                <Ionicons name="information-circle-outline" size={22} color="#009688" />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemText}>Thông tin ứng dụng</Text>
                <Text style={styles.menuItemDescription}>Version 1.0.0</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => showAlert('Thông báo', 'Tính năng đang phát triển')}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: '#fff9c4' }]}>
                <Ionicons name="help-circle-outline" size={22} color="#fbc02d" />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemText}>Trợ giúp & Hỗ trợ</Text>
                <Text style={styles.menuItemDescription}>Câu hỏi thường gặp, liên hệ</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={24} color="#f44336" />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>

        {/* Spacer */}
        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#007AFF',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingVertical: 12,
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginBottom: 2,
  },
  menuItemDescription: {
    fontSize: 13,
    color: '#999',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#f44336',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f44336',
  },
  spacer: {
    height: 32,
  },
});

