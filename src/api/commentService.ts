import { getApiUrl } from '../config/api';

export interface Author {
  id: number;
  username: string;
  fullName: string;
  avatarUrl?: string;
}

export interface CommentDto {
  id: number;
  content: string;
  author: Author;
  momentId: number;
  parentCommentId?: number;
  createdAt: string;
  reactionCount: number;
  userReacted: boolean;
  userReactionType?: 'LIKE' | 'HEART' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY'; // Thêm field này
  replies?: CommentDto[];
}

class CommentService {
  async getCommentsByMoment(momentId: number, token: string): Promise<CommentDto[]> {
    const response = await fetch(`${getApiUrl()}/comments/moment/${momentId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Failed to fetch comments');
    
    const result = await response.json();
    return result.data;
  }

  async createComment(momentId: number, content: string, token: string, parentCommentId?: number): Promise<CommentDto> {
    const response = await fetch(`${getApiUrl()}/comments/moment/${momentId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content, parentCommentId })
    });

    if (!response.ok) throw new Error('Failed to create comment');
    
    const result = await response.json();
    return result.data;
  }

  async deleteComment(commentId: number, token: string): Promise<void> {
    const response = await fetch(`${getApiUrl()}/comments/${commentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Failed to delete comment');
  }

  async toggleReaction(commentId: number, token: string, type: string = 'HEART'): Promise<void> {
    const response = await fetch(`${getApiUrl()}/comments/${commentId}/react`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ type })
    });

    if (!response.ok) throw new Error('Failed to react to comment');
  }
}

export default new CommentService();
