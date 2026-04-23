import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Platform,
  FlatList,
  RefreshControl,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import GradientView from '../components/ui/GradientView';
import { BlurView } from 'expo-blur';
import { useAuthStore } from '../store/useAuthStore';
import { useAlert } from '../context/AlertContext';
import { useThemeStore } from '../store/useThemeStore';
import { LIGHT_COLORS, DARK_COLORS, GRADIENTS } from '../constants/design';
import authService from '../api/authService';
import userService from '../api/userService';
import MomentCard, { Moment } from '../components/MomentCard';
import api from '../api/api';
import { getImageUrl } from '../utils/uiUtils';
import { getApiUrl, getBaseUrl, buildMediaUrl } from '../config/api';
import albumService from '../api/albumService';
import momentService from '../api/momentService';
import AlbumSelectModal from '../components/AlbumSelectModal';
import CommentModal from '../components/CommentModal';
import EditCaptionModal from '../components/EditCaptionModal';
import { Modal, Pressable } from 'react-native';
import MiniMomentCard from '../components/MiniMomentCard';

const { width: SCREEN_W } = Dimensions.get('window');
const PHOTO_COL = 2;
const PHOTO_GAP = 8;
const CONTENT_PADDING = 32;
const PHOTO_SIZE = (SCREEN_W - CONTENT_PADDING - PHOTO_GAP * (PHOTO_COL + 1)) / PHOTO_COL;

const GENDER_LABELS: Record<string, string> = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' };
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

interface ProfileScreenProps {
  onNavigateToSettings?: () => void;
  refreshTrigger?: boolean;
  onOpenMap?: (params: { latitude: number; longitude: number; addressName: string; provinceName?: string; imageUrl?: string }) => void;
  onOpenAlbums?: () => void;
}

