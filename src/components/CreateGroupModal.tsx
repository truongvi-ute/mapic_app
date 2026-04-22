import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuthStore } from '../store/useAuthStore';
import { useAlert } from '../context/AlertContext';
import chatService, { ConversationDto } from '../api/chatService';
import { getApiUrl, buildMediaUrl, buildAvatarUrl } from '../config/api';

interface FriendItem {
  id: number;
  username: string;
  name: string;
  avatarUrl?: string | null;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: (conv: ConversationDto) => void;
}

export default function CreateGroupModal({ visible, onClose, onSuccess }: Props) {
  const token = useAuthStore((s) => s.token) || '';
  const { showAlert } = useAlert();

  const [groupName, setGroupName] = useState('');
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      loadFriends();
      setGroupName('');
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
      const data: FriendItem[] = (json.data || []).map((f: any) => ({
        id: f.id,
        username: f.username,
        name: f.name || f.fullName || f.username,
        avatarUrl: f.avatarUrl,
      }));
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

  const handleCreate = async () => {
    if (!groupName.trim()) {
      showAlert('Lỗi', 'Vui lòng nhập tên nhóm');
      return;
    }
    if (selectedIds.length < 2) {
      showAlert('Lỗi', 'Nhóm cần ít nhất 3 người (bạn + 2 thành viên)');
      return;
    }
    try {
      setSubmitting(true);
      const conv = await chatService.createGroup(groupName.trim(), selectedIds, token);
      onSuccess(conv);
    } catch (e: any) {
      showAlert('Lỗi', e.message || 'Không thể tạo nhóm');
    } finally {
      setSubmitting(false);
    }
  };

  const renderItem = ({ item }: { item: FriendItem }) => {
    const isSelected = selectedIds.includes(item.id);
    const avatarUrl = item.avatarUrl ? buildAvatarUrl(item.avatarUrl) : null;

    return (
      <TouchableOpacity style={styles.item} onPress={() => toggleSelect(item.id)}>
        {/* Avatar — giống ChatsListScreen */}
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

        {/* Name */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name || item.username}
          </Text>
        </View>

        {/* Checkbox */}
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.title}>Tạo nhóm mới</Text>
            <TouchableOpacity
              onPress={handleCreate}
              disabled={submitting}
              style={styles.headerBtn}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <Text style={styles.createBtnText}>Tạo</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Group name input */}
          <View style={styles.inputSection}>
            <TextInput
              style={styles.nameInput}
              placeholder="Tên nhóm..."
              value={groupName}
              onChangeText={setGroupName}
              autoFocus
            />
          </View>

          {/* Section label */}
          <View style={styles.sectionLabel}>
            <Text style={styles.sectionLabelText}>
              Chọn thành viên ({selectedIds.length} đã chọn)
            </Text>
          </View>

          {/* Friends list */}
          {loading ? (
            <View style={styles.loadingCenter}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : (
            <FlatList
              data={friends}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderItem}
              contentContainerStyle={{ flexGrow: 1 }}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={64} color="#C7C7CC" />
                  <Text style={styles.emptyText}>Chưa có bạn bè nào</Text>
                </View>
              }
            />
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerBtn: { minWidth: 40, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  createBtnText: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
  inputSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  nameInput: {
    fontSize: 17,
    color: '#000',
    paddingVertical: 6,
  },
  sectionLabel: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  sectionLabelText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 },
  // ── Item — giống hệt ChatsListScreen ──────────────────────────────────────
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  avatarWrap: { marginRight: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#000' },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: { fontSize: 16, color: '#8E8E93', marginTop: 12 },
});
