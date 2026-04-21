import React, { useState } from 'react';
import { View, Image, StyleProp, ViewStyle, Text } from 'react-native';

interface ImageMarkerProps {
  imageUrl?: string;
  style?: StyleProp<ViewStyle>;
  size?: number;
  onImageLoad?: () => void;
}

export default function ImageMarker({
  imageUrl,
  style,
  size = 100,
  onImageLoad,
}: ImageMarkerProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  console.log('[ImageMarker] Rendering with imageUrl:', imageUrl);

  const BORDER = 3;
  const RADIUS = 8;
  const TAIL_W = 14;
  const TAIL_H = 10;

  const TOTAL_WIDTH = size;
  const TOTAL_HEIGHT = size + TAIL_H;

  return (
    <View
      collapsable={false}
      style={[
        {
          width: TOTAL_WIDTH,
          height: TOTAL_HEIGHT,
          alignItems: 'center',
        },
        style,
      ]}
    >
      {/* White border frame */}
      <View
        style={{
          width: size,
          height: size,
          backgroundColor: '#ffffff',
          borderRadius: RADIUS,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 5,
        }}
      >
        {/* Image container */}
        <View
          style={{
            width: size - BORDER * 2,
            height: size - BORDER * 2,
            borderRadius: RADIUS - BORDER / 2,
            overflow: 'hidden',
            backgroundColor: '#e0e0e0',
          }}
        >
          {imageUrl && !imageError ? (
            <Image
              source={{ uri: imageUrl }}
              style={{ width: size - BORDER * 2, height: size - BORDER * 2 }}
              resizeMode="cover"
              onLoad={() => {
                console.log('[ImageMarker] Image loaded successfully');
                setImageLoaded(true);
                if (onImageLoad) onImageLoad();
              }}
              onError={(error) => {
                console.error('[ImageMarker] Image load error:', error.nativeEvent);
                setImageError(true);
              }}
              fadeDuration={0}
            />
          ) : (
            <View style={{ flex: 1, backgroundColor: '#e53935', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 10 }}>📷</Text>
            </View>
          )}
        </View>
      </View>

      {/* Triangle tail */}
      <View
        style={{
          width: 0,
          height: 0,
          borderStyle: 'solid',
          borderLeftWidth: TAIL_W / 2,
          borderRightWidth: TAIL_W / 2,
          borderTopWidth: TAIL_H,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: '#ffffff',
        }}
      />
    </View>
  );
}
