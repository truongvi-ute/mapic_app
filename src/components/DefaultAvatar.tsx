import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface DefaultAvatarProps {
  name: string;
  size?: number;
  backgroundColor?: string;
  textColor?: string;
}

export const DefaultAvatar: React.FC<DefaultAvatarProps> = ({
  name,
  size = 40,
  backgroundColor = '#6B7280',
  textColor = '#FFFFFF'
}) => {
  const getInitials = (fullName: string): string => {
    const words = fullName.trim().split(' ');
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  };

  const styles = StyleSheet.create({
    container: {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor,
      justifyContent: 'center',
      alignItems: 'center',
    },
    text: {
      color: textColor,
      fontSize: size * 0.4,
      fontWeight: '600',
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{getInitials(name)}</Text>
    </View>
  );
};

export default DefaultAvatar;