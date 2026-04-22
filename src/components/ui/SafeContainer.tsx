/**
 * SafeContainer Component
 * Wrapper that automatically handles safe area insets
 */

import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SafeContainerProps {
  children: React.ReactNode;
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
  style?: ViewStyle;
}

export const SafeContainer: React.FC<SafeContainerProps> = ({
  children,
  top = true,
  bottom = true,
  left = true,
  right = true,
  style,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: top ? insets.top : 0,
          paddingBottom: bottom ? insets.bottom : 0,
          paddingLeft: left ? insets.left : 0,
          paddingRight: right ? insets.right : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default SafeContainer;
