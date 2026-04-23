import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Animated,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { buildMomentImageUrl, getApiUrl } from '../config/api';
import { Moment } from './MomentCard';

const { width } = Dimensions.get('window');
// Card width is determined by the parent container, but we define a default aspect ratio
const ASPECT_RATIO = 1; // Square cards for mini format

interface MiniMomentCardProps {
  moment: Moment;
  onPressLike?: () => void;
  onPress?: () => void;
  token?: string;
}

export default function MiniMomentCard({
  moment,
  onPressLike,
  onPress,
  token,
}: MiniMomentCardProps) {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [liked, setLiked] = useState(moment.userReacted || false);
  const [likeCount, setLikeCount] = useState(moment.reactionCount || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [showLottie, setShowLottie] = useState(false);
  const [cardWidth, setCardWidth] = useState(0);
  const [userReactionType, setUserReactionType] = useState<string | undefined>(
    (moment as any).userReactionType
  );

  // Animation values
  const scaleAnim = useState(new Animated.Value(1))[0];
  const lottieRef = useRef<LottieView>(null);
  
  // Sync state with props when moment changes
  React.useEffect(() => {
    setLiked(moment.userReacted || false);
    setLikeCount(moment.reactionCount || 0);
    setUserReactionType((moment as any).userReactionType);
  }, [moment.id, moment.userReacted, moment.reactionCount, (moment as any).userReactionType]);
  
  // Helper function to get emoji from reaction type
  const getEmojiFromType = (type?: string) => {
    switch (type) {
      case 'LIKE': return '👍';
      case 'HEART': return '❤️';
      case 'HAHA': return '😂';
      case 'WOW': return '😮';
      case 'SAD': return '😢';
      case 'ANGRY': return '😠';
      default: return null;
    }
  };

  const handleLike = async () => {
    if (isLiking || !token) {
      return;
    }
    
    setIsLiking(true);
    const wasLiked = liked;
    const previousCount = likeCount;
    
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
      const response = await fetch(`${API_URL}/reactions/moments/${moment.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'HEART' }),
      });
      
      if (!response.ok) {
        // Revert on error
        setLiked(wasLiked);
        setLikeCount(previousCount);
      }
      
      onPressLike?.();
    } catch (error) {
      // Revert on error
      setLiked(wasLiked);
      setLikeCount(previousCount);
    } finally {
      setIsLiking(false);
    }
  };



  const mediaCount = moment.media?.length || 0;

  return (
    <TouchableOpacity 
      style={styles.card}
      activeOpacity={1}
      onPress={onPress}
    >
      {/* MEDIA SECTION */}
      {mediaCount > 0 && moment.media && moment.media[currentMediaIndex] ? (
        <View style={styles.mediaSection}>
          <View style={[styles.mediaContainer, { width: '100%', height: '100%' }]}>
            {moment.media[currentMediaIndex].mediaType === 'IMAGE' ? (
              <Image
                source={{ uri: buildMomentImageUrl(moment.media[currentMediaIndex].mediaUrl) || undefined }}
                style={styles.mediaImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.videoPlaceholder}>
                <Ionicons name="play-circle" size={40} color="#fff" />
              </View>
            )}
          </View>


          

          
          {/* Reaction Overlay (Bottom Right) */}
          <View style={styles.reactionOverlay}>
            <TouchableOpacity
              style={styles.reactionButton}
              onPress={handleLike}
              activeOpacity={0.7}
              disabled={isLiking}
            >
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                {liked && userReactionType ? (
                  <Text style={styles.reactionEmoji}>{getEmojiFromType(userReactionType)}</Text>
                ) : (
                  <Ionicons
                    name="heart-outline"
                    size={20}
                    color="#FFFFFF"
                  />
                )}
              </Animated.View>
              {likeCount > 0 && (
                <Text style={styles.reactionCountText}>{likeCount}</Text>
              )}
            </TouchableOpacity>
          </View>
          
          {/* Lottie Love Animation */}
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
      ) : (
        <View style={styles.noMediaContainer}>
          <Ionicons name="image-outline" size={40} color="#ccc" />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    aspectRatio: ASPECT_RATIO, // Ensures the card is square or whatever ratio we want
    width: '100%',
  },

  // Media Section
  mediaSection: {
    flex: 1,
    position: 'relative',
  },
  mediaContainer: {
    backgroundColor: '#F5F5F5',
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
  noMediaContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
  },
  

  

  
  // Reaction Overlay
  reactionOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
    elevation: 10,
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  reactionCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  reactionEmoji: {
    fontSize: 20,
  },
  
  lottieAnimation: {
    position: 'absolute',
    width: 150,
    height: 150,
    top: '50%',
    left: '50%',
    marginLeft: -75,
    marginTop: -75,
    zIndex: 100,
    pointerEvents: 'none',
  },
  
  // Media Indicator
  mediaIndicator: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  indicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  indicatorDotActive: {
    backgroundColor: '#fff',
    width: 12,
  },
});
