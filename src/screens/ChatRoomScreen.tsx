import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { useAlert } from '../context/AlertContext';
import chatService, { ConversationDto, MessageDto } from '../api/chatService';
import { buildMediaUrl, getBaseUrl } from '../config/api';

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
  
  // Use props if available, otherwise fallback to route params
  const friendId = propConversation?.participants?.find((p: any) => p.user.id !== useAuthStore.getState().user?.id)?.user.id 
                 || propFriendId 
                 || route.params?.friendId;
  
  const friendName = propConversation?.name 
                   || propFriendName 
                   || route.params?.friendName 
                   || propConversation?.participants?.find((p: any) => p.user.id !== useAuthStore.getState().user?.id)?.user.name;

  const friendAvatar = propFriendAvatar 
                     || route.params?.friendAvatar 
                     || propConversation?.participants?.find((p: any) => p.user.id !== useAuthStore.getState().user?.id)?.user.avatarUrl;

  const conversation = propConversation || { id: 0, isGroup: false, participants: [] };

  const currentUser = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const { subscribeToRoom, sendMessage, reactToMessage, isConnected, updateConversation } = useChatStore();
  const { showAlert } = useAlert();

  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [inputText, setInputText] = useState('');
  const [reactionTarget, setReactionTarget] = useState<number | null>(null);
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
          updateConversation(conv);
        } catch (e: any) {
          console.error('[ChatRoom] Failed to open direct chat error detail:', e);
          showAlert('Lỗi', 'Không thể kết nối cuộc trò chuyện: ' + (e.message || 'Unknown error'));
          setLoading(false);
          loadingRef.current = false;
          return;
        }
      }

      if (convId === 0) {
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

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');

    if (isConnected) {
      sendMessage(conversation.id, 'TEXT', text);
    } else {
      // Fallback to REST
      chatService
        .sendMessage(conversation.id, text, token)
        .then((msg) => {
          setMessages((prev) => [msg, ...prev]);
          syncLastMessage(msg);
        });
    }
  }, [inputText, isConnected, conversation.id]);

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
    const avatarUrl = item.senderAvatarUrl ? buildMediaUrl(item.senderAvatarUrl) : null;

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
          {/* Show username in group chats for others */}
          {!isMe && conversation.isGroup && (
            <Text style={styles.senderName}>{item.senderUsername}</Text>
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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => onBack ? onBack() : navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>{displayName}</Text>
          {conversation.isGroup && (
            <Text style={styles.headerSub}>
              {conversation.participants.length} thành viên
            </Text>
          )}
        </View>
        {!isConnected && (
          <ActivityIndicator size="small" color="#FF3B30" style={{ marginRight: 8 }} />
        )}
      </View>

      {/* Messages + Input — tách riêng để tránh KeyboardAvoidingView che FlatList inverted */}
      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {messages.length === 0 && (
              <View style={styles.emptyState}>
                <Image
                  source={require('../assets/images/message.png')}
                  style={styles.emptyIcon}
                />
                <Text style={styles.emptyTitle}>Bắt đầu trò chuyện ngay!</Text>
                <Text style={styles.emptySubtitle}>
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
              onEndReached={() => {
                if (hasMore && !loadingMore) loadMessages(page + 1);
              }}
              onEndReachedThreshold={0.3}
              ListFooterComponent={loadingMore ? <ActivityIndicator color="#007AFF" /> : null}
            />
          </View>
        )}

        {/* Input bar */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder="Nhập tin nhắn..."
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
              <Ionicons name="send" size={20} color={inputText.trim() ? '#007AFF' : '#C7C7CC'} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>

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
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    gap: 8,
  },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 17, fontWeight: '600', color: '#000' },
  headerSub: { fontSize: 12, color: '#8E8E93' },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messagesContent: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 12 },
  emptyState: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    opacity: 0.35,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3C3C43',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
  messageRow: { marginVertical: 4, flexDirection: 'row', alignItems: 'flex-end' },
  messageRowLeft: { justifyContent: 'flex-start' },
  messageRowRight: { justifyContent: 'flex-end' },
  avatarWrap: { marginRight: 6 },
  avatar: { width: 28, height: 28, borderRadius: 14 },
  avatarDefault: { backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center' },
  bubble: {
    maxWidth: '75%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bubbleMe: { backgroundColor: '#007AFF', borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#fff', borderBottomLeftRadius: 4 },
  senderName: { fontSize: 11, fontWeight: '600', color: '#007AFF', marginBottom: 2 },
  messageText: { fontSize: 16, lineHeight: 22 },
  messageTextMe: { color: '#fff' },
  messageTextThem: { color: '#000' },
  shareCardRich: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    overflow: 'hidden',
    width: 200,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  shareImg: { width: '100%', height: 120, backgroundColor: '#E5E5EA' },
  shareImgPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFE4EC' },
  shareImgAsset: { width: 56, height: 56, opacity: 0.5 },
  shareAlbumIcon: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F8FF' },
  shareInfo: { padding: 8 },
  shareAuthor: { fontSize: 12, fontWeight: 'bold', color: '#007AFF', marginBottom: 2 },
  shareText: { fontSize: 13, color: '#333' },
  shareTitle: { fontSize: 14, fontWeight: 'bold', color: '#000' },
  shareSub: { fontSize: 12, color: '#8E8E93' },
  shareTap: { fontSize: 11, color: '#007AFF', marginTop: 4 },
  msgTime: { fontSize: 10, marginTop: 2 },
  msgTimeMe: { color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  msgTimeThem: { color: '#8E8E93' },
  shareCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,122,255,0.08)',
    borderRadius: 10,
    padding: 10,
  },
  shareCardText: { fontSize: 14, color: '#007AFF', fontWeight: '500' },
  reactions: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, marginTop: 2 },
  reactionsRight: { justifyContent: 'flex-end', alignSelf: 'flex-end', marginRight: 4 },
  reactionsLeft: { marginLeft: 34 },
  reactionChip: { fontSize: 12, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 16,
    maxHeight: 120,
  },
  sendBtn: { padding: 8 },
  sendBtnDisabled: {},
  reactionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionPicker: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 40,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  emojiBtn: { padding: 6 },
  emoji: { fontSize: 28 },
});
