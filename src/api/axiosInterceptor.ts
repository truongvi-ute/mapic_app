import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/useAuthStore';

let isSettingUpInterceptor = false;

export const setupAxiosInterceptor = () => {
  if (isSettingUpInterceptor) return;
  isSettingUpInterceptor = true;

  // Response interceptor
  axios.interceptors.response.use(
    (response) => {
      // Request thành công, trả về response
      return response;
    },
    async (error) => {
      const originalRequest = error.config;

      // Kiểm tra nếu là lỗi 401 (Unauthorized)
      if (error.response && error.response.status === 401) {
        console.log('[Interceptor] Received 401, logging out...');

        // Xóa token và user data
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');

        // Logout từ store
        const logout = useAuthStore.getState().logout;
        logout();

        // Không retry request
        return Promise.reject(error);
      }

      // Kiểm tra nếu là lỗi 403 (Forbidden)
      if (error.response && error.response.status === 403) {
        console.log('[Interceptor] Received 403, access denied');
        // Có thể xử lý riêng cho 403 nếu cần
      }

      // Các lỗi khác, trả về như bình thường
      return Promise.reject(error);
    }
  );

  console.log('[Interceptor] Axios interceptor setup complete');
};
