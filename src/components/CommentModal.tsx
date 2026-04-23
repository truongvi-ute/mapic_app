import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, Modal, TouchableOpacity, 
  FlatList, TextInput, KeyboardAvoidingView, Platform,
  ActivityIndicator, Keyboard, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CommentItem, { ReactionType } from './CommentItem';
import commentService, { CommentDto } from '../api/commentService';
import reportService, { ReportRequest } from '../api/reportService';
import { useAuthStore } from '../store/useAuthStore';
import { useAlert } from '../context/AlertContext';
import ReportInputModal from './ReportInputModal';

interface CommentModalProps {
  visible: boolean;
  momentId: number;
  onClose: () => void;
  onCommentAdded?: () => void;
}

export default function CommentModal({ visible, momentId, onClose, onCommentAdded }: CommentModalProps) {
  const [comments, setComments] = useState<CommentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<CommentDto | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportInputVisible, setReportInputVisible] = useState(false);
  const [reportingCommentId, setReportingCommentId] = useState<number | null>(null);
  
  const token = useAuthStore(state => state.token);
  const currentUserId = useAuthStore(state => state.user?.id);
  const { showAlert } = useAlert();
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible && momentId) {
      fetchComments();
    }
  }, [visible, momentId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const data = await commentService.getCommentsByMoment(momentId, token || '');
      setComments(data);
    } catch (error) {
      console.error('Failed to fetch comments', error);
      showAlert('Lỗi', 'Không thể tải bình luận');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!inputText.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await commentService.createComment(
        momentId, 
        inputText.trim(), 
        token || '', 
        replyingTo ? replyingTo.id : undefined
      );
      
      setInputText('');
      setReplyingTo(null);
      Keyboard.dismiss();
      await fetchComments();
      if (onCommentAdded) onCommentAdded();
    } catch (error) {
      console.error('Failed to post comment', error);
      showAlert('Lỗi', 'Không thể gửi bình luận');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = (comment: CommentDto) => {
    setReplyingTo(comment);
    inputRef.current?.focus();
  };

  const handleReact = async (comment: CommentDto, type: ReactionType) => {
    try {
      // Optimistic update
      const updatedComments = comments.map(c => {
        if (c.id === comment.id) {
          // If clicking same reaction type, remove it (toggle off)
          const isCurrentlyReacted = c.userReacted && c.userReactionType === type;
          
          if (isCurrentlyReacted) {
            // Remove reaction
            return {
              ...c,
              userReacted: false,
              userReactionType: undefined,
              reactionCount: c.reactionCount - 1
            };
          } else if (c.userReacted && c.userReactionType !== type) {
            // Change reaction type (count stays same)
            return {
              ...c,
              userReacted: true,
              userReactionType: type,
              reactionCount: c.reactionCount
            };
          } else {
            // Add new reaction
            return {
              ...c,
              userReacted: true,
              userReactionType: type,
              reactionCount: c.reactionCount + 1
            };
          }
        }
        if (c.replies) {
          const updatedReplies = c.replies.map(r => {
            if (r.id === comment.id) {
              const isCurrentlyReacted = r.userReacted && r.userReactionType === type;
              
              if (isCurrentlyReacted) {
                return {
                  ...r,
                  userReacted: false,
                  userReactionType: undefined,
                  reactionCount: r.reactionCount - 1
                };
              } else if (r.userReacted && r.userReactionType !== type) {
                return {
                  ...r,
                  userReacted: true,
                  userReactionType: type,
                  reactionCount: r.reactionCount
                };
              } else {
                return {
                  ...r,
                  userReacted: true,
                  userReactionType: type,
                  reactionCount: r.reactionCount + 1
                };
              }
            }
            return r;
          });
          return { ...c, replies: updatedReplies };
        }
        return c;
      });
      setComments(updatedComments);

      await commentService.toggleReaction(comment.id, token || '', type);
    } catch (error) {
      console.error('Failed to react', error);
      // Revert on failure
      fetchComments();
    }
  };

  const handleLongPress = (comment: CommentDto) => {
    const isOwner = comment.author.id === currentUserId;
    
    if (isOwner) {
      showAlert('Tùy chọn', 'Bạn muốn làm gì với bình luận này?', [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Xóa bình luận', 
          style: 'destructive',
          onPress: () => deleteComment(comment.id)
        }
      ]);
    } else {
      showAlert('Tùy chọn', 'Bạn muốn làm gì với bình luận này?', [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Báo cáo', 
          style: 'destructive',
          onPress: () => showReportDialog(comment.id)
        }
      ]);
    }
  };

  const deleteComment = async (commentId: number) => {
    try {
      setLoading(true);
      await commentService.deleteComment(commentId, token || '');
      await fetchComments();
    } catch (error) {
      console.error('Failed to delete comment', error);
      showAlert('Lỗi', 'Không thể xóa bình luận');
      setLoading(false);
    }
  };

  const showReportDialog = (commentId: number) => {
    showAlert(
      'Báo cáo bình luận',
      'Chọn lý do báo cáo:',
      [
        { text: 'Nội dung sai lệch', onPress: () => submitReport(commentId, 'Bình luận có nội dung sai lệch hoặc không chính xác') },
        { text: 'Vi phạm tiêu chuẩn cộng đồng', onPress: () => submitReport(commentId, 'Bình luận vi phạm tiêu chuẩn cộng đồng') },
        { text: 'Ngôn từ thù ghét', onPress: () => submitReport(commentId, 'Bình luận chứa ngôn từ thù ghét hoặc phân biệt đối xử') },
        { text: 'Khác', onPress: () => {
          setReportingCommentId(commentId);
          setReportInputVisible(true);
        }},
        { text: 'Hủy', style: 'cancel' }
      ]
    );
  };

  const handleCustomReasonSubmit = (reason: string) => {
    if (reportingCommentId) {
      submitReport(reportingCommentId, reason);
      setReportingCommentId(null);
    }
  };

  const submitReport = async (commentId: number, reason: string) => {
    try {
      const request: ReportRequest = {
        targetId: commentId,
        targetType: 'COMMENT',
        reason
      };
      await reportService.submitReport(request, token || '');
      showAlert('Thành công', 'Cảm ơn bạn đã báo cáo. Chúng tôi sẽ xem xét.');
    } catch (error) {
      console.error('Failed to report comment', error);
      showAlert('Lỗi', 'Không thể gửi báo cáo');
    }
  };

  const renderComment = ({ item }: { item: CommentDto }) => (
    <View>
      <CommentItem 
        comment={item} 
        onReply={handleReply} 
        onReact={handleReact}
        onLongPress={handleLongPress}
      />
      {item.replies && item.replies.map(reply => (
        <CommentItem 
          key={reply.id}
          comment={reply} 
          onReply={() => handleReply(item)} // Reply to parent
          onReact={handleReact}
          onLongPress={handleLongPress}
          isReply
        />
      ))}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={styles.modalOverlay} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <View style={{ width: 24 }} />
            <Text style={styles.headerTitle}>Bình luận</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : comments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Chưa có bình luận nào. Hãy là người đầu tiên!</Text>
            </View>
          ) : (
            <FlatList
              data={comments}
              renderItem={renderComment}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
            />
          )}

          <View style={styles.inputContainer}>
            {replyingTo && (
              <View style={styles.replyingToContainer}>
                <Text style={styles.replyingToText}>
                  Đang trả lời {replyingTo.author.fullName || replyingTo.author.username}
                </Text>
                <TouchableOpacity onPress={() => setReplyingTo(null)}>
                  <Ionicons name="close-circle" size={16} color="#8E8E93" />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.inputWrapper}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder="Thêm bình luận..."
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
              />
              <TouchableOpacity 
                style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]} 
                onPress={handleSubmit}
                disabled={!inputText.trim() || isSubmitting}
              >
                <Ionicons 
                  name="send" 
                  size={20} 
                  color={inputText.trim() ? "#007AFF" : "#C7C7CC"} 
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
      
      <ReportInputModal
        visible={reportInputVisible}
        onClose={() => {
          setReportInputVisible(false);
          setReportingCommentId(null);
        }}
        onSubmit={handleCustomReasonSubmit}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    height: '80%',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  inputContainer: {
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#fff',
  },
  replyingToContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F2F2F7',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  replyingToText: {
    fontSize: 13,
    color: '#8E8E93',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    minHeight: 24,
    fontSize: 15,
    paddingTop: 0,
    paddingBottom: 0,
  },
  sendButton: {
    marginLeft: 12,
    marginBottom: 2,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  }
});
