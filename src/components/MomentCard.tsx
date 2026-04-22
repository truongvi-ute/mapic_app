import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { getBaseUrl, buildAvatarUrl, buildMomentImageUrl, getApiUrl } from '../config/api';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;

interface MomentMedia {
  id: number;
  mediaUrl: string;
  mediaType: 'IMAGE' | 'VIDEO';
  sortOrder: number;
}

interface Location {
  id: number;
  latitude: number;
  longitude: number;
  address: string;
  name: string;
}

interface Author {
  id: number;
  username: string;
  fullName: string;
  avatarUrl?: string;
}

interface Province {
  id: number;
  name: string;
  code: string;
}

interface District {
  id: number;
  name: string;
  code: string;
}

interface Commune {
  id: number;
  name: string;
  code: string;
}

export interface Moment {
  id: number;
  content: string;
  author: Author;
  location?: Location;
  province?: Province;
  district?: District;
  commune?: Commune;
  category: string;
  isPublic: boolean;
  status: string;
  createdAt: string;
  media?: MomentMedia[];
  reactionCount?: number;
  userReacted?: boolean;
}

interface MomentCardProps {
  moment: Moment;
  onPressProfile?: () => void;
  onPressMap?: () => void;
  onPressLike?: () => void;
  onPressComment?: () => void;
  onPressShare?: () => void;
  onPressMenu?: () => void;
  onPressAddToAlbum?: () => void;
  baseUrl?: string;
  token?: string;
  showAddToAlbum?: boolean;
}

const CATEGORY_LABELS: { [key: string]: string} = {
  LANDSCAPE: 'Phong cảnh',
  PEOPLE: 'Con người',
  FOOD: 'Món ăn',
  ARCHITECTURE: 'Kiến trúc',
  CULTURE: 'Văn hóa',
  NATURE: 'Thiên nhiên',
  URBAN: 'Đô thị',
  EVENT: 'Sự kiện',
  OTHER: 'Khác',
};

