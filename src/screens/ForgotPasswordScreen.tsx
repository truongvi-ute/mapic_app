import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAlert } from '../context/AlertContext';
import { validateEmailDetailed } from '../utils/validation';
import authService from '../api/authService';
import ValidatedInput from '../components/ValidatedInput';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ email: '' });
  const navigation = useNavigation<any>();
  const { showAlert } = useAlert();

  const validateFields = (): boolean => {
    const emailValidation = validateEmailDetailed(email);
    setErrors({ email: emailValidation.isValid ? '' : emailValidation.error || '' });
    return emailValidation.isValid;
  };

  const handleSendOTP = async () => {
    if (!validateFields()) return;
    setLoading(true);
    try {
      const response = await authService.forgotPassword(email.trim().toLowerCase());
      if (response.success) {
        // Move navigation INSIDE the alert callback to prevent UI hanging
        showAlert('Thành công', response.message, [
          {
            text: 'Tiếp tục',
            onPress: () => {
              navigation.navigate('VerifyOTP', { 
                email: email.trim().toLowerCase(), 
                type: 'FORGOT_PASSWORD' 
              });
            }
          }
        ]);
        setLoading(false);
      } else {
        showAlert('Lỗi', response.message);
        setLoading(false);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Gửi mã OTP thất bại';
      showAlert('Lỗi', errorMessage);
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.card}>
          <Text style={styles.title}>Quên mật khẩu</Text>
          <Text style={styles.subtitle}>Nhập email của bạn để nhận mã xác thực</Text>

          <ValidatedInput
            placeholder="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setErrors({ email: '' });
            }}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[styles.sendButton, loading && styles.sendButtonDisabled]}
            onPress={handleSendOTP}
            disabled={loading}
          >
            <Text style={styles.sendButtonText}>
              {loading ? 'Đang gửi...' : 'Gửi mã OTP'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backLink}>← Quay lại đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  backLink: {
    color: '#007AFF',
    fontWeight: '600',
    textAlign: 'center',
  },
});
