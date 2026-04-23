import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuthStore } from '../store/useAuthStore';
import { useAlert } from '../context/AlertContext';
import chatService, { ConversationDto } from '../api/chatService';
import { getApiUrl, buildAvatarUrl } from '../config/api';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADIUS, DIMENSIONS } from '../constants/design';

interface FriendItem {
  id: number;
  username: string;
  name: string;
  avatarUrl?: string | null;
}

interface Props {
  visible: boolean;
  conversation: ConversationDto;
  onClose: () => void;
  onSuccess: (updatedConv: ConversationDto) => void;
}

export default function AddMemberModal({ visible, conversation, onClose, onSuccess }: Props) {
  const token = useAuthStore((s) => s.token) || '';
  const { showAlert } = useAlert();

  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      loadFriends();
      setSelectedIds([]);
    }
  }, [visible]);

  const loadFriends = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${getApiUrl()}/friends`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      
      const existingMemberIds = new Set(conversation.participants.map(p => p.userId));
      
      const data: FriendItem[] = (json.data || [])
        .map((f: any) => ({
          id: f.id,
          username: f.username,
          name: f.name || f.fullName || f.username,
          avatarUrl: f.avatarUrl,
        }))
        .filter((f: FriendItem) => !existingMemberIds.has(f.id));
        
      setFriends(data);
    } catch {
      showAlert('Lỗi', 'Không thể tải danh sách bạn bè');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleAdd = async () => {
    if (selectedIds.length === 0) {
      showAlert('Thông báo', 'Vui lòng chọn ít nhất một thành viên');
      return;
    }
    try {
      setSubmitting(true);
      const updatedConv = await chatService.addMembers(conversation.id, selectedIds, token);
      onSuccess(updatedConv);
    } catch (e: any) {
      showAlert('Lỗi', e.message || 'Không thể thêm thành viên');
    } finally {
      setSubmitting(false);
    }
  };

  const renderItem = ({ item }: { item: FriendItem }) => {
    const isSelected = selectedIds.includes(item.id);
    const avatarUrl = item.avatarUrl ? buildAvatarUrl(item.avatarUrl) : null;

    return (
      <TouchableOpacity style={styles.item} onPress={() => toggleSelect(item.id)}>
        <View style={styles.avatarWrap}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <Image
              source={require('../assets/images/avatar-default.png')}
              style={styles.avatar}
            />
          )}
        </View>

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name || item.username}
          </Text>
        </View>

        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Ionicons name="close" size={24} color={COLORS.gray900} />
          </TouchableOpacity>
          <Text style={styles.title}>Thêm thành viên</Text>
          <TouchableOpacity
            onPress={handleAdd}
            disabled={submitting || selectedIds.length === 0}
            style={styles.headerBtn}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text style={[styles.addBtnText, selectedIds.length === 0 && { opacity: 0.5 }]}>Thêm</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Section label */}
        <View style={styles.sectionLabel}>
          <Text style={styles.sectionLabelText}>
            Chọn bạn bè để thêm vào nhóm ({selectedIds.length})
          </Text>
        </View>

        {/* Friends list */}
        {loading ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            data={friends}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={{ flexGrow: 1 }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={64} color={COLORS.gray300} />
                <Text style={styles.emptyText}>Tất cả bạn bè đã ở trong nhóm hoặc không có bạn bè nào</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  headerBtn: { minWidth: 60, alignItems: 'center' },
  title: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.gray900 },
  addBtnText: { fontSize: FONT_SIZE.lg, color: COLORS.primary, fontWeight: FONT_WEIGHT.semibold },
  sectionLabel: {
    backgroundColor: COLORS.gray50,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.gray200,
  },
  sectionLabelText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray500,
    fontWeight: FONT_WEIGHT.semibold,
    textTransform: 'uppercase',
  },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.gray200,
  },
  avatarWrap: { marginRight: SPACING.md },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  info: { flex: 1 },
  name: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold, color: COLORS.gray900 },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: COLORS.gray300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxxl,
  },
  emptyText: { fontSize: FONT_SIZE.md, color: COLORS.gray500, marginTop: SPACING.lg, textAlign: 'center' },
});