export default function MomentCard({
  moment,
  onPressProfile,
  onPressMap,
  onPressLike,
  onPressComment,
  onPressShare,
  onPressMenu,
  onPressAddToAlbum,
  baseUrl,
  token,
  showAddToAlbum = false,
}: MomentCardProps) {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [liked, setLiked] = useState(moment.userReacted || false);
  const [likeCount, setLikeCount] = useState(moment.reactionCount || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [showLottie, setShowLottie] = useState(false);
  
  // Animation values
  const scaleAnim = useState(new Animated.Value(1))[0];
  const lottieRef = useRef<LottieView>(null);
  
  const actualBaseUrl = baseUrl || getBaseUrl();

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Vừa xong';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  const getLocationText = () => {
    if (moment.commune && moment.district && moment.province) {
      return `${moment.commune.name}, ${moment.district.name}, ${moment.province.name}`;
    }
    if (moment.location?.address) {
      return moment.location.address;
    }
    return 'Không xác định';
  };

  const getCategoryIcon = (category: string): keyof typeof Ionicons.glyphMap => {
    const iconMap: { [key: string]: keyof typeof Ionicons.glyphMap } = {
      LANDSCAPE: 'image-outline',
      PEOPLE: 'people-outline',
      FOOD: 'restaurant-outline',
      ARCHITECTURE: 'business-outline',
      CULTURE: 'color-palette-outline',
      NATURE: 'leaf-outline',
      URBAN: 'business-outline',
      EVENT: 'calendar-outline',
      OTHER: 'ellipsis-horizontal-circle-outline',
    };
    return iconMap[category] || 'ellipsis-horizontal-circle-outline';
  };

  const handleLike = async () => {
    console.log('[MomentCard] handleLike called', { isLiking, hasToken: !!token, momentId: moment.id });
    
    if (isLiking || !token) {
      console.log('[MomentCard] Skipping - isLiking:', isLiking, 'hasToken:', !!token);
      return;
    }
    
    setIsLiking(true);
    const wasLiked = liked;
    const previousCount = likeCount;
    
    console.log('[MomentCard] Before toggle - liked:', wasLiked, 'count:', previousCount);
    
    // Optimistic update
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);
    
    // Button scale animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Heart animation (only when liking)
    if (!wasLiked) {
      console.log('[MomentCard] Starting Lottie animation');
      setShowLottie(true);
      
      // Delay to ensure state update and smooth start
      setTimeout(() => {
        lottieRef.current?.reset();
        lottieRef.current?.play();
      }, 50);
      
      // Hide after 3 seconds
      setTimeout(() => {
        setShowLottie(false);
      }, 3000);
    }
    
    try {
      const API_URL = getApiUrl();
      console.log('[MomentCard] Calling reaction API:', `${API_URL}/reactions/moments/${moment.id}`, 'hasToken:', !!token);
      
      const response = await fetch(`${API_URL}/reactions/moments/${moment.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'HEART' }),
      });
      
      const responseText = await response.text();
      console.log('[MomentCard] Reaction API status:', response.status, 'body:', responseText);
      
      if (!response.ok) {
        console.error('[MomentCard] Reaction failed:', response.status, responseText);
        setLiked(wasLiked);
        setLikeCount(previousCount);
      }
      
      onPressLike?.();
    } catch (error) {
      setLiked(wasLiked);
      setLikeCount(previousCount);
      console.error('[MomentCard] Error toggling reaction:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / CARD_WIDTH);
    setCurrentMediaIndex(index);
  };

  const mediaCount = moment.media?.length || 0;

  return (
    <View style={styles.card}>
      {/* MEDIA SECTION WITH OVERLAYS */}
      {mediaCount > 0 && (
        <View style={styles.mediaSection}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {moment.media?.map((media) => (
              <View key={media.id} style={styles.mediaContainer}>
                {media.mediaType === 'IMAGE' ? (
                  <Image
                    source={{ uri: buildMomentImageUrl(media.mediaUrl) || undefined }}
                    style={styles.mediaImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.videoPlaceholder}>
                    <Ionicons name="play-circle" size={64} color="#fff" />
                    <Text style={styles.videoText}>Video</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
          
          {/* Author Info Overlay - Tất cả thông tin ở góc trên */}
          <View style={styles.authorOverlay}>
            <TouchableOpacity
              style={styles.authorContent}
              onPress={onPressProfile}
              activeOpacity={0.8}
            >
              <Image
                source={
                  buildAvatarUrl(moment.author.avatarUrl)
                    ? { uri: buildAvatarUrl(moment.author.avatarUrl) || undefined }
                    : require('../assets/images/avatar-default.png')
                }
                style={styles.avatarOverlay}
              />
              <View style={styles.authorInfo}>
                <Text style={styles.authorName} numberOfLines={1}>
                  {moment.author.fullName}
                </Text>
                <View style={styles.metaRow}>
                  {/* Time */}
                  <Text style={styles.metaText}>{getTimeAgo(moment.createdAt)}</Text>
                  
                  <View style={styles.metaDot} />
                  
                  {/* Public/Private Icon */}
                  <Ionicons 
                    name={moment.isPublic ? "globe-outline" : "lock-closed"} 
                    size={12} 
                    color="#FFFFFF" 
                  />
                  
                  <View style={styles.metaDot} />
                  
                  {/* Category Icon */}
                  <Ionicons 
                    name={getCategoryIcon(moment.category)} 
                    size={12} 
                    color="#FFFFFF" 
                  />
                </View>
              </View>
            </TouchableOpacity>
            
            {/* Menu Button */}
            {onPressMenu && (
              <TouchableOpacity
                style={styles.menuButtonOverlay}
                onPress={onPressMenu}
              >
                <Ionicons name="ellipsis-horizontal" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
          
          {/* Interaction Overlay - Giữa phía dưới với nút Map */}
          <View style={styles.interactionOverlay}>
            <TouchableOpacity
              style={styles.overlayButton}
              onPress={handleLike}
              activeOpacity={0.7}
              disabled={isLiking}
            >
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <Ionicons
                  name={liked ? 'heart' : 'heart-outline'}
                  size={28}
                  color={liked ? '#FF3B30' : '#FFFFFF'}
                />
              </Animated.View>
              {likeCount > 0 && (
                <Text style={styles.reactionCount}>{likeCount}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.overlayButton}
              onPress={onPressComment}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble-outline" size={26} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.overlayButton}
              onPress={onPressShare}
              activeOpacity={0.7}
            >
              <Ionicons name="share-outline" size={26} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Map Button - Chỉ hiện khi có location */}
            {moment.location && onPressMap && (
              <TouchableOpacity
                style={styles.overlayButton}
                onPress={onPressMap}
                activeOpacity={0.7}
              >
                <Image
                  source={require('../assets/images/open-map.png')}
                  style={styles.mapIconInteraction}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            )}
            
            {/* Add to Album Button - Chỉ hiện khi showAddToAlbum = true */}
            {showAddToAlbum && onPressAddToAlbum && (
              <TouchableOpacity
                style={styles.overlayButton}
                onPress={onPressAddToAlbum}
                activeOpacity={0.7}
              >
                <Image
                  source={require('../assets/images/album.png')}
                  style={styles.albumIconInteraction}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            )}
          </View>
          
          {/* Lottie Love Animation - Always mounted, controlled by opacity */}
          <LottieView
            ref={lottieRef}
            source={require('../assets/aminations/Love Animation with Particle.json')}
            style={[
              styles.lottieAnimation,
              { opacity: showLottie ? 1 : 0 }
            ]}
            loop={false}
            autoPlay={false}
            speed={0.3}
          />
          
          {/* Media Indicator */}
          {mediaCount > 1 && (
            <View style={styles.mediaIndicator}>
              {moment.media?.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicatorDot,
                    index === currentMediaIndex && styles.indicatorDotActive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  // Media Section
  mediaSection: {
    position: 'relative',
  },
  mediaContainer: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.25,
    backgroundColor: '#000',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
  },
  videoText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 8,
  },
  
  // Author Overlay - Tất cả thông tin ở góc trên
  authorOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  authorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
    paddingRight: 14,
    maxWidth: '75%',
  },
  avatarOverlay: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  metaDot: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
    opacity: 0.6,
  },
  menuButtonOverlay: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Interaction Overlay - Giữa phía dưới (có thể có 3 hoặc 4 nút)
  interactionOverlay: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 30,
    gap: 8,
  },
  overlayButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  reactionCount: {
    position: 'absolute',
    bottom: -6,
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  mapIconInteraction: {
    width: 24,
    height: 24,
    tintColor: '#FFFFFF',
  },
  albumIconInteraction: {
    width: 24,
    height: 24,
    tintColor: '#FFFFFF',
  },
  animatedHeart: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -50,
    marginTop: -50,
    zIndex: 100,
  },
  lottieAnimation: {
    position: 'absolute',
    width: 300,
    height: 300,
    top: '50%',
    left: '50%',
    marginLeft: -150,
    marginTop: -150,
    zIndex: 100,
    pointerEvents: 'none',
  },
  
  // Media Indicator
  mediaIndicator: {
    position: 'absolute',
    bottom: 76,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  indicatorDotActive: {
    backgroundColor: '#fff',
    width: 20,
  },
});
