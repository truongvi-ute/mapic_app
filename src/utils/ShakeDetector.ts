import { Accelerometer } from 'expo-sensors';
import { Subscription } from 'expo-modules-core';

/**
 * Shake Detector Utility
 * Requirements: 3.2, 3.3
 */
export class ShakeDetector {
  private subscription: Subscription | null = null;
  private shakeCount: number = 0;
  private lastShakeTime: number = 0;
  
  // Configuration
  private readonly SHAKE_THRESHOLD = 1.7; // ~1.7g for robust detection (1g is gravity)
  private readonly SHAKE_WINDOW = 2000;    // 2 seconds to complete shakes
  private readonly REQUIRED_SHAKES = 3;     // 3 shakes required
  private readonly UPDATE_INTERVAL = 100;   // 100ms update frequency

  private onShakeDetected: () => void;

  constructor(onShakeDetected: () => void) {
    this.onShakeDetected = onShakeDetected;
  }

  /**
   * Start listening for shakes
   */
  public async start(): Promise<void> {
    if (this.subscription) return;

    const { status } = await Accelerometer.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('[ShakeDetector] Accelerometer permission not granted');
      return;
    }

    Accelerometer.setUpdateInterval(this.UPDATE_INTERVAL);
    
    this.subscription = Accelerometer.addListener(this.handleAccelerometerChange.bind(this));
    console.log('[ShakeDetector] Started listening for shakes');
  }

  /**
   * Stop listening for shakes
   */
  public stop(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
      this.reset();
      console.log('[ShakeDetector] Stopped listening for shakes');
    }
  }

  /**
   * Reset shake counters
   */
  public reset(): void {
    this.shakeCount = 0;
    this.lastShakeTime = 0;
  }

  /**
   * Process accelerometer data
   */
  private handleAccelerometerChange({ x, y, z }: { x: number; y: number; z: number }): void {
    // Calculate total acceleration magnitude
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    const now = Date.now();

    // Reset count if too much time has passed between shakes
    if (this.lastShakeTime > 0 && now - this.lastShakeTime > this.SHAKE_WINDOW) {
      this.shakeCount = 0;
    }

    // Check if movement exceeds threshold
    if (magnitude > this.SHAKE_THRESHOLD) {
      // Debounce: ignore multiple readings for the same physical shake (approx 200ms)
      if (now - this.lastShakeTime < 250) return;

      this.shakeCount++;
      this.lastShakeTime = now;
      
      console.log(`[ShakeDetector] Shake detected! Count: ${this.shakeCount}/${this.REQUIRED_SHAKES}`);

      // If required shakes reached, trigger callback
      if (this.shakeCount >= this.REQUIRED_SHAKES) {
        console.log('[ShakeDetector] Threshold reached! Triggering SOS...');
        this.onShakeDetected();
        this.reset();
      }
    }
  }
}
