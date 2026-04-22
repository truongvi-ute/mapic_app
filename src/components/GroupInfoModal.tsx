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
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuthStore } from '../store/useAuthStore';
import { useAlert } from '../context/AlertContext';
import chatService, { ConversationDto, ParticipantDto } from '../api/chatService';
import { buildAvatarUrl, getApiUrl } from '../config/api';

interface Props {
  visible: boolean;
  conversation: ConversationDto;
  onClose: () => void;
  onUpdate: (conv: ConversationDto) => void;
  onLeave: () => void;
}

interface FriendItem {
  id: number;
  username: string;
  name: string;
  avatarUrl?: string | null;
}

export default function GroupInfoModal({ visible, conversation, onClose, onUpdate, onLeave }: Props) {
  const token = useAuthStore((s) => s.token) || '';
  const currentUser = useAuthStore((s) => s.user);
  const { showAlert } = useAlert();

  const [activeTab, setActiveTab] = useState<'info' | 'members' | 'add'>('info');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [newGroupName, setNewGroupName] = useState(conversation.title || '');
  const [savingName, setSavingName] = useState(false);
  
  // Add members
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [addingMembers, setAddingMembers] = useState(false);

  const isAdmin = conversation.creatorId === currentUser?.id;
  const memberCount = conversation.participants?.length || 0;

  useEffect(() => {
    if (visible) {
      setActiveTab('info');
      setSearchQuery('');
      setEditingName(false);
      setNewGroupName(conversation.title || '');
    }
  }, [visible, conversation.title]);

  useEffect(() => {
    if (visible && activeTab === 'add') {
      loadAvailableFriends();
    }
  }, [visible, activeTab]);

  const loadAvailableFriends = async () => {
    try {
      setLoadingFriends(true);
      const res = await fetch(`${getApiUrl()}/friends`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      
      // Filter out friends who are already in the group
      const memberIds = new Set(conversation.participants?.map(p => p.userId) || []);
      const availableFriends: FriendItem[] = (json.data || [])
        .filter((f: any) => !memberIds.has(f.id))
        .map((f: any) => ({
          id: f.id,
          username: f.username,
          name: f.name || f.fullName || f.username,
          avatarUrl: f.avatarUrl,
        }));
      
      setFriends(availableFriends);
      setSelectedIds([]);
    } catch {
      showAlert('Lỗi', 'Không thể tải danh sách bạn bè');
    } finally {
      setLoadingFriends(false);
    }
  };

  const handleSaveGroupName = async () => {
    if (!newGroupName.trim()) {
      showAlert('Lỗi', 'Tên nhóm không được để trống');
      return;
    }
    if (newGroupName.trim() === conversation.title) {
      setEditingName(false);
      return;
    }

    try {
      setSavingName(true);
      const updated = await chatService.renameGroup(conversation.id, newGroupName.trim(), token);
      onUpdate(updated);
      setEditingName(false);
      showAlert('Thành công', 'Đã đổi tên nhóm');
    } catch (e: any) {
      showAlert('Lỗi', e.message || 'Không thể đổi tên nhóm');
    } finally {
      setSavingName(false);
    }
  };

  const handleRemoveMember = (member: ParticipantDto) => {
    if (!isAdmin) return;
    
    showAlert(
      'Xóa thành viên',
      `Bạn có chắc muốn xóa ${member.fullName || member.username} khỏi nhóm?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await chatService.removeMember(conversation.id, member.userId, token);
              // Update local conversation
              const updated = {
                ...conversation,
                participants: conversation.participants?.filter(p => p.userId !== member.userId) || [],
              };
              onUpdate(updated);
              showAlert('Thành công', 'Đã xóa thành viên');
            } catch (e: any) {
              showAlert('Lỗi', e.message || 'Không thể xóa thành viên');
            }
          },
        },
      ]
    );
  };

  const handleAddMembers = async () => {
    if (selectedIds.length === 0) {
      showAlert('Lỗi', 'Vui lòng chọn ít nhất 1 thành viên');
      return;
    }

    try {
      setAddingMembers(true);
      // Call API to add members (you'll need to implement this endpoint)
      const res = await fetch(`${getApiUrl()}/chat/rooms/${conversation.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ memberIds: selectedIds }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to add members');
      }

      const json = await res.json();
      onUpdate(json.data);
      setActiveTab('members');
      showAlert('Thành công', `Đã thêm ${selectedIds.length} thành viên`);
    } catch (e: any) {
      showAlert('Lỗi', e.message || 'Không thể thêm thành viên');
    } finally {
      setAddingMembers(false);
    }
  };

  const handleLeaveGroup = () => {
    if (isAdmin) {
      showAlert(
        'Không thể rời nhóm',
        'Bạn là trưởng nhóm. Vui lòng chuyển quyền trưởng nhóm hoặc giải tán nhóm trước.',
        [{ text: 'OK' }]
      );
      return;
    }

    showAlert(
      'Rời khỏi nhóm',
      `Bạn có chắc muốn rời khỏi nhóm "${conversation.title}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Rời nhóm',
          style: 'destructive',
          onPress: async () => {
            try {
              await chatService.removeMember(conversation.id, currentUser!.id, token);
              onLeave();
              onClose();
              showAlert('Đã rời nhóm', 'Bạn đã rời khỏi nhóm');
            } catch (e: any) {
              showAlert('Lỗi', e.message || 'Không thể rời nhóm');
            }
          },
        },
      ]
    );
  };

  const handleDeleteGroup = () => {
    if (!isAdmin) return;

    showAlert(
      'Giải tán nhóm',
      `Bạn có chắc muốn giải tán nhóm "${conversation.title}"? Hành động này không thể hoàn tác.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Giải tán',
          style: 'destructive',
          onPress: async () => {
            try {
              await chatService.deleteGroup(conversation.id, token);
              onLeave();
              onClose();
              showAlert('Đã giải tán', 'Nhóm đã được giải tán');
            } catch (e: any) {
              showAlert('Lỗi', e.message || 'Không thể giải tán nhóm');
            }
          },
        },
      ]
    );
  };

  const filteredMembers = conversation.participants?.filter(p =>
    (p.fullName || p.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const renderMemberItem = ({ item }: { item: ParticipantDto }) => {
    const isMe = item.userId === currentUser?.id;
    const isMemberAdmin = item.role === 'ADMIN';
    const avatarUrl = item.avatarUrl ? buildAvatarUrl(item.avatarUrl) : null;

    return (
      <View style={styles.memberItem}>
        <View style={styles.avatarWrap}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <Image source={require('../assets/images/avatar-default.png')} style={styles.avatar} />
          )}
        </View>

        <View style={styles.memberInfo}>
          <View style={styles.memberNameRow}>
            <Text style={styles.memberName} numberOfLines={1}>
              {item.fullName || item.username}
              {isMe && <Text style={styles.youBadge}> (Bạn)</Text>}
            </Text>
            {isMemberAdmin && (
              <View style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#007AFF" />
                <Text style={styles.adminBadgeText}>Admin</Text>
              </View>
            )}
          </View>
          <Text style={styles.memberUsername}>@{item.username}</Text>
        </View>

        {isAdmin && !isMe && (
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => handleRemoveMember(item)}
          >
            <Ionicons name="close-circle" size={24} color="#FF3B30" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderFriendItem = ({ item }: { item: FriendItem }) => {
    const isSelected = selectedIds.includes(item.id);
    const avatarUrl = item.avatarUrl ? buildAvatarUrl(item.avatarUrl) : null;

    return (
      <TouchableOpacity
        style={styles.friendItem}
        onPress={() => {
          setSelectedIds(prev =>
            prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]
          );
        }}
      >
        <View style={styles.avatarWrap}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <Image source={require('../assets/images/avatar-default.png')} style={styles.avatar} />
          )}
        </View>

        <View style={styles.friendInfo}>
          <Text style={styles.friendName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.friendUsername}>@{item.username}</Text>
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
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thông tin nhóm</Text>
          <View style={styles.headerBtn} />
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'info' && styles.tabActive]}
            onPress={() => setActiveTab('info')}
          >
            <Ionicons
              name="information-circle"
              size={20}
              color={activeTab === 'info' ? '#007AFF' : '#8E8E93'}
            />
            <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>
              Thông tin
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'members' && styles.tabActive]}
            onPress={() => setActiveTab('members')}
          >
            <Ionicons
              name="people"
              size={20}
              color={activeTab === 'members' ? '#007AFF' : '#8E8E93'}
            />
            <Text style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}>
              Thành viên ({memberCount})
            </Text>
          </TouchableOpacity>

          {isAdmin && (
            <TouchableOpacity
              style={[styles.tab, activeTab === 'add' && styles.tabActive]}
              onPress={() => setActiveTab('add')}
            >
              <Ionicons
                name="person-add"
                size={20}
                color={activeTab === 'add' ? '#007AFF' : '#8E8E93'}
              />
              <Text style={[styles.tabText, activeTab === 'add' && styles.tabTextActive]}>
                Thêm
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Content */}
        {activeTab === 'info' && (
          <ScrollView style={styles.content}>
            {/* Group Avatar */}
            <View style={styles.groupAvatarSection}>
              <View style={styles.groupAvatarWrap}>
                <Image source={require('../assets/images/friend.png')} style={styles.groupAvatar} />
              </View>
            </View>

            {/* Group Name */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>TÊN NHÓM</Text>
              {editingName ? (
                <View style={styles.editNameRow}>
                  <TextInput
                    style={styles.editNameInput}
                    value={newGroupName}
                    onChangeText={setNewGroupName}
                    placeholder="Tên nhóm..."
                    autoFocus
                    maxLength={50}
                  />
                  <TouchableOpacity
                    style={styles.saveNameBtn}
                    onPress={handleSaveGroupName}
                    disabled={savingName}
                  >
                    {savingName ? (
                      <ActivityIndicator size="small" color="#007AFF" />
                    ) : (
                      <Ionicons name="checkmark" size={24} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelNameBtn}
                    onPress={() => {
                      setEditingName(false);
                      setNewGroupName(conversation.title || '');
                    }}
                  >
                    <Ionicons name="close" size={24} color="#8E8E93" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.infoRow}
                  onPress={() => isAdmin && setEditingName(true)}
                  disabled={!isAdmin}
                >
                  <Text style={styles.infoText}>{conversation.title || 'Nhóm không tên'}</Text>
                  {isAdmin && <Ionicons name="pencil" size={20} color="#007AFF" />}
                </TouchableOpacity>
              )}
            </View>

            {/* Group Stats */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>THỐNG KÊ</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Ionicons name="people" size={24} color="#007AFF" />
                  <Text style={styles.statValue}>{memberCount}</Text>
                  <Text style={styles.statLabel}>Thành viên</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="calendar" size={24} color="#34C759" />
                  <Text style={styles.statValue}>
                    {new Date(conversation.createdAt).toLocaleDateString('vi')}
                  </Text>
                  <Text style={styles.statLabel}>Ngày tạo</Text>
                </View>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>HÀNH ĐỘNG</Text>
              
              {!isAdmin && (
                <TouchableOpacity style={styles.actionBtn} onPress={handleLeaveGroup}>
                  <Ionicons name="exit-outline" size={24} color="#FF9500" />
                  <Text style={[styles.actionText, { color: '#FF9500' }]}>Rời khỏi nhóm</Text>
                </TouchableOpacity>
              )}

              {isAdmin && (
                <TouchableOpacity style={styles.actionBtn} onPress={handleDeleteGroup}>
                  <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                  <Text style={[styles.actionText, { color: '#FF3B30' }]}>Giải tán nhóm</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        )}

        {activeTab === 'members' && (
          <View style={styles.content}>
            {/* Search */}
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color="#8E8E93" />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm thành viên..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#8E8E93" />
                </TouchableOpacity>
              )}
            </View>

            {/* Members List */}
            <FlatList
              data={filteredMembers}
              keyExtractor={(item) => item.userId.toString()}
              renderItem={renderMemberItem}
              contentContainerStyle={styles.membersList}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="search-outline" size={64} color="#C7C7CC" />
                  <Text style={styles.emptyText}>Không tìm thấy thành viên</Text>
                </View>
              }
            />
          </View>
        )}

        {activeTab === 'add' && (
          <View style={styles.content}>
            {/* Selected count */}
            {selectedIds.length > 0 && (
              <View style={styles.selectedBar}>
                <Text style={styles.selectedText}>
                  Đã chọn {selectedIds.length} người
                </Text>
                <TouchableOpacity
                  style={styles.addSelectedBtn}
                  onPress={handleAddMembers}
                  disabled={addingMembers}
                >
                  {addingMembers ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.addSelectedText}>Thêm</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Friends List */}
            {loadingFriends ? (
              <View style={styles.loadingCenter}>
                <ActivityIndicator size="large" color="#007AFF" />
              </View>
            ) : (
              <FlatList
                data={friends}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderFriendItem}
                contentContainerStyle={styles.friendsList}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Ionicons name="people-outline" size={64} color="#C7C7CC" />
                    <Text style={styles.emptyText}>
                      Tất cả bạn bè đã ở trong nhóm
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        )}
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
  headerBtn: { minWidth: 40 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#007AFF' },
  tabText: { fontSize: 14, color: '#8E8E93', fontWeight: '500' },
  tabTextActive: { color: '#007AFF', fontWeight: '600' },
  content: { flex: 1 },
  
  // Info Tab
  groupAvatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  groupAvatarWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  groupAvatar: { width: 100, height: 100 },
  section: {
    backgroundColor: '#fff',
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionLabel: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '600',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoText: { fontSize: 17, color: '#000', flex: 1 },
  editNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editNameInput: {
    flex: 1,
    fontSize: 17,
    color: '#000',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  saveNameBtn: { padding: 4 },
  cancelNameBtn: { padding: 4 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  statItem: { alignItems: 'center', gap: 4 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#000', marginTop: 4 },
  statLabel: { fontSize: 13, color: '#8E8E93' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  actionText: { fontSize: 17, fontWeight: '500' },

  // Members Tab
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    height: 40,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 16, color: '#000' },
  membersList: { paddingBottom: 16 },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  avatarWrap: { marginRight: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  memberInfo: { flex: 1 },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  memberName: { fontSize: 16, fontWeight: '600', color: '#000' },
  youBadge: { fontSize: 14, color: '#8E8E93', fontWeight: '400' },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  adminBadgeText: { fontSize: 11, color: '#007AFF', fontWeight: '600' },
  memberUsername: { fontSize: 14, color: '#8E8E93' },
  removeBtn: { padding: 4 },

  // Add Tab
  selectedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  selectedText: { fontSize: 16, color: '#fff', fontWeight: '600' },
  addSelectedBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  addSelectedText: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
  friendsList: { paddingBottom: 16 },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  friendInfo: { flex: 1 },
  friendName: { fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 2 },
  friendUsername: { fontSize: 14, color: '#8E8E93' },
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

  // Common
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: { fontSize: 16, color: '#8E8E93', marginTop: 12, textAlign: 'center' },
});
