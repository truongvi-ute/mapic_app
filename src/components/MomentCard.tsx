import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32; // 16px margin on each side

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
}

interface MomentCardProps {
  moment: Moment;
  onPressProfile?: () => void;
  onPressMap?: () => void;
  onPressLike?: () => void;
  onPressComment?: () => void;
  onPressShare?: () => void;
  onPressMenu?: () => void;
  baseUrl?: string;
}

const CATEGORY_LABELS: { [key: string]: string } = {
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
  baseUrl = 'http://192.168.1.26:8080',
}: MomentCardProps) {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [liked, setLiked] = useState(false);

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

  const openGoogleMaps = () => {
    if (moment.location) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${moment.location.latitude},${moment.location.longitude}`;
      Linking.openURL(url).catch(() => {
        Alert.alert('Lỗi', 'Không thể mở Google Maps');
      });
    }
  };

  const handleLike = () => {
    setLiked(!liked);
    onPressLike?.();
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / CARD_WIDTH);
    setCurrentMediaIndex(index);
  };

  const mediaCount = moment.media?.length || 0;

  return (
    <View style={styles.card}>
      {/* 1. LOCATION SECTION - Top with gradient overlay */}
      {moment.location && (
        <View style={styles.locationSection}>
          <View style={styles.locationGradient}>
            <View style={styles.locationContent}>
              <View style={styles.locationLeft}>
                <Ionicons name="location" size={20} color="#007AFF" />
                <View style={styles.locationTextContainer}>
                  <Text style={styles.locationText} numberOfLines={1}>
                    {getLocationText()}
                  </Text>
                </View>
              </View>
              <View style={styles.locationActions}>
                {onPressMap && (
                  <TouchableOpacity
                    style={styles.locationButton}
                    onPress={onPressMap}
                  >
                    <Ionicons name="map-outline" size={18} color="#007AFF" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.locationButton}
                  onPress={openGoogleMaps}
                >
                  <Ionicons name="navigate-outline" size={18} color="#007AFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* 2. AUTHOR SECTION */}
      <View style={styles.authorSection}>
        <TouchableOpacity
          style={styles.authorLeft}
          onPress={onPressProfile}
          activeOpacity={0.7}
        >
          <Image
            source={{
              uri: moment.author.avatarUrl
                ? `${baseUrl}/uploads/avatars/${moment.author.avatarUrl}`
                : 'https://via.placeholder.com/40',
            }}
            style={styles.avatar}
          />
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>{moment.author.fullName}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.timeText}>{getTimeAgo(moment.createdAt)}</Text>
              <View style={styles.dot} />
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>
                  {CATEGORY_LABELS[moment.category] || moment.category}
                </Text>
              </View>
              {!moment.isPublic && (
                <>
                  <View style={styles.dot} />
                  <Ionicons name="lock-closed" size={12} color="#666" />
                </>
              )}
            </View>
          </View>
        </TouchableOpacity>
        {onPressMenu && (
          <TouchableOpacity
            style={styles.menuButton}
            onPress={onPressMenu}
          >
            <Ionicons name="ellipsis-horizontal" size={24} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* 3. MEDIA SECTION */}
      {mediaCount > 0 && (
        <View style={styles.mediaSection}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {moment.media?.map((media, index) => (
              <View key={media.id} style={styles.mediaContainer}>
                {media.mediaType === 'IMAGE' ? (
                  <Image
                    source={{ uri: `${baseUrl}/uploads/moments/${media.mediaUrl}` }}
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
          
          {/* Media indicator */}
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

      {/* Caption */}
      {moment.content && (
        <View style={styles.captionSection}>
          <Text style={styles.captionText}>{moment.content}</Text>
        </View>
      )}

      {/* 4. INTERACTION SECTION */}
      <View style={styles.interactionSection}>
        <TouchableOpacity
          style={styles.interactionButton}
          onPress={handleLike}
          activeOpacity={0.7}
        >
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={24}
            color={liked ? '#FF3B30' : '#666'}
          />
          <Text style={[styles.interactionText, liked && styles.likedText]}>
            Thích
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.interactionButton}
          onPress={onPressComment}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-outline" size={22} color="#666" />
          <Text style={styles.interactionText}>Bình luận</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.interactionButton}
          onPress={onPressShare}
          activeOpacity={0.7}
        >
          <Ionicons name="share-outline" size={22} color="#666" />
          <Text style={styles.interactionText}>Chia sẻ</Text>
        </TouchableOpacity>
      </View>
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
  
  // Location Section
  locationSection: {
    overflow: 'hidden',
  },
  locationGradient: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F0F7FF', // Light blue background instead of gradient
  },
  locationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  locationTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  locationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  locationButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  // Author Section
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  authorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f0f0',
  },
  authorInfo: {
    marginLeft: 12,
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 13,
    color: '#666',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#999',
    marginHorizontal: 6,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#F0F0F0',
  },
  categoryText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  menuButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Media Section
  mediaSection: {
    position: 'relative',
  },
  mediaContainer: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.25, // 4:5 aspect ratio
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
  mediaIndicator: {
    position: 'absolute',
    bottom: 12,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  captionText: {
    fontSize: 15,
    color: '#000',
    lineHeight: 20,
  },

  // Interaction Section
  interactionSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  interactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  interactionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  likedText: {
    color: '#FF3B30',
  },
});
