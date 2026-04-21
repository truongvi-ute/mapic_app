import ImagePicker, { Image, Video } from 'react-native-image-crop-picker';
import { Alert, Platform } from 'react-native';
import axios from 'axios';
import { getApiUrl } from '../config/api';

// Types
export type MediaType = 'image' | 'video' | 'any';
export type UploadType = 'avatar' | 'cover' | 'moment';

export interface PickerOptions {
  mediaType: MediaType;
  cropping?: boolean;
  cropperCircleOverlay?: boolean;
  width?: number;
  height?: number;
  compressImageQuality?: number;
  multiple?: boolean;
  maxFiles?: number;
  includeBase64?: boolean;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

// Preset configurations for different upload types
const UPLOAD_PRESETS: Record<UploadType, PickerOptions> = {
  avatar: {
    mediaType: 'image',
    cropping: true,
    cropperCircleOverlay: true,
    width: 400,
    height: 400,
    compressImageQuality: 0.8,
    multiple: false,
  },
  cover: {
    mediaType: 'image',
    cropping: true,
    cropperCircleOverlay: false,
    width: 1200,
    height: 400,
    compressImageQuality: 0.8,
    multiple: false,
  },
  moment: {
    mediaType: 'any',
    cropping: false,
    compressImageQuality: 0.7,
    multiple: true,
    maxFiles: 10,
  },
};

// Note: getApiUrl is now imported from '../config/api'

/**
 * Pick media from library
 */
export const pickFromLibrary = async (
  type: UploadType,
  customOptions?: Partial<PickerOptions>
): Promise<Image | Image[] | null> => {
  console.log('[MediaUpload] pickFromLibrary START', { type, customOptions });
  
  try {
    const options = { ...UPLOAD_PRESETS[type], ...customOptions };
    console.log('[MediaUpload] Merged options:', options);
    
    if (options.multiple) {
      console.log('[MediaUpload] Opening picker for MULTIPLE images');
      const images = await ImagePicker.openPicker({
        mediaType: options.mediaType,
        multiple: true,
        maxFiles: options.maxFiles || 10,
        compressImageQuality: options.compressImageQuality || 0.7,
      });
      console.log('[MediaUpload] Multiple images selected:', images.length);
      return images;
    } else {
      console.log('[MediaUpload] Opening picker for SINGLE image');
      console.log('[MediaUpload] Picker config:', {
        mediaType: options.mediaType,
        cropping: options.cropping,
        cropperCircleOverlay: options.cropperCircleOverlay,
        width: options.width,
        height: options.height,
        compressImageQuality: options.compressImageQuality,
      });
      
      const image = await ImagePicker.openPicker({
        mediaType: options.mediaType,
        cropping: options.cropping,
        cropperCircleOverlay: options.cropperCircleOverlay,
        width: options.width,
        height: options.height,
        compressImageQuality: options.compressImageQuality || 0.8,
      });
      console.log('[MediaUpload] Single image selected:', {
        path: image.path,
        mime: image.mime,
        size: image.size,
      });
      return image;
    }
  } catch (error: any) {
    console.error('[MediaUpload] pickFromLibrary ERROR:', error);
    console.error('[MediaUpload] Error code:', error.code);
    console.error('[MediaUpload] Error message:', error.message);
    console.error('[MediaUpload] Error stack:', error.stack);
    
    if (error.code !== 'E_PICKER_CANCELLED') {
      console.error('[MediaUpload] Non-cancellation error occurred');
      Alert.alert('Lỗi', 'Không thể chọn ảnh từ thư viện: ' + error.message);
    } else {
      console.log('[MediaUpload] User cancelled picker');
    }
    return null;
  }
};

/**
 * Take photo with camera
 */
export const takePhoto = async (
  type: UploadType,
  customOptions?: Partial<PickerOptions>
): Promise<Image | null> => {
  try {
    const options = { ...UPLOAD_PRESETS[type], ...customOptions };
    
    const image = await ImagePicker.openCamera({
      mediaType: 'photo',
      cropping: options.cropping,
      cropperCircleOverlay: options.cropperCircleOverlay,
      width: options.width,
      height: options.height,
      compressImageQuality: options.compressImageQuality || 0.8,
    });
    
    return image;
  } catch (error: any) {
    if (error.code !== 'E_PICKER_CANCELLED') {
      console.error('Take photo error:', error);
      Alert.alert('Lỗi', 'Không thể chụp ảnh');
    }
    return null;
  }
};

/**
 * Upload single file to server
 */
export const uploadFile = async (
  file: Image | Video,
  endpoint: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  try {
    const formData = new FormData();
    
    // Prepare file object for React Native
    const fileObj: any = {
      uri: Platform.OS === 'ios' ? file.path.replace('file://', '') : file.path,
      type: file.mime,
      name: file.filename || `upload_${Date.now()}.${file.mime.split('/')[1]}`,
    };
    
    formData.append('file', fileObj);
    
    const apiUrl = getApiUrl();
    const token = await getAuthToken();
    
    const response = await axios.post(`${apiUrl}${endpoint}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`,
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress({
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage,
          });
        }
      },
    });
    
    return {
      success: true,
      url: response.data.url || response.data.path,
    };
  } catch (error: any) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error.response?.data?.message || 'Upload thất bại',
    };
  }
};

