/**
 * Spacer Component
 * Provides consistent spacing between components
 */

import React from 'react';
import { View, ViewStyle } from 'react-native';
import { SPACING } from '../../constants/design';

type SpacingSize = keyof typeof SPACING;

interface SpacerProps {
  size?: SpacingSize | number;
  horizontal?: boolean;
  style?: ViewStyle;
}

export const Spacer: React.FC<SpacerProps> = ({ 
  size = 'md', 
  horizontal = false,
  style 
}) => {
  const spacing = typeof size === 'number' ? size : SPACING[size];
  
  return (
    <View
      style={[
        {
          [horizontal ? 'width' : 'height']: spacing,
        },
        style,
      ]}
    />
  );
};

export default Spacer;
