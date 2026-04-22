import { getApiUrl } from '../config/api';

export interface ParticipantDto {
  userId: number;
  username: string;
  fullName: string;
  avatarUrl?: string;
  role: 'ADMIN' | 'MEMBER';
}

export interface MessageDto {
  id: number;
  conversationId: number;
  senderId: number;
  senderUsername: string;
  senderAvatarUrl?: string;
  type: 'TEXT' | 'SHARE' | 'SHARE_MOMENT' | 'SHARE_ALBUM';
  content?: string;
  referenceId?: number;
  reactions: Record<string, number>; // emoji -> count
  myReaction?: string;
  createdAt: string;
}

export interface ConversationDto {
  id: number;
  isGroup: boolean;
  title?: string;
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
    if (!res.ok) throw new Error('Failed to remove member');
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
