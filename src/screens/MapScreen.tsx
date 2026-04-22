import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  Switch,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MapboxGL from '@maplibre/maplibre-react-native';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWebSocketStore } from '../store/useWebSocketStore';
import { useAuthStore } from '../store/useAuthStore';
import mapService, { FriendLocationResponse } from '../api/mapService';
import userService from '../api/userService';
import { getBaseUrl } from '../config/api';

// Get UPLOADS_BASE_URL for avatar URLs
const UPLOADS_BASE_URL = getBaseUrl();

// Types
import { MapFriend } from '../store/useWebSocketStore';

// Extended interface for own avatar (allows string userId)
interface OwnAvatarFriend extends Omit<MapFriend, 'userId'> {
  userId: string | number;
}

// Import vibrant map style
const vibrantMapStyle = require('../../assets/map-style-dark.json');

MapboxGL.setAccessToken(null);

// ─────────────────────────────────────────────────────────────────────────────
// Helper: resolve a correct absolute image URL from any avatarUrl format
// Add timestamp for cache busting
// ─────────────────────────────────────────────────────────────────────────────
function buildAvatarUri(avatarUrl: string | null | undefined, timestamp?: number): string | null {
  if (!avatarUrl) return null;
  
  let url: string;
  
  // Already a proper absolute URL (Unsplash, external, etc.)
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    url = avatarUrl;
  }
  // Detect broken pattern produced by old resolveUrl: /uploads/avatars/https://...
  // Extract the embedded absolute URL and return it directly
  else if (avatarUrl.indexOf('https://') > 0 || avatarUrl.indexOf('http://') > 0) {
    const nestedHttpIdx = avatarUrl.indexOf('https://');
    const nestedHttpIdx2 = avatarUrl.indexOf('http://');
    const nestedIdx = nestedHttpIdx >= 0 ? nestedHttpIdx : nestedHttpIdx2;
    url = avatarUrl.substring(nestedIdx);
  }
  // Relative path from storage service: /uploads/avatars/uuid.jpg
  else if (avatarUrl.startsWith('/uploads/')) {
    url = `${UPLOADS_BASE_URL}${avatarUrl}`;
  }
  // Raw filename fallback
  else {
    url = `${UPLOADS_BASE_URL}/uploads/avatars/${avatarUrl}`;
  }
  
  // Add timestamp for cache busting
  if (timestamp) {
    url = url.includes('?') ? `${url}&t=${timestamp}` : `${url}?t=${timestamp}`;
  }
  
  return url;
}

