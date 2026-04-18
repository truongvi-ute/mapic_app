import { useState } from 'react';
import { Alert } from 'react-native';
import { Image } from 'react-native-image-crop-picker';
import {
  uploadFile,
  uploadMultipleFiles,
  UploadProgress,
  UploadResult,
  UploadType,
} from '../utils/mediaUpload';

interface UseMediaUploadReturn {
  uploading: boolean;
  progress: number;
  uploadSingle: (file: Image, endpoint: string) => Promise<UploadResult>;
  uploadMultiple: (files: Image[], endpoint: string) => Promise<UploadResult[]>;
}

/**
 * Hook for handling media uploads with progress tracking
 */
export const useMediaUpload = (): UseMediaUploadReturn => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleProgress = (uploadProgress: UploadProgress) => {
    setProgress(uploadProgress.percentage);
  };

  const uploadSingle = async (file: Image, endpoint: string): Promise<UploadResult> => {
    setUploading(true);
    setProgress(0);

    try {
      const result = await uploadFile(file, endpoint, handleProgress);
      
      if (!result.success) {
        Alert.alert('Lỗi', result.error || 'Upload thất bại');
      }
      
      return result;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const uploadMultiple = async (files: Image[], endpoint: string): Promise<UploadResult[]> => {
    setUploading(true);
    setProgress(0);

    try {
      const results = await uploadMultipleFiles(files, endpoint, handleProgress);
      
      const failedCount = results.filter(r => !r.success).length;
      if (failedCount > 0) {
        Alert.alert('Thông báo', `${failedCount}/${results.length} file upload thất bại`);
      }
      
      return results;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return {
    uploading,
    progress,
    uploadSingle,
    uploadMultiple,
  };
};
