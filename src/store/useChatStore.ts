import { create } from 'zustand';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getBaseUrl } from '../config/api';
import { MessageDto } from '../api/chatService';

interface ChatState {
  stompClient: Client | null;
  isConnected: boolean;
  newMessagesByRoom: Record<number, MessageDto[]>; // roomId -> new messages queue
  connect: (token: string) => void;
  disconnect: () => void;
  subscribeToRoom: (roomId: number, onMessage: (msg: MessageDto) => void) => (() => void);
  sendMessage: (conversationId: number, type: string, content?: string, referenceId?: number) => void;
  reactToMessage: (messageId: number, emoji: string) => void;
  conversations: ConversationDto[];
  setConversations: (convs: ConversationDto[]) => void;
  updateConversation: (conv: ConversationDto) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  stompClient: null,
  isConnected: false,
  newMessagesByRoom: {},
  conversations: [],

  setConversations: (convs) => set({ conversations: convs }),

  updateConversation: (updatedConv) => {
    set((state) => {
      const exists = state.conversations.findIndex((c) => c.id === updatedConv.id);
      let newList;
      if (exists !== -1) {
        newList = [...state.conversations];
        newList[exists] = updatedConv;
      } else {
        newList = [updatedConv, ...state.conversations];
      }
      // Sort by last message date
      return {
        conversations: newList.sort((a, b) => {
          const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
          const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
          return timeB - timeA;
        }),
      };
    });
  },

  connect: (token: string) => {
    const existing = get().stompClient;
    if (existing?.connected) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(`${getBaseUrl()}/ws`),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 5000,
      onConnect: () => {
        set({ isConnected: true });
        console.log('[Chat] STOMP connected');

        // Subscribe to user-specific conversation updates
        client.subscribe('/user/topic/conversations', (frame) => {
          const conv = JSON.parse(frame.body);
          get().updateConversation(conv);
        });
      },
      onDisconnect: () => {
        set({ isConnected: false });
        console.log('[Chat] STOMP disconnected');
      },
      onStompError: (frame) => {
        console.error('[Chat] STOMP error:', frame);
      },
    });

    client.activate();
    set({ stompClient: client });
  },

  disconnect: () => {
    const client = get().stompClient;
    if (client) {
      client.deactivate();
      set({ stompClient: null, isConnected: false });
    }
  },

  subscribeToRoom: (roomId: number, onMessage: (msg: MessageDto) => void) => {
    const client = get().stompClient;
    if (!client?.connected) {
      console.warn('[Chat] Not connected yet');
      return () => {};
    }

    const sub = client.subscribe(`/topic/chat/${roomId}`, (frame) => {
      const msg: MessageDto = JSON.parse(frame.body);
      onMessage(msg);
    });

    const reactionSub = client.subscribe(`/topic/chat/${roomId}/reactions`, (frame) => {
      const msg: MessageDto = JSON.parse(frame.body);
      onMessage(msg); // trigger re-render with updated reaction
    });

    return () => {
      sub.unsubscribe();
      reactionSub.unsubscribe();
    };
  },

  sendMessage: (conversationId, type, content, referenceId) => {
    const client = get().stompClient;
    if (!client?.connected) {
      console.warn('[Chat] Not connected');
      return;
    }
    client.publish({
      destination: '/app/chat.send',
      body: JSON.stringify({ conversationId, type, content, referenceId }),
    });
  },

  reactToMessage: (messageId, emoji) => {
    const client = get().stompClient;
    if (!client?.connected) return;
    client.publish({
      destination: '/app/chat.react',
      body: JSON.stringify({ messageId, emoji }),
    });
  },
}));
