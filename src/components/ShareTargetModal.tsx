import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuthStore } from '../store/useAuthStore';
import { useAlert } from '../context/AlertContext';
import chatService, { ConversationDto } from '../api/chatService';
import { buildMediaUrl, getApiUrl } from '../config/api';

interface Props {
  visible: boolean;
  onClose: () => void;
  shareType: 'MOMENT' | 'ALBUM';
  referenceId: number;
}

interface UserItem {
  id: number;
  name: string;
  username: string;
  avatarUrl?: string;
}

export default function ShareTargetModal({ visible, onClose, shareType, referenceId }: Props) {
  const token = useAuthStore((s) => s.token) || '';
  const currentUser = useAuthStore((s) => s.user);
  const { showAlert } = useAlert();

  const [search, setSearch] = useState('');
  const [conversations, setConversations] = useState<ConversationDto[]>([]);
  const [friends, setFriends] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingId, setSendingId] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load friends (always works, even with no conversations)
      const friendsRes = await fetch(`${getApiUrl()}/friends`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (friendsRes.ok) {
        const json = await friendsRes.json();
        setFriends(json.data || []);
      }

      // Load existing conversations (may be empty list - that's fine)
      try {
        const convos = await chatService.getConversations(token);
        setConversations(convos || []);
      } catch {
        setConversations([]);
      }
    } catch (e) {
      console.error('Failed to load share targets', e);
    } finally {
      setLoading(false);
    }
  }

  const handleShareToConversation = async (conv: ConversationDto) => {
    try {
      setSendingId(conv.id);
      await chatService.sendMessage(
        conv.id,
        shareType === 'MOMENT' ? 'SHARE_MOMENT' : 'SHARE_ALBUM',
        token,
        shareType === 'MOMENT' ? 'SHARE_MOMENT' : 'SHARE_ALBUM',
        referenceId
      );
      showAlert('Thành công', 'Đã chia sẻ');
      onClose();
    } catch (e) {
      showAlert('Lỗi', 'Không thể chia sẻ');
    } finally {
      setSendingId(null);
    }
  };

  const handleShareToFriend = async (friend: UserItem) => {
    try {
      setSendingId(friend.id);
      // Open/Get conv first
      const conv = await chatService.openDirectChat(friend.id, token);
      await chatService.sendMessage(
        conv.id,
        shareType === 'MOMENT' ? 'SHARE_MOMENT' : 'SHARE_ALBUM',
        token,
        shareType === 'MOMENT' ? 'SHARE_MOMENT' : 'SHARE_ALBUM',
        referenceId
      );
      showAlert('Thành công', 'Đã chia sẻ');
      onClose();
    } catch (e) {
      showAlert('Lỗi', 'Không thể chia sẻ');
    } finally {
      setSendingId(null);
    }
  };

  const filteredConversations = conversations.filter(c => {
    const title = c.isGroup ? c.title : c.participants.find(p => p.userId !== currentUser?.id)?.fullName || '';
    return title?.toLowerCase().includes(search.toLowerCase());
  });

  const filteredFriends = friends.filter(f => 
    f.name.toLowerCase().includes(search.toLowerCase()) || 
    f.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Chia sẻ qua tin nhắn</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#8E8E93" />
            <TextInput
              style={styles.input}
              placeholder="Tìm kiếm..."
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color="#007AFF" />
          ) : (
            <FlatList
              data={[...filteredConversations, ...filteredFriends.filter(f => !conversations.some(c => !c.isGroup && c.participants.some(p => p.userId === f.id)))]}
              keyExtractor={(item, index) => 'target-' + index}
              renderItem={({ item }) => {
                const isConv = Array.isArray((item as any).participants);
                
                let title = 'Người dùng';
                let avatar = null;
                let subtitle = '';

                if (isConv) {
                  const conv = item as ConversationDto;
                  if (conv.isGroup) {
                    title = conv.title || 'Nhóm không tên';
                    subtitle = `${conv.participants?.length || 0} thành viên`;
                  } else {
                    const other = conv.participants?.find(p => p.userId !== currentUser?.id) || conv.participants?.[0];
                    title = other?.fullName || other?.username || 'Người dùng';
                    avatar = other?.avatarUrl;
                    subtitle = other?.username ? `@${other.username}` : '';
                  }
                } else {
                  const friend = item as any;
                  title = friend.name || friend.fullName || friend.username || 'Người dùng';
                  avatar = friend.avatarUrl;
                  subtitle = friend.username ? `@${friend.username}` : '';
                }

                return (
                  <TouchableOpacity 
                    style={styles.friendItem}
                    activeOpacity={0.9}
                    onPress={() => isConv ? handleShareToConversation(item as any) : handleShareToFriend(item as any)}
                  >
                    <Image 
                      source={require('../assets/images/cover-default.jpg')} 
                      style={styles.friendBackground}
                    />
                    
                    <View style={styles.friendOverlay}>
                      <View style={styles.friendInfo}>
                        {avatar ? (
                          <Image source={{ uri: buildMediaUrl(avatar) }} style={styles.avatar} />
                        ) : (
                          <Image 
                            source={require('../assets/images/avatar-default.png')} 
                            style={styles.avatar}
                          />
                        )}
                        <View style={styles.friendDetails}>
                          <Text style={styles.friendName} numberOfLines={1}>{title}</Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.sendIconBtn}
                        onPress={() => isConv ? handleShareToConversation(item as any) : handleShareToFriend(item as any)}
                        disabled={sendingId !== null}
                      >
                        {sendingId === (item as any).id || (isConv && sendingId === (item as any).id) ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Image 
                            source={require('../assets/images/send.png')} 
                            style={styles.sendIcon}
                          />
                        )}
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<Text style={styles.empty}>Không tìm thấy mục tiêu nào</Text>}
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    height: '85%',
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#1C1C1E' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 44,
  },
  input: { flex: 1, marginLeft: 10, fontSize: 16, color: '#000' },
  friendItem: {
    height: 100,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  friendBackground: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  friendOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  sendIconBtn: { 
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  sendIcon: {
    width: 24,
    height: 24,
  },
  empty: { textAlign: 'center', marginTop: 50, color: '#8E8E93', fontSize: 15 },
});
