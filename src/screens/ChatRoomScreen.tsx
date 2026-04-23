import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { useAlert } from '../context/AlertContext';
import chatService, { ConversationDto, MessageDto } from '../api/chatService';
import { buildMediaUrl, buildAvatarUrl, getBaseUrl } from '../config/api';
// import GroupInfoModal from '../components/GroupInfoModal';
import AddMemberModal from '../components/AddMemberModal';
import { SPACING, COLORS, LIGHT_COLORS, DARK_COLORS, FONT_SIZE, FONT_WEIGHT, RADIUS, SHADOWS, CHAT } from '../constants/design';
import { useThemeStore } from '../store/useThemeStore';
import Spacer from '../components/ui/Spacer';

// ─── Reaction emoji toolbar ───
const EMOJIS = ['❤️', '😂', '😮', '😢', '👍', '👎'];

interface Props {
  conversation: ConversationDto;
  onBack: () => void;
  onPressMoment?: (momentId: number) => void;
  onPressAlbum?: (albumId: number) => void;
  friendId?: number;
  friendName?: string;
  friendAvatar?: string;
}

export default function ChatRoomScreen({ 
  conversation: propConversation, 
  friendId: propFriendId, 
  friendName: propFriendName, 
  friendAvatar: propFriendAvatar, 
  onBack, 
  onPressMoment, 
  onPressAlbum 
}: any) {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  
  const currentUser = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const { subscribeToRoom, sendMessage, reactToMessage, isConnected, updateConversation } = useChatStore();
  const { showAlert } = useAlert();
  const { mode } = useThemeStore();
  const isDark = mode === 'dark';
  const C = isDark ? DARK_COLORS : LIGHT_COLORS;

  // Use state to track conversation (can be updated after creation)
  const [conversation, setConversation] = useState<ConversationDto>(
    propConversation || { id: 0, isGroup: false, participants: [], title: null, creatorId: null, createdAt: new Date().toISOString(), lastMessage: null }
  );
  
  // Use props if available, otherwise fallback to route params
  const friendId = propConversation?.participants?.find((p: any) => p.userId !== currentUser?.id)?.userId 
                 || propFriendId 
                 || route.params?.friendId;
  
  const friendName = propConversation?.title
                   || propFriendName 
                   || route.params?.friendName 
                   || propConversation?.participants?.find((p: any) => p.userId !== currentUser?.id)?.fullName;

  const friendAvatar = propFriendAvatar 
                     || route.params?.friendAvatar 
                     || propConversation?.participants?.find((p: any) => p.userId !== currentUser?.id)?.avatarUrl;

  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [inputText, setInputText] = useState('');
  const [reactionTarget, setReactionTarget] = useState<number | null>(null);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [addMemberModal, setAddMemberModal] = useState(false);
  const [renameModal, setRenameModal] = useState(false);
  const [renameText, setRenameText] = useState('');
  const [renaming, setRenaming] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const loadingRef = useRef(false);
  const hasAttemptedOpen = useRef(false);

  const baseUrl = getBaseUrl();

  // Other participant for 1-1 chats
  const otherParticipant = !conversation.isGroup
    ? conversation.participants.find((p) => p.userId !== currentUser?.id)
    : null;

  const displayName = conversation.isGroup
    ? (conversation.title || 'Nhóm chat')
    : (otherParticipant?.fullName || otherParticipant?.username || friendName || 'Người dùng');

  // ─── Sync last message back to conversations store ───
  // Called whenever a new message arrives so ChatsListScreen always shows the latest.
  const syncLastMessage = useCallback((msg: MessageDto) => {
    updateConversation({
      ...conversation,
      lastMessage: msg,
    });
  }, [conversation, updateConversation]);

  // ─── Load initial messages ───
  useEffect(() => {
    loadMessages(0);
  }, [conversation.id]);

  // ─── Subscribe to real-time via STOMP ───
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = subscribeToRoom(conversation.id, (newMsg) => {
      setMessages((prev) => {
        // If reaction update (same id exists)
        const exists = prev.findIndex((m) => m.id === newMsg.id);
        if (exists !== -1) {
          const updated = [...prev];
          updated[exists] = newMsg;
          return updated;
        }
        // New message — sync to conversations list
        syncLastMessage(newMsg);
        return [newMsg, ...prev];
      });
    });

    return unsubscribe;
  }, [conversation.id, isConnected]);

  const loadMessages = async (pageNum: number) => {
    if (loadingRef.current) return;
    
    try {
      loadingRef.current = true;
      if (pageNum === 0) setLoading(true);
      else setLoadingMore(true);

      let convId = conversation.id;

      // If we don't have a conversation ID yet (e.g. from notification), get/create it
      if (convId === 0 && friendId && !hasAttemptedOpen.current) {
        try {
          hasAttemptedOpen.current = true;
          console.log('[ChatRoom] Attempting to open direct chat with friendId:', friendId);
          const conv = await chatService.openDirectChat(friendId, token || '');
          convId = conv.id;
          // Update local state AND store
          setConversation(conv);
          updateConversation(conv);
          console.log('[ChatRoom] Conversation opened with id:', convId);
        } catch (e: any) {
          console.error('[ChatRoom] Failed to open direct chat error detail:', e);
          showAlert('Lỗi', 'Không thể kết nối cuộc trò chuyện: ' + (e.message || 'Unknown error'));
          setLoading(false);
          loadingRef.current = false;
          return;
        }
      }

      if (convId === 0) {
        console.log('[ChatRoom] No valid conversation ID, skipping message load');
        setLoading(false);
        loadingRef.current = false;
        return;
      }

      const msgs = await chatService.getMessages(convId, pageNum, token || '');
      if (msgs.length < 30) setHasMore(false);

      setMessages((prev) => (pageNum === 0 ? msgs : [...prev, ...msgs]));
      setPage(pageNum);
    } catch (e) {
      console.error('[ChatRoom] Failed to load messages:', e);
      showAlert('Lỗi', 'Không thể tải tin nhắn');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingRef.current = false;
    }
  };

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');

    // Ensure conversation exists before sending
    let convId = conversation.id;
    
    // If conversation doesn't exist yet, create it first
    if (convId === 0 && friendId) {
      try {
        console.log('[ChatRoom] Creating conversation before sending message to friendId:', friendId);
        const conv = await chatService.openDirectChat(friendId, token || '');
        convId = conv.id;
        setConversation(conv);
        updateConversation(conv);
        console.log('[ChatRoom] Conversation created with id:', convId);
      } catch (e: any) {
        console.error('[ChatRoom] Failed to create conversation:', e);
        showAlert('Lỗi', 'Không thể tạo cuộc trò chuyện: ' + (e.message || 'Unknown error'));
        return;
      }
    }

    // Now send the message with valid conversation ID
    if (convId === 0) {
      showAlert('Lỗi', 'Không thể gửi tin nhắn: Cuộc trò chuyện không hợp lệ');
      return;
    }

    if (isConnected) {
      sendMessage(convId, 'TEXT', text);
    } else {
      // Fallback to REST
      chatService
        .sendMessage(convId, text, token)
        .then((msg) => {
          setMessages((prev) => [msg, ...prev]);
          syncLastMessage(msg);
        })
        .catch((e) => {
          console.error('[ChatRoom] Failed to send message:', e);
          showAlert('Lỗi', 'Không thể gửi tin nhắn');
        });
    }
  }, [inputText, isConnected, conversation.id, friendId, token, updateConversation, syncLastMessage, showAlert, setConversation]);

  const handleReact = useCallback(
    (emoji: string) => {
      if (reactionTarget == null) return;
      setReactionTarget(null);

      if (isConnected) {
        reactToMessage(reactionTarget, emoji);
      } else {
        chatService.reactToMessage(reactionTarget, emoji, token).then((updated) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? updated : m))
          );
        });
      }
    },
    [reactionTarget, isConnected]
  );

  // ─── Group Management ───
  const handleGroupOptions = () => {
    if (!conversation.isGroup) return;
    const isAdmin = conversation.creatorId === currentUser?.id;

    const options = [];
    
    if (isAdmin) {
      options.push({
        text: 'Đổi tên nhóm',
        onPress: () => {
          setRenameText(conversation.title || '');
          setRenameModal(true);
        },
      });
      options.push({
        text: 'Thêm thành viên',
        onPress: () => setAddMemberModal(true),
      });
      options.push({
        text: 'Xóa thành viên',
        onPress: () => handleRemoveMemberFromGroup(),
      });
      options.push({
        text: 'Giải tán nhóm',
        style: 'destructive',
        onPress: () => handleDeleteGroup(),
      });
    } else {
      options.push({
        text: 'Rời khỏi nhóm',
        style: 'destructive',
        onPress: () => handleLeaveGroup(),
      });
    }
    
    options.push({ text: 'Đóng', style: 'cancel' });

    showAlert('Quản lý nhóm', conversation.title || 'Nhóm chat', options);
  };

  const handleRenameGroup = async () => {
    if (!renameText.trim()) return;
    try {
      setRenaming(true);
      const updated = await chatService.renameGroup(conversation.id, renameText.trim(), token!);
      setConversation(updated);
      updateConversation(updated);
      setRenameModal(false);
      showAlert('Thành công', 'Đã đổi tên nhóm');
    } catch (e: any) {
      showAlert('Lỗi', e.message || 'Không thể đổi tên nhóm');
    } finally {
      setRenaming(false);
    }
  };

  const handleRemoveMemberFromGroup = () => {
    const members = conversation.participants.filter((p) => p.userId !== currentUser?.id);
    if (members.length === 0) {
      showAlert('Thông báo', 'Không có thành viên nào khác để xóa');
      return;
    }

    const memberOptions = members.map((p) => ({
      text: p.fullName || p.username,
      onPress: () => confirmRemoveMember(p.userId, p.fullName || p.username),
    }));
    memberOptions.push({ text: 'Đóng', style: 'cancel' });
    showAlert('Xóa thành viên', 'Chọn thành viên cần xóa', memberOptions);
  };

  const confirmRemoveMember = (userId: number, name: string) => {
    showAlert('Xác nhận', `Xóa ${name} khỏi nhóm?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await chatService.removeMember(conversation.id, userId, token!);
            const updated = {
              ...conversation,
              participants: conversation.participants.filter((p) => p.userId !== userId),
            };
            setConversation(updated);
            updateConversation(updated);
            showAlert('Thành công', `Đã xóa ${name}`);
          } catch (e: any) {
            showAlert('Lỗi', e.message || 'Không thể xóa thành viên');
          }
        },
      },
    ]);
  };

  const handleDeleteGroup = () => {
    showAlert('Giải tán nhóm', 'Bạn có chắc chắn muốn giải tán nhóm này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Giải tán',
        style: 'destructive',
        onPress: async () => {
          try {
            await chatService.deleteGroup(conversation.id, token!);
            showAlert('Thành công', 'Đã giải tán nhóm');
            onBack ? onBack() : navigation.goBack();
          } catch (e: any) {
            showAlert('Lỗi', e.message || 'Không thể giải tán nhóm');
          }
        },
      },
    ]);
  };

  const handleLeaveGroup = () => {
    showAlert('Rời nhóm', 'Bạn có chắc chắn muốn rời khỏi nhóm này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Rời nhóm',
        style: 'destructive',
        onPress: async () => {
          try {
            await chatService.removeMember(conversation.id, currentUser!.id, token!);
            showAlert('Thành công', 'Đã rời khỏi nhóm');
            onBack ? onBack() : navigation.goBack();
          } catch (e: any) {
            showAlert('Lỗi', e.message || 'Không thể rời nhóm');
          }
        },
      },
    ]);
  };

  // ─── Render shared content card ───
  const renderSharedContent = (item: MessageDto) => {
    const preview: any = item.sharedPreview;
    if (!preview) return null;

    const shareType = item.content || item.type;

    if (shareType === 'SHARE_MOMENT' || shareType === 'MOMENT') {
      return (
        <TouchableOpacity
          style={styles.shareCardRich}
          activeOpacity={0.8}
          onPress={() => item.referenceId && onPressMoment?.(item.referenceId)}
        >
          <View style={[styles.shareImg, styles.shareImgPlaceholder]}>
            <Image
              source={require('../assets/images/moment.png')}
              style={styles.shareImgAsset}
            />
          </View>
          <View style={styles.shareInfo}>
            <Text style={styles.shareAuthor}>{preview.authorName}</Text>
            <Text style={styles.shareText} numberOfLines={2}>{preview.content || 'Khoảnh khắc'}</Text>
            <Text style={styles.shareTap}>Nhấn để xem →</Text>
          </View>
        </TouchableOpacity>
      );
    }

    if (shareType === 'SHARE_ALBUM' || shareType === 'ALBUM') {
      return (
        <TouchableOpacity
          style={styles.shareCardRich}
          activeOpacity={0.8}
          onPress={() => item.referenceId && onPressAlbum?.(item.referenceId)}
        >
          <View style={[styles.shareImg, styles.shareAlbumIcon]}>
            <Image
              source={require('../assets/images/album.png')}
              style={styles.shareImgAsset}
            />
          </View>
          <View style={styles.shareInfo}>
            <Text style={styles.shareTitle}>{preview.title}</Text>
            <Text style={styles.shareSub}>{preview.itemCount} mục • {preview.description || 'Không có mô tả'}</Text>
            <Text style={styles.shareTap}>Nhấn để lưu & xem →</Text>
          </View>
        </TouchableOpacity>
      );
    }

    return null;
  };

  // ─── Render individual message ───
  const renderMessage = ({ item }: { item: MessageDto }) => {
    const isMe = item.senderId === currentUser?.id;
    const totalReactions = Object.values(item.reactions ?? {}).reduce((a, b) => a + b, 0);
    const avatarUrl = item.senderAvatarUrl ? buildAvatarUrl(item.senderAvatarUrl) : null;

    const isShare = item.type === 'SHARE' || item.type?.startsWith('SHARE_');

    return (
      <Pressable
        onLongPress={() => setReactionTarget(item.id)}
        style={[styles.messageRow, isMe ? styles.messageRowRight : styles.messageRowLeft]}
      >
        {/* Avatar for others */}
        {!isMe && (
          <View style={styles.avatarWrap}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarDefault]}>
                <Ionicons name="person" size={14} color="#fff" />
              </View>
            )}
          </View>
        )}

        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          {/* Show name in group chats for others */}
          {!isMe && conversation.isGroup && (
            <Text style={styles.senderName}>{item.senderName || item.senderUsername}</Text>
          )}

          {(!isShare) && (
            <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextThem]}>
              {item.content || ''}
            </Text>
          )}

          {isShare && renderSharedContent(item)}

          {/* Fallback for share if no preview */}
          {isShare && !item.sharedPreview && (
            <View style={styles.shareCard}>
              <Ionicons
                name={(item.content || '').includes('MOMENT') ? 'images-outline' : 'albums-outline'}
                size={20}
                color="#007AFF"
              />
              <Text style={styles.shareCardText}>
                {(item.content || '').includes('MOMENT') ? 'Đã chia sẻ một Moment' : 'Đã chia sẻ một Album'}
              </Text>
            </View>
          )}

          {/* Timestamp */}
          <Text style={[styles.msgTime, isMe ? styles.msgTimeMe : styles.msgTimeThem]}>
            {new Date(item.createdAt).toLocaleTimeString('vi', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        {/* Reactions */}
        {totalReactions > 0 && (
          <View style={[styles.reactions, isMe ? styles.reactionsRight : styles.reactionsLeft]}>
            {Object.entries(item.reactions)
              .filter(([, count]) => count > 0)
              .map(([emoji, count]) => (
                <Text key={emoji} style={styles.reactionChip}>
                  {emoji} {count}
                </Text>
              ))}
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: isDark ? '#0D0D14' : COLORS.gray50 }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => onBack ? onBack() : (navigation.canGoBack() && navigation.goBack())}>
          <Ionicons name="arrow-back" size={24} color={C.primary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.headerInfo}
          onPress={handleGroupOptions}
          disabled={!conversation.isGroup}
        >
          <Text style={[styles.headerName, { color: C.textPrimary }]} numberOfLines={1}>{displayName}</Text>
          {conversation.isGroup && (
            <Text style={[styles.headerSub, { color: C.textTertiary }]}>
              {conversation.participants.length} thành viên • Nhấn để xem
            </Text>
          )}
        </TouchableOpacity>
        {!isConnected && (
          <ActivityIndicator size="small" color={COLORS.error} style={{ marginRight: SPACING.sm }} />
        )}
      </View>

      {/* Messages List */}
      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {messages.length === 0 && (
            <View style={styles.emptyState}>
              <Image
                source={require('../assets/images/message.png')}
                style={styles.emptyIcon}
              />
              <Text style={[styles.emptyTitle, { color: C.textSecondary }]}>Bắt đầu trò chuyện ngay!</Text>
              <Text style={[styles.emptySubtitle, { color: C.textTertiary }]}>
                Hãy gửi tin nhắn đầu tiên{'\n'}hoặc chia sẻ một khoảnh khắc
              </Text>
            </View>
          )}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderMessage}
            inverted
            contentContainerStyle={styles.messagesContent}
            keyboardShouldPersistTaps="handled"
            onEndReached={() => {
              if (hasMore && !loadingMore) loadMessages(page + 1);
            }}
            onEndReachedThreshold={0.3}
            ListFooterComponent={loadingMore ? <ActivityIndicator color="#007AFF" /> : null}
          />
        </View>
      )}

      {/* Input bar with KeyboardAvoidingView */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 60 : 0}
      >
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + SPACING.sm, backgroundColor: C.surface, borderTopColor: C.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : COLORS.gray100, color: C.textPrimary }]}
            placeholder="Nhập tin nhắn..."
            placeholderTextColor={C.textTertiary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={20} color={inputText.trim() ? COLORS.primary : COLORS.gray300} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Reaction picker */}
      <Modal
        transparent
        visible={reactionTarget !== null}
        animationType="fade"
        onRequestClose={() => setReactionTarget(null)}
      >
        <Pressable style={styles.reactionOverlay} onPress={() => setReactionTarget(null)}>
          <View style={styles.reactionPicker}>
            {EMOJIS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={styles.emojiBtn}
                onPress={() => handleReact(emoji)}
              >
                <Text style={styles.emoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Add Member Modal */}
      {addMemberModal && (
        <AddMemberModal
          visible={addMemberModal}
          conversation={conversation}
          onClose={() => setAddMemberModal(false)}
          onSuccess={(updated) => {
            setConversation(updated);
            updateConversation(updated);
            setAddMemberModal(false);
            showAlert('Thành công', 'Đã thêm thành viên mới');
          } }
        />
      )}

      {/* Rename Group Modal */}
      <Modal
        visible={renameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setRenameModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Đổi tên nhóm</Text>
            <TextInput
              style={styles.modalInput}
              value={renameText}
              onChangeText={setRenameText}
              autoFocus
              placeholder="Tên nhóm mới..."
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalBtn} onPress={() => setRenameModal(false)}>
                <Text style={styles.modalBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnPrimary]} 
                onPress={handleRenameGroup}
                disabled={renaming}
              >
                {renaming ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalBtnTextPrimary}>Lưu</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray50 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  backBtn: { padding: SPACING.xs },
  headerInfo: { flex: 1 },
  headerName: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold, color: COLORS.gray900 },
  headerSub: { fontSize: FONT_SIZE.xs, color: COLORS.gray500 },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messagesContent: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: SPACING.md },
  emptyState: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xxxl,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    opacity: 0.35,
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray700,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.gray500,
    textAlign: 'center',
    lineHeight: FONT_SIZE.md * 1.4,
  },
  messageRow: { marginVertical: SPACING.xs, flexDirection: 'row', alignItems: 'flex-end' },
  messageRowLeft: { justifyContent: 'flex-start' },
  messageRowRight: { justifyContent: 'flex-end' },
  avatarWrap: { marginRight: SPACING.xs },
  avatar: { width: CHAT.avatarSize, height: CHAT.avatarSize, borderRadius: CHAT.avatarSize / 2 },
  avatarDefault: { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  bubble: {
    maxWidth: CHAT.bubbleMaxWidth,
    borderRadius: CHAT.bubbleRadius,
    paddingHorizontal: CHAT.bubblePadding.horizontal,
    paddingVertical: CHAT.bubblePadding.vertical,
    ...SHADOWS.sm,
  },
  bubbleMe: { backgroundColor: COLORS.chatBubbleSent, borderBottomRightRadius: SPACING.xs },
  bubbleThem: { backgroundColor: COLORS.chatBubbleReceived, borderBottomLeftRadius: SPACING.xs },
  senderName: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.primary, marginBottom: 2 },
  messageText: { fontSize: FONT_SIZE.lg, lineHeight: FONT_SIZE.lg * 1.4 },
  messageTextMe: { color: COLORS.chatTextSent },
  messageTextThem: { color: COLORS.chatTextReceived },
  shareCardRich: {
    backgroundColor: COLORS.gray100,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    width: 200,
    marginTop: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  shareImg: { width: '100%', height: 120, backgroundColor: COLORS.gray200 },
  shareImgPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFE4EC' },
  shareImgAsset: { width: 56, height: 56, opacity: 0.5 },
  shareAlbumIcon: { justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primary + '10' },
  shareInfo: { padding: SPACING.sm },
  shareAuthor: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, color: COLORS.primary, marginBottom: 2 },
  shareText: { fontSize: FONT_SIZE.sm, color: COLORS.gray700 },
  shareTitle: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: COLORS.gray900 },
  shareSub: { fontSize: FONT_SIZE.xs, color: COLORS.gray500 },
  shareTap: { fontSize: FONT_SIZE.xs, color: COLORS.primary, marginTop: SPACING.xs },
  msgTime: { fontSize: FONT_SIZE.xs, marginTop: 2 },
  msgTimeMe: { color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  msgTimeThem: { color: COLORS.gray500 },
  shareCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary + '08',
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
  },
  shareCardText: { fontSize: FONT_SIZE.md, color: COLORS.primary, fontWeight: FONT_WEIGHT.medium },
  reactions: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, marginTop: 2 },
  reactionsRight: { justifyContent: 'flex-end', alignSelf: 'flex-end', marginRight: SPACING.xs },
  reactionsLeft: { marginLeft: 34 },
  reactionChip: { fontSize: FONT_SIZE.xs, backgroundColor: COLORS.surface, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.xs, paddingVertical: 2 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.gray100,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZE.lg,
    maxHeight: 120,
    color: COLORS.gray900,
  },
  sendBtn: { padding: SPACING.sm },
  sendBtnDisabled: {},
  reactionOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionPicker: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.huge,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
    ...SHADOWS.lg,
    elevation: 8,
  },
  emojiBtn: { padding: 6 },
  emoji: { fontSize: 28 },
  // Modal styles for Rename
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    width: '100%',
    ...SHADOWS.md,
  },
  modalTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: SPACING.lg,
    color: '#000',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZE.lg,
    marginBottom: SPACING.xl,
    color: '#000',
  },
  modalBtns: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.md,
  },
  modalBtn: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
  },
  modalBtnPrimary: {
    backgroundColor: COLORS.primary,
  },
  modalBtnText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.gray500,
    fontWeight: FONT_WEIGHT.semibold,
  },
  modalBtnTextPrimary: {
    fontSize: FONT_SIZE.md,
    color: '#fff',
    fontWeight: FONT_WEIGHT.bold,
  },
});
