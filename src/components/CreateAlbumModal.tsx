import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { useAlert } from '../context/AlertContext';
import albumService, { Album } from '../api/albumService';

interface CreateAlbumModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (newAlbum: Album) => void;
  initialAlbum?: Album; // If provided, modal is in Edit mode
}

export default function CreateAlbumModal({
  visible,
  onClose,
  onSuccess,
  initialAlbum,
}: CreateAlbumModalProps) {
  const token = useAuthStore((state) => state.token);
  const { showAlert } = useAlert();

  const [albumTitle, setAlbumTitle] = useState('');
  const [albumDescription, setAlbumDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (visible) {
      if (initialAlbum) {
        setAlbumTitle(initialAlbum.title || '');
        setAlbumDescription(initialAlbum.description || '');
      } else {
        setAlbumTitle('');
        setAlbumDescription('');
      }
    }
  }, [visible, initialAlbum]);

  const resetForm = () => {
    setAlbumTitle('');
    setAlbumDescription('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!albumTitle.trim()) {
      showAlert('Lỗi', 'Vui lòng nhập tên album');
      return;
    }

    if (!token) return;

    try {
      setSubmitting(true);
      
      const payload = {
        title: albumTitle.trim(),
        description: albumDescription.trim() || undefined,
      };

      let resultAlbum: Album;
      if (initialAlbum) {
        resultAlbum = await albumService.updateAlbum(initialAlbum.id, payload, token);
      } else {
        resultAlbum = await albumService.createAlbum(payload, token);
      }
      
      resetForm();
      onSuccess(resultAlbum);
    } catch (error: any) {
      showAlert('Lỗi', error.message || (initialAlbum ? 'Không thể cập nhật album' : 'Không thể tạo album'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {initialAlbum ? 'Chỉnh sửa Album' : 'Tạo Album mới'}
                </Text>
                <TouchableOpacity onPress={handleClose}>
                  <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Tên Album *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập tên album..."
                  value={albumTitle}
                  onChangeText={setAlbumTitle}
                  autoFocus={true}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Mô tả (tùy chọn)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Nhập mô tả..."
                  value={albumDescription}
                  onChangeText={setAlbumDescription}
                  multiline={true}
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={handleClose}
                >
                  <Text style={styles.cancelButtonText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.submitButton,
                    (!albumTitle.trim() || submitting) && styles.disabledButton,
                  ]}
                  onPress={handleSubmit}
                  disabled={submitting || !albumTitle.trim()}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>
                      {initialAlbum ? 'Cập nhật' : 'Tạo'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
  },
  textArea: {
    height: 100,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E5E5EA',
  },
  cancelButtonText: {
    color: '#000',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
});
