import Constants from 'expo-constants';

/**
 * Get API base URL from environment variables
 * Priority: EXPO_PUBLIC_API_URL from .env > fallback to localhost
 */
export const getApiUrl = (): string => {
  const apiUrl = Constants.expoConfig?.extra?.apiUrl || 
                 process.env.EXPO_PUBLIC_API_URL || 
                 'http://192.168.1.6:8080/api';
  
  console.log('[API Config] Using API URL:', apiUrl);
  return apiUrl;
};

/**
 * Get base URL (without /api suffix) for media files
 */
export const getBaseUrl = (): string => {
  return getApiUrl().replace('/api', '');
};

/**
 * Get WebSocket base URL for SockJS
 * Note: SockJS uses HTTP/HTTPS, not WS/WSS
 */
export const getWsUrl = (): string => {
  const apiUrl = getApiUrl();
  const baseUrl = apiUrl.replace('/api', '');
  return `${baseUrl}/chat-socket`;
};

// Export as constants for compatibility
export const WS_BASE_URL = getWsUrl();
export const API_BASE_URL = getApiUrl();
export const UPLOADS_BASE_URL = getBaseUrl();

/**
 * Build full URL for media files
 * @param path - Relative path (e.g., "/uploads/avatars/image.jpg" or "uploads/avatars/image.jpg")
 */
export const buildMediaUrl = (path?: string | null): string | null => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  
  const baseUrl = getBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};

/**
 * Build full URL for moment images
 * @param filename - Image filename (e.g., "image.jpg")
 */
export const buildMomentImageUrl = (filename?: string | null): string | null => {
  if (!filename) return null;
  if (filename.startsWith('http')) return filename;
  
  return buildMediaUrl(`/uploads/moments/${filename}`);
};

/**
 * Build full URL for avatar images
 * @param path - Avatar path from API
 */
export const buildAvatarUrl = (path?: string | null): string | null => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  
  // If path doesn't start with /uploads/, add /uploads/avatars/ prefix
  let fullPath = path;
  if (!path.startsWith('/uploads/')) {
    fullPath = `/uploads/avatars/${path.startsWith('/') ? path.substring(1) : path}`;
  }
  
  const result = buildMediaUrl(fullPath);
  console.log('[API Config] buildAvatarUrl - Input:', path, 'Output:', result);
  return result;
};

/**
 * Build full URL for cover images
 * @param path - Cover image path from API
 */
export const buildCoverUrl = (path?: string | null): string | null => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  
  // If path doesn't start with /uploads/, add /uploads/covers/ prefix
  let fullPath = path;
  if (!path.startsWith('/uploads/')) {
    fullPath = `/uploads/covers/${path.startsWith('/') ? path.substring(1) : path}`;
  }
  
  return buildMediaUrl(fullPath);
};
