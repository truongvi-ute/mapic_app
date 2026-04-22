import React, { useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import GradientView from './ui/GradientView';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Moment } from './MomentCard';
import { getImageUrl } from '../utils/uiUtils';

const { width: W, height: H } = Dimensions.get('window');

interface MomentViewerModalProps {
  visible: boolean;
  moments: Moment[];
  initialIndex: number;
  onClose: () => void;
}

export default function MomentViewerModal({
  visible,
  moments,
  initialIndex,
  onClose,
}: MomentViewerModalProps) {
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [mediaIndex, setMediaIndex] = useState(0);

  // Scroll to correct item when modal opens
  const handleModalShow = useCallback(() => {
    setCurrentIndex(initialIndex);
    setMediaIndex(0);
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false });
    }, 50);
  }, [initialIndex]);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index ?? 0);
      setMediaIndex(0);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;

  const renderItem = ({ item }: { item: Moment }) => {
    const mediaList = item.media || [];
    const author = (item as any).author;

    return (
      <View style={styles.page}>
        {/* Media Pager (horizontal within a moment) */}
        <FlatList
          data={mediaList.length > 0 ? mediaList : [null]}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => `media-${i}`}
          renderItem={({ item: media, index: mIdx }) => {
            const imgUrl = media ? getImageUrl(media.mediaUrl, 'moment') : null;
            return (
              <View style={styles.mediaSlide}>
                {imgUrl ? (
                  <Image
                    source={{ uri: imgUrl }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                  />
                ) : (
                  <GradientView
                    colors={['#1e1b4b', '#312e81', '#4c1d95']}
                    style={StyleSheet.absoluteFill}
                  />
                )}
              </View>
            );
          }}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / W);
            setMediaIndex(idx);
          }}
        />

        {/* Gradient overlay */}
        <GradientView
          colors={['rgba(0,0,0,0.55)', 'transparent', 'transparent', 'rgba(0,0,0,0.90)']}
          locations={[0, 0.2, 0.5, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Media dots indicator */}
        {mediaList.length > 1 && (
          <View style={styles.dots}>
            {mediaList.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === mediaIndex && styles.dotActive]}
              />
            ))}
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.authorRow}>
            {author?.avatarUrl ? (
              <Image
                source={{ uri: getImageUrl(author.avatarUrl, 'avatar') || '' }}
                style={styles.authorAvatar}
                contentFit="cover"
              />
            ) : (
              <GradientView
                colors={['#4361EE', '#7209b7']}
                style={styles.authorAvatar}
              />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.authorName}>{author?.name || 'Người dùng'}</Text>
              {item.location && (
                <View style={styles.locationRow}>
                  <Ionicons name="location" size={11} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.locationText}>
                    {item.location.name || item.location.address}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Content */}
        <View style={styles.contentArea}>
          {/* Category badge */}
          {item.category && (
            <BlurView intensity={30} tint="dark" style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </BlurView>
          )}

          {/* Caption */}
          {item.content ? (
            <Text style={styles.caption} numberOfLines={3}>
              {item.content}
            </Text>
          ) : null}

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="heart" size={18} color="#EC4899" />
              <Text style={styles.statText}>{(item as any).reactionCount || 0}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="chatbubble" size={18} color="#8B5CF6" />
              <Text style={styles.statText}>{(item as any).commentCount || 0}</Text>
            </View>
            {item.province && (
              <View style={[styles.statItem, { marginLeft: 'auto' }]}>
                <Ionicons name="map" size={15} color="rgba(255,255,255,0.6)" />
                <Text style={[styles.statText, { color: 'rgba(255,255,255,0.6)', fontSize: 12 }]}>
                  {item.province.name}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Swipe hint */}
        <View style={styles.swipeHint}>
          <Text style={styles.swipeHintText}>
            {currentIndex + 1} / {moments.length}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onShow={handleModalShow}
    >
      <StatusBar hidden />
      <View style={styles.container}>
        {/* Close button */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
          <BlurView intensity={50} tint="dark" style={styles.closeBtnInner}>
            <Ionicons name="close" size={22} color="#FFF" />
          </BlurView>
        </TouchableOpacity>

        <FlatList
          ref={flatListRef}
          data={moments}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={(_, index) => ({
            length: W,
            offset: W * index,
            index,
          })}
          initialScrollIndex={initialIndex}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  page: {
    width: W,
    height: H,
    backgroundColor: '#000',
  },
  mediaSlide: {
    width: W,
    height: H,
    backgroundColor: '#0d0d0d',
  },

  // Header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  authorAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  authorName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  locationText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },

  // Media dots
  dots: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 20,
  },
  dot: {
    flex: 1,
    maxWidth: 40,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: {
    backgroundColor: '#FFF',
  },

  // Content
  contentArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 48,
    gap: 10,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  caption: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.90)',
    lineHeight: 22,
    fontWeight: '400',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },

  // Close button
  closeBtn: {
    position: 'absolute',
    top: 52,
    right: 18,
    zIndex: 100,
  },
  closeBtnInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },

  // Counter
  swipeHint: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  swipeHintText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
  },
});
