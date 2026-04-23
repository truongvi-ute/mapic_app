import { create } from 'zustand';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getWsUrl } from '../config/api';

export interface MapFriend {
  userId: number;
  name: string;
  username: string;
  avatarUrl: string | null;
  latitude: number;
  longitude: number;
  lastSeenAt: string | null;
  isOnline: boolean;
  profileUpdatedAt: string | null; // For avatar cache invalidation
}

interface WebSocketState {
  client: Client | null;
  isConnected: boolean;
  connect: (token: string, onConnectSuccess?: () => void) => void;
  disconnect: () => void;
  publish: (destination: string, body: any) => void;
  subscribe: (destination: string, callback: (message: any) => void) => any;
  hasMapInitialFocused: boolean;
  setMapInitialFocused: (v: boolean) => void;
  lastCameraCenter: number[] | null;
  setLastCameraCenter: (coords: number[]) => void;
  selectedId: number | null;
  setSelectedId: (id: number | null) => void;
  showPanel: boolean;
  setShowPanel: (v: boolean | ((prev: boolean) => boolean)) => void;
  friends: Map<number, MapFriend>;
  setFriends: (friends: Map<number, MapFriend>) => void;
  localUris: Map<string, string>;
  setLocalUris: (u: Map<string, string> | ((prev: Map<string, string>) => Map<string, string>)) => void;
  hasPerformedManualZoom: boolean; // Track if user has manually zoomed
  setHasPerformedManualZoom: (v: boolean) => void;
}

export const useWebSocketStore = create<WebSocketState>((set, get) => ({
  client: null,
  isConnected: false,
  hasMapInitialFocused: false,
  setMapInitialFocused: (v) => set({ hasMapInitialFocused: v }),
  lastCameraCenter: null,
  setLastCameraCenter: (coords) => set({ lastCameraCenter: coords }),
  selectedId: null,
  setSelectedId: (id) => set({ selectedId: id }),
  showPanel: false,
  setShowPanel: (v) => set((state) => ({ 
    showPanel: typeof v === 'function' ? (v as any)(state.showPanel) : v 
  })),
  friends: new Map(),
  setFriends: (friends) => set({ friends }),
  localUris: new Map(),
  setLocalUris: (u) => set((state) => ({
    localUris: typeof u === 'function' ? u(state.localUris) : u
  })),
  hasPerformedManualZoom: false,
  setHasPerformedManualZoom: (v) => set({ hasPerformedManualZoom: v }),

  connect: (token: string, onConnectSuccess) => {
    const existing = get().client;
    if (existing?.connected) {
      console.log('[WS Map] Already connected');
      return;
    }

    console.log('[WS Map] Starting connection...');
    const wsUrl = getWsUrl();
    console.log('[WS Map] Connecting to:', wsUrl);

    const client = new Client({
      // Use webSocketFactory with SockJS instead of brokerURL
      webSocketFactory: () => new SockJS(wsUrl),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: (str) => {
        console.log('[WS Map Debug]', str);
      },
      onConnect: () => {
        console.log('✅ [WS Map] Connected to server!');
        set({ isConnected: true });
        if (onConnectSuccess) onConnectSuccess();
      },
      onStompError: (frame) => {
        console.error('❌ [WS Map] STOMP error:', frame.headers['message']);
        console.error('[WS Map] STOMP error body:', frame.body);
        set({ isConnected: false });
      },
      onWebSocketError: (error) => {
        console.error('❌ [WS Map] WebSocket error:', error);
        set({ isConnected: false });
      },
      onDisconnect: () => {
        console.log('[WS Map] Disconnected');
        set({ isConnected: false });
      },
    });

    client.activate();
    set({ client });
  },

  disconnect: () => {
    const { client } = get();
    if (client) {
      client.deactivate();
      set({ client: null, isConnected: false });
    }
  },

  publish: (destination: string, body: any) => {
    const { client, isConnected } = get();
    if (client && isConnected) {
      client.publish({
        destination,
        body: JSON.stringify(body),
      });
    } else {
      console.warn('[WS Map] Cannot publish, not connected');
    }
  },

  subscribe: (destination: string, callback: (message: any) => void) => {
    const { client, isConnected } = get();
    if (client && isConnected) {
      return client.subscribe(destination, callback);
    }
    console.warn('[WS Map] Cannot subscribe, not connected');
    return null;
  }
}));
