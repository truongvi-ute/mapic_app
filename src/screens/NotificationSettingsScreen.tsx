import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/api';

interface NotificationSetting {
  id: number;
  notificationType: string;
  enabled: boolean;
  pushEnabled: boolean;
  soundEnabled: boolean;
}

const NOTIFICATION_TYPES = [
  { type: 'FRIEND_REQUEST', label: 'Lời mời kết bạn', icon: 'person-add', color: '#007AFF' },
  { type: 'FRIEND_ACCEPT', label: 'Chấp nhận kết bạn', icon: 'people', color: '#34C759' },
  { type: 'MOMENT_REACTION', label: 'Lượt thích bài viết', icon: 'heart', color: '#FF2D55' },
  { type: 'MOMENT_COMMENT', label: 'Bình luận bài viết', icon: 'chatbubble', color: '#5856D6' },
  { type: 'MOMENT_TAG', label: 'Gắn thẻ trong bài viết', icon: 'pricetag', color: '#FF9500' },
  { type: 'NEW_MESSAGE', label: 'Tin nhắn mới', icon: 'mail', color: '#FF9500' },
  { type: 'SOS_ALERT', label: 'Cảnh báo SOS', icon: 'warning', color: '#FF3B30' },
];

export default function NotificationSettingsScreen() {
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/notification-settings');
      if (response.data.success) {
        setSettings(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (
    type: string,
    field: 'enabled' | 'pushEnabled' | 'soundEnabled',
    value: boolean
  ) => {
    setUpdating(type);
    try {
      const response = await api.put(`/notification-settings/${type}`, {
        [field]: value,
      });

      if (response.data.success) {
        setSettings((prev) =>
          prev.map((s) =>
            s.notificationType === type ? { ...s, [field]: value } : s
          )
        );
      }
    } catch (error) {
      console.error('Failed to update setting:', error);
    } finally {
      setUpdating(null);
    }
  };

  const getSetting = (type: string): NotificationSetting | undefined => {
    return settings.find((s) => s.notificationType === type);
  };

  const renderSettingItem = (item: typeof NOTIFICATION_TYPES[0]) => {
    const setting = getSetting(item.type);
    const isUpdating = updating === item.type;

    if (!setting) return null;

    return (
      <View key={item.type} style={styles.settingCard}>
        {/* Header */}
        <View style={styles.settingHeader}>
          <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
            <Ionicons name={item.icon as any} size={24} color={item.color} />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>{item.label}</Text>
            <Text style={styles.settingType}>{item.type}</Text>
          </View>
          {isUpdating && <ActivityIndicator size="small" color={item.color} />}
        </View>

        {/* Toggles */}
        <View style={styles.togglesContainer}>
          {/* In-app notification */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Ionicons name="notifications-outline" size={20} color="#8E8E93" />
              <Text style={styles.toggleLabel}>Thông báo trong app</Text>
            </View>
            <Switch
              value={setting.enabled}
              onValueChange={(value) => updateSetting(item.type, 'enabled', value)}
              trackColor={{ false: '#E5E5EA', true: item.color + '80' }}
              thumbColor={setting.enabled ? item.color : '#F4F3F4'}
              disabled={isUpdating}
            />
          </View>

          {/* Push notification */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Ionicons name="phone-portrait-outline" size={20} color="#8E8E93" />
              <Text style={styles.toggleLabel}>Push notification</Text>
            </View>
            <Switch
              value={setting.pushEnabled}
              onValueChange={(value) => updateSetting(item.type, 'pushEnabled', value)}
              trackColor={{ false: '#E5E5EA', true: item.color + '80' }}
              thumbColor={setting.pushEnabled ? item.color : '#F4F3F4'}
              disabled={isUpdating || !setting.enabled}
            />
          </View>

          {/* Sound */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Ionicons name="volume-high-outline" size={20} color="#8E8E93" />
              <Text style={styles.toggleLabel}>Âm thanh</Text>
            </View>
            <Switch
              value={setting.soundEnabled}
              onValueChange={(value) => updateSetting(item.type, 'soundEnabled', value)}
              trackColor={{ false: '#E5E5EA', true: item.color + '80' }}
              thumbColor={setting.soundEnabled ? item.color : '#F4F3F4'}
              disabled={isUpdating || !setting.enabled}
            />
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Đang tải cài đặt...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Cài đặt thông báo</Text>
        <Text style={styles.subtitle}>
          Tùy chỉnh cách bạn nhận thông báo
        </Text>
      </View>

      {/* Settings List */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {NOTIFICATION_TYPES.map(renderSettingItem)}

        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={24} color="#007AFF" />
          <Text style={styles.infoText}>
            Tắt thông báo sẽ không hiển thị trong app và không gửi push notification.
            Bạn vẫn có thể xem lại trong mục Thông báo.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8E8E93',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  settingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  settingType: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  togglesContainer: {
    gap: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toggleLabel: {
    fontSize: 15,
    color: '#3A3A3C',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1976D2',
    lineHeight: 18,
  },
});
