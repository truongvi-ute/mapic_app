import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  visible: boolean;
  messageId: number;
  position: { x: number; y: number }; // Position of the message
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  onReply: () => void;
  isMyMessage: boolean;
}

const EMOJIS = [
  { emoji: '❤️', label: 'Love' },
  { emoji: '😂', label: 'Haha' },
  { emoji: '😮', label: 'Wow' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '👍', label: 'Like' },
  { emoji: '👎', label: 'Dislike' },
];

export default function MessageReactionPicker({
  visible,
  messageId,
  position,
  onClose,
  onSelectEmoji,
  onReply,
  isMyMessage,
}: Props) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const handleSelectEmoji = (emoji: string) => {
    // Animate out
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onSelectEmoji(emoji);
    });
  };

  if (!visible) return null;

  // Calculate position (above or below message)
  const pickerTop = position.y > 300 ? position.y - 120 : position.y + 60;
  const pickerLeft = Math.max(10, Math.min(position.x - 150, SCREEN_WIDTH - 310));

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View
          style={[
            styles.container,
            {
              top: pickerTop,
              left: pickerLeft,
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Emoji Reactions */}
          <View style={styles.emojiRow}>
            {EMOJIS.map((item, index) => (
              <TouchableOpacity
                key={item.emoji}
                style={[
                  styles.emojiBtn,
                  { 
                    transform: [{ 
                      translateY: scaleAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }) 
                    }] 
                  }
                ]}
                onPress={() => handleSelectEmoji(item.emoji)}
                activeOpacity={0.7}
              >
                <Animated.Text 
                  style={[
                    styles.emoji,
                    {
                      transform: [{
                        scale: scaleAnim.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0, 1.2, 1],
                        })
                      }]
                    }
                  ]}
                >
                  {item.emoji}
                </Animated.Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                onClose();
                onReply();
              }}
            >
              <Text style={styles.actionText}>💬 Trả lời</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  container: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    minWidth: 300,
  },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  emojiBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  emoji: {
    fontSize: 32,
  },
  actionsRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingTop: 8,
    marginTop: 4,
  },
  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '600',
  },
});
