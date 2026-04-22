/**
 * GradientView — Safe wrapper around expo-linear-gradient.
 * Falls back to a solid color View if the native module is not available
 * (e.g., running in Expo Go before a full rebuild).
 */
import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';

let LinearGradient: any = null;
try {
  LinearGradient = require('expo-linear-gradient').LinearGradient;
} catch (_) {
  // Native module not available yet
}

interface GradientViewProps {
  colors: string[];
  style?: ViewStyle | ViewStyle[] | any;
  locations?: number[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  children?: React.ReactNode;
  pointerEvents?: 'none' | 'auto' | 'box-none' | 'box-only';
}

export default function GradientView({
  colors,
  style,
  locations,
  start,
  end,
  children,
  pointerEvents,
}: GradientViewProps) {
  if (LinearGradient) {
    return (
      <LinearGradient
        colors={colors}
        style={style}
        locations={locations}
        start={start}
        end={end}
        pointerEvents={pointerEvents}
      >
        {children}
      </LinearGradient>
    );
  }

  // Fallback: use the middle color or first color as solid background
  const fallbackColor = colors[Math.floor(colors.length / 2)] || colors[0] || '#1e1b4b';
  return (
    <View style={[style, { backgroundColor: fallbackColor }]} pointerEvents={pointerEvents}>
      {children}
    </View>
  );
}