/**
 * Upload multiple files to server
 */
export const uploadMultipleFiles = async (
  files: (Image | Video)[],
  endpoint: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult[]> => {
  const results: UploadResult[] = [];
  let totalLoaded = 0;
  const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
  
  for (const file of files) {
    const result = await uploadFile(file, endpoint, (fileProgress) => {
      const overallProgress = {
        loaded: totalLoaded + fileProgress.loaded,
        total: totalSize,
        percentage: Math.round(((totalLoaded + fileProgress.loaded) / totalSize) * 100),
      };
      onProgress?.(overallProgress);
    });
    
    results.push(result);
    totalLoaded += file.size || 0;
  }
  
  return results;
};

/**
 * Helper to get auth token from storage
 */
const getAuthToken = async (): Promise<string> => {
  // Import dynamically to avoid circular dependency
  const { useAuthStore } = await import('../store/useAuthStore');
  return useAuthStore.getState().token || '';
};

/**
 * Clean up picker cache
 */
export const cleanupPickerCache = async () => {
  try {
    await ImagePicker.clean();
  } catch (error) {
    console.error('Cleanup error:', error);
  }
};

/**
 * Show media picker dialog
 */
export const showMediaPicker = (
  type: UploadType,
  onSelected: (media: Image | Image[]) => void
) => {
  console.log('[MediaUpload] showMediaPicker called with type:', type);
  
  Alert.alert(
    type === 'avatar' ? 'Chọn ảnh đại diện' : type === 'cover' ? 'Chọn ảnh bìa' : 'Chọn ảnh/video',
    'Bạn muốn chọn từ đâu?',
    [
      {
        text: 'Thư viện',
        onPress: async () => {
          console.log('[MediaUpload] User selected Library option');
          try {
            console.log('[MediaUpload] Calling pickFromLibrary...');
            const media = await pickFromLibrary(type);
            console.log('[MediaUpload] pickFromLibrary returned:', media ? 'SUCCESS' : 'NULL');
            if (media) {
              console.log('[MediaUpload] Calling onSelected callback');
              onSelected(media);
            } else {
              console.log('[MediaUpload] No media selected or error occurred');
            }
          } catch (err) {
            console.error('[MediaUpload] Unexpected error in Library handler:', err);
          }
        },
      },
      {
        text: 'Chụp ảnh',
        onPress: async () => {
          console.log('[MediaUpload] User selected Camera option');
          try {
            console.log('[MediaUpload] Calling takePhoto...');
            const media = await takePhoto(type);
            console.log('[MediaUpload] takePhoto returned:', media ? 'SUCCESS' : 'NULL');
            if (media) {
              console.log('[MediaUpload] Calling onSelected callback');
              onSelected(media);
            } else {
              console.log('[MediaUpload] No photo taken or error occurred');
            }
          } catch (err) {
            console.error('[MediaUpload] Unexpected error in Camera handler:', err);
          }
        },
      },
      { 
        text: 'Hủy', 
        style: 'cancel',
        onPress: () => console.log('[MediaUpload] User cancelled dialog')
      },
    ]
  );
};
