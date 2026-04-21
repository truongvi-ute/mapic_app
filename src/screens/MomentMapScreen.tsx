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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapLibreGL from '@maplibre/maplibre-react-native';
import ImageMarker from '../components/ImageMarker';
import { getApiUrl, getBaseUrl, buildMomentImageUrl } from '../config/api';

MapLibreGL.setAccessToken(null);

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
  onBack: () => void;
}

export default function MomentMapScreen({
  latitude,
  longitude,
  addressName,
  provinceName,
  imageUrl,
  onBack,
}: MomentMapScreenProps) {
  const baseUrl = getBaseUrl();

  console.log('[MomentMapScreen] Props:', {
    latitude,
    longitude,
    addressName,
    provinceName,
    imageUrl,
  });

  // Build full image URL
  const fullImageUrl = imageUrl 
    ? (imageUrl.startsWith('http') 
        ? imageUrl 
        : buildMomentImageUrl(imageUrl))
    : undefined;

  console.log('[MomentMapScreen] Base URL:', baseUrl);
  console.log('[MomentMapScreen] Full image URL:', fullImageUrl);

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Vị trí
          </Text>
          {provinceName && (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {provinceName}
            </Text>
          )}
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapLibreGL.MapView
          style={StyleSheet.absoluteFillObject}
          mapStyle={defaultMapStyle}
          logoEnabled={false}
          attributionEnabled={false}
        >
          <MapLibreGL.Camera
            zoomLevel={16}
            centerCoordinate={[longitude, latitude]}
          />
          <MapLibreGL.PointAnnotation
            id="momentMarker"
            coordinate={[longitude, latitude]}
            anchor={{ x: 0.5, y: 1 }}
          >
            {fullImageUrl ? (
              <ImageMarker imageUrl={fullImageUrl} size={100} />
            ) : (
              <View style={styles.simpleMarker}>
                <View style={styles.simpleMarkerDot} />
              </View>
            )}
          </MapLibreGL.PointAnnotation>
        </MapLibreGL.MapView>

        {/* Address Card */}
        <View style={styles.addressCard}>
          <Ionicons name="location" size={20} color="#e53935" />
          <View style={styles.addressCardText}>
            <Text style={styles.addressText} numberOfLines={2}>
              {addressName}
            </Text>
            <Text style={styles.coordsText}>
              {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.directionButton}
            onPress={handleDirections}
            activeOpacity={0.8}
          >
            <Ionicons name="navigate-circle" size={42} color="#1a73e8" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a73e8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a73e8',
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#E3F2FD',
    marginTop: 2,
  },
  placeholder: {
    width: 32,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  simpleMarker: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simpleMarkerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#e53935',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  addressCard: {
    position: 'absolute',
    bottom: 20,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
  },
  addressCardText: {
    flex: 1,
  },
  addressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    lineHeight: 20,
  },
  coordsText: {
    fontSize: 11,
    color: '#9e9e9e',
    marginTop: 2,
  },
  directionButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
