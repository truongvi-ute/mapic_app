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
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAlert } from '../context/AlertContext';
import { validatePasswordDetailed, validatePasswordMatch } from '../utils/validation';
import authService from '../api/authService';
import ValidatedInput from '../components/ValidatedInput';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    password: '',
    confirmPassword: '',
  });
  
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { email, otp, type } = route.params || {};
  const { showAlert } = useAlert();

  const validateFields = (): boolean => {
    const passwordValidation = validatePasswordDetailed(password);
    const confirmPasswordValidation = validatePasswordMatch(password, confirmPassword);

    const newErrors = {
      password: passwordValidation.isValid ? '' : passwordValidation.error || '',
      confirmPassword: confirmPasswordValidation.isValid ? '' : confirmPasswordValidation.error || '',
    };

    setErrors(newErrors);
    return Object.values(newErrors).every(error => error === '');
  };

  const handleResetPassword = async () => {
    if (!validateFields()) return;
    setLoading(true);
    try {
      const response = await authService.resetPassword({
        email: email as string,
        otp: otp as string,
        newPassword: password,
      });

      if (response.success) {
        const message = type === 'CHANGE_PASSWORD' 
          ? 'Mật khẩu đã được thay đổi thành công'
          : 'Mật khẩu đã được đặt lại thành công';
        
        const buttonText = type === 'CHANGE_PASSWORD' ? 'Đóng' : 'Đăng nhập ngay';
        
        // Explicitly navigate AFTER alert acknowledgement
        showAlert('Thành công', message, [
          { 
            text: buttonText, 
            onPress: () => {
              if (type === 'CHANGE_PASSWORD') {
                // Navigate back to Main screen (Settings)
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Main' }],
                });
              } else {
                // Navigate to Login for forgot password flow
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
              }
            } 
          }
        ]);
        setLoading(false);
      } else {
        showAlert('Lỗi', response.message);
        setLoading(false);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Đặt lại mật khẩu thất bại';
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
          <Text style={styles.title}>Đặt lại mật khẩu</Text>
          <Text style={styles.subtitle}>
            Nhập mật khẩu mới cho tài khoản{'\n'}
            <Text style={styles.email}>{email}</Text>
          </Text>

          <ValidatedInput
            placeholder="Mật khẩu mới"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setErrors(prev => ({ ...prev, password: '' }));
            }}
            error={errors.password}
            isPassword
            autoCapitalize="none"
          />

          <ValidatedInput
            placeholder="Xác nhận mật khẩu mới"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              setErrors(prev => ({ ...prev, confirmPassword: '' }));
            }}
            error={errors.confirmPassword}
            isPassword
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[styles.resetButton, loading && styles.resetButtonDisabled]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            <Text style={styles.resetButtonText}>
              {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => {
            if (type === 'CHANGE_PASSWORD') {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Main' }],
              });
            } else {
              navigation.navigate('Login');
            }
          }}>
            <Text style={styles.backLink}>
              ← {type === 'CHANGE_PASSWORD' ? 'Quay lại' : 'Quay lại đăng nhập'}
            </Text>
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
  email: {
    color: '#007AFF',
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  resetButtonDisabled: {
    opacity: 0.6,
  },
  resetButtonText: {
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
