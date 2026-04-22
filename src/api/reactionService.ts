import { getApiUrl } from '../config/api';

export type ReactionType = 'LIKE' | 'HEART' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY';

const reactionService = {
  /**
   * Toggle reaction on a moment
   * If user already reacted with the same type, it will remove the reaction
   * If user reacted with different type, it will change to the new type
   */
  async toggleReaction(momentId: number, type: ReactionType, token: string): Promise<void> {
    const API_URL = getApiUrl();
    
    const response = await fetch(`${API_URL}/reactions/moments/${momentId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to toggle reaction: ${errorText}`);
    }
  },

  /**
   * Get reactions for a moment
   */
  async getMomentReactions(momentId: number, token: string): Promise<any> {
    const API_URL = getApiUrl();
    
    const response = await fetch(`${API_URL}/reactions/moments/${momentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get reactions');
    }

    return response.json();
  },
};

export default reactionService;
