import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  replyingTo: {
    id: number;
    senderName: string;
    content: string;
  } | null;
  onCancel: () => void;
}

export default function ReplyMessageBar({ replyingTo, onCancel }: Props) {
  if (!replyingTo) return null;

  return (
    <View style={styles.container}>
      <View style={styles.replyIndicator} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons name="arrow-undo" size={16} color="#007AFF" />
          <Text style={styles.replyingText}>Đang trả lời {replyingTo.senderName}</Text>
        </View>
        <Text style={styles.messagePreview} numberOfLines={1}>
          {replyingTo.content}
        </Text>
      </View>
      <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
        <Ionicons name="close" size={20} color="#8E8E93" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  replyIndicator: {
    width: 3,
    height: 40,
    backgroundColor: '#007AFF',
    borderRadius: 2,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  replyingText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
  },
  messagePreview: {
    fontSize: 14,
    color: '#8E8E93',
  },
  cancelBtn: {
    padding: 4,
    marginLeft: 8,
  },
});
