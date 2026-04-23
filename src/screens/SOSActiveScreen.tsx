import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Vibration,
  ScrollView,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSOSStore } from '../store/sosStore';
import { COLORS, RADIUS, SHADOWS } from '../constants/design';
import SOSConfirmationModal from '../components/SOSConfirmationModal';

export default function SOSActiveScreen() {
  const { activeAlert, resolveSOS } = useSOSStore();
  const [showConfirm, setShowConfirm] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Continuous pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Vibrate on entry
    Vibration.vibrate([0, 500, 200, 500]);
  }, []);

  if (!activeAlert) return null;

  const handleResolve = async () => {
    await resolveSOS();
    setShowConfirm(false);
  };

  return (
    <View style={styles.container}>
      <BlurView intensity={120} tint="dark" style={StyleSheet.absoluteFill} />
      
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.header}>
            <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]} />
            <View style={styles.iconContainer}>
              <Ionicons name="warning" size={40} color="#FF3B30" />
            </View>
            <Text style={styles.statusTitle}>CHẾ ĐỘ KHẨN CẤP</Text>
            <Text style={styles.statusSubtitle}>Vị trí của bạn đang được chia sẻ trực tiếp</Text>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{activeAlert.recipientCount || 0}</Text>
              <Text style={styles.statLabel}>Người đã nhận</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statBox}>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
              <Text style={styles.statLabel}>Đang theo dõi</Text>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Hướng dẫn an toàn:</Text>
            <View style={styles.infoRow}>
              <Ionicons name="phone-portrait-outline" size={18} color={COLORS.primary} />
              <Text style={styles.infoText}>Giữ điện thoại luôn mở</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={18} color={COLORS.primary} />
              <Text style={styles.infoText}>Bạn bè sẽ nhận được tin nhắn khi bạn an toàn</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={18} color="#FF3B30" />
              <Text style={styles.infoText}>Gọi 113 nếu cần hỗ trợ khẩn cấp</Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.resolveBtn} 
            onPress={() => setShowConfirm(true)}
            activeOpacity={0.8}
          >
            <BlurView intensity={20} tint="light" style={styles.btnBlur}>
              <Ionicons name="checkmark-circle" size={28} color="#FFF" />
              <Text style={styles.resolveText}>TÔI ĐÃ AN TOÀN</Text>
            </BlurView>
          </TouchableOpacity>
          <Text style={styles.resolveHint}>Nhấn để dừng chia sẻ và thông báo cho mọi người</Text>
        </View>
      </SafeAreaView>

      <SOSConfirmationModal
        visible={showConfirm}
        title="Xác Nhận An Toàn"
        message="Hệ thống sẽ gửi thông báo 'Đã An Toàn' đến tất cả bạn bè và dừng chia sẻ vị trí."
        confirmText="Xác Nhận An Toàn"
        onConfirm={handleResolve}
        onCancel={() => setShowConfirm(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 20,
  },
  header: {
    alignItems: 'center',
    marginVertical: 20,
  },
  pulseCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.2)',
  },
  statusTitle: {
    color: '#FF3B30',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 2,
  },
  statusSubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: RADIUS.xl,
    padding: 20,
    marginVertical: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '900',
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF3B30',
    marginRight: 6,
  },
  liveText: {
    color: '#FF3B30',
    fontSize: 12,
    fontWeight: '900',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoBox: {
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  infoTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 16,
    opacity: 0.9,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  infoText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  footer: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 0 : 24,
    backgroundColor: 'transparent',
  },
  resolveBtn: {
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#34C759',
    ...SHADOWS.large,
  },
  btnBlur: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  resolveText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  resolveHint: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '500',
  },
});
