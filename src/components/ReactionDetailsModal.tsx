import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { buildAvatarUrl, getApiUrl } from '../config/api';
import { useAuthStore } from '../store/useAuthStore';

interface ReactionUser {
  userId: number;
  username: string;
  fullName: string;
  avatarUrl?: string;
  emoji: string;
}

interface Props {
  visible: boolean;
  messageId: number;
  reactions: Record<string, number>; // emoji -> count
  onClose: () => void;
}

export default function ReactionDetailsModal({ visible, messageId, reactions, onClose }: Props) {
  const token = useAuthStore((s) => s.token);
  const [loading, setLoading] = useState(false);
  const [reactionUsers, setReactionUsers] = useState<ReactionUser[]>([]);
  const [selectedEmoji, setSelectedEmoji] = useState<string | 'all'>('all');

  useEffect(() => {
    if (visible && messageId) {
      loadReactionDetails();
    }
  }, [visible, messageId]);

  const loadReactionDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${getApiUrl()}/chat/messages/${messageId}/reactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setReactionUsers(json.data || []);
    } catch (e) {
      console.error('Failed to load reaction details:', e);
    } finally {
      setLoading(false);
    }
  };

  const emojis = Object.keys(reactions).filter(emoji => reactions[emoji] > 0);
  const totalCount = Object.values(reactions).reduce((a, b) => a + b, 0);

  const filteredUsers = selectedEmoji === 'all' 
    ? reactionUsers 
    : reactionUsers.filter(u => u.emoji === selectedEmoji);

  const renderUser = ({ item }: { item: ReactionUser }) => {
    const avatarUrl = item.avatarUrl ? buildAvatarUrl(item.avatarUrl) : null;

    return (
      <View style={styles.userItem}>
        <View style={styles.avatarWrap}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <Image source={require('../assets/images/avatar-default.png')} style={styles.avatar} />
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.fullName || item.username}</Text>
          <Text style={styles.userUsername}>@{item.username}</Text>
        </View>
        <Text style={styles.userEmoji}>{item.emoji}</Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Cảm xúc</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Emoji Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, selectedEmoji === 'all' && styles.tabActive]}
              onPress={() => setSelectedEmoji('all')}
            >
              <Text style={[styles.tabText, selectedEmoji === 'all' && styles.tabTextActive]}>
                Tất cả {totalCount}
              </Text>
            </TouchableOpacity>
            {emojis.map(emoji => (
              <TouchableOpacity
                key={emoji}
                style={[styles.tab, selectedEmoji === emoji && styles.tabActive]}
                onPress={() => setSelectedEmoji(emoji)}
              >
                <Text style={styles.tabEmoji}>{emoji}</Text>
                <Text style={[styles.tabCount, selectedEmoji === emoji && styles.tabCountActive]}>
                  {reactions[emoji]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Users List */}
          {loading ? (
            <View style={styles.loadingCenter}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : (
            <FlatList
              data={filteredUsers}
              keyExtractor={(item, index) => `${item.userId}-${index}`}
              renderItem={renderUser}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>Chưa có cảm xúc nào</Text>
                </View>
              }
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  closeBtn: {
    padding: 4,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    gap: 4,
  },
  tabActive: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
  },
  tabEmoji: {
    fontSize: 16,
  },
  tabCount: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  tabCountActive: {
    color: '#fff',
  },
  loadingCenter: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: 8,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  avatarWrap: {
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 14,
    color: '#8E8E93',
  },
  userEmoji: {
    fontSize: 24,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
  },
});
