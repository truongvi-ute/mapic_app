import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, FONT_SIZE } from '../constants/design';

interface SOSConfirmationModalProps {
  visible: boolean;
  onConfirm: (note?: string) => Promise<void>;
  onCancel: () => void;
  title: string;
  message: string;
  confirmText: string;
  isDestructive?: boolean;
}

export default function SOSConfirmationModal({
  visible,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText,
  isDestructive = false,
}: SOSConfirmationModalProps) {
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(note);
      setNote('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.container}>
          <View style={[styles.header, isDestructive && styles.destructiveHeader]}>
            <Ionicons 
              name={isDestructive ? "alert-circle" : "checkmark-circle"} 
              size={32} 
              color="#FFF" 
            />
            <Text style={styles.title}>{title}</Text>
          </View>

          <View style={styles.content}>
            <Text style={styles.message}>{message}</Text>
            
            {!isDestructive && (
              <TextInput
                style={styles.input}
                placeholder="Thêm ghi chú (tùy chọn)..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={note}
                onChangeText={setNote}
                multiline
              />
            )}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.cancelBtn} 
              onPress={onCancel}
              disabled={loading}
            >
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.confirmBtn, isDestructive && styles.destructiveBtn]} 
              onPress={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.confirmText}>{confirmText}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1C1C1E',
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.large,
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  destructiveHeader: {
    backgroundColor: '#FF3B30',
  },
  title: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    padding: 20,
  },
  message: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 16,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: RADIUS.md,
    padding: 12,
    color: '#FFF',
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  cancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  cancelText: {
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
    fontSize: 16,
  },
  confirmBtn: {
    flex: 2,
    padding: 14,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  destructiveBtn: {
    backgroundColor: '#FF3B30',
  },
  confirmText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
