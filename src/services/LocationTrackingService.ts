import * as Location from 'expo-location';
import { useWebSocketStore } from '../store/useWebSocketStore';
import { useAuthStore } from '../store/useAuthStore';

class LocationTrackingService {
  private subscription: Location.LocationSubscription | null = null;
  private isTracking = false;
  private lastPublishTime = 0;
  private readonly PUBLISH_INTERVAL = 5000; // 5 seconds
  private readonly MIN_DISTANCE = 10; // 10 meters

  async startTracking(): Promise<boolean> {
    if (this.isTracking) {
      console.log('[LocationTracking] Already tracking');
      return true;
    }

    try {
      // Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('[LocationTracking] Permission denied');
        return false;
      }

      // Check if WebSocket is connected
      const { isConnected, publish } = useWebSocketStore.getState();
      if (!isConnected) {
        console.warn('[LocationTracking] WebSocket not connected');
        return false;
      }

      console.log('[LocationTracking] Starting location tracking...');
      this.isTracking = true;

      // Start watching position
      this.subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: this.MIN_DISTANCE, // Or every 10 meters
        },
        (location) => {
          this.handleLocationUpdate(location);
        }
      );

      console.log('[LocationTracking] ✅ Location tracking started');
      return true;
    } catch (error) {
      console.error('[LocationTracking] Failed to start tracking:', error);
      this.isTracking = false;
      return false;
    }
  }

  stopTracking(): void {
    if (!this.isTracking) return;

    console.log('[LocationTracking] Stopping location tracking...');
    
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }

    this.isTracking = false;
    console.log('[LocationTracking] ✅ Location tracking stopped');
  }

  private handleLocationUpdate(location: Location.LocationObject): void {
    const now = Date.now();
    
    // Throttle publishing to avoid spam
    if (now - this.lastPublishTime < this.PUBLISH_INTERVAL) {
      return;
    }

    try {
      const { isConnected, publish } = useWebSocketStore.getState();
      const { token } = useAuthStore.getState();

      if (!isConnected || !token) {
        console.warn('[LocationTracking] Cannot publish - not connected or no token');
        return;
      }

      // Publish location update via WebSocket
      publish('/app/location.update', {
        longitude: location.coords.longitude,
        latitude: location.coords.latitude,
      });

      this.lastPublishTime = now;
      
      console.log('[LocationTracking] 📍 Published location:', {
        lat: location.coords.latitude.toFixed(6),
        lng: location.coords.longitude.toFixed(6),
        accuracy: location.coords.accuracy
      });
    } catch (error) {
      console.error('[LocationTracking] Failed to publish location:', error);
    }
  }

  isCurrentlyTracking(): boolean {
    return this.isTracking;
  }

  async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;

      return await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
    } catch (error) {
      console.error('[LocationTracking] Failed to get current location:', error);
      return null;
    }
  }
}

// Export singleton instance
export const locationTrackingService = new LocationTrackingService();
export default locationTrackingService;