import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RegisterData {
  username: string;
  name: string;
  email: string;
  password: string;
}

export interface VerifyOtpData {
  email: string;
  code: string;
  type?: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  type: string;
  id: number;
  email: string;
  username: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

const authService = {
  async register(data: RegisterData): Promise<ApiResponse<void>> {
    const response = await api.post<ApiResponse<void>>('/auth/register', data);
    return response.data;
  },

  async verifyRegistration(data: VerifyOtpData): Promise<ApiResponse<AuthResponse>> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/verify-registration', {
      ...data,
      type: data.type ? data.type.toUpperCase().replace('-', '_') : 'REGISTRATION'
    });
    if (response.data.success && response.data.data) {
      const { token, ...user } = response.data.data;
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));
    }
    return response.data;
  },

  async login(data: LoginData): Promise<ApiResponse<AuthResponse>> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', data);
    if (response.data.success && response.data.data) {
      const { token, ...user } = response.data.data;
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));
    }
    return response.data;
  },

  async logout(): Promise<void> {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
  },

  async getCurrentUser(): Promise<any> {
    const userStr = await AsyncStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  async forgotPassword(email: string): Promise<ApiResponse<void>> {
    const response = await api.post<ApiResponse<void>>('/auth/forgot-password', { email });
    return response.data;
  },

  async resetPassword(data: any): Promise<ApiResponse<void>> {
    const response = await api.post<ApiResponse<void>>('/auth/reset-password', data);
    return response.data;
  },

  async resendOtp(email: string, type: string): Promise<ApiResponse<void>> {
    const normalizedType = type.toUpperCase().replace('-', '_');
    const response = await api.post<ApiResponse<void>>('/auth/resend-otp', { email, type: normalizedType });
    return response.data;
  },

  async changePassword(email: string): Promise<ApiResponse<void>> {
    const response = await api.post<ApiResponse<void>>('/auth/change-password', { email });
    return response.data;
  },
};

export default authService;
