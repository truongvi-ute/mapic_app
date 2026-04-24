import { create } from 'zustand';
import * as Location from 'expo-location';
import sosService from '../api/sosService';
import { useAuthStore } from './useAuthStore';
import { useWebSocketStore } from './useWebSocketStore';
import { 
  SOSAlert, 
  SOSAlertStatus, 
  LocationStatus, 
  TriggerSOSRequest,
  LocationUpdate
} from '../types/sos';
import { ShakeDetector } from '../utils/ShakeDetector';

interface SOSState {
  activeAlert: SOSAlert | null;
  receivedAlerts: SOSAlert[];
  isTracking: boolean;
  viewingAlertId: number | null;
  shakeDetector: ShakeDetector | null;
  
  // Actions
  setActiveAlert: (alert: SOSAlert | null) => void;
  setViewingAlertId: (id: number | null) => void;
  addReceivedAlert: (alert: SOSAlert) => void;
  removeReceivedAlert: (alertId: number) => void;
  
  // Business Logic
  triggerSOS: (message?: string) => Promise<void>;
  resolveSOS: () => Promise<void>;
  fetchActiveAlerts: () => Promise<void>;
  markAlertAsViewed: (alertId: number) => Promise<void>;
  
  // Tracking
  startLocationTracking: () => void;
  stopLocationTracking: () => void;
  
  // Shake Detection
  enableShakeDetection: () => void;
  disableShakeDetection: () => void;
  
  // WebSocket Listeners
  initializeSOSListeners: () => void;
  cleanupSOSListeners: () => void;
}

let locationSubscription: Location.LocationSubscription | null = null;
let sosWebSocketSubs: any[] = [];

export const useSOSStore = create<SOSState>((set, get) => ({
  activeAlert: null,
  receivedAlerts: [],
  isTracking: false,
  viewingAlertId: null,
  shakeDetector: null,

  setActiveAlert: (alert) => set({ activeAlert: alert }),
  setViewingAlertId: (id) => set({ viewingAlertId: id }),

  addReceivedAlert: (alert) => {
    set((state) => {
      if (state.receivedAlerts.some(a => a.id === alert.id)) return state;
      return { receivedAlerts: [alert, ...state.receivedAlerts] };
    });
  },

  removeReceivedAlert: (alertId) => {
    set((state) => ({
      receivedAlerts: state.receivedAlerts.filter(a => a.id !== alertId)
    }));
  },

  triggerSOS: async (message) => {
    const { token } = useAuthStore.getState();
    if (!token) {
      console.error('[SOSStore] No token available');
      return;
    }

    console.log('[SOSStore] 🚨 Triggering SOS alert with message:', message);

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      console.log('[SOSStore] 📍 Got location:', {
        lat: location.coords.latitude,
        lng: location.coords.longitude
      });

      const request: TriggerSOSRequest = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        message,
        locationStatus: LocationStatus.ACCURATE
      };

      console.log('[SOSStore] 📤 Sending SOS request to backend...');
      const response = await sosService.triggerSOS(request, token);
      console.log('[SOSStore] ✅ SOS triggered successfully:', response);
      
      const alert: SOSAlert = {
        id: response.alertId,
        senderId: useAuthStore.getState().user?.id || 0,
        senderName: useAuthStore.getState().user?.name || '',
        triggeredAt: response.triggeredAt,
        status: SOSAlertStatus.ACTIVE,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        message,
        locationStatus: LocationStatus.ACCURATE,
        recipientCount: response.recipientCount
      };

      set({ activeAlert: alert });
      get().startLocationTracking();
    } catch (error) {
      console.error('[SOSStore] ❌ Trigger failed:', error);
      throw error;
    }
  },

  resolveSOS: async () => {
    const { activeAlert } = get();
    const { token } = useAuthStore.getState();
    if (!activeAlert || !token) return;

    try {
      await sosService.resolveSOS(activeAlert.id, token);
      set({ activeAlert: null });
      get().stopLocationTracking();
    } catch (error) {
      console.error('[SOSStore] Resolve failed:', error);
    }
  },

  fetchActiveAlerts: async () => {
    const { token } = useAuthStore.getState();
    if (!token) return;

    try {
      const response = await sosService.getActiveAlerts(token);
      set({ 
        activeAlert: response.asSender || null,
        receivedAlerts: response.asRecipient || []
      });

      if (response.asSender) {
        get().startLocationTracking();
      }
    } catch (error) {
      console.error('[SOSStore] Fetch failed:', error);
    }
  },

  markAlertAsViewed: async (alertId) => {
    const { token } = useAuthStore.getState();
    if (!token) return;

    try {
      await sosService.markAsViewed(alertId, token);
      get().removeReceivedAlert(alertId);
    } catch (error) {
      console.error('[SOSStore] Mark viewed failed:', error);
    }
  },

  startLocationTracking: async () => {
    if (get().isTracking) return;

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;

    set({ isTracking: true });

    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 10, // Update every 10 meters
        timeInterval: 5000,    // Or every 5 seconds
      },
      (location) => {
        const { activeAlert } = get();
        if (activeAlert) {
          useWebSocketStore.getState().publish('/app/sos.location.update', {
            alertId: activeAlert.id,
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            locationStatus: LocationStatus.ACCURATE
          });
        }
      }
    );
  },

  stopLocationTracking: () => {
    if (locationSubscription) {
      locationSubscription.remove();
      locationSubscription = null;
    }
    set({ isTracking: false });
  },

  enableShakeDetection: () => {
    if (get().shakeDetector) return;
    
    const detector = new ShakeDetector(() => {
      get().triggerSOS('Khẩn cấp! Tôi vừa lắc điện thoại để cầu cứu.');
    });
    
    detector.start();
    set({ shakeDetector: detector });
  },

  disableShakeDetection: () => {
    const { shakeDetector } = get();
    if (shakeDetector) {
      shakeDetector.stop();
      set({ shakeDetector: null });
    }
  },

  initializeSOSListeners: () => {
    const { subscribe, isConnected } = useWebSocketStore.getState();
    if (!isConnected) return;

    // 1. Listen for new SOS alerts (via general notifications or dedicated topic)
    // Here we use the notification queue as per backend implementation
    // The actual alert logic is often handled by specific destination
    
    // 2. Listen for location updates for alerts I am a recipient of
    // This is handled dynamically when an alert is received or active
    // But we can subscribe to a pattern if STOMP supports it or handle in MapScreen
  },

  cleanupSOSListeners: () => {
    sosWebSocketSubs.forEach(sub => sub.unsubscribe());
    sosWebSocketSubs = [];
  }
}));
