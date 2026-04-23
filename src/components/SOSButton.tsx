import React, { useState } from 'react';
import { 
  TouchableOpacity, 
  StyleSheet, 
  View, 
  Text, 
  ActivityIndicator,
  Animated,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS } from '../constants/design';
import { useSOSStore } from '../store/sosStore';

export default function SOSButton() {
  const [loading, setLoading] = useState(false);
  const triggerSOS = useSOSStore((state) => state.triggerSOS);
  const activeAlert = useSOSStore((state) => state.activeAlert);
  const scaleAnim = new Animated.Value(1);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handleTrigger = async () => {
    if (activeAlert) {
      Alert.alert('SOS Đang Hoạt Động', 'Bạn đang trong tình trạng khẩn cấp.');
      return;
    }

    Alert.alert(
      'Xác Nhận SOS',
      'Bạn có chắc chắn muốn gửi tín hiệu khẩn cấp đến tất cả bạn bè?',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Gửi Cấp Cứu', 
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await triggerSOS();
            } catch (error: any) {
              Alert.alert('Lỗi', error.message || 'Không thể gửi tín hiệu SOS');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={[styles.button, activeAlert && styles.activeButton]}
        onPress={handleTrigger}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <View style={styles.content}>
            <Ionicons name="warning" size={24} color="#FFF" />
            <Text style={styles.text}>SOS</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    alignSelf: 'center',
  },
  button: {
    backgroundColor: '#FF3B30',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  activeButton: {
    backgroundColor: '#000',
    borderColor: '#FF3B30',
  },
  content: {
    alignItems: 'center',
  },
  text: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 16,
    marginTop: 2,
  },
});
