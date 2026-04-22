import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuthStore } from '../store/useAuthStore';
import { useAlert } from '../context/AlertContext';
import chatService, { ConversationDto } from '../api/chatService';
import { useChatStore } from '../store/useChatStore';
import { buildMediaUrl, buildAvatarUrl, getApiUrl } from '../config/api';
import CreateGroupModal from '../components/CreateGroupModal';

type Tab = 'direct' | 'group';

interface FriendItem {
  id: number;
  username: string;
  name: string;
  avatarUrl?: string | null;
}

// Unified item for the direct tab: either an existing conversation or a friend-only entry
type DirectItem =
  | { kind: 'conversation'; data: ConversationDto }
  | { kind: 'friend'; data: FriendItem };

interface ChatsListScreenProps {
  onBack: () => void;
  onOpenChat: (conversation: ConversationDto, currentTab?: Tab) => void;
  refreshTrigger?: number;
  initialTab?: Tab;
}

export default function ChatsListScreen({ onBack, onOpenChat, refreshTrigger, initialTab }: ChatsListScreenProps) {
  const token = useAuthStore((s) => s.token) || '';
  const currentUser = useAuthStore((s) => s.user);
  const { showAlert } = useAlert();

  const [tab, setTab] = useState<Tab>(initialTab || 'direct');
  const { conversations, setConversations } = useChatStore();
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<number | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [renameModal, setRenameModal] = useState<{ conv: ConversationDto } | null>(null);
  const [renameText, setRenameText] = useState('');
  const [renaming, setRenaming] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Reload khi quay lại từ chat-room (refreshTrigger thay đổi)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    loadData();
  }, [refreshTrigger]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load both in parallel; conversations may be empty for new users
      const [convosResult, friendsResult] = await Promise.allSettled([
        chatService.getConversations(token),
        fetch(`${getApiUrl()}/friends`, { headers: { Authorization: `Bearer ${token}` } })
          .then((r) => r.json())
          .then((j) => (j.data || []) as FriendItem[]),
      ]);

      if (convosResult.status === 'fulfilled') {
        setConversations(convosResult.value || []);
      }
      if (friendsResult.status === 'fulfilled') {
        setFriends(friendsResult.value);
      }
    } catch (e) {
      showAlert('Lỗi', 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  // ── Build direct tab list ──────────────────────────────────────────────────
  // Show all friends. If a conversation already exists for a friend, show that
  // (with last message). Otherwise show the friend as a "start chat" entry.
  const directConversations = conversations.filter((c) => !c.isGroup);
  const groupConversations = conversations.filter((c) => c.isGroup);

  // Set of friend user-ids that already have a direct conversation
  const friendIdsWithConvo = new Set(
    directConversations.flatMap((c) =>
      c.participants.filter((p) => p.userId !== currentUser?.id).map((p) => p.userId)
    )
  );

  const directItems: DirectItem[] = [
    ...directConversations.map((c) => ({ kind: 'conversation' as const, data: c })),
    ...friends
      .filter((f) => !friendIdsWithConvo.has(f.id))
      .map((f) => ({ kind: 'friend' as const, data: f })),
  ];

  // ── Open / create direct chat ──────────────────────────────────────────────
  const handleOpenFriendChat = async (friend: FriendItem) => {
    try {
      setOpeningId(friend.id);
      const conv = await chatService.openDirectChat(friend.id, token);
      setConversations([conv, ...conversations.filter((c) => c.id !== conv.id)]);
      onOpenChat(conv, tab);
    } catch {
      showAlert('Lỗi', 'Không thể mở cuộc trò chuyện');
    } finally {
      setOpeningId(null);
    }
  };

  // ── Group management (long press) ──────────────────────────────────────────
  const handleLongPressGroup = (conv: ConversationDto) => {
    const isAdmin = conv.creatorId === currentUser?.id;
    const options: any[] = [];

    if (isAdmin) {
      options.push({
        text: 'Đổi tên nhóm',
        onPress: () => {
          setRenameText(conv.title || '');
          setRenameModal({ conv });
        },
      });
      options.push({
        text: 'Xóa thành viên',
        onPress: () => handleRemoveMember(conv),
      });
      options.push({
        text: 'Giải tán nhóm',
        style: 'destructive',
        onPress: () => handleDeleteGroup(conv),
      });
    }
    options.push({ text: 'Đóng', style: 'cancel' });

    if (options.length > 1) {
      showAlert('Quản lý nhóm', conv.title || 'Nhóm chat', options);
    }
  };

  const handleRenameGroup = async () => {
    if (!renameModal || !renameText.trim()) return;
    try {
      setRenaming(true);
      const updated = await chatService.renameGroup(renameModal.conv.id, renameText.trim(), token);
      setConversations(conversations.map((c) => (c.id === updated.id ? updated : c)));
      setRenameModal(null);
    } catch (e: any) {
      showAlert('Lỗi', e.message || 'Không thể đổi tên nhóm');
    } finally {
      setRenaming(false);
    }
  };

  const handleRemoveMember = (conv: ConversationDto) => {
    const members = conv.participants.filter((p) => p.userId !== currentUser?.id);
    if (members.length === 0) return;

    const memberOptions = members.map((p) => ({
      text: p.fullName || p.username,
      onPress: () => confirmRemoveMember(conv, p.userId, p.fullName || p.username),
    }));
    memberOptions.push({ text: 'Đóng', style: 'cancel' });
    showAlert('Xóa thành viên', 'Chọn thành viên cần xóa', memberOptions);
  };

  const confirmRemoveMember = (conv: ConversationDto, userId: number, name: string) => {
    showAlert('Xác nhận', `Xóa ${name} khỏi nhóm?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await chatService.removeMember(conv.id, userId, token);
            // Cập nhật participants trong store
            const updated = {
              ...conv,
              participants: conv.participants.filter((p) => p.userId !== userId),
            };
            setConversations(conversations.map((c) => (c.id === conv.id ? updated : c)));
          } catch (e: any) {
            showAlert('Lỗi', e.message || 'Không thể xóa thành viên');
          }
        },
      },
    ]);
  };

  const handleDeleteGroup = (conv: ConversationDto) => {
    showAlert('Giải tán nhóm', `Bạn chắc chắn muốn giải tán nhóm "${conv.title || 'Nhóm chat'}"? Hành động này không thể hoàn tác.`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Giải tán',
        style: 'destructive',
        onPress: async () => {
          try {
            await chatService.deleteGroup(conv.id, token);
            setConversations(conversations.filter((c) => c.id !== conv.id));
          } catch (e: any) {
            showAlert('Lỗi', e.message || 'Không thể giải tán nhóm');
          }
        },
      },
    ]);
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getConversationTitle = (conv: ConversationDto) => {
    if (conv.isGroup) return conv.title || 'Nhóm chat';
    const other = conv.participants.find((p) => p.userId !== currentUser?.id);
    return other?.fullName || other?.username || 'Người dùng';
  };

  const getConversationAvatar = (conv: ConversationDto): string | null => {
    if (conv.isGroup) return null;
    const other = conv.participants.find((p) => p.userId !== currentUser?.id);
    return other?.avatarUrl ? buildAvatarUrl(other.avatarUrl) : null;
  };

  // ── Render helpers ─────────────────────────────────────────────────────────
  const renderDirectItem = ({ item }: { item: DirectItem }) => {
    if (item.kind === 'conversation') {
      const conv = item.data;
      const title = getConversationTitle(conv);
      const avatarUrl = getConversationAvatar(conv);
      const lastMsg = conv.lastMessage;
      const lastMsgText = lastMsg
        ? lastMsg.type === 'TEXT'
          ? lastMsg.content
          : '📎 Đã chia sẻ nội dung'
        : 'Bắt đầu cuộc trò chuyện';
      const time = lastMsg
        ? new Date(lastMsg.createdAt).toLocaleTimeString('vi', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : '';

      return (
        <TouchableOpacity style={styles.item} onPress={() => onOpenChat(conv, tab)}>
          <View style={styles.avatarWrap}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <Image source={require('../assets/images/avatar-default.png')} style={styles.avatar} />
            )}
          </View>
          <View style={styles.info}>
            <View style={styles.row}>
              <Text style={styles.name} numberOfLines={1}>{title}</Text>
              <Text style={styles.time}>{time}</Text>
            </View>
            <Text style={styles.lastMsg} numberOfLines={1}>{lastMsgText}</Text>
          </View>
        </TouchableOpacity>
      );
    }

    // kind === 'friend' — no conversation yet
    const friend = item.data;
    const avatarUrl = friend.avatarUrl ? buildAvatarUrl(friend.avatarUrl) : null;
    const isOpening = openingId === friend.id;

    return (
      <TouchableOpacity
        style={styles.item}
        onPress={() => handleOpenFriendChat(friend)}
        disabled={isOpening}
      >
        <View style={styles.avatarWrap}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <Image source={require('../assets/images/avatar-default.png')} style={styles.avatar} />
          )}
        </View>
        <View style={styles.info}>
          <View style={styles.row}>
            <Text style={styles.name} numberOfLines={1}>{friend.name || friend.username}</Text>
            {isOpening && <ActivityIndicator size="small" color="#007AFF" />}
          </View>
          <Text style={[styles.lastMsg, styles.startChat]}>Nhắn tin</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderGroupItem = ({ item }: { item: ConversationDto }) => {
    const lastMsg = item.lastMessage;
    const lastMsgText = lastMsg
      ? lastMsg.type === 'TEXT'
        ? lastMsg.content
        : '📎 Đã chia sẻ nội dung'
      : 'Bắt đầu cuộc trò chuyện';
    const time = lastMsg
      ? new Date(lastMsg.createdAt).toLocaleTimeString('vi', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

    return (
      <TouchableOpacity
        style={styles.item}
        onPress={() => onOpenChat(item, tab)}
        onLongPress={() => handleLongPressGroup(item)}
        delayLongPress={400}
      >
        <View style={styles.avatarWrap}>
          <Image 
            source={require('../assets/images/friend.png')} 
            style={styles.avatar}
          />
        </View>
        <View style={styles.info}>
          <View style={styles.row}>
            <Text style={styles.name} numberOfLines={1}>{item.title || 'Nhóm chat'}</Text>
            <Text style={styles.time}>{time}</Text>
          </View>
          <Text style={styles.lastMsg} numberOfLines={1}>{lastMsgText}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tin nhắn</Text>
        {tab === 'group' && (
          <TouchableOpacity onPress={() => setShowCreateGroup(true)} style={styles.addBtn}>
            <Ionicons name="add" size={26} color="#007AFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'direct' && styles.tabActive]}
          onPress={() => setTab('direct')}
        >
          <Text style={[styles.tabText, tab === 'direct' && styles.tabTextActive]}>
            Cá nhân
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'group' && styles.tabActive]}
          onPress={() => setTab('group')}
        >
          <Text style={[styles.tabText, tab === 'group' && styles.tabTextActive]}>
            Nhóm
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : tab === 'direct' ? (
        <FlatList
          data={directItems}
          keyExtractor={(item, i) =>
            item.kind === 'conversation' ? `conv-${item.data.id}` : `friend-${item.data.id}-${i}`
          }
          renderItem={renderDirectItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color="#C7C7CC" />
              <Text style={styles.emptyText}>Chưa có bạn bè nào</Text>
              <Text style={styles.emptySubtext}>Kết bạn để bắt đầu nhắn tin</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={groupConversations}
          keyExtractor={(item) => `group-${item.id}`}
          renderItem={renderGroupItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color="#C7C7CC" />
              <Text style={styles.emptyText}>Chưa có nhóm nào</Text>
              <Text style={styles.emptySubtext}>Nhấn + để tạo nhóm mới</Text>
            </View>
          }
        />
      )}

      <CreateGroupModal
        visible={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onSuccess={(conv) => {
          // Thêm conversation mới vào store ngay lập tức để tab nhóm hiển thị
          setConversations([conv, ...conversations.filter((c) => c.id !== conv.id)]);
          setShowCreateGroup(false);
          setTab('group'); // Chuyển sang tab nhóm
          onOpenChat(conv, 'group');
        }}
      />

      {/* Rename group modal */}
      <Modal
        visible={!!renameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameModal(null)}
      >
        <View style={styles.renameOverlay}>
          <View style={styles.renameBox}>
            <Text style={styles.renameTitle}>Đổi tên nhóm</Text>
            <TextInput
              style={styles.renameInput}
              value={renameText}
              onChangeText={setRenameText}
              placeholder="Tên nhóm mới..."
              autoFocus
              maxLength={50}
            />
            <View style={styles.renameActions}>
              <TouchableOpacity
                style={styles.renameCancelBtn}
                onPress={() => setRenameModal(null)}
              >
                <Text style={styles.renameCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.renameSaveBtn, !renameText.trim() && { opacity: 0.4 }]}
                onPress={handleRenameGroup}
                disabled={!renameText.trim() || renaming}
              >
                {renaming ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.renameSaveText}>Lưu</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: 'bold', color: '#000' },
  addBtn: { padding: 4 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#007AFF' },
  tabText: { fontSize: 15, color: '#8E8E93', fontWeight: '500' },
  tabTextActive: { color: '#007AFF', fontWeight: '600' },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { flexGrow: 1 },
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
  groupAvatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  info: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  name: { fontSize: 16, fontWeight: '600', color: '#000', flex: 1, marginRight: 8 },
  time: { fontSize: 12, color: '#8E8E93' },
  lastMsg: { fontSize: 14, color: '#8E8E93' },
  startChat: { color: '#007AFF', fontSize: 13 },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#000', marginTop: 16, marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#8E8E93', textAlign: 'center' },
  // ── Rename modal ──────────────────────────────────────────────────────────
  renameOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  renameBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
  },
  renameTitle: { fontSize: 17, fontWeight: '600', color: '#000', marginBottom: 14, textAlign: 'center' },
  renameInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: '#000',
    marginBottom: 16,
  },
  renameActions: { flexDirection: 'row', gap: 10 },
  renameCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
  },
  renameCancelText: { fontSize: 16, color: '#8E8E93' },
  renameSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  renameSaveText: { fontSize: 16, color: '#fff', fontWeight: '600' },
});