// ─────────────────────────────────────────────────────────────────────────────
// Download a remote image to device cache — local file URIs render reliably
// inside native views (MarkerView) on Android unlike remote URLs.
// Cache is invalidated after 5 minutes to ensure fresh avatars.
// Returns either file:// URI or HTTP URL as fallback.
// ─────────────────────────────────────────────────────────────────────────────
async function downloadToCache(remoteUri: string, cacheKey: string): Promise<string | null> {
  try {
    const localPath = `${FileSystem.cacheDirectory}mapic_avatar_${cacheKey}.jpg`;
    const info = await FileSystem.getInfoAsync(localPath);
    
    // Check if cache is fresh (less than 5 minutes old) and has valid size
    if (info.exists && (info as any).size > 1024) {
      const fileAge = Date.now() - (info.modificationTime || 0) * 1000;
      const FIVE_MINUTES = 5 * 60 * 1000;
      
      // If cache is fresh, use it
      if (fileAge < FIVE_MINUTES) {
        console.log(`[Cache] Using cached avatar for ${cacheKey}, size: ${(info as any).size} bytes`);
        return localPath;
      }
      
      // Cache is stale, delete it
      console.log(`[Cache] Avatar cache expired for ${cacheKey}, redownloading...`);
      await FileSystem.deleteAsync(localPath, { idempotent: true });
    }
    
    // Delete if exists but too small (broken download)
    if (info.exists) {
      console.log(`[Cache] Deleting invalid cache for ${cacheKey}, size: ${(info as any).size || 0} bytes`);
      await FileSystem.deleteAsync(localPath, { idempotent: true });
    }

    console.log(`[Cache] Downloading avatar for ${cacheKey} from: ${remoteUri}`);
    const result = await FileSystem.downloadAsync(remoteUri, localPath);
    
    if (result.status === 200) {
      // Verify downloaded file
      const verifyInfo = await FileSystem.getInfoAsync(result.uri);
      const fileSize = (verifyInfo as any).size || 0;
      console.log(`[Cache] Downloaded avatar for ${cacheKey}, size: ${fileSize} bytes`);
      
      if (fileSize > 1024) {
        return result.uri;
      } else {
        console.error(`[Cache] Downloaded file too small (${fileSize} bytes), using HTTP URL directly`);
        // Delete corrupt file
        await FileSystem.deleteAsync(result.uri, { idempotent: true });
        // Return HTTP URL as fallback - this works for friend avatars
        return remoteUri;
      }
    }
    
    console.error(`[Cache] Download failed with status: ${result.status}`);
    // Return HTTP URL as fallback
    return remoteUri;
  } catch (error) {
    console.error(`[Cache] Error downloading avatar for ${cacheKey}:`, error);
    // Return HTTP URL as fallback
    return remoteUri;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Friend pin — simple View children inside MarkerView (Perfect CSS styling)
// Used for BOTH friends and own avatar for consistent rendering
// ─────────────────────────────────────────────────────────────────────────────
function FriendPin({
  friend,
  localUri,
  isSelected,
}: {
  friend: MapFriend | OwnAvatarFriend;
  localUri?: string | null;
  isSelected: boolean;
}) {
  // CRITICAL: Calculate isOwn FIRST before using it
  const isOwn = friend.userId === 'me' || String(friend.userId) === 'me';
  
  // Debug log to see actual URI
  useEffect(() => {
    console.log(`[FriendPin] ${friend.name} - URI: ${localUri}, type: ${typeof localUri}, isOwn: ${isOwn}`);
    if (isOwn) {
      console.log(`[FriendPin] Own avatar - avatarUrl: ${friend.avatarUrl}, profileUpdatedAt: ${friend.profileUpdatedAt}`);
    }
  }, [localUri, friend.name, isOwn, friend.avatarUrl, friend.profileUpdatedAt]);
  
  return (
    <View 
      style={styles.pinWrapper}
      collapsable={false} // CRITICAL: Prevent Android view flattening
      onLayout={() => {}} // CRITICAL: Force Android to render properly
    >
      <View 
        style={styles.avatarContainer}
        collapsable={false} // CRITICAL: Prevent Android view flattening
      >
        {friend.isOnline && (
          <View style={[
            styles.onlineRing, 
            isSelected && styles.onlineRingSelected,
            isOwn && { borderColor: '#4361EE', borderWidth: 3 }
          ]} />
        )}
        <View
          style={[
            styles.avatarBorder,
            !friend.isOnline && styles.avatarBorderOffline,
            isSelected && styles.avatarBorderSelected,
            isOwn && { borderColor: '#4361EE', borderWidth: 4 }
          ]}
          collapsable={false} // CRITICAL: Prevent Android view flattening
        >
          {localUri && localUri !== 'null' ? (
            <Image 
              source={{ uri: localUri }} 
              style={styles.avatarImg} 
              resizeMode="cover"
              onLayout={() => {}} // CRITICAL: Force Android to render images
              onLoad={() => console.log(`[Image] Loaded: ${friend.name}`)}
              onError={(e) => {
                console.error(`[Image] Error loading ${friend.name}:`, e.nativeEvent.error);
                console.log(`[Image] Failed URI: ${localUri}`);
              }}
            />
          ) : (
            <View 
              style={[
                styles.avatarInitials,
                isOwn && { backgroundColor: '#4361EE' }
              ]}
              collapsable={false} // CRITICAL: Prevent Android view flattening
            >
              <Text style={[styles.initialsText, isOwn && { color: '#FFF' }]}>
                {friend.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View style={[styles.statusDot, { backgroundColor: friend.isOnline ? '#22C55E' : '#6B7280' }]} />
      </View>
      <View style={[
        styles.nameBubble,
        isOwn && { backgroundColor: '#4361EE', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)' }
      ]}>
        {isOwn && <Ionicons name="radio-button-on" size={10} color="#22C55E" style={{ marginRight: 4 }} />}
        <Text style={styles.nameLabel} numberOfLines={1}>{friend.name}</Text>
      </View>
    </View>
  );
}

// Detail card — slide-up blur panel when pin is selected
// ─────────────────────────────────────────────────────────────────────────────
function DetailCard({ friend, localUri, onClose }: { friend: MapFriend; localUri?: string | null; onClose: () => void }) {
  const slideY = useRef(new Animated.Value(130)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideY, { toValue: 0, tension: 55, friction: 9, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, []);

  const close = () =>
    Animated.parallel([
      Animated.timing(slideY, { toValue: 130, duration: 180, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => onClose());

  const lastSeenText = (() => {
    if (friend.isOnline) return 'Đang online';
    if (!friend.lastSeenAt) return 'Chưa rõ';
    const diff = Math.floor((Date.now() - new Date(friend.lastSeenAt).getTime()) / 60000);
    if (diff < 1) return 'Vừa mới';
    if (diff < 60) return `${diff} phút trước`;
    if (diff < 1440) return `${Math.floor(diff / 60)} giờ trước`;
    return `${Math.floor(diff / 1440)} ngày trước`;
  })();

  return (
    <Animated.View style={[styles.detailCard, { transform: [{ translateY: slideY }], opacity }]}>
      <BlurView intensity={65} tint="dark" style={styles.detailBlur}>
        <View style={styles.detailRow}>
          <View style={[styles.detailAvatarBorder, !friend.isOnline && { borderColor: '#6B7280' }]}>
            {localUri ? (
              <Image source={{ uri: localUri }} style={{ width: 60, height: 60 }} resizeMode="cover" />
            ) : (
              <View style={[{ width: 60, height: 60 }, styles.avatarInitials]}>
                <Text style={[styles.initialsText, { fontSize: 22 }]}>{friend.name.charAt(0)}</Text>
              </View>
            )}
          </View>
          <View style={styles.detailInfo}>
            <Text style={styles.detailName}>{friend.name}</Text>
            <Text style={styles.detailUsername}>@{friend.username}</Text>
            <View style={styles.coordRow}>
              <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.45)" />
              <Text style={styles.coordText}>{friend.latitude.toFixed(4)}, {friend.longitude.toFixed(4)}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={close}
            hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
            <Ionicons name="close" size={20} color="rgba(255,255,255,0.75)" />
          </TouchableOpacity>
        </View>
        <View style={styles.statusRow}>
          <View style={[styles.statusDotSmall, { backgroundColor: friend.isOnline ? '#22C55E' : '#6B7280' }]} />
          <Text style={styles.statusText}>
            {friend.isOnline ? 'Đang chia sẻ vị trí  ' : 'Vị trí cuối • '}
            <Text style={styles.statusTime}>{lastSeenText}</Text>
          </Text>
        </View>
      </BlurView>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MapScreen — main component
// ─────────────────────────────────────────────────────────────────────────────
export default function MapScreen({ focusLocation, onNavigateToNotifications }: {
  focusLocation?: { latitude: number; longitude: number } | null;
  onNavigateToNotifications?: () => void;
}) {
  const navigation = useNavigation<any>();
  const { user, avatarVersion } = useAuthStore();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<number[] | null>(
    focusLocation ? [focusLocation.longitude, focusLocation.latitude] : null
  );
  const [isSharingLocation, setIsSharingLocation] = useState(true);
  const [sharingLoading, setSharingLoading] = useState(false);
  const lastMarkerPress = useRef<number>(0);
  
  const { 
    lastCameraCenter,
    setLastCameraCenter,
    selectedId,
    setSelectedId,
    showPanel,
    setShowPanel,
    friends,
    setFriends,
    localUris,
    setLocalUris,
    hasMapInitialFocused,
    setMapInitialFocused,
    isConnected,
    subscribe
  } = useWebSocketStore();

  const cameraRef = useRef<any>(null);
  const previousSelected = useRef<number | null>(null);
  const isMapMoving = useRef<boolean>(false);
  const lastMoveEndTime = useRef<number>(0); 
  const lastLockUpdateTime = useRef<number>(0);

  // ── Manual Camera Focus Handler ──────────────────────────────────────────────
  const focusOnFriend = useCallback((friend: MapFriend) => {
    const timeSinceLastMove = Date.now() - lastMoveEndTime.current;
    if (timeSinceLastMove < 600) {
      console.log(`[Camera] Blocked auto-zoom (Selection Lock: ${timeSinceLastMove}ms ago)`);
      return;
    }

    if (cameraRef.current && !isMapMoving.current) {
      console.log(`[Camera] Flying to friend ${friend.name}`);
      cameraRef.current.setCamera({
        centerCoordinate: [friend.longitude, friend.latitude],
        zoomLevel: 15,
        animationDuration: 600,
        animationMode: 'flyTo',
      });
    }
  }, []);

  // Update selection bookkeeping
  useEffect(() => {
    previousSelected.current = selectedId;
  }, [selectedId]);

  // ── Download image to cache and store local URI ───────────────────────────
  const cacheAvatar = useCallback(async (cacheKey: string, remoteUri: string | null | undefined, profileUpdatedAt?: string | null) => {
    // Include profileUpdatedAt timestamp in cache key to invalidate when avatar changes
    const timestamp = profileUpdatedAt ? new Date(profileUpdatedAt).getTime() : 0;
    const fullCacheKey = timestamp > 0 ? `${cacheKey}_${timestamp}` : cacheKey;
    
    // Check if already cached with this timestamp
    if (localUris.has(fullCacheKey)) {
      console.log(`[Cache] Avatar already cached for ${cacheKey} with timestamp ${timestamp}`);
      return;
    }
    
    const url = buildAvatarUri(remoteUri);
    if (!url) {
      // No avatar URL, but still create cache entry with null to indicate "processed"
      console.log(`[Cache] No avatar URL for ${cacheKey}, creating null cache entry`);
      setLocalUris(prev => {
        const next = new Map(prev);
        // Remove old cache entries for this user (different timestamps)
        for (const key of prev.keys()) {
          if (key.startsWith(`${cacheKey}_`)) {
            next.delete(key);
          }
        }
        next.set(fullCacheKey, null);
        return next;
      });
      return;
    }
    
    const local = await downloadToCache(url, fullCacheKey);
    if (local) {
      setLocalUris(prev => {
        const next = new Map(prev);
        // Remove old cache entries for this user (different timestamps)
        for (const key of prev.keys()) {
          if (key.startsWith(`${cacheKey}_`)) {
            next.delete(key);
          }
        }
        next.set(fullCacheKey, local);
        return next;
      });
    }
  }, []);

  // ── Helper to get cached avatar URI with timestamp ───────────────────────
  const getCachedAvatarUri = useCallback((userId: number | string, profileUpdatedAt?: string | null): string | null => {
    const cacheKey = String(userId);
    const timestamp = profileUpdatedAt ? new Date(profileUpdatedAt).getTime() : 0;
    const fullCacheKey = timestamp > 0 ? `${cacheKey}_${timestamp}` : cacheKey;
    
    // Return cached URI, or null if not cached or explicitly null
    return localUris.get(fullCacheKey) || null;
  }, [localUris]);

  // ── Helper to check if avatar is cached (processed) ──────────────────────
  const isAvatarCached = useCallback((userId: number | string, profileUpdatedAt?: string | null): boolean => {
    const cacheKey = String(userId);
    const timestamp = profileUpdatedAt ? new Date(profileUpdatedAt).getTime() : 0;
    const fullCacheKey = timestamp > 0 ? `${cacheKey}_${timestamp}` : cacheKey;
    
    return localUris.has(fullCacheKey);
  }, [localUris]);

  // ── Load friends locations from API ──────────────────────────────────────
  const loadFriends = useCallback(async () => {
    try {
      const list: FriendLocationResponse[] = await mapService.getFriendsLocations();
      console.log(`[Map] Fetched ${list.length} friends from API`);
      const next = new Map<number, MapFriend>();
      for (const loc of list) {
        console.log(`[Map] Adding friend: ${loc.name} at ${loc.latitude}, ${loc.longitude}`);
        next.set(loc.userId, {
          userId: loc.userId,
          name: loc.name,
          username: loc.username,
          avatarUrl: loc.avatarUrl,
          latitude: loc.latitude,
          longitude: loc.longitude,
          lastSeenAt: loc.lastSeenAt,
          isOnline: loc.isOnline,
          profileUpdatedAt: loc.profileUpdatedAt,
        });
        // Download avatar in background with profileUpdatedAt for cache invalidation
        cacheAvatar(String(loc.userId), loc.avatarUrl, loc.profileUpdatedAt);
      }
      setFriends(next);
    } catch (e) {
      console.warn('[Map] load friends:', e);
    }
  }, [cacheAvatar]);

  // ── Init: GPS + profile avatar + friends — all pre-loaded before rendering ─
  useEffect(() => {
    (async () => {
      console.log('[Map] Initializing MapScreen components...');

      // Run GPS request and data loading in parallel
      const [gpsRes, profileResult] = await Promise.allSettled([
        // GPS
        (async () => {
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
              const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
              console.log('[Map] GPS success:', loc.coords.latitude, loc.coords.longitude);
              const pos = [loc.coords.longitude, loc.coords.latitude];
              setCurrentLocation(pos);
              
              // One-time flyTo user if not focused by props
              if (!focusLocation && cameraRef.current && !hasMapInitialFocused) {
                console.log('[Map] Auto-focusing on User (Initial Global)');
                setMapInitialFocused(true);
                cameraRef.current.setCamera({
                  centerCoordinate: pos,
                  zoomLevel: 14,
                  animationDuration: 800,
                });
              }
            } else {
              console.warn('[Map] GPS permission denied, using fallback (Hanoi)');
              if (!focusLocation) setCurrentLocation([105.8342, 21.0278]);
            }
          } catch (e) {
            console.warn('[Map] GPS Error:', e);
            if (!focusLocation) setCurrentLocation([105.8342, 21.0278]);
          }
        })(),
        // Own profile
        userService.getProfile(),
      ]);

      // Pre-download own avatar to file cache (same as friends)
      let myAvatarUrl = null;
      if (profileResult.status === 'fulfilled' && profileResult.value.avatarUrl) {
        myAvatarUrl = profileResult.value.avatarUrl;
        console.log('[Map] Got avatar from profile API:', myAvatarUrl);
      } else if (user?.avatarUrl) {
        myAvatarUrl = user.avatarUrl;
        console.log('[Map] Got avatar from auth store:', myAvatarUrl);
      } else {
        console.log('[Map] No avatar found in profile or auth store');
        console.log('[Map] Profile result:', profileResult.status === 'fulfilled' ? profileResult.value : 'failed');
        console.log('[Map] Auth user:', user);
      }

      // Always cache own avatar entry, even if no avatar URL (for consistent behavior)
      console.log('[Map] Caching own avatar entry, avatarUrl:', myAvatarUrl, 'avatarVersion:', avatarVersion);
      cacheAvatar('me', myAvatarUrl, String(avatarVersion));

      // Load friends (they will cache their avatars via cacheAvatar callback)
      await loadFriends();

      setLoading(false);
      console.log('[Map] MapScreen Ready.');
    })();

    mapService.getSharingStatus().then(v => setIsSharingLocation(v)).catch(() => {});

    return () => {
      console.log('[Map] Unmounting MapScreen...');
      // Clear avatar cache to force fresh download next time
      setLocalUris(new Map());
    };
  }, [loadFriends]);

  // ── Camera follows focusLocation prop (First time only) ──────────────────
  useEffect(() => {
    if (focusLocation && !hasMapInitialFocused) {
      console.log('[Map] Focusing on Prop location (First time Global)');
      setMapInitialFocused(true);
      setCurrentLocation([focusLocation.longitude, focusLocation.latitude]);
    }
  }, [focusLocation, hasMapInitialFocused]);

  // ── Reload own avatar when avatarVersion changes (after upload) ──────────
  useEffect(() => {
    if (avatarVersion > 0 && user?.avatarUrl) {
      console.log('[Map] Avatar version changed, redownloading to cache...');
      const url = buildAvatarUri(user.avatarUrl);
      if (url) {
        console.log('[Map] Downloading new avatar from:', url);
        // Use SAME caching system as friends with avatarVersion
        cacheAvatar('me', user.avatarUrl, String(avatarVersion));
      }
    }
  }, [avatarVersion, user?.avatarUrl]);

  // ── WebSocket real-time updates ───────────────────────────────────────────
  useEffect(() => {
    let sub: any = null;
    if (isConnected) {
      sub = subscribe('/user/queue/location', (msg) => {
        const data: { userId: number; longitude: number; latitude: number } = JSON.parse(msg.body);
        setFriends(prev => {
          const existing = prev.get(data.userId);
          const next = new Map(prev);
          next.set(data.userId, {
            userId: data.userId,
            name: existing?.name ?? `User ${data.userId}`,
            username: existing?.username ?? '',
            avatarUrl: existing?.avatarUrl ?? null,
            latitude: data.latitude,
            longitude: data.longitude,
            lastSeenAt: new Date().toISOString(),
            isOnline: true,
            profileUpdatedAt: existing?.profileUpdatedAt ?? null,
          });
          // Don't re-cache avatar on location updates - it's already cached with timestamp
          return next;
        });
      });
    }
    return () => { if (sub) sub.unsubscribe(); };
  }, [isConnected]);

  // ── Toggle sharing ────────────────────────────────────────────────────────
  const handleToggle = async (v: boolean) => {
    setSharingLoading(true);
    try {
      await mapService.toggleLocationSharing(v);
      setIsSharingLocation(v);
    } finally {
      setSharingLoading(false);
    }
  };

  // ── Stable Default Settings (Global Awareness) ──────────────────────────
  const initialMapLocation = useMemo(() => {
    if (lastCameraCenter) return lastCameraCenter;
    if (focusLocation) return [focusLocation.longitude, focusLocation.latitude];
    return currentLocation || [105.8342, 21.0278];
  }, []);

  const defaultCameraSettings = useMemo(() => ({
    centerCoordinate: initialMapLocation,
    zoomLevel: 13,
  }), [initialMapLocation]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4361EE" />
        <Text style={styles.loadingText}>Đang xác định vị trí…</Text>
      </View>
    );
  }

  const selectedFriend = selectedId ? friends.get(selectedId) ?? null : null;
  console.log(`[Render] selectedId: ${selectedId}, friendsCount: ${friends.size}, HasSelectedFriend: ${!!selectedFriend}`);
  console.log(`[Render] currentLocation: ${currentLocation ? `[${currentLocation[0]}, ${currentLocation[1]}]` : 'NULL'}, myAvatar: ${isAvatarCached('me', String(avatarVersion)) ? 'cached' : 'not cached'}, avatarVersion: ${avatarVersion}`);
  console.log(`[Debug] Cache key for own avatar: me_${avatarVersion}, localUris size: ${localUris.size}, cached URI: ${getCachedAvatarUri('me', String(avatarVersion))}`);
  
  const onlineCount = Array.from(friends.values()).filter(f => f.isOnline).length;

  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        style={styles.map}
        mapStyle={vibrantMapStyle}
        logoEnabled={false}
        onPress={() => { 
          if (Date.now() - lastMarkerPress.current < 1500) {
            console.log(`[MapPress] Blocked map reset due to recent marker interaction`);
            return;
          }
          console.log(`[MapPress] Valid tap on map. Clearing selection.`);
          isMapMoving.current = false;
          if (selectedId) setSelectedId(null); 
        }}
        onRegionWillChange={() => {
          isMapMoving.current = true;
          lastLockUpdateTime.current = Date.now();
        }}
        onRegionDidChange={(feature) => {
          if (feature.geometry && feature.geometry.type === 'Point') {
            setLastCameraCenter(feature.geometry.coordinates);
          }
          
          setTimeout(() => { 
            isMapMoving.current = false; 
            lastMoveEndTime.current = Date.now();
          }, 300);
        }}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          defaultSettings={defaultCameraSettings}
        />

        {/* Blue circle indicator for my location - REMOVED completely to avoid overlapping with avatar */}

        {/* Friend pins using Native View for perfect CSS styling */}
        {Array.from(friends.values()).map(friend => (
          <MapboxGL.MarkerView
            key={`f-${friend.userId}`}
            id={`fp-${friend.userId}`}
            coordinate={[friend.longitude, friend.latitude]}
            anchor={{ x: 0.5, y: 0.5 }}
            allowOverlap={true}
          >
            <TouchableOpacity 
              activeOpacity={0.7}
              delayPressIn={0}
              hitSlop={{ top: 25, bottom: 25, left: 25, right: 25 }}
              collapsable={false} // CRITICAL: Prevent Android view flattening
              onLayout={() => {}} // CRITICAL: Force Android to render properly
              onPressIn={() => {
                lastMarkerPress.current = Date.now(); 
              }}
              onPress={() => {
                const duration = Date.now() - lastMarkerPress.current;
                
                if (duration > 400) {
                   console.log(`[Touch] Ignored long-press/pan on friend ${friend.userId} (${duration}ms)`);
                   return;
                }

                if (isMapMoving.current) {
                  const now = Date.now();
                  const timeSinceLastMove = now - lastMoveEndTime.current;
                  const lockAge = now - lastLockUpdateTime.current;

                  if (lockAge > 2500 || selectedId !== friend.userId) {
                    console.log(`[Touch] Heartbeat/Priority Unlock: Breaking stuck map lock (${lockAge}ms age)`);
                    isMapMoving.current = false;
                  } else if (timeSinceLastMove > 400) {
                    console.log(`[Touch] Ignored tap on friend ${friend.userId} because map is active Panning/Zooming!`);
                    return;
                  }
                }
                
                console.log(`[Touch] Tapped on friend ${friend.userId} (Valid fast tap: ${duration}ms). Setting selectedId...`);
                setSelectedId(friend.userId);
                focusOnFriend(friend);
              }}
            >
              <FriendPin
                friend={friend}
                localUri={getCachedAvatarUri(friend.userId, friend.profileUpdatedAt)}
                isSelected={selectedId === friend.userId}
              />
            </TouchableOpacity>
          </MapboxGL.MarkerView>
        ))}

        {/* Own avatar pin - Using MarkerView (SAME as friends for consistent rendering) */}
        {currentLocation && isAvatarCached('me', String(avatarVersion)) && (
          <MapboxGL.MarkerView
            key="my-avatar-marker"
            id="my-avatar-marker"
            coordinate={currentLocation}
            anchor={{ x: 0.5, y: 0.5 }}
            allowOverlap={true}
          >
            <View 
              collapsable={false} // CRITICAL: Prevent Android view flattening
              onLayout={() => {}} // CRITICAL: Force Android to render properly
            >
              <FriendPin
                friend={{
                  userId: 'me',
                  name: 'Tôi',
                  username: 'me',
                  avatarUrl: user?.avatarUrl || null,
                  longitude: currentLocation[0],
                  latitude: currentLocation[1],
                  lastSeenAt: null,
                  isOnline: true,
                  profileUpdatedAt: String(avatarVersion),
                }}
                localUri={getCachedAvatarUri('me', String(avatarVersion))}
                isSelected={false}
              />
            </View>
          </MapboxGL.MarkerView>
        )}
      </MapboxGL.MapView>

      {/* Badge */}
      {friends.size > 0 && (
        <View style={[styles.badge, { top: insets.top + 8 }]}>
          <Ionicons name="people" size={13} color="#FFF" />
          <Text style={styles.badgeText}>
            {onlineCount > 0 ? `${onlineCount} online` : `${friends.size} bạn bè`}
          </Text>
        </View>
      )}

      {/* Notification Bell */}
      {onNavigateToNotifications && (
        <TouchableOpacity
          style={[styles.notificationBtn, { top: insets.top + 8 }]}
          onPress={onNavigateToNotifications}
          activeOpacity={0.7}
        >
          <View style={styles.notificationIconWrapper}>
            <Ionicons name="notifications" size={20} color="#FFF" />
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>3</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* My Location Button */}
      <TouchableOpacity
        style={[styles.myLocationBtn, { bottom: insets.bottom + 156 }]}
        onPress={() => {
          if (currentLocation && cameraRef.current) {
            console.log('[Camera] Flying to my location');
            cameraRef.current.setCamera({
              centerCoordinate: currentLocation,
              zoomLevel: 15,
              animationDuration: 600,
              animationMode: 'flyTo',
            });
          }
        }}
        activeOpacity={0.85}
      >
        <Ionicons name="navigate" size={22} color="#4361EE" />
      </TouchableOpacity>

      {/* Sharing FAB */}
      <TouchableOpacity
        style={[
          styles.fab, 
          isSharingLocation ? styles.fabOn : styles.fabOff,
          { bottom: insets.bottom + 90 }
        ]}
        onPress={() => setShowPanel(v => !v)}
        activeOpacity={0.85}
      >
        <Ionicons name={isSharingLocation ? 'location' : 'location-outline'} size={22} color="#FFF" />
      </TouchableOpacity>

      {/* Sharing panel */}
      {showPanel && (
        <View style={[styles.sharingPanel, { bottom: insets.bottom + 156 }]}>
          <BlurView intensity={65} tint="dark" style={styles.sharingBlur}>
            <View style={styles.sharingRow}>
              <View style={[styles.sharingIconBox, { backgroundColor: isSharingLocation ? 'rgba(34,197,94,0.18)' : 'rgba(107,114,128,0.18)' }]}>
                <Ionicons name={isSharingLocation ? 'location' : 'location-outline'} size={20}
                  color={isSharingLocation ? '#22C55E' : '#6B7280'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sharingTitle}>Chia sẻ vị trí</Text>
                <Text style={styles.sharingSubtitle}>
                  {isSharingLocation ? 'Bạn bè thấy được vị trí của bạn' : 'Vị trí của bạn đang bị ẩn'}
                </Text>
              </View>
              {sharingLoading
                ? <ActivityIndicator size="small" color="#4361EE" />
                : <Switch value={isSharingLocation} onValueChange={handleToggle}
                    trackColor={{ false: 'rgba(255,255,255,0.15)', true: 'rgba(34,197,94,0.5)' }}
                    thumbColor={isSharingLocation ? '#22C55E' : '#888'}
                    ios_backgroundColor="rgba(255,255,255,0.15)" />}
            </View>
          </BlurView>
        </View>
      )}

      {/* Detail card */}
      {selectedFriend && (
        <DetailCard
          friend={selectedFriend}
          localUri={getCachedAvatarUri(selectedFriend.userId, selectedFriend.profileUpdatedAt)}
          onClose={() => {
            isMapMoving.current = false;
            setSelectedId(null);
          }}
        />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', gap: 12 },
  loadingText: { color: 'rgba(255,255,255,0.55)', fontSize: 14 },
  map: { flex: 1 },

  // ── Own pin ──
  myPinWrapper: { 
    alignItems: 'center', 
    justifyContent: 'center',
    width: 90, 
    height: 90,
  },
  myPulseRing: {
    position: 'absolute',
    width: 75, 
    height: 75, 
    borderRadius: 37.5,
    borderWidth: 3,
    borderColor: '#4361EE',
    backgroundColor: 'rgba(67,97,238,0.25)',
  },
  myPulseRing2: {
    position: 'absolute',
    width: 90, 
    height: 90, 
    borderRadius: 45,
    borderWidth: 2,
    borderColor: '#4361EE',
    backgroundColor: 'rgba(67,97,238,0.12)',
  },
  myAvatarBorder: {
    width: 58, 
    height: 58, 
    borderRadius: 29,
    borderWidth: 4, 
    borderColor: '#4361EE',
    overflow: 'hidden', 
    backgroundColor: '#1C1C2E',
    elevation: 12,
  },
  myNameBubble: { 
    backgroundColor: 'rgba(67,97,238,0.95)', 
    flexDirection: 'row', 
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    marginTop: 6,
  },

  // ── Friend pin ──
  pinWrapper: { alignItems: 'center' },
  avatarContainer: {
    width: 66, height: 66,
    justifyContent: 'center', alignItems: 'center',
  },
  onlineRing: {
    position: 'absolute',
    width: 66, height: 66, borderRadius: 33,
    borderWidth: 2.5, borderColor: 'rgba(34,197,94,0.50)',
    backgroundColor: 'transparent',
  },
  onlineRingSelected: { borderColor: '#22C55E' },
  avatarBorder: {
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 3, borderColor: '#FFF',
    overflow: 'hidden', backgroundColor: '#1C1C2E',
    elevation: 8,
  },
  avatarBorderOffline: { borderColor: 'rgba(255,255,255,0.40)' },
  avatarBorderSelected: { borderColor: '#22C55E' },

  // ── Shared image / initials ──
  avatarImg: { width: 52, height: 52 },
  avatarInitials: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  initialsText: { color: '#FFF', fontSize: 18, fontWeight: '700' },

  // ── Status dot ──
  statusDot: {
    position: 'absolute', bottom: 6, right: 6,
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 2.5, borderColor: '#FFF',
    elevation: 9,
  },

  // ── Name bubble ──
  nameBubble: {
    marginTop: 5,
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10, maxWidth: 110,
  },
  nameLabel: { color: '#FFF', fontSize: 11, fontWeight: '600', textAlign: 'center' },

  // ── Badge ──
  badge: {
    position: 'absolute',
    left: 16,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(67,97,238,0.92)',
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 22, elevation: 6,
  },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: '700' },

  // ── Notification Bell ──
  notificationBtn: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.60)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  notificationIconWrapper: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#000',
  },
  notificationBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },

  // ── Sharing FAB ──
  fab: {
    position: 'absolute',
    right: 20,
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabOn: { backgroundColor: '#22C55E' },
  fabOff: { backgroundColor: 'rgba(107,114,128,0.90)' },

  // ── My Location Button ──
  myLocationBtn: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(67,97,238,0.15)',
  },

  sharingPanel: {
    position: 'absolute',
    left: 20, right: 20,
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    elevation: 10,
  },
  sharingBlur: {
    padding: 16,
    backgroundColor: Platform.OS === 'android' ? 'rgba(15,15,25,0.93)' : 'transparent',
  },
  sharingRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  sharingIconBox: { width: 42, height: 42, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  sharingTitle: { color: '#FFF', fontSize: 15, fontWeight: '700', marginBottom: 2 },
  sharingSubtitle: { color: 'rgba(255,255,255,0.50)', fontSize: 12 },

  // ── Detail card ──
  detailCard: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    borderRadius: 24, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    elevation: 12,
  },
  detailBlur: {
    padding: 16,
    backgroundColor: Platform.OS === 'android' ? 'rgba(18,18,30,0.93)' : 'transparent',
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  detailAvatarBorder: {
    width: 60, height: 60, borderRadius: 30,
    borderWidth: 2.5, borderColor: '#4361EE',
    overflow: 'hidden', backgroundColor: '#1C1C2E',
  },
  detailInfo: { flex: 1, gap: 3 },
  detailName: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  detailUsername: { color: 'rgba(255,255,255,0.50)', fontSize: 13 },
  coordRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  coordText: { color: 'rgba(255,255,255,0.40)', fontSize: 11 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.10)',
    justifyContent: 'center', alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.10)',
  },
  statusDotSmall: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: 'rgba(255,255,255,0.55)', fontSize: 12 },
  statusTime: { color: 'rgba(255,255,255,0.35)', fontSize: 12 },
});
