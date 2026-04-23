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
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuthStore } from '../store/useAuthStore';
import { useAlert } from '../context/AlertContext';
import chatService, { ConversationDto, ParticipantDto } from '../api/chatService';
import { buildAvatarUrl, getApiUrl } from '../config/api';
import { SPACING, COLORS, LIGHT_COLORS, DARK_COLORS, FONT_SIZE, FONT_WEIGHT, RADIUS, SHADOWS, DIMENSIONS } from '../constants/design';
import { useThemeStore } from '../store/useThemeStore';
import Spacer from '../components/ui/Spacer';

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
  const { mode } = useThemeStore();
  const isDark = mode === 'dark';
  const C = isDark ? DARK_COLORS : LIGHT_COLORS;

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
      const updated = await chatService.addMembers(conversation.id, selectedIds, token);
      onUpdate(updated);
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
      <View style={[styles.memberItem, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <View style={styles.avatarWrap}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <Image source={require('../assets/images/avatar-default.png')} style={styles.avatar} />
          )}
        </View>

        <View style={styles.memberInfo}>
          <View style={styles.memberNameRow}>
            <Text style={[styles.memberName, { color: C.textPrimary }]} numberOfLines={1}>
              {item.fullName || item.username}
              {isMe && <Text style={styles.youBadge}> (Bạn)</Text>}
            </Text>
            {isMemberAdmin && (
              <View style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={10} color={COLORS.primary} />
                <Text style={styles.adminBadgeText}>Admin</Text>
              </View>
            )}
          </View>
          <Text style={[styles.memberUsername, { color: C.textTertiary }]}>@{item.username}</Text>
        </View>

        {isAdmin && !isMe && (
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => handleRemoveMember(item)}
          >
            <Image source={require('../assets/images/unfriend.png')} style={styles.actionIconSm} />
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
        style={[styles.friendItem, { backgroundColor: C.surface, borderBottomColor: C.border }]}
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
          <Text style={[styles.friendName, { color: C.textPrimary }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.friendUsername, { color: C.textTertiary }]}>@{item.username}</Text>
        </View>

        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        {/* Header */}
        <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Ionicons name="close" size={28} color={C.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Thông tin nhóm</Text>
          <View style={styles.headerBtn} />
        </View>

        {/* Tabs */}
        <View style={[styles.tabs, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'info' && styles.tabActive]}
            onPress={() => setActiveTab('info')}
          >
            <Image 
              source={require('../assets/images/message.png')} 
              style={[styles.tabIcon, activeTab !== 'info' && { opacity: 0.5 }]} 
            />
            <Text style={[styles.tabText, { color: C.textTertiary }, activeTab === 'info' && styles.tabTextActive]}>
              Thông tin
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'members' && styles.tabActive]}
            onPress={() => setActiveTab('members')}
          >
            <Image 
              source={require('../assets/images/friend.png')} 
              style={[styles.tabIcon, activeTab !== 'members' && { opacity: 0.5 }]} 
            />
            <Text style={[styles.tabText, { color: C.textTertiary }, activeTab === 'members' && styles.tabTextActive]}>
              Thành viên
            </Text>
          </TouchableOpacity>

          {isAdmin && (
            <TouchableOpacity
              style={[styles.tab, activeTab === 'add' && styles.tabActive]}
              onPress={() => setActiveTab('add')}
            >
              <Image 
                source={require('../assets/images/add-friend.png')} 
                style={[styles.tabIcon, activeTab !== 'add' && { opacity: 0.5 }]} 
              />
              <Text style={[styles.tabText, { color: C.textTertiary }, activeTab === 'add' && styles.tabTextActive]}>
                Thêm
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Content */}
        {activeTab === 'info' && (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Group Avatar */}
            <View style={[styles.groupAvatarSection, { backgroundColor: C.surface }]}>
              <View style={[styles.groupAvatarWrap, { backgroundColor: COLORS.primary + '15' }]}>
                <Image source={require('../assets/images/group.png')} style={styles.groupAvatar} />
              </View>
              <Spacer size="md" />
              <Text style={[styles.memberCountText, { color: C.textSecondary }]}>{memberCount} thành viên</Text>
            </View>

            {/* Group Name */}
            <View style={[styles.section, { backgroundColor: C.surface }]}>
              <View style={styles.sectionHeader}>
                <Image source={require('../assets/images/write.png')} style={styles.sectionIcon} />
                <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>TÊN NHÓM</Text>
              </View>
              {editingName ? (
                <KeyboardAvoidingView 
                  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                  <View style={styles.editNameRow}>
                    <TextInput
                      style={[styles.editNameInput, { color: C.textPrimary, borderColor: C.border }]}
                      value={newGroupName}
                      onChangeText={setNewGroupName}
                      placeholder="Tên nhóm mới..."
                      placeholderTextColor={C.textTertiary}
                      autoFocus
                      maxLength={50}
                    />
                    <TouchableOpacity
                      style={styles.saveNameBtn}
                      onPress={handleSaveGroupName}
                      disabled={savingName}
                    >
                      {savingName ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                      ) : (
                        <Ionicons name="checkmark-circle" size={32} color={COLORS.success} />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cancelNameBtn}
                      onPress={() => {
                        setEditingName(false);
                        setNewGroupName(conversation.title || '');
                      }}
                    >
                      <Ionicons name="close-circle" size={32} color={COLORS.gray400} />
                    </TouchableOpacity>
                  </View>
                </KeyboardAvoidingView>
              ) : (
                <TouchableOpacity
                  style={styles.infoRow}
                  onPress={() => isAdmin && setEditingName(true)}
                  disabled={!isAdmin}
                >
                  <Text style={[styles.infoText, { color: C.textPrimary }]}>{conversation.title || 'Nhóm không tên'}</Text>
                  {isAdmin && <Ionicons name="chevron-forward" size={20} color={C.textTertiary} />}
                </TouchableOpacity>
              )}
            </View>

            {/* Group Stats */}
            <View style={[styles.section, { backgroundColor: C.surface }]}>
              <View style={styles.sectionHeader}>
                <Image source={require('../assets/images/recent.png')} style={styles.sectionIcon} />
                <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>THÔNG TIN</Text>
              </View>
              <View style={styles.statsRow}>
                <View style={[styles.statItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : COLORS.gray50 }]}>
                  <Text style={[styles.statValue, { color: C.textPrimary }]}>{memberCount}</Text>
                  <Text style={[styles.statLabel, { color: C.textTertiary }]}>Thành viên</Text>
                </View>
                <View style={[styles.statItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : COLORS.gray50 }]}>
                  <Text style={[styles.statValue, { color: C.textPrimary }]}>
                    {new Date(conversation.createdAt).toLocaleDateString('vi')}
                  </Text>
                  <Text style={[styles.statLabel, { color: C.textTertiary }]}>Ngày tạo</Text>
                </View>
              </View>
            </View>

            {/* Actions */}
            <View style={[styles.section, { backgroundColor: C.surface }]}>
              <View style={styles.sectionHeader}>
                <Image source={require('../assets/images/setting.png')} style={styles.sectionIcon} />
                <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>HÀNH ĐỘNG</Text>
              </View>
              
              {!isAdmin && (
                <TouchableOpacity style={styles.actionBtn} onPress={handleLeaveGroup}>
                  <Image source={require('../assets/images/unfriend.png')} style={styles.actionIcon} />
                  <Text style={[styles.actionText, { color: COLORS.warning }]}>Rời khỏi nhóm</Text>
                </TouchableOpacity>
              )}

              {isAdmin && (
                <TouchableOpacity style={styles.actionBtn} onPress={handleDeleteGroup}>
                  <Ionicons name="trash-outline" size={24} color={COLORS.error} />
                  <Text style={[styles.actionText, { color: COLORS.error }]}>Giải tán nhóm</Text>
                </TouchableOpacity>
              )}
            </View>
            <Spacer size="xxxl" />
          </ScrollView>
        )}

        {activeTab === 'members' && (
          <View style={styles.content}>
            {/* Search */}
            <View style={[styles.searchBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : COLORS.gray100 }]}>
              <Image source={require('../assets/images/search.png')} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: C.textPrimary }]}
                placeholder="Tìm thành viên..."
                placeholderTextColor={C.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={C.textTertiary} />
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
                  <Image source={require('../assets/images/search.png')} style={styles.emptyIcon} />
                  <Text style={[styles.emptyText, { color: C.textTertiary }]}>Không tìm thấy thành viên</Text>
                </View>
              }
            />
          </View>
        )}

        {activeTab === 'add' && (
          <View style={styles.content}>
            {/* Friends List */}
            {loadingFriends ? (
              <View style={styles.loadingCenter}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            ) : (
              <FlatList
                data={friends}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderFriendItem}
                contentContainerStyle={styles.friendsList}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Image source={require('../assets/images/friend.png')} style={styles.emptyIcon} />
                    <Text style={[styles.emptyText, { color: C.textTertiary }]}>
                      Tất cả bạn bè đã ở trong nhóm
                    </Text>
                  </View>
                }
              />
            )}

            {/* Selected count / Add button floating at bottom */}
            {selectedIds.length > 0 && (
              <View style={[styles.floatingAction, { backgroundColor: C.surface }]}>
                <Text style={[styles.selectedText, { color: C.textPrimary }]}>
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
                    <Text style={styles.addSelectedText}>Thêm vào nhóm</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  headerBtn: { minWidth: 40, alignItems: 'center' },
  headerTitle: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.primary },
  tabIcon: { width: 24, height: 24 },
  tabText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium },
  tabTextActive: { color: COLORS.primary, fontWeight: FONT_WEIGHT.bold },
  content: { flex: 1 },
  
  // Info Tab
  groupAvatarSection: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
    marginBottom: SPACING.md,
  },
  groupAvatarWrap: {
    width: 100,
    height: 100,
    borderRadius: RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  groupAvatar: { width: 64, height: 64 },
  memberCountText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
  section: {
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.md },
  sectionIcon: { width: 18, height: 18, opacity: 0.7 },
  sectionLabel: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  infoText: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.medium, flex: 1 },
  editNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editNameInput: {
    flex: 1,
    fontSize: FONT_SIZE.lg,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  saveNameBtn: { padding: 4 },
  cancelNameBtn: { padding: 4 },
  statsRow: { flexDirection: 'row', gap: SPACING.md },
  statItem: { flex: 1, alignItems: 'center', padding: SPACING.md, borderRadius: RADIUS.md, gap: 4 },
  statValue: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
  statLabel: { fontSize: FONT_SIZE.xs },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: SPACING.md },
  actionIcon: { width: 24, height: 24 },
  actionIconSm: { width: 20, height: 20 },
  actionText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold },

  // Members Tab
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    height: 44,
    gap: 8,
  },
  searchIcon: { width: 20, height: 20, opacity: 0.5 },
  searchInput: { flex: 1, fontSize: FONT_SIZE.md },
  membersList: { paddingBottom: 16 },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarWrap: { marginRight: SPACING.md },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  memberInfo: { flex: 1 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  memberName: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold },
  youBadge: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.regular },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.round,
  },
  adminBadgeText: { fontSize: 10, color: COLORS.primary, fontWeight: FONT_WEIGHT.bold },
  memberUsername: { fontSize: FONT_SIZE.sm },
  removeBtn: { padding: 4 },

  // Add Tab
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
