import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommentDto } from '../api/commentService';
import { useAuthStore } from '../store/useAuthStore';
import { buildAvatarUrl } from '../config/api';

export type ReactionType = 'LIKE' | 'HEART' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY';

interface CommentItemProps {
  comment: CommentDto;
  onReply: (comment: CommentDto) => void;
  onReact: (comment: CommentDto, type: ReactionType) => void;
  onLongPress: (comment: CommentDto) => void;
  isReply?: boolean;
}

export default function CommentItem({ comment, onReply, onReact, onLongPress, isReply = false }: CommentItemProps) {
  const currentUserId = useAuthStore(state => state.user?.id);
  const [showReactions, setShowReactions] = useState(false);

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `Vài giây trước`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
    return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
  };

  return (
    <TouchableOpacity 
      style={[styles.container, isReply && styles.replyContainer]} 
      onLongPress={() => onLongPress(comment)}
      activeOpacity={0.8}
    >
      <Image 
        source={
          buildAvatarUrl(comment.author.avatarUrl)
            ? { uri: buildAvatarUrl(comment.author.avatarUrl) || undefined }
            : require('../assets/images/avatar-default.png')
        }
        style={styles.avatar} 
      />
      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.username}>{comment.author.fullName || comment.author.username}</Text>
          <Text style={styles.time}>{formatTime(comment.createdAt)}</Text>
        </View>
        
        <Text style={styles.content}>{comment.content}</Text>
        
        <View style={styles.actions}>
          {!isReply && (
            <TouchableOpacity onPress={() => onReply(comment)} style={styles.actionButton}>
              <Text style={styles.actionText}>Trả lời</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            onPress={() => onReact(comment, 'HEART')} 
            onLongPress={() => setShowReactions(true)}
            style={styles.reactionButton}
          >
            <Ionicons 
              name={comment.userReacted ? "heart" : "heart-outline"} 
              size={16} 
              color={comment.userReacted ? "#FF4B4B" : "#8E8E93"} 
            />
            {comment.reactionCount > 0 && (
              <Text style={[styles.reactionCount, comment.userReacted && styles.reactionCountActive]}>
                {comment.reactionCount}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {showReactions && (
          <View style={styles.reactionPicker}>
            {(['LIKE', 'HEART', 'HAHA', 'WOW', 'SAD', 'ANGRY'] as ReactionType[]).map((type) => (
              <TouchableOpacity
                key={type}
                style={styles.reactionBubble}
                onPress={() => {
                  setShowReactions(false);
                  onReact(comment, type);
                }}
              >
                <Text style={styles.reactionEmoji}>
                  {type === 'LIKE' ? '👍' : 
                   type === 'HEART' ? '❤️' : 
                   type === 'HAHA' ? '😂' : 
                   type === 'WOW' ? '😮' : 
                   type === 'SAD' ? '😢' : '😡'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  replyContainer: {
    paddingLeft: 50,
    borderBottomWidth: 0,
    paddingTop: 8,
    paddingBottom: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    color: '#8E8E93',
  },
  content: {
    fontSize: 15,
    color: '#1C1C1E',
    lineHeight: 20,
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginRight: 16,
  },
  actionText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  reactionCount: {
    fontSize: 13,
    color: '#8E8E93',
    marginLeft: 4,
  },
  reactionCountActive: {
    color: '#FF4B4B',
  },
  reactionPicker: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 6,
    position: 'absolute',
    bottom: -10,
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 10,
  },
  reactionBubble: {
    paddingHorizontal: 6,
  },
  reactionEmoji: {
    fontSize: 20,
  }
});
