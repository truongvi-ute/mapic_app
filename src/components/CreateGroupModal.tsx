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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuthStore } from '../store/useAuthStore';
import { useAlert } from '../context/AlertContext';
import chatService, { ConversationDto } from '../api/chatService';
import { getApiUrl, buildMediaUrl } from '../config/api';

interface FriendItem {
  id: number;
  username: string;
  fullName: string;
  avatarUrl?: string;
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
        id: f.userId || f.id,
        username: f.username,
        fullName: f.fullName || f.username,
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
    if (selectedIds.length < 1) {
      showAlert('Lỗi', 'Vui lòng chọn ít nhất 1 thành viên');
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

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Tạo nhóm mới</Text>
          <TouchableOpacity
            onPress={handleCreate}
            disabled={submitting}
            style={styles.createBtn}
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

        <Text style={styles.sectionLabel}>
          Chọn thành viên ({selectedIds.length} đã chọn)
        </Text>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color="#007AFF" />
        ) : (
          <FlatList
            data={friends}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => {
              const isSelected = selectedIds.includes(item.id);
              const avatarUrl = item.avatarUrl ? buildMediaUrl(item.avatarUrl) : null;
              return (
                <TouchableOpacity
                  style={styles.friendItem}
                  onPress={() => toggleSelect(item.id)}
                >
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarDefault]}>
                      <Ionicons name="person" size={20} color="#fff" />
                    </View>
                  )}
                  <View style={styles.friendInfo}>
                    <Text style={styles.friendName}>{item.fullName}</Text>
                    <Text style={styles.friendUsername}>@{item.username}</Text>
                  </View>
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  createBtn: { minWidth: 48, alignItems: 'flex-end' },
  createBtnText: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
  inputSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  nameInput: {
    fontSize: 18,
    color: '#000',
    paddingVertical: 8,
  },
  sectionLabel: {
    fontSize: 13,
    color: '#8E8E93',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F2F2F7',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  avatarDefault: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendInfo: { flex: 1 },
  friendName: { fontSize: 16, fontWeight: '600', color: '#000' },
  friendUsername: { fontSize: 13, color: '#8E8E93' },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
});
