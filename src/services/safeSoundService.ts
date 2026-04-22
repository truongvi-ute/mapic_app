/**
 * Safe Sound Service
 * Works gracefully in Expo Go without native modules
 */

class SafeSoundService {
  private isAvailable = false;

  async initialize() {
    // In Expo Go, sound/haptics are not available
    // Just log and continue
    console.log('ℹ️ Sound/haptics disabled in Expo Go');
    console.log('ℹ️ To enable sound/haptics:');
    console.log('   1. Build development build: eas build --profile development');
    console.log('   2. Install APK on device');
    console.log('   3. Run: npx expo start --dev-client');
    console.log('');
    console.log('✅ App will work without sound/haptics');
    this.isAvailable = false;
  }

  async playNotificationSound() {
    // No-op in Expo Go
  }

  async playSOSSound() {
    // No-op in Expo Go
  }

  async vibrate(type: 'light' | 'medium' | 'heavy' = 'medium') {
    // No-op in Expo Go
  }

  async notificationFeedback(priority: 'HIGH' | 'NORMAL' | 'LOW' = 'NORMAL') {
    // No-op in Expo Go
  }

  async cleanup() {
    // No-op in Expo Go
  }
}

export const safeSoundService = new SafeSoundService();
export default safeSoundService;
