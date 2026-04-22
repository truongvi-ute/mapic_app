import { buildMediaUrl } from '../config/api';

// ============================================================================
// Category Labels
// ============================================================================
export const CATEGORY_LABELS: Record<string, string> = {
  LANDSCAPE: 'Phong cảnh',
  PEOPLE: 'Con người',
  FOOD: 'Món ăn',
  ARCHITECTURE: 'Kiến trúc',
  CULTURE: 'Văn hóa',
  NATURE: 'Thiên nhiên',
  URBAN: 'Đô thị',
  EVENT: 'Sự kiện',
  OTHER: 'Khác',
};

// ============================================================================
// Time helpers
// ============================================================================
export const getTimeAgo = (dateString?: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Vừa xong';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} ngày trước`;
  return date.toLocaleDateString('vi-VN');
};

// ============================================================================
// Image URL helpers
// ============================================================================
/**
 * Converts a raw media path from the API into a full URL.
 * Handles:
 *  - Cloudinary URLs (already absolute http/https) → returned as-is
 *  - Local server paths (relative or /uploads/...) → prefixed with base URL
 */
export const getImageUrl = (
  path?: string | null,
  type: 'moment' | 'avatar' | 'cover' = 'moment'
): string | null => {
  if (!path) return null;

  // Already a full URL (Cloudinary, S3, etc.)
  if (path.startsWith('http')) return path;

  // Already contains /uploads/ prefix
  if (path.includes('/uploads/')) {
    return buildMediaUrl(path);
  }

  // Bare filename — prepend the correct uploads folder
  const folder =
    type === 'avatar'
      ? '/uploads/avatars/'
      : type === 'cover'
      ? '/uploads/covers/'
      : '/uploads/moments/';

  return buildMediaUrl(`${folder}${path}`);
};
