import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { vietnamLocations, Province, District, Ward } from '../data/vietnamLocations';

// MapLibre configuration
try { MapLibreGL.setAccessToken(null); } catch (_) {}

// OpenStreetMap style for detailed Vietnam map
const osmMapStyle = JSON.stringify({
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap",
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm",
    },
  ],
});

const { width, height } = Dimensions.get('window');

interface LocationPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (location: {
    province: string;
    district: string;
    ward: string;
    provinceId: string;
    districtId: string;
    wardId: string;
    latitude: number;
    longitude: number;
    fullAddress: string;
  }) => void;
}

export default function LocationPicker({ visible, onClose, onSelect }: LocationPickerProps) {
  const [step, setStep] = useState<'province' | 'district' | 'ward' | 'map'>('province');
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);
  const [loading, setLoading] = useState(false);
  const [coordinates, setCoordinates] = useState<[number, number]>([105.8342, 21.0278]); // Default: Hanoi
  const [markerCoordinates, setMarkerCoordinates] = useState<[number, number]>([105.8342, 21.0278]);

  useEffect(() => {
    if (!visible) {
      // Reset when modal closes
      setStep('province');
      setSelectedProvince(null);
      setSelectedDistrict(null);
      setSelectedWard(null);
    }
  }, [visible]);

  const handleProvinceSelect = (province: Province) => {
    setSelectedProvince(province);
    setSelectedDistrict(null);
    setSelectedWard(null);
    setStep('district');
  };

  const handleDistrictSelect = (district: District) => {
    setSelectedDistrict(district);
    setSelectedWard(null);
    setStep('ward');
  };

  const handleWardSelect = async (ward: Ward) => {
    setSelectedWard(ward);
    setLoading(true);

    try {
      // Build full address using path from data
      const fullAddress = `${ward.nameWithType}, ${selectedDistrict?.nameWithType}, ${selectedProvince?.nameWithType}`;
      
      // Call OpenCage API to get coordinates
      const coords = await geocodeAddress(fullAddress);
      
      if (coords) {
        setCoordinates(coords);
        setMarkerCoordinates(coords);
        setStep('map');
      } else {
        Alert.alert('Lỗi', 'Không thể lấy tọa độ cho địa chỉ này');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      Alert.alert('Lỗi', 'Không thể lấy tọa độ');
    } finally {
      setLoading(false);
    }
  };

  const geocodeAddress = async (address: string): Promise<[number, number] | null> => {
    try {
      // OpenCage API - Free tier: 2,500 requests/day
      const API_KEY = '5475f95b5f1540bf82e422b0a84d97ec';
      const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=${API_KEY}&language=vi&countrycode=vn`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry;
        return [lng, lat]; // MapLibre uses [longitude, latitude]
      }
      
      return null;
    } catch (error) {
      console.error('OpenCage API error:', error);
      return null;
    }
  };

  const handleMapPress = (event: any) => {
    const { geometry } = event;
    if (geometry && geometry.coordinates) {
      setMarkerCoordinates(geometry.coordinates);
    }
  };

  const handleMarkerDragEnd = (event: any) => {
    if (event.geometry && event.geometry.coordinates) {
      setMarkerCoordinates(event.geometry.coordinates);
    }
  };

  const handleConfirm = () => {
    if (!selectedProvince || !selectedDistrict || !selectedWard) {
      Alert.alert('Lỗi', 'Vui lòng chọn đầy đủ thông tin');
      return;
    }

    const fullAddress = `${selectedWard.nameWithType}, ${selectedDistrict.nameWithType}, ${selectedProvince.nameWithType}`;
    
    onSelect({
      province: selectedProvince.name,
      district: selectedDistrict.name,
      ward: selectedWard.name,
      provinceId: selectedProvince.code,
      districtId: selectedDistrict.code,
      wardId: selectedWard.code,
      latitude: markerCoordinates[1],
      longitude: markerCoordinates[0],
      fullAddress,
    });
    
    onClose();
  };

  const handleBack = () => {
    if (step === 'district') {
      setStep('province');
      setSelectedDistrict(null);
    } else if (step === 'ward') {
      setStep('district');
      setSelectedWard(null);
    } else if (step === 'map') {
      setStep('ward');
    }
  };

  const renderStepTitle = () => {
    switch (step) {
      case 'province':
        return 'Chọn Tỉnh/Thành phố';
      case 'district':
        return 'Chọn Quận/Huyện';
      case 'ward':
        return 'Chọn Phường/Xã';
      case 'map':
        return 'Chọn vị trí chính xác';
      default:
        return '';
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Đang tải bản đồ...</Text>
        </View>
      );
    }

    if (step === 'province') {
      // Sắp xếp tỉnh/thành phố theo thứ tự chữ cái
      const sortedProvinces = [...vietnamLocations].sort((a, b) => 
        a.nameWithType.localeCompare(b.nameWithType, 'vi')
      );
      
      return (
        <ScrollView style={styles.listContainer}>
          {sortedProvinces.map((province) => (
            <TouchableOpacity
              key={province.code}
              style={styles.listItem}
              onPress={() => handleProvinceSelect(province)}
            >
              <Text style={styles.listItemText}>{province.nameWithType}</Text>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      );
    }

    if (step === 'district' && selectedProvince) {
      // Sắp xếp quận/huyện theo thứ tự chữ cái
      const sortedDistricts = [...selectedProvince.districts].sort((a, b) => 
        a.nameWithType.localeCompare(b.nameWithType, 'vi')
      );
      
      return (
        <ScrollView style={styles.listContainer}>
          {sortedDistricts.map((district) => (
            <TouchableOpacity
              key={district.code}
              style={styles.listItem}
              onPress={() => handleDistrictSelect(district)}
            >
              <Text style={styles.listItemText}>{district.nameWithType}</Text>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      );
    }

    if (step === 'ward' && selectedDistrict) {
      // Sắp xếp phường/xã theo thứ tự chữ cái
      const sortedWards = [...selectedDistrict.wards].sort((a, b) => 
        a.nameWithType.localeCompare(b.nameWithType, 'vi')
      );
      
      return (
        <ScrollView style={styles.listContainer}>
          {sortedWards.map((ward) => (
            <TouchableOpacity
              key={ward.code}
              style={styles.listItem}
              onPress={() => handleWardSelect(ward)}
            >
              <Text style={styles.listItemText}>{ward.nameWithType}</Text>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      );
    }

    if (step === 'map') {
      return (
        <View style={styles.mapContainer}>
          <MapLibreGL.MapView
            style={styles.map}
            mapStyle={osmMapStyle}
            logoEnabled={false}
            attributionEnabled={false}
            onPress={handleMapPress}
          >
            <MapLibreGL.Camera
              zoomLevel={16}
              centerCoordinate={coordinates}
              animationMode="flyTo"
              animationDuration={1000}
            />
            
            <MapLibreGL.PointAnnotation
              id="marker"
              coordinate={markerCoordinates}
              draggable
              onDragEnd={handleMarkerDragEnd}
            >
              <View style={styles.marker}>
                <Ionicons name="location" size={40} color="#007AFF" />
              </View>
            </MapLibreGL.PointAnnotation>
          </MapLibreGL.MapView>
          
          <View style={styles.mapInfo}>
            <Text style={styles.mapInfoText}>
              Kéo marker để chọn vị trí chính xác
            </Text>
            <Text style={styles.mapCoordinates}>
              Lat: {markerCoordinates[1].toFixed(6)}, Lng: {markerCoordinates[0].toFixed(6)}
            </Text>
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          {step !== 'province' && (
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#007AFF" />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>{renderStepTitle()}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Breadcrumb */}
        {(selectedProvince || selectedDistrict || selectedWard) && (
          <View style={styles.breadcrumb}>
            {selectedProvince && (
              <Text style={styles.breadcrumbText}>{selectedProvince.nameWithType}</Text>
            )}
            {selectedDistrict && (
              <>
                <Ionicons name="chevron-forward" size={16} color="#666" />
                <Text style={styles.breadcrumbText}>{selectedDistrict.nameWithType}</Text>
              </>
            )}
            {selectedWard && (
              <>
                <Ionicons name="chevron-forward" size={16} color="#666" />
                <Text style={styles.breadcrumbText}>{selectedWard.nameWithType}</Text>
              </>
            )}
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {renderContent()}
        </View>

        {/* Confirm Button (only show on map step) */}
        {step === 'map' && (
          <View style={styles.footer}>
            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.confirmButtonText}>Xác nhận</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  backButton: {
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    width: 40,
    alignItems: 'flex-end',
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    gap: 8,
  },
  breadcrumbText: {
    fontSize: 14,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  listItemText: {
    fontSize: 16,
    color: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  marker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapInfo: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  mapInfoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  mapCoordinates: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e1e8ed',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
