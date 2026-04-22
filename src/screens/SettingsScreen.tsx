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
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { SPACING, COLORS, LIGHT_COLORS, DARK_COLORS, FONT_SIZE, FONT_WEIGHT, RADIUS, SHADOWS, DIMENSIONS } from '../constants/design';
import SafeContainer from '../components/ui/SafeContainer';
import Spacer from '../components/ui/Spacer';
import { useAuthStore } from '../store/useAuthStore';
import { useAlert } from '../context/AlertContext';
import { useThemeStore } from '../store/useThemeStore';
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
  const { mode, toggleTheme } = useThemeStore();
  const isDark = mode === 'dark';
  const C = isDark ? DARK_COLORS : LIGHT_COLORS;
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
        
        // Notify global store to invalidate avatar cache everywhere
        if (type === 'avatar') {
          useAuthStore.getState().updateAvatar(profile?.avatarUrl || '');
        }
        
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
    <SafeContainer style={[styles.container, { backgroundColor: C.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.primary} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: C.primary }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={DIMENSIONS.iconLG} color={COLORS.white} />
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
              <View style={[styles.iconContainer, { backgroundColor: COLORS.gray100 }]}>
                <Ionicons name="create-outline" size={DIMENSIONS.iconMD} color={COLORS.primary} />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemText}>Chỉnh sửa thông tin</Text>
                <Text style={styles.menuItemDescription}>Cập nhật tên, bio, ngày sinh</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={DIMENSIONS.iconSM} color={COLORS.gray400} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleChangeImages}
            disabled={uploading}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: COLORS.gray100 }]}>
                <Ionicons name="image-outline" size={DIMENSIONS.iconMD} color={COLORS.info} />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemText}>Đổi ảnh đại diện & bìa</Text>
                <Text style={styles.menuItemDescription}>Cập nhật ảnh hồ sơ của bạn</Text>
              </View>
            </View>
            {uploading ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Ionicons name="chevron-forward" size={DIMENSIONS.iconSM} color={COLORS.gray400} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleChangePassword}
            disabled={loading}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: COLORS.gray100 }]}>
                <Ionicons name="lock-closed-outline" size={DIMENSIONS.iconMD} color={COLORS.warning} />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemText}>Đổi mật khẩu</Text>
                <Text style={styles.menuItemDescription}>Thay đổi mật khẩu đăng nhập</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={DIMENSIONS.iconSM} color={COLORS.gray400} />
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
              <View style={[styles.iconContainer, { backgroundColor: COLORS.gray100 }]}>
                <Ionicons name="notifications-outline" size={DIMENSIONS.iconMD} color={COLORS.error} />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemText}>Thông báo</Text>
                <Text style={styles.menuItemDescription}>Quản lý thông báo push</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={DIMENSIONS.iconSM} color={COLORS.gray400} />
          </TouchableOpacity>
        </View>

        {/* Appearance Section */}
        <View style={[styles.section, { backgroundColor: C.surface }]}>
          <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>Giao diện</Text>

          <View style={[styles.menuItem, { backgroundColor: C.surface }]}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6' }]}>
                <Text style={{ fontSize: 20 }}>{isDark ? '🌙' : '☀️'}</Text>
              </View>
              <View style={styles.menuItemContent}>
                <Text style={[styles.menuItemText, { color: C.textPrimary }]}>Chế độ tối</Text>
                <Text style={[styles.menuItemDescription, { color: C.textTertiary }]}>
                  {isDark ? 'Đang bật — nhấn để chuyển sáng' : 'Đang tắt — nhấn để chuyển tối'}
                </Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#D1D5DB', true: '#4361EE' }}
              thumbColor={isDark ? '#FFF' : '#FFF'}
              ios_backgroundColor="#D1D5DB"
            />
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Về ứng dụng</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => showAlert('MAPIC', 'Version 1.0.0\n\nỨng dụng mạng xã hội dựa trên vị trí')}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: COLORS.gray100 }]}>
                <Ionicons name="information-circle-outline" size={DIMENSIONS.iconMD} color={COLORS.success} />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemText}>Thông tin ứng dụng</Text>
                <Text style={styles.menuItemDescription}>Version 1.0.0</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={DIMENSIONS.iconSM} color={COLORS.gray400} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => showAlert('Thông báo', 'Tính năng đang phát triển')}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: COLORS.gray100 }]}>
                <Ionicons name="help-circle-outline" size={DIMENSIONS.iconMD} color={COLORS.warning} />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemText}>Trợ giúp & Hỗ trợ</Text>
                <Text style={styles.menuItemDescription}>Câu hỏi thường gặp, liên hệ</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={DIMENSIONS.iconSM} color={COLORS.gray400} />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={DIMENSIONS.iconLG} color={COLORS.error} />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>

        <Spacer size="xxxl" />
      </ScrollView>
    </SafeContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  backButton: {
    padding: SPACING.sm,
  },
  headerTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: COLORS.surface,
    marginTop: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray500,
    textTransform: 'uppercase',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.gray800,
    fontWeight: FONT_WEIGHT.medium,
    marginBottom: 2,
  },
  menuItemDescription: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray500,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xxl,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  logoutText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.error,
  },
});

