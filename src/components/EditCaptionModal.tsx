import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EditCaptionModalProps {
  visible: boolean;
  initialCaption: string;
  onClose: () => void;
  onSave: (newCaption: string) => Promise<void>;
}

export default function EditCaptionModal({
  visible,
  initialCaption,
  onClose,
  onSave,
}: EditCaptionModalProps) {
  const [caption, setCaption] = useState(initialCaption);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (saving) return;

    setSaving(true);
    try {
      await onSave(caption);
      onClose();
    } catch (error) {
      console.error('Error saving caption:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} disabled={saving}>
                <Ionicons name="close" size={28} color="#007AFF" />
              </TouchableOpacity>
              <Text style={styles.title}>Chỉnh sửa caption</Text>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving || caption.trim() === ''}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : (
                  <Text
                    style={[
                      styles.saveButton,
                      caption.trim() === '' && styles.saveButtonDisabled,
                    ]}
                  >
                    Lưu
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Caption Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={caption}
                onChangeText={setCaption}
                placeholder="Nhập caption..."
                placeholderTextColor="#999"
                multiline
                autoFocus
                maxLength={500}
              />
              <Text style={styles.charCount}>{caption.length}/500</Text>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  inputContainer: {
    padding: 16,
  },
  input: {
    fontSize: 16,
    color: '#000',
    minHeight: 120,
    maxHeight: 300,
    textAlignVertical: 'top',
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginBottom: 8,
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
});
