import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  StatusBar,
  SafeAreaView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { getApiUrl, getBaseUrl, buildMomentImageUrl } from '../config/api';

try { MapLibreGL.setAccessToken(null); } catch (_) {}

// Detect if MapLibreGL native module is available
let isMapNativeAvailable = false;
try {
  const { NativeModules } = require('react-native');
  isMapNativeAvailable = !!(NativeModules.MLRNModule || NativeModules.RNMBXModule || NativeModules.MapboxGL);
} catch (_) {}

const defaultMapStyle = JSON.stringify({
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
    },
  ],
});

interface MomentMapScreenProps {
  latitude: number;
  longitude: number;
  addressName: string;
  provinceName?: string;
  imageUrl?: string;
  caption?: string;
  onBack: () => void;
}

export default function MomentMapScreen({
  latitude,
  longitude,
  addressName,
  provinceName,
  imageUrl,
  caption,
  onBack,
}: MomentMapScreenProps) {
  const baseUrl = getBaseUrl();
  const [imageReady, setImageReady] = React.useState(false);

  console.log('[MomentMapScreen] Props:', {
    latitude,
    longitude,
    addressName,
    provinceName,
    imageUrl,
    caption,
  });

  // Build full image URL
  const fullImageUrl = imageUrl 
    ? (imageUrl.startsWith('http') 
        ? imageUrl 
        : buildMomentImageUrl(imageUrl))
    : undefined;

  console.log('[MomentMapScreen] Base URL:', baseUrl);
  console.log('[MomentMapScreen] Full image URL:', fullImageUrl);
  console.log('[MomentMapScreen] Marker will be placed at:', [longitude, latitude]);

  // Pre-load image
  React.useEffect(() => {
    if (fullImageUrl) {
      Image.prefetch(fullImageUrl)
        .then(() => {
          console.log('[MomentMapScreen] Image prefetched successfully');
          setImageReady(true);
        })
        .catch((error) => {
          console.log('[MomentMapScreen] Image prefetch error:', error);
          setImageReady(true);
        });
    } else {
      setImageReady(true);
    }
  }, [fullImageUrl]);

  const handleDirections = () => {
    const url = Platform.select({
      ios: `maps:0,0?q=${addressName}@${latitude},${longitude}`,
      android: `google.navigation:q=${latitude},${longitude}&mode=d`,
    });

    if (url) {
      Linking.canOpenURL(url).then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
          Linking.openURL(webUrl);
        }
      });
    }
  };

  // Fallback when MapLibreGL native module is not available (Expo Go)
  if (!isMapNativeAvailable) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="light-content" />
        <Ionicons name="map-outline" size={64} color="#4361EE" />
        <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '700', marginTop: 16, textAlign: 'center' }}>
          {addressName || provinceName || 'Vị trí không xác định'}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 8, textAlign: 'center' }}>
          Bản đồ không khả dụng trong Expo Go
        </Text>
        <TouchableOpacity
          style={{ marginTop: 24, backgroundColor: '#4361EE', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, flexDirection: 'row', gap: 8, alignItems: 'center' }}
          onPress={handleDirections}
        >
          <Ionicons name="navigate-outline" size={18} color="#FFF" />
          <Text style={{ color: '#FFF', fontWeight: '700' }}>Mở Google Maps</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ marginTop: 16, padding: 12 }}
          onPress={onBack}
        >
          <Text style={{ color: 'rgba(255,255,255,0.6)' }}>Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Map - Full screen */}
      <MapLibreGL.MapView
        style={StyleSheet.absoluteFillObject}
        mapStyle={defaultMapStyle}
        logoEnabled={false}
        attributionEnabled={false}
        scrollEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        zoomEnabled={false}
      >
        <MapLibreGL.Camera
          zoomLevel={15}
          centerCoordinate={[longitude, latitude]}
          animationMode="flyTo"
          animationDuration={1000}
        />
        
        {/* No marker on map - we use fixed overlay instead */}
      </MapLibreGL.MapView>

      {/* Info Overlay - Top */}
      <View style={styles.infoOverlay}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.infoContent}>
          {/* Address with icon */}
          <View style={styles.addressRow}>
            <Image
              source={require('../assets/images/location.png')}
              style={styles.locationIcon}
            />
            <Text style={styles.addressText}>
              {addressName}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.directionsButton}
          onPress={handleDirections}
          activeOpacity={0.8}
        >
          <Image
            source={require('../assets/images/path.png')}
            style={styles.pathIcon}
          />
        </TouchableOpacity>
      </View>

      {/* Caption Overlay - Bottom Left */}
      {caption && (
        <View style={styles.captionOverlay} pointerEvents="none">
          <Text style={styles.captionText} numberOfLines={3}>
            {caption}
          </Text>
        </View>
      )}

      {/* Fixed Image Preview Card - Center of screen */}
      {fullImageUrl && imageReady && (
        <View style={styles.fixedImageContainer} pointerEvents="none">
          <View style={styles.imagePreviewCard}>
            <Image
              source={{ uri: fullImageUrl }}
              style={styles.previewImage}
              resizeMode="cover"
            />
          </View>
          {/* Triangle tail pointing down */}
          <View style={styles.previewTail} />
          {/* Fixed marker dot at the tip of triangle */}
          <View style={styles.fixedMarkerDot} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  infoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 12 : 50,
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  infoContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 4,
  },
  locationIcon: {
    width: 18,
    height: 18,
    marginTop: 2,
  },
  addressText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    lineHeight: 20,
  },
  directionsButton: {
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pathIcon: {
    width: 24,
    height: 24,
  },
  captionOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 12,
    maxWidth: '70%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  captionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    lineHeight: 20,
  },
  fixedImageContainer: {
    position: 'absolute',
    top: '35%',
    left: '50%',
    transform: [{ translateX: -60 }], // Center horizontally (120/2)
    alignItems: 'center',
  },
  imagePreviewCard: {
    width: 120,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  previewImage: {
    width: 112,
    height: 112,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  previewTail: {
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#fff',
    marginTop: 0,
  },
  fixedMarkerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#e53935',
    borderWidth: 3,
    borderColor: '#fff',
    marginTop: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
});
