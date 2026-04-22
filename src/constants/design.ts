/**
 * Design System Constants
 * Centralized design tokens for consistent UI/UX
 */

import { Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================================================
// SPACING SYSTEM
// ============================================================================
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

// ============================================================================
// BORDER RADIUS
// ============================================================================
export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  round: 9999, // Fully rounded
} as const;

// ============================================================================
// TYPOGRAPHY
// ============================================================================
export const FONT_SIZE = {
  xs: 11,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  xxxl: 24,
  huge: 28,
  massive: 32,
} as const;

export const FONT_WEIGHT = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const LINE_HEIGHT = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
} as const;

// ============================================================================
// COLORS — LIGHT THEME
// ============================================================================
export const LIGHT_COLORS = {
  // Primary — MAPIC Blue
  primary: '#4361EE',
  primaryDark: '#2d4bd4',
  primaryLight: '#6b84f3',

  // Accent
  accentPurple: '#7209b7',
  accentPink: '#EC4899',
  accentViolet: '#8B5CF6',

  // Neutral
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

  // Semantic
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Chat specific
  chatBubbleSent: '#4361EE',
  chatBubbleReceived: '#E5E5EA',
  chatTextSent: '#FFFFFF',
  chatTextReceived: '#000000',

  // Backgrounds
  background: '#F5F5F5',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  cardBackground: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.5)',

  // Text
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',

  // Border
  border: '#E5E7EB',
  borderSubtle: 'rgba(0,0,0,0.06)',
} as const;

// ============================================================================
// COLORS — DARK THEME (matches mapic_app reference design)
// ============================================================================
export const DARK_COLORS = {
  // Primary — MAPIC Blue
  primary: '#4361EE',
  primaryDark: '#2d4bd4',
  primaryLight: '#6b84f3',

  // Accent
  accentPurple: '#7209b7',
  accentPink: '#EC4899',
  accentViolet: '#8B5CF6',

  // Neutral
  white: '#FFFFFF',
  black: '#000000',
  gray50: 'rgba(255,255,255,0.05)',
  gray100: 'rgba(255,255,255,0.07)',
  gray200: 'rgba(255,255,255,0.10)',
  gray300: 'rgba(255,255,255,0.15)',
  gray400: 'rgba(255,255,255,0.25)',
  gray500: 'rgba(255,255,255,0.40)',
  gray600: 'rgba(255,255,255,0.50)',
  gray700: 'rgba(255,255,255,0.65)',
  gray800: 'rgba(255,255,255,0.80)',
  gray900: '#FFFFFF',

  // Semantic
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#4361EE',

  // Chat specific
  chatBubbleSent: '#4361EE',
  chatBubbleReceived: 'rgba(255,255,255,0.10)',
  chatTextSent: '#FFFFFF',
  chatTextReceived: '#FFFFFF',

  // Backgrounds — deep dark from reference app
  background: '#000000',
  surface: '#0d0d0d',
  surfaceElevated: 'rgba(255,255,255,0.07)',
  cardBackground: 'rgba(255,255,255,0.06)',
  overlay: 'rgba(0, 0, 0, 0.75)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.70)',
  textTertiary: 'rgba(255,255,255,0.45)',
  textInverse: '#000000',

  // Border
  border: 'rgba(255,255,255,0.10)',
  borderSubtle: 'rgba(255,255,255,0.06)',
} as const;

// Legacy alias — defaults to light for backward compat
export const COLORS = LIGHT_COLORS;

// Gradient presets (dark mode)
export const GRADIENTS = {
  darkHero: ['#1e1b4b', '#312e81', '#4c1d95'] as const,
  darkCard: ['rgba(30,27,75,0.9)', 'rgba(49,46,129,0.7)'] as const,
  primaryBlue: ['#4361EE', '#7209b7'] as const,
  sunset: ['#EC4899', '#F59E0B'] as const,
  emerald: ['#10B981', '#4361EE'] as const,
  overlayBottom: ['transparent', 'rgba(0,0,0,0.85)'] as const,
  overlayFull: ['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.9)'] as const,
} as const;

// ============================================================================
// SHADOWS
// ============================================================================
export const SHADOWS = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// ============================================================================
// DIMENSIONS
// ============================================================================
export const DIMENSIONS = {
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,
  
  // Common component sizes
  buttonHeight: 48,
  inputHeight: 48,
  tabBarHeight: 60,
  headerHeight: 56,
  
  // Avatar sizes
  avatarXS: 24,
  avatarSM: 32,
  avatarMD: 40,
  avatarLG: 56,
  avatarXL: 80,
  
  // Icon sizes
  iconXS: 16,
  iconSM: 20,
  iconMD: 24,
  iconLG: 28,
  iconXL: 32,
} as const;

// ============================================================================
// ANIMATION
// ============================================================================
export const ANIMATION = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 350,
  },
  easing: {
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
} as const;

// ============================================================================
// LAYOUT HELPERS
// ============================================================================
export const isSmallDevice = SCREEN_WIDTH < 375;
export const isMediumDevice = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414;
export const isLargeDevice = SCREEN_WIDTH >= 414;

export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';

// ============================================================================
// RESPONSIVE HELPERS
// ============================================================================
export const scale = (size: number): number => {
  const baseWidth = 375; // iPhone SE/8 width
  return (SCREEN_WIDTH / baseWidth) * size;
};

export const verticalScale = (size: number): number => {
  const baseHeight = 667; // iPhone SE/8 height
  return (SCREEN_HEIGHT / baseHeight) * size;
};

export const moderateScale = (size: number, factor = 0.5): number => {
  return size + (scale(size) - size) * factor;
};

// ============================================================================
// CHAT UI SPECIFIC
// ============================================================================
export const CHAT = {
  bubbleMaxWidth: SCREEN_WIDTH * 0.75,
  bubbleMinWidth: 60,
  bubblePadding: {
    horizontal: SPACING.md,
    vertical: SPACING.sm,
  },
  bubbleRadius: RADIUS.lg,
  messageSpa: SPACING.sm,
  inputBarHeight: 56,
  avatarSize: DIMENSIONS.avatarSM,
} as const;

// ============================================================================
// MOMENT CARD SPECIFIC
// ============================================================================
export const MOMENT_CARD = {
  width: SCREEN_WIDTH - SPACING.lg * 2,
  imageAspectRatio: 1.25,
  borderRadius: RADIUS.lg,
  padding: SPACING.lg,
  captionPadding: SPACING.md,
  iconSize: DIMENSIONS.iconLG,
  avatarSize: DIMENSIONS.avatarMD,
} as const;

export default {
  SPACING,
  RADIUS,
  FONT_SIZE,
  FONT_WEIGHT,
  LINE_HEIGHT,
  COLORS,
  SHADOWS,
  DIMENSIONS,
  ANIMATION,
  CHAT,
  MOMENT_CARD,
  scale,
  verticalScale,
  moderateScale,
  isSmallDevice,
  isMediumDevice,
  isLargeDevice,
  isIOS,
  isAndroid,
};
