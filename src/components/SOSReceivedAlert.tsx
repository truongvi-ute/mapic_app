import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, SHADOWS } from '../constants/design';
import { SOSAlert } from '../types/sos';
import DefaultAvatar from './DefaultAvatar';

interface SOSReceivedAlertProps {
  alert: SOSAlert;
  onViewLocation: () => void;
  onDismiss: () => void;
}

const { width } = Dimensions.get('window');

export default function SOSReceivedAlert({
  alert,
  onViewLocation,
  onDismiss,
}: SOSReceivedAlertProps) {
  const slideAnim = useRef(new Animated.Value(-200)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 20,
      useNativeDriver: true,
      tension: 40,
      friction: 7,
    }).start();
  }, []);

  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: -200,
      duration: 300,
      useNativeDriver: true,
    }).start(onDismiss);
  };

  return (
    <Animated.View 
      style={[
        styles.container, 
        { transform: [{ translateY: slideAnim }] }
      ]}
    >
      <BlurView intensity={90} tint="dark" style={styles.blurContainer}>
        <View style={styles.header}>
          <View style={styles.alertIcon}>
            <Ionicons name="warning" size={24} color="#FF3B30" />
          </View>
          <Text style={styles.headerText}>TÍN HIỆU SOS KHẨN CẤP</Text>
          <TouchableOpacity onPress={handleDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close-circle" size={24} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.avatarContainer}>
            {alert.senderAvatar ? (
              <Image source={{ uri: alert.senderAvatar }} style={styles.avatar} />
            ) : (
              <DefaultAvatar name={alert.senderName} size={50} />
            )}
            <View style={styles.pulseContainer}>
              <View style={styles.pulse} />
            </View>
          </View>
          
          <View style={styles.info}>
            <Text style={styles.name}>{alert.senderName}</Text>
            <Text style={styles.message} numberOfLines={2}>
              {alert.message || 'Đang cần sự giúp đỡ từ bạn!'}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.viewBtn} onPress={onViewLocation}>
            <Ionicons name="location" size={20} color="#FFF" />
            <Text style={styles.viewText}>Xem vị trí ngay</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 9999,
    ...SHADOWS.large,
  },
  blurContainer: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 59, 48, 0.5)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  alertIcon: {
    marginRight: 10,
  },
  headerText: {
    flex: 1,
    color: '#FF3B30',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  content: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  pulseContainer: {
    position: 'absolute',
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: -1,
  },
  pulse: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 59, 48, 0.3)',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  info: {
    flex: 1,
  },
  name: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  message: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 18,
  },
  footer: {
    padding: 12,
    paddingTop: 0,
  },
  viewBtn: {
    backgroundColor: '#FF3B30',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderRadius: RADIUS.md,
    gap: 8,
  },
  viewText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
