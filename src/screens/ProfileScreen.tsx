import React, { useState, useEffect, useRef } from 'react';
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
import { Moment } from '../components/MomentCard';
import api from '../api/api';
import { getImageUrl } from '../utils/uiUtils';
import { getApiUrl, getBaseUrl, buildMediaUrl } from '../config/api';
import MomentViewerModal from '../components/MomentViewerModal';

const { width: SCREEN_W } = Dimensions.get('window');
const PHOTO_COL = 3;
const PHOTO_GAP = 3;
const PHOTO_SIZE = (SCREEN_W - PHOTO_GAP * (PHOTO_COL + 1)) / PHOTO_COL;

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

  // Moment Viewer
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  // Scroll animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const coverScale = scrollY.interpolate({ inputRange: [-100, 0], outputRange: [1.4, 1], extrapolate: 'clamp' });
  const coverOpacity = scrollY.interpolate({ inputRange: [0, 180], outputRange: [1, 0.3], extrapolate: 'clamp' });
  const headerOpacity = scrollY.interpolate({ inputRange: [140, 200], outputRange: [0, 1], extrapolate: 'clamp' });

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
          try { await FileSystem.deleteAsync(fileUri, { idempotent: true }); } catch (_) {}
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
            } catch (_) {}

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

  const openMomentViewer = (index: number) => {
    setViewerIndex(index);
    setViewerVisible(true);
  };

  const renderThumb = ({ item, index }: { item: Moment; index: number }) => {
    const mainMedia = item.media?.[0];
    const imgUrl = getImageUrl(mainMedia?.mediaUrl, 'moment');
    return (
      <TouchableOpacity
        style={styles.thumb}
        activeOpacity={0.88}
        onPress={() => openMomentViewer(index)}
      >
        {imgUrl ? (
          <Image source={{ uri: imgUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <GradientView colors={['#1e1b4b', '#312e81']} style={StyleSheet.absoluteFill} />
        )}
        <View style={styles.thumbOverlay} />
        {(item.media?.length ?? 0) > 1 && (
          <View style={styles.multiIcon}>
            <Ionicons name="copy" size={12} color="#FFF" />
          </View>
        )}
        {mainMedia?.mediaType === 'VIDEO' && (
          <View style={styles.videoIcon}>
            <Ionicons name="play" size={12} color="#FFF" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

      {/* Sticky mini-header (appears when scrolled past cover) */}
      <Animated.View style={[styles.stickyHeader, { opacity: headerOpacity, backgroundColor: C.background }]}>
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
        <TouchableOpacity activeOpacity={0.95} onPress={() => pickAndUpload('cover')}>
          <Animated.View style={[styles.cover, { transform: [{ scale: coverScale }], opacity: coverOpacity }]}>
            {coverUrl ? (
              <Image source={{ uri: `${coverUrl}?v=${coverVersion}` }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <GradientView colors={GRADIENTS.darkHero} style={StyleSheet.absoluteFill} />
            )}
            <GradientView colors={GRADIENTS.overlayFull as any} style={StyleSheet.absoluteFill} />
            <BlurView intensity={25} tint="dark" style={styles.coverEditBtn}>
              <Ionicons name="camera" size={14} color="rgba(255,255,255,0.85)" />
            </BlurView>
            {/* Settings */}
            <TouchableOpacity style={styles.settingsBtn} onPress={onNavigateToSettings}>
              <BlurView intensity={40} tint="dark" style={styles.settingsBtnInner}>
                <Ionicons name="settings-outline" size={18} color="#FFF" />
              </BlurView>
            </TouchableOpacity>
            {/* Albums */}
            {onOpenAlbums && (
              <TouchableOpacity style={styles.albumsBtn} onPress={onOpenAlbums}>
                <BlurView intensity={40} tint="dark" style={styles.settingsBtnInner}>
                  <Ionicons name="albums-outline" size={18} color="#FFF" />
                </BlurView>
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
        </TouchableOpacity>

        {/* === PROFILE CONTENT === */}
        <View style={[styles.content, { backgroundColor: C.background }]}>

          {/* Avatar floating above cover */}
          <View style={styles.avatarRow}>
            <TouchableOpacity style={styles.avatarWrapper} onPress={() => pickAndUpload('avatar')}>
              {avatarUrl ? (
                <Image source={{ uri: `${avatarUrl}?v=${avatarVersion}` }} style={styles.avatar} contentFit="cover" />
              ) : (
                <GradientView colors={GRADIENTS.primaryBlue} style={styles.avatar}>
                  <Text style={styles.avatarInitials}>{getInitials()}</Text>
                </GradientView>
              )}
              <View style={[styles.avatarBadge, { backgroundColor: C.primary }]}>
                <Ionicons name="camera" size={11} color="#FFF" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Name & info */}
          <Text style={[styles.name, { color: C.textPrimary }]}>{user?.name || 'Người dùng'}</Text>
          <Text style={[styles.username, { color: C.textTertiary }]}>@{user?.username || ''}</Text>
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

          {/* === BENTO STATS GRID === */}
          <View style={styles.bentoGrid}>
            {/* Row 1: 3 equal stat cards */}
            <View style={styles.bentoRow}>
              {[
                { icon: 'images', label: 'Khoảnh khắc', value: moments.length, color: C.primary },
                { icon: 'people', label: 'Bạn bè', value: friendsCount, color: DARK_COLORS.accentPink },
                { icon: 'location', label: 'Địa điểm', value: locationsCount, color: DARK_COLORS.accentViolet },
              ].map((stat) => (
                <View
                  key={stat.label}
                  style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFF', borderColor: C.border }]}
                >
                  <View style={[styles.statIconBg, { backgroundColor: `${stat.color}22` }]}>
                    <Ionicons name={stat.icon as any} size={20} color={stat.color} />
                  </View>
                  <Text style={[styles.statValue, { color: C.textPrimary }]}>{stat.value}</Text>
                  <Text style={[styles.statLabel, { color: C.textTertiary }]}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* === LOGOUT ROW === */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.logoutBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F3F4F6', borderColor: C.border }]}
              onPress={() => showAlert('Xác nhận', 'Đăng xuất khỏi tài khoản?', [
                { text: 'Hủy', style: 'cancel' },
                { text: 'Đăng xuất', style: 'destructive', onPress: async () => { await authService.logout(); logoutStore(); } },
              ])}
            >
              <Ionicons name="log-out-outline" size={17} color={C.textTertiary} />
              <Text style={[styles.logoutText, { color: C.textTertiary }]}>Đăng xuất</Text>
            </TouchableOpacity>
          </View>

          {/* === MOMENTS GRID === */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>Khoảnh khắc</Text>
            <View style={[styles.countBadge, { backgroundColor: isDark ? 'rgba(67,97,238,0.2)' : '#EEF2FF' }]}>
              <Text style={[styles.countBadgeText, { color: C.primary }]}>{moments.length}</Text>
            </View>
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
              renderItem={renderThumb}
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

      {/* === MOMENT VIEWER MODAL === */}
      <MomentViewerModal
        visible={viewerVisible}
        moments={moments}
        initialIndex={viewerIndex}
        onClose={() => setViewerVisible(false)}
      />
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
    padding: 9, borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  settingsBtn: { position: 'absolute', top: 54, right: 16 },
  albumsBtn: { position: 'absolute', top: 54, right: 64 },
  uploadProgress: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 8, backgroundColor: 'rgba(0,0,0,0.5)',
  },
  uploadText: { color: '#FFF', fontSize: 13 },
  settingsBtnInner: {
    width: 40, height: 40, borderRadius: 20, overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },

  // Content
  content: { paddingHorizontal: 16, paddingBottom: 8 },

  // Avatar
  avatarRow: { marginTop: -52, marginBottom: 12 },
  avatarWrapper: { position: 'relative', alignSelf: 'flex-start' },
  avatar: {
    width: 96, height: 96, borderRadius: 28,
    borderWidth: 3, borderColor: '#000',
    justifyContent: 'center', alignItems: 'center',
  },
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

  // Actions
  actionRow: { flexDirection: 'row', marginBottom: 24 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1,
  },
  logoutText: { fontSize: 14, fontWeight: '500' },

  // Section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  countBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  countBadgeText: { fontSize: 13, fontWeight: '700' },

  // Grid thumbs
  thumb: {
    width: PHOTO_SIZE, height: PHOTO_SIZE,
    borderRadius: 10, overflow: 'hidden', position: 'relative',
  },
  thumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 10,
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
});
