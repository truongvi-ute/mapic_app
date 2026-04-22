import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

class SoundService {
  private notificationSound: Audio.Sound | null = null;
  private sosSound: Audio.Sound | null = null;

  async initialize() {
    try {
      // Set audio mode
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      // Load notification sound
      const { sound: notifSound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/notification.mp3')
      );
      this.notificationSound = notifSound;

      // Load SOS sound
      const { sound: sosAlertSound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/sos-alert.mp3')
      );
      this.sosSound = sosAlertSound;

      console.log('Sound service initialized');
    } catch (error) {
      console.error('Error initializing sound service:', error);
    }
  }

  async playNotificationSound() {
    try {
      if (this.notificationSound) {
        await this.notificationSound.replayAsync();
      }
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }

  async playSOSSound() {
    try {
      if (this.sosSound) {
        await this.sosSound.replayAsync();
      }
    } catch (error) {
      console.error('Error playing SOS sound:', error);
    }
  }

  async vibrate(type: 'light' | 'medium' | 'heavy' = 'medium') {
    try {
      switch (type) {
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
      }
    } catch (error) {
      console.error('Error vibrating:', error);
    }
  }

  async notificationFeedback(priority: 'HIGH' | 'NORMAL' | 'LOW' = 'NORMAL') {
    try {
      if (priority === 'HIGH') {
        // SOS Alert: loud sound + heavy vibration
        await this.playSOSSound();
        await this.vibrate('heavy');
        // Vibrate again after 500ms
        setTimeout(() => this.vibrate('heavy'), 500);
      } else {
        // Normal notification: soft sound + light vibration
        await this.playNotificationSound();
        await this.vibrate('light');
      }
    } catch (error) {
      console.error('Error playing notification feedback:', error);
    }
  }

  async cleanup() {
    try {
      if (this.notificationSound) {
        await this.notificationSound.unloadAsync();
      }
      if (this.sosSound) {
        await this.sosSound.unloadAsync();
      }
    } catch (error) {
      console.error('Error cleaning up sound service:', error);
    }
  }
}

export const soundService = new SoundService();