export default function ProfileScreen({ onNavigateToSettings, refreshTrigger, onOpenMap, onOpenAlbums }: ProfileScreenProps) {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const setUser = useAuthStore((state) => state.setUser);
  const logoutStore = useAuthStore((state) => state.logout);
  const { showAlert } = useAlert();
  const { mode } = useThemeStore();
  const isDark = mode === 'dark';
  const C = isDark ? DARK_COLORS : LIGHT_COLORS;

  const [isLoading, setIsLoading] = useState(false);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loadingMoments, setLoadingMoments] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(Date.now());
  const [coverVersion, setCoverVersion] = useState(Date.now());
  const [friendsCount, setFriendsCount] = useState(0);
  const [locationsCount, setLocationsCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Moment Viewer & Interaction
  const [selectedMoment, setSelectedMoment] = useState<Moment | null>(null);
  const [albumModalVisible, setAlbumModalVisible] = useState(false);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [editCaptionModalVisible, setEditCaptionModalVisible] = useState(false);
  const [editingMoment, setEditingMoment] = useState<Moment | null>(null);

  // Interaction throttling
  const lastPress = useRef<number>(0);

  // Scroll animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const coverScale = scrollY.interpolate({ inputRange: [-100, 0], outputRange: [1.4, 1], extrapolate: 'clamp' });
  const coverOpacity = scrollY.interpolate({ inputRange: [0, 180], outputRange: [1, 0.3], extrapolate: 'clamp' });
  const headerOpacity = scrollY.interpolate({ inputRange: [140, 200], outputRange: [0, 1], extrapolate: 'clamp' });

  const [isHeaderVisible, setIsHeaderVisible] = useState(false);

  useEffect(() => {
    const id = scrollY.addListener(({ value }) => {
      const visible = value > 140;
      if (visible !== isHeaderVisible) setIsHeaderVisible(visible);
    });
    return () => scrollY.removeListener(id);
  }, [isHeaderVisible]);

  useEffect(() => { loadProfile(); loadMoments(); loadFriendsCount(); }, []);
  useEffect(() => { if (refreshTrigger !== undefined) loadProfile(); }, [refreshTrigger]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const profile = await userService.getProfile();
      setUser(profile);
    } catch { } finally { setIsLoading(false); }
  };

  const loadMoments = async () => {
    try {
      setLoadingMoments(true);
      const API_URL = getApiUrl();
      const response = await fetch(`${API_URL}/moments/my-moments`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        const list = data.data || [];
        setMoments(list);
        const uniqueLocs = new Set<string>();
        list.forEach((m: Moment) => { if (m.province?.code) uniqueLocs.add(m.province.code); });
        setLocationsCount(uniqueLocs.size);
      }
    } catch { } finally { setLoadingMoments(false); setRefreshing(false); }
  };

  const loadFriendsCount = async () => {
    try {
      const res = await api.get('/friends');
      if (res.data?.data) setFriendsCount(res.data.data.length);
    } catch { }
  };

  const onRefresh = () => { setRefreshing(true); loadProfile(); loadMoments(); loadFriendsCount(); };

  const getInitials = () => {
    if (user?.name) {
      const parts = user.name.split(' ');
      if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      return user.name.substring(0, 2).toUpperCase();
    }
    return user?.email?.[0].toUpperCase() || 'U';
  };

  const avatarUrl = getImageUrl(user?.avatarUrl, 'avatar');
  const coverUrl = getImageUrl(user?.coverImageUrl, 'cover');

  const uploadImageFromUri = async (uri: string, type: 'avatar' | 'cover') => {
    setUploading(true);
    setUploadProgress(0);
    try {
      console.log('[ProfileScreen] Uploading', type, 'from URI:', uri);
      let fileUri = uri;
      let fileName = `${type}_${Date.now()}.jpg`;

      // On Android, convert content:// URI to file URI
      if (Platform.OS === 'android' && uri.startsWith('content://')) {
        const destPath = `${FileSystem.cacheDirectory}${fileName}`;
        try {
          await FileSystem.copyAsync({ from: uri, to: destPath });
          fileUri = destPath;
          console.log('[ProfileScreen] File copied to:', fileUri);
        } catch (copyError) {
          console.error('[ProfileScreen] File copy error:', copyError);
          throw new Error('Không thể xử lý file ảnh');
        }
      }

      const uriParts = fileUri.split('.');
      const ext = uriParts.length > 1 ? uriParts[uriParts.length - 1].toLowerCase() : 'jpg';
      if (ext !== 'jpg') fileName = `${type}_${Date.now()}.${ext}`;

      const formData = new FormData();
      const fileObj: any = {
        uri: Platform.OS === 'android' ? fileUri : fileUri.replace('file://', ''),
        type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        name: fileName,
      };
      console.log('[ProfileScreen] File object:', fileObj);
      formData.append('file', fileObj);

      const tkn = useAuthStore.getState().token;
      const endpoint = type === 'avatar' ? '/user/upload-avatar' : '/user/upload-cover';
      const API_URL = getApiUrl();
      console.log('[ProfileScreen] Uploading to:', `${API_URL}${endpoint}`);

      setUploadProgress(30);
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${tkn}`, 'Content-Type': 'multipart/form-data' },
        body: formData,
      });
      console.log('[ProfileScreen] Response status:', response.status);
      setUploadProgress(80);

      if (response.ok) {
        const responseData = await response.json();
        console.log('[ProfileScreen] Upload response data:', responseData);

        // Cleanup cached file on Android
        if (Platform.OS === 'android' && fileUri.startsWith(FileSystem.cacheDirectory || '')) {
          try { await FileSystem.deleteAsync(fileUri, { idempotent: true }); } catch (_) { }
        }

        const profile = await userService.getProfile();
        console.log('[ProfileScreen] Updated profile avatarUrl:', profile?.avatarUrl, 'coverUrl:', profile?.coverImageUrl);
        setUser(profile);

        if (type === 'avatar') {
          setAvatarVersion(Date.now());
          // Sync avatar version to global store (invalidates map cache etc.)
          useAuthStore.getState().updateAvatar(profile?.avatarUrl || '');
        } else {
          setCoverVersion(Date.now());
        }
        setUploadProgress(100);
        showAlert('Thành công', `Cập nhật ảnh ${type === 'avatar' ? 'đại diện' : 'bìa'} thành công`);
      } else {
        const errText = await response.text();
        console.error('[ProfileScreen] Upload failed:', errText);
        showAlert('Lỗi', `Upload thất bại: ${errText}`);
      }
    } catch (e: any) {
      console.error('[ProfileScreen] Upload error:', e);
      showAlert('Lỗi', e.message || 'Không thể upload ảnh');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const pickAndUpload = (type: 'avatar' | 'cover') => {
    const aspect: [number, number] = type === 'avatar' ? [1, 1] : [16, 9];
    showAlert(`Chọn ảnh ${type === 'avatar' ? 'đại diện' : 'bìa'}`, 'Bạn muốn chọn từ đâu?', [
      {
        text: 'Thư viện', onPress: async () => {
          try {
            // Try native ImagePickerModule first (dev client), fallback to expo-image-picker (Expo Go)
            let uri: string | null = null;
            try {
              const ImagePickerModule = require('../modules/ImagePickerModule').default;
              if (ImagePickerModule?.pickImage) {
                const result = await ImagePickerModule.pickImage();
                uri = result?.uri || null;
              }
            } catch (_) { }

            // Fallback: expo-image-picker (works in Expo Go)
            if (!uri) {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect,
                quality: 0.8,
              });
              if (!result.canceled && result.assets?.[0]) uri = result.assets[0].uri;
            }

            if (uri) await uploadImageFromUri(uri, type);
          } catch (e: any) { if (e.code !== 'E_PICKER_CANCELLED') showAlert('Lỗi', e.message); }
        },
      },
      {
        text: 'Chụp ảnh', onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect, quality: 0.8 });
          if (!result.canceled && result.assets?.[0]) await uploadImageFromUri(result.assets[0].uri, type);
        },
      },
      { text: 'Hủy', style: 'cancel' },
    ]);
  };

  const openMomentViewer = useCallback((index: number) => {
    const now = Date.now();
    if (now - lastPress.current < 600) return;
    lastPress.current = now;

    setSelectedMoment(moments[index]);
  }, [moments]);

  const closeMomentViewer = useCallback(() => {
    const now = Date.now();
    if (now - lastPress.current < 400) return;
    lastPress.current = now;

    setSelectedMoment(null);
  }, []);

  const handleEditCaption = (moment: Moment) => {
    setEditingMoment(moment);
    setEditCaptionModalVisible(true);
  };

  const handleSaveCaption = async (newCaption: string) => {
    if (!editingMoment || !token) return;
    try {
      await momentService.updateMomentContent(editingMoment.id, newCaption, token);
      setMoments(prev => prev.map(m => (m.id === editingMoment.id ? { ...m, content: newCaption } : m)));
      if (selectedMoment?.id === editingMoment.id) {
        setSelectedMoment({ ...selectedMoment, content: newCaption });
      }
      showAlert('Thành công', 'Đã cập nhật caption');
    } catch (error: any) {
      showAlert('Lỗi', error.message || 'Không thể cập nhật caption');
      throw error;
    }
  };

  const handleDeleteMoment = async (momentId: number) => {
    if (!token) return;
    showAlert('Xác nhận', 'Bạn có chắc muốn xóa bài viết này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await momentService.deleteMoment(momentId, token);
            setMoments(prev => prev.filter(m => m.id !== momentId));
            setSelectedMoment(null);
            showAlert('Thành công', 'Đã xóa bài viết');
          } catch (error: any) {
            showAlert('Lỗi', error.message || 'Không thể xóa bài viết');
          }
        },
      },
    ]);
  };

  const handleAddToAlbum = (momentId: number) => {
    setAlbumModalVisible(true);
  };

  const handleSelectAlbum = async (albumId: number) => {
    if (!selectedMoment || !token) return;
    try {
      await albumService.addMomentToAlbum(albumId, selectedMoment.id, token);
      showAlert('Thành công', 'Đã thêm vào album');
    } catch (error: any) {
      showAlert('Lỗi', error.message || 'Không thể thêm vào album');
    }
  };

  const renderMiniCard = ({ item, index }: { item: Moment; index: number }) => {
    return (
      <View style={styles.miniCardWrapper}>
        <MiniMomentCard
          moment={item}
          token={token || ''}
          onPress={() => openMomentViewer(index)}
          onPressLike={() => {
            setMoments(prev => prev.map(m =>
              m.id === item.id
                ? { ...m, userReacted: !m.userReacted, reactionCount: m.userReacted ? (m.reactionCount || 1) - 1 : (m.reactionCount || 0) + 1 }
                : m
            ));
          }}
        />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

      {/* Sticky mini-header (appears when scrolled past cover) */}
      <Animated.View
        pointerEvents={isHeaderVisible ? 'auto' : 'none'}
        style={[styles.stickyHeader, { opacity: headerOpacity, backgroundColor: C.background }]}
      >
        <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <Text style={[styles.stickyName, { color: C.textPrimary }]}>{user?.name || ''}</Text>
        <TouchableOpacity onPress={onNavigateToSettings}>
          <Ionicons name="settings-outline" size={22} color={C.textSecondary} />
        </TouchableOpacity>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        {/* === COVER with parallax === */}
        <Animated.View style={[styles.cover, { transform: [{ scale: coverScale }], opacity: coverOpacity }]}>
          {coverUrl ? (
            <Image source={{ uri: `${coverUrl}?v=${coverVersion}` }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <Image source={require('../assets/images/cover-default.jpg')} style={StyleSheet.absoluteFill} contentFit="cover" />
          )}
          {/* Camera button - pick avatar or cover */}
          <TouchableOpacity
            style={[styles.coverEditBtn, { elevation: 5 }]}
            onPress={() => showAlert('Thay ảnh', 'Bạn muốn đổi ảnh nào?', [
              { text: 'Ảnh đại diện', onPress: () => pickAndUpload('avatar') },
              { text: 'Ảnh bìa', onPress: () => pickAndUpload('cover') },
              { text: 'Hủy', style: 'cancel' },
            ])}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            activeOpacity={0.7}
          >
            <View style={styles.coverEditBtnInner}>
              <Image source={require('../assets/images/camera.png')} style={styles.coverIconImg} />
            </View>
          </TouchableOpacity>
          {/* Settings */}
          <TouchableOpacity
            style={[styles.settingsBtn, { elevation: 5 }]}
            onPress={onNavigateToSettings}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            activeOpacity={0.7}
          >
            <View style={styles.settingsBtnInner}>
              <Image source={require('../assets/images/setting.png')} style={styles.coverIconImg} />
            </View>
          </TouchableOpacity>
          {/* Albums */}
          {onOpenAlbums && (
            <TouchableOpacity
              style={[styles.albumsBtn, { elevation: 5 }]}
              onPress={onOpenAlbums}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              activeOpacity={0.7}
            >
              <View style={styles.settingsBtnInner}>
                <Image source={require('../assets/images/album.png')} style={styles.coverIconImg} />
              </View>
            </TouchableOpacity>
          )}
          {/* Upload progress */}
          {uploading && (
            <View style={styles.uploadProgress}>
              <ActivityIndicator size="small" color="#FFF" />
              <Text style={styles.uploadText}>Đang tải lên... {uploadProgress}%</Text>
            </View>
          )}
        </Animated.View>

        {/* === PROFILE CONTENT === */}
        <View style={[styles.content, { backgroundColor: C.background }]}>

          {/* Avatar floating above cover - no camera badge */}
          <View style={styles.avatarRow}>
            <View style={styles.avatarWrapper}>
              {avatarUrl ? (
                <Image source={{ uri: `${avatarUrl}?v=${avatarVersion}` }} style={styles.avatar} contentFit="cover" />
              ) : (
                <Image source={require('../assets/images/avatar-default.png')} style={styles.avatar} contentFit="cover" />
              )}
            </View>
            <View style={styles.usernameContainer}>
               <Text style={[styles.username, { color: C.textTertiary }]}>@{user?.username || ''}</Text>
            </View>
          </View>

          {/* Name & info */}
          <Text style={[styles.name, { color: C.textPrimary }]}>{user?.name || 'Người dùng'}</Text>
          {user?.bio ? <Text style={[styles.bio, { color: C.textSecondary }]}>{user.bio}</Text> : null}

          {/* Gender / DOB / Phone info row */}
          <View style={styles.infoRow}>
            {user?.gender ? (
              <View style={styles.infoItem}>
                <Ionicons name="person-outline" size={14} color={C.textTertiary} />
                <Text style={[styles.infoText, { color: C.textTertiary }]}>{GENDER_LABELS[user.gender] || user.gender}</Text>
              </View>
            ) : null}
            {user?.dateOfBirth ? (
              <View style={styles.infoItem}>
                <Ionicons name="calendar-outline" size={14} color={C.textTertiary} />
                <Text style={[styles.infoText, { color: C.textTertiary }]}>{formatDate(user.dateOfBirth)}</Text>
              </View>
            ) : null}
            {user?.phone ? (
              <View style={styles.infoItem}>
                <Ionicons name="call-outline" size={14} color={C.textTertiary} />
                <Text style={[styles.infoText, { color: C.textTertiary }]}>{user.phone}</Text>
              </View>
            ) : null}
          </View>
          {/* === MOMENTS GRID === */}
          <View style={styles.sectionHeader}>
            <Image source={require('../assets/images/moment.png')} style={styles.sectionIcon} />
            <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>Khoảnh khắc</Text>
          </View>

          {loadingMoments ? (
            <ActivityIndicator size="small" color={C.primary} style={{ marginVertical: 32 }} />
          ) : moments.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconBg, { backgroundColor: isDark ? 'rgba(67,97,238,0.15)' : '#EEF2FF' }]}>
                <Ionicons name="images-outline" size={36} color={C.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>Chưa có khoảnh khắc</Text>
              <Text style={[styles.emptySubtitle, { color: C.textTertiary }]}>Chia sẻ khoảnh khắc đầu tiên của bạn!</Text>
            </View>
          ) : (
            <FlatList
              data={moments}
              renderItem={renderMiniCard}
              keyExtractor={(item) => item.id.toString()}
              numColumns={PHOTO_COL}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: PHOTO_GAP }} />}
              columnWrapperStyle={{ gap: PHOTO_GAP }}
              contentContainerStyle={{ gap: PHOTO_GAP }}
            />
          )}

          <View style={{ height: 120 }} />
        </View>
      </Animated.ScrollView>

      {/* === FULL MOMENT MODAL === */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={!!selectedMoment}
        onRequestClose={closeMomentViewer}
      >
        <View style={styles.momentModalOverlay}>
          {/* Close button */}
          <TouchableOpacity style={styles.modalCloseBtn} onPress={closeMomentViewer} activeOpacity={0.8}>
            <Ionicons name="close" size={22} color="#FFF" />
          </TouchableOpacity>

          <View style={{ width: '100%' }}>
            {selectedMoment && (
              <MomentCard
                moment={selectedMoment}
                baseUrl={getBaseUrl()}
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
                onPressLike={async () => {
                  const wasLiked = selectedMoment.userReacted;
                  const newReactionCount = wasLiked ? (selectedMoment.reactionCount || 1) - 1 : (selectedMoment.reactionCount || 0) + 1;
                  
                  // Optimistic update
                  setMoments(prev => prev.map(m =>
                    m.id === selectedMoment.id
                      ? {
                        ...m,
                        userReacted: !wasLiked,
                        reactionCount: newReactionCount
                      }
                      : m
                  ));
                  
                  setSelectedMoment(prev => prev ? {
                    ...prev,
                    userReacted: !wasLiked,
                    reactionCount: newReactionCount
                  } : null);

                  // Call API
                  try {
                    const API_URL = getApiUrl();
                    const response = await fetch(`${API_URL}/reactions/moments/${selectedMoment.id}`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ type: 'HEART' }),
                    });

                    if (!response.ok) {
                      // Revert on failure
                      setMoments(prev => prev.map(m =>
                        m.id === selectedMoment.id
                          ? {
                            ...m,
                            userReacted: wasLiked,
                            reactionCount: selectedMoment.reactionCount || 0
                          }
                          : m
                      ));
                      
                      setSelectedMoment(prev => prev ? {
                        ...prev,
                        userReacted: wasLiked,
                        reactionCount: selectedMoment.reactionCount || 0
                      } : null);
                    }
                  } catch (error) {
                    console.error('Error toggling reaction:', error);
                    // Revert on error
                    setMoments(prev => prev.map(m =>
                      m.id === selectedMoment.id
                        ? {
                          ...m,
                          userReacted: wasLiked,
                          reactionCount: selectedMoment.reactionCount || 0
                        }
                        : m
                    ));
                    
                    setSelectedMoment(prev => prev ? {
                      ...prev,
                      userReacted: wasLiked,
                      reactionCount: selectedMoment.reactionCount || 0
                    } : null);
                  }
                }}
                onPressComment={() => {
                  setCommentModalVisible(true);
                }}
                onPressMenu={() => {
                  showAlert('Tùy chọn', 'Chọn hành động cho bài viết này', [
                    { text: 'Chỉnh sửa caption', onPress: () => handleEditCaption(selectedMoment) },
                    { text: 'Thêm vào album', onPress: () => handleAddToAlbum(selectedMoment.id) },
                    { text: 'Xóa bài viết', style: 'destructive', onPress: () => handleDeleteMoment(selectedMoment.id) },
                    { text: 'Hủy', style: 'cancel' }
                  ]);
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Comment Modal */}
      {selectedMoment && (
        <CommentModal
          visible={commentModalVisible}
          momentId={selectedMoment.id}
          onClose={() => setCommentModalVisible(false)}
          onCommentAdded={() => {
            setMoments(prev => prev.map(m =>
              m.id === selectedMoment.id
                ? { ...m, commentCount: (m.commentCount || 0) + 1 }
                : m
            ));
            setSelectedMoment(prev => prev ? { ...prev, commentCount: (prev.commentCount || 0) + 1 } : null);
          }}
        />
      )}

      {/* Album Select Modal */}
      <AlbumSelectModal
        visible={albumModalVisible}
        onClose={() => setAlbumModalVisible(false)}
        onSelectAlbum={handleSelectAlbum}
      />

      {/* Edit Caption Modal */}
      {editingMoment && (
        <EditCaptionModal
          visible={editCaptionModalVisible}
          initialCaption={editingMoment.content}
          onClose={() => {
            setEditCaptionModalVisible(false);
            setEditingMoment(null);
          }}
          onSave={handleSaveCaption}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Sticky mini header
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    height: 90,
    paddingTop: 48,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  stickyName: { fontSize: 17, fontWeight: '700' },

  // Cover
  cover: { height: 260, overflow: 'hidden', position: 'relative' },
  coverEditBtn: {
    position: 'absolute', bottom: 14, right: 14,
    zIndex: 10,
  },
  coverEditBtnInner: {
    padding: 9, borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  settingsBtn: { position: 'absolute', top: 54, right: 16, zIndex: 10 },
  albumsBtn: { position: 'absolute', top: 54, right: 74, zIndex: 10 },
  uploadProgress: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 8, backgroundColor: 'rgba(0,0,0,0.5)',
  },
  uploadText: { color: '#FFF', fontSize: 13 },
  coverEditBtn: {
    position: 'absolute', bottom: 14, right: 14,
    zIndex: 10,
  },
  coverEditBtnInner: {
    width: 54, height: 54, borderRadius: 27, overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
  },
  settingsBtnInner: {
    width: 54, height: 54, borderRadius: 27, overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
  },

  // Content
  content: { paddingHorizontal: 16, paddingBottom: 8 },

  // Avatar
  avatarRow: { 
    marginTop: -96, 
    marginBottom: 12, 
    flexDirection: 'row', 
    alignItems: 'flex-end', 
    justifyContent: 'space-between' 
  },
  avatarWrapper: { position: 'relative' },
  avatar: {
    width: 192, height: 192, borderRadius: 96,
    borderWidth: 4, borderColor: '#FFF',
    backgroundColor: '#EEE',
  },
  usernameContainer: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    paddingBottom: 12,
  },
  username: { fontSize: 20, fontWeight: '700' },
  smallIconImg: { width: 28, height: 28 },
  coverIconImg: { width: 32, height: 32 },
  avatarInitials: { fontSize: 34, fontWeight: '800', color: '#FFF' },
  avatarBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#000',
  },

  // Info
  name: { fontSize: 26, fontWeight: '800', marginBottom: 2 },
  username: { fontSize: 14, marginBottom: 6 },
  bio: { fontSize: 14, lineHeight: 20, marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  location: { fontSize: 13 },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16, marginTop: 4 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoText: { fontSize: 13 },

  // Bento
  bentoGrid: { marginBottom: 14, gap: 10 },
  bentoRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, borderRadius: 20, borderWidth: 1,
    paddingVertical: 16, paddingHorizontal: 12,
    alignItems: 'center', gap: 6,
  },
  statIconBg: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 2,
  },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '500', textAlign: 'center' },

  // Section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionIcon: { width: 32, height: 32 },
  sectionTitle: { fontSize: 20, fontWeight: '800' },
  countBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  countBadgeText: { fontSize: 13, fontWeight: '700' },

  // Grid thumbs
  thumb: {
    width: PHOTO_SIZE, height: PHOTO_SIZE,
    borderRadius: 14, overflow: 'hidden', position: 'relative',
  },
  miniCardWrapper: {
    width: PHOTO_SIZE,
  },
  thumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  multiIcon: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 8, padding: 3,
  },
  videoIcon: {
    position: 'absolute', bottom: 6, right: 6,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 8, padding: 3,
  },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyIconBg: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptySubtitle: { fontSize: 13, textAlign: 'center' },

  // Moment Modal
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
});
