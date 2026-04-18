import api from './api';

export interface UpdateProfileData {
  name: string;
  bio?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null;
  dateOfBirth?: string | null;
  phone?: string;
  location?: string | null;
}

export interface UserProfileResponse {
  id: number;
  username: string;
  email: string;
  name: string;
  bio?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth?: string;
  phone?: string;
  avatarUrl?: string;
  coverImageUrl?: string;
}

const userService = {
  getProfile: async (): Promise<UserProfileResponse> => {
    const response = await api.get('/user/profile');
    // Backend returns { success, message, data }, we need the data field
    return response.data.data || response.data;
  },

  updateProfile: async (data: UpdateProfileData): Promise<UserProfileResponse> => {
    const response = await api.put('/user/update-profile', data);
    return response.data.data || response.data;
  },

  uploadAvatar: async (file: FormData): Promise<{ avatarUrl: string }> => {
    const response = await api.post('/user/upload-avatar', file, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data || response.data;
  },

  uploadCover: async (file: FormData): Promise<{ coverUrl: string }> => {
    const response = await api.post('/user/upload-cover', file, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data || response.data;
  },
};

export default userService;
