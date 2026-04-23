import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import { useAlert } from '../context/AlertContext';
import authService from '../api/authService';
import { useAuthStore } from '../store/useAuthStore';

export default function VerifyOTPScreen() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { email, type } = route.params || {};
  const loginStore = useAuthStore((state) => state.login);
  const { showAlert } = useAlert();

  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleOTPChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      showAlert('Lỗi', 'Vui lòng nhập đầy đủ mã OTP');
      return;
    }

    setLoading(true);
    try {
      if (type === 'REGISTRATION') {
        const response = await authService.verifyRegistration({
          email: email as string,
          code: otpCode,
          type: 'REGISTRATION'
        });

        if (response.success && response.data) {
          const { token, ...user } = response.data;
          
          // Show alert FIRST, then login (which triggers navigation)
          showAlert('Thành công', 'Đăng ký thành công!', [
            {
              text: 'Bắt đầu ngay',
              onPress: async () => {
                console.log('[VerifyOTP] Calling loginStore with user:', user);
                console.log('[VerifyOTP] Calling loginStore with token:', token ? 'present' : 'missing');
                
                // Small delay to ensure AsyncStorage is saved
                await new Promise(resolve => setTimeout(resolve, 100));
                
                loginStore(user, token);
                console.log('[VerifyOTP] loginStore called, should trigger navigation');
                
                // Force navigation reset as backup
                setTimeout(() => {
                  console.log('[VerifyOTP] Force navigation reset to Main');
                  navigation.dispatch(
                    CommonActions.reset({
                      index: 0,
                      routes: [{ name: 'Main' }],
                    })
                  );
                }, 500);
              }
            }
          ]);
          setLoading(false);
        } else {
          showAlert('Lỗi', response.message);
          setLoading(false);
        }
      } else if (type === 'FORGOT_PASSWORD' || type === 'CHANGE_PASSWORD') {
        // Move navigation inside alert callback
        const message = type === 'CHANGE_PASSWORD' 
          ? 'Mã OTP hợp lệ. Vui lòng đặt mật khẩu mới của bạn.'
          : 'Mã OTP hợp lệ. Vui lòng đặt lại mật khẩu của bạn.';
        
        showAlert('Xác nhận', message, [
          {
            text: 'Tiếp tục',
            onPress: () => {
              navigation.navigate('ResetPassword', { email, otp: otpCode, type });
            }
          }
        ]);
        setLoading(false);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Xác thực OTP thất bại';
      showAlert('Lỗi', errorMessage);
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
      const response = await authService.resendOtp(email as string, type as string);
      if (response.success) {
        showAlert('Thành công', response.message);
        setResendTimer(60);
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        showAlert('Lỗi', response.message);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Gửi lại mã OTP thất bại';
      showAlert('Lỗi', errorMessage);
    } finally {
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
          <Text style={styles.title}>Xác thực OTP</Text>
          <Text style={styles.subtitle}>
            Mã xác thực đã được gửi đến{'\n'}
            <Text style={styles.email}>{email}</Text>
          </Text>

          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => { inputRefs.current[index] = ref; }}
                style={[styles.otpInput, digit && styles.otpInputFilled]}
                value={digit}
                onChangeText={(value) => handleOTPChange(value, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.verifyButton, loading && styles.verifyButtonDisabled]}
            onPress={handleVerifyOTP}
            disabled={loading}
          >
            <Text style={styles.verifyButtonText}>
              {loading ? 'Đang xác thực...' : 'Xác thực'}
            </Text>
          </TouchableOpacity>

          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Không nhận được mã? </Text>
            <TouchableOpacity onPress={handleResendOTP} disabled={resendTimer > 0}>
              <Text style={[styles.resendLink, resendTimer > 0 && styles.resendLinkDisabled]}>
                {resendTimer > 0 ? `Gửi lại (${resendTimer}s)` : 'Gửi lại'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => navigation.canGoBack() && navigation.goBack()}>
            <Text style={styles.backLink}>← Quay lại</Text>
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
    padding: 25,
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
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    gap: 8,
  },
  otpInput: {
    width: 45,
    height: 60,
    backgroundColor: '#F6F6F6',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#000',
  },
  otpInputFilled: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  verifyButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  resendText: {
    color: '#8E8E93',
    fontSize: 14,
  },
  resendLink: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  resendLinkDisabled: {
    color: '#C7C7CD',
  },
  backLink: {
    color: '#007AFF',
    fontWeight: '600',
    textAlign: 'center',
  },
});
