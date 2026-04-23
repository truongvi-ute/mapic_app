import React, { useState, useRef, useEffect } from 'react';
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
import ShareTargetModal from './ShareTargetModal';

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
  userReactionType?: 'LIKE' | 'HEART' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY';
  commentCount?: number;
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
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [userReactionType, setUserReactionType] = useState<string | undefined>(
    (moment as any).userReactionType
  );
  
  // Sync state with props when moment changes
  useEffect(() => {
    setLiked(moment.userReacted || false);
    setLikeCount(moment.reactionCount || 0);
    setUserReactionType((moment as any).userReactionType);
  }, [moment.id, moment.userReacted, moment.reactionCount, (moment as any).userReactionType]);
  
  // Animation values
  const scaleAnim = useState(new Animated.Value(1))[0];
  const lottieRef = useRef<LottieView>(null);
  
  const actualBaseUrl = baseUrl || getBaseUrl();

  // Helper function to get emoji from reaction type
  const getEmojiFromType = (type?: string) => {
    switch (type) {
      case 'LIKE': return '👍';
      case 'HEART': return '❤️';
      case 'HAHA': return '😂';
      case 'WOW': return '😮';
      case 'SAD': return '😢';
      case 'ANGRY': return '😠';
      default: return '❤️';
    }
  };

  // Auto-close emoji picker after 5 seconds
  useEffect(() => {
    if (showReactions) {
      const timer = setTimeout(() => {
        setShowReactions(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showReactions]);

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

  const handleReact = async (reactionType: string) => {
    console.log('[MomentCard] handleReact called', { isLiking, hasToken: !!token, momentId: moment.id, type: reactionType });
    
    // Close emoji picker
    setShowReactions(false);
    
    if (isLiking || !token) {
      console.log('[MomentCard] Skipping - isLiking:', isLiking, 'hasToken:', !!token);
      return;
    }
    
    setIsLiking(true);
    
    // Safety timeout để đảm bảo isLiking được reset
    const safetyTimeout = setTimeout(() => {
      console.log('[MomentCard] Safety timeout - resetting isLiking');
      setIsLiking(false);
    }, 5000);
    
    const wasLiked = liked;
    const previousCount = likeCount;
    const previousType = userReactionType;
    
    console.log('[MomentCard] Before react - liked:', wasLiked, 'count:', previousCount, 'type:', previousType);
    
    // Optimistic update logic
    const isCurrentlyReacted = liked && userReactionType === reactionType;
    
    if (isCurrentlyReacted) {
      // Remove reaction (toggle off)
      setLiked(false);
      setUserReactionType(undefined);
      setLikeCount(likeCount - 1);
    } else if (liked && userReactionType !== reactionType) {
      // Change reaction type (count stays same)
      setUserReactionType(reactionType);
    } else {
      // Add new reaction
      setLiked(true);
      setUserReactionType(reactionType);
      setLikeCount(likeCount + 1);
    }
    
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
    
    // Heart animation (only when adding reaction)
    if (!wasLiked) {
      console.log('[MomentCard] Starting Lottie animation');
      setShowLottie(true);
      
      setTimeout(() => {
        lottieRef.current?.reset();
        lottieRef.current?.play();
      }, 50);
      
      setTimeout(() => {
        setShowLottie(false);
      }, 3000);
    }
    
    try {
      const API_URL = getApiUrl();
      console.log('[MomentCard] Calling reaction API:', `${API_URL}/reactions/moments/${moment.id}`, 'type:', reactionType);
      
      const response = await fetch(`${API_URL}/reactions/moments/${moment.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: reactionType }),
      });
      
      const responseText = await response.text();
      console.log('[MomentCard] Reaction API status:', response.status, 'body:', responseText);
      
      if (!response.ok) {
        console.error('[MomentCard] Reaction failed:', response.status, responseText);
        // Revert on failure
        setLiked(wasLiked);
        setLikeCount(previousCount);
        setUserReactionType(previousType);
      } else {
        // Notify parent on success (if callback provided)
        onPressLike?.();
      }
    } catch (error) {
      // Revert on error
      setLiked(wasLiked);
      setLikeCount(previousCount);
      setUserReactionType(previousType);
      console.error('[MomentCard] Error toggling reaction:', error);
    } finally {
      clearTimeout(safetyTimeout);
      setIsLiking(false);
    }
  };

  const handleLike = () => {
    console.log('[MomentCard] handleLike called', { hasOnPressLike: !!onPressLike, isLiking });
    
    // Luôn xử lý reaction internally, không để parent override
    console.log('[MomentCard] Handling like internally');
    handleReact('HEART');
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
          
          {/* Media Indicator - Nằm ngoài overlay */}
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
          
          {/* Interaction Overlay - 2 hàng 4 cột */}
          <View style={styles.interactionOverlay}>
            {/* Hàng 1: Icons */}
            <View style={styles.iconsRow}>
              <TouchableOpacity
                style={styles.overlayButton}
                onPress={handleLike}
                onLongPress={() => setShowReactions(true)}
                activeOpacity={0.7}
                disabled={isLiking}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Animated.View style={{ transform: [{ scale: scaleAnim }] }} pointerEvents="none">
                  {liked && userReactionType ? (
                    <Text style={styles.reactionEmoji}>{getEmojiFromType(userReactionType)}</Text>
                  ) : (
                    <Ionicons
                      name="heart-outline"
                      size={28}
                      color="#FFFFFF"
                    />
                  )}
                </Animated.View>
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
                onPress={() => setShareModalVisible(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="share-outline" size={26} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Map Button - Chỉ hiện khi có location */}
              {moment.location && onPressMap ? (
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
              ) : showAddToAlbum && onPressAddToAlbum ? (
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
              ) : (
                <View style={styles.overlayButton} />
              )}
            </View>
            
            {/* Hàng 2: Số lượng */}
            <View style={styles.countsRow}>
              <View style={styles.countColumn}>
                {likeCount > 0 && (
                  <Text style={styles.reactionCountInside}>{likeCount}</Text>
                )}
              </View>
              <View style={styles.countColumn}>
                {moment.commentCount! > 0 && (
                  <Text style={styles.reactionCountInside}>{moment.commentCount}</Text>
                )}
              </View>
              <View style={styles.countColumn} />
              <View style={styles.countColumn} />
            </View>
            
            {/* Emoji Picker */}
            {showReactions && (
              <View style={styles.reactionPicker}>
                {(['LIKE', 'HEART', 'HAHA', 'WOW', 'SAD', 'ANGRY'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={styles.reactionBubble}
                    onPress={() => handleReact(type)}
                  >
                    <Text style={styles.reactionEmojiPicker}>
                      {getEmojiFromType(type)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
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
        </View>
      )}

      {/* Caption Section */}
      {moment.content && (
        <View style={styles.captionSection}>
          <Text style={styles.captionText}>{moment.content}</Text>
        </View>
      )}

      <ShareTargetModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        shareType="MOMENT"
        referenceId={moment.id}
      />
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
  
  // Interaction Overlay - 2 hàng 4 cột
  interactionOverlay: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 30,
    paddingVertical: 8,
    paddingHorizontal: 12,
    zIndex: 200,
  },
  iconsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  countsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  countColumn: {
    width: 48,
    alignItems: 'center',
    minHeight: 16,
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
  reactionButtonContainer: {
    alignItems: 'center',
    gap: 1,
  },
  reactionCountInside: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  reactionCountBelow: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    minWidth: 20,
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
    bottom: 120,
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

  // Caption Section
  captionSection: {
    padding: 16,
    paddingTop: 12,
  },
  captionText: {
    fontSize: 15,
    lineHeight: 20,
    color: '#1C1C1E',
  },
  
  // Emoji Reactions
  reactionEmoji: {
    fontSize: 28,
  },
  reactionPicker: {
    position: 'absolute',
    bottom: 70, // Tăng từ 50 lên 70 để không che nút tim
    left: 0,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 25,
    padding: 8,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 300,
  },
  reactionBubble: {
    paddingHorizontal: 6,
  },
  reactionEmojiPicker: {
    fontSize: 24,
  },
});
