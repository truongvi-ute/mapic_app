import { getApiUrl } from '../config/api';

export interface ParticipantDto {
  userId: number;
  username: string;
  fullName: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  role: 'ADMIN' | 'MEMBER';
}

export interface MessageDto {
  id: number;
  conversationId: number;
  senderId: number;
  senderUsername: string;
  senderName?: string; // Full name of sender
  senderAvatarUrl?: string;
  type: 'TEXT' | 'SHARE' | 'SHARE_MOMENT' | 'SHARE_ALBUM';
  content?: string;
  referenceId?: number;
  sharedPreview?: any; // Preview data for shared content
  reactions: Record<string, number>; // emoji -> count
  myReaction?: string;
  createdAt: string;
}

export interface ConversationDto {
  id: number;
  isGroup: boolean;
  title?: string;
  groupAvatarUrl?: string; // Avatar for group chats
  creatorId?: number;
  createdAt: string;
  lastMessage?: MessageDto;
  participants: ParticipantDto[];
  unreadCount: number;
}

const chatService = {
  async getConversations(token: string): Promise<ConversationDto[]> {
    const res = await fetch(`${getApiUrl()}/chat/rooms`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to load conversations');
    const json = await res.json();
    return json.data || [];
  },

  async openDirectChat(friendId: number, token: string): Promise<ConversationDto> {
    const res = await fetch(`${getApiUrl()}/chat/rooms/direct/${friendId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Failed to open chat: ${res.status} ${errBody}`);
    }
    const json = await res.json();
    return json.data;
  },

  async createGroup(title: string, memberIds: number[], token: string): Promise<ConversationDto> {
    const res = await fetch(`${getApiUrl()}/chat/rooms/group`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, memberIds }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to create group');
    }
    const json = await res.json();
    return json.data;
  },

  async removeMember(roomId: number, userId: number, token: string): Promise<void> {
    const res = await fetch(`${getApiUrl()}/chat/rooms/${roomId}/members/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to remove member');
    }
  },

  async renameGroup(roomId: number, title: string, token: string): Promise<ConversationDto> {
    const res = await fetch(`${getApiUrl()}/chat/rooms/${roomId}/title`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to rename group');
    }
    const json = await res.json();
    return json.data;
  },

  async updateGroupAvatar(roomId: number, imageUri: string, token: string): Promise<ConversationDto> {
    const formData = new FormData();
    
    // Create file object from URI
    const filename = imageUri.split('/').pop() || 'group-avatar.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    formData.append('file', {
      uri: imageUri,
      name: filename,
      type,
    } as any);

    const res = await fetch(`${getApiUrl()}/chat/rooms/${roomId}/avatar`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to update group avatar');
    }
    const json = await res.json();
    return json.data;
  },

  async deleteGroup(roomId: number, token: string): Promise<void> {
    const res = await fetch(`${getApiUrl()}/chat/rooms/${roomId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to delete group');
    }
  },

  async getMessages(roomId: number, page: number, token: string): Promise<MessageDto[]> {
    const res = await fetch(`${getApiUrl()}/chat/rooms/${roomId}/messages?page=${page}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to load messages');
    const json = await res.json();
    return json.data;
  },

  async sendMessage(
    roomId: number,
    content: string,
    token: string,
    type: 'TEXT' | 'SHARE_MOMENT' | 'SHARE_ALBUM' = 'TEXT',
    referenceId?: number
  ): Promise<MessageDto> {
    const res = await fetch(`${getApiUrl()}/chat/rooms/${roomId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type, content, referenceId }),
    });
    if (!res.ok) throw new Error('Failed to send message');
    const json = await res.json();
    return json.data;
  },

  async reactToMessage(messageId: number, emoji: string, token: string): Promise<MessageDto> {
    const res = await fetch(`${getApiUrl()}/chat/messages/${messageId}/react`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ emoji }),
    });
    if (!res.ok) throw new Error('Failed to react');
    const json = await res.json();
    return json.data;
  },
};

export default chatService;
