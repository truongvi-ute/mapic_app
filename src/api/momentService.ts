import { getApiUrl } from '../config/api';

export interface UpdateMomentContentRequest {
  content: string;
}

const momentService = {
  deleteMoment: async (momentId: number, token: string): Promise<void> => {
    const API_URL = getApiUrl();
    const url = `${API_URL}/moments/${momentId}`;
    
    console.log('[momentService] Deleting moment:', momentId);
    console.log('[momentService] DELETE URL:', url);
    console.log('[momentService] Token:', token ? 'present' : 'missing');
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('[momentService] Delete response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[momentService] Delete failed:', response.status, errorText);
      
      let errorMessage = 'Failed to delete moment';
      try {
        const error = JSON.parse(errorText);
        errorMessage = error.message || errorMessage;
      } catch (e) {
        errorMessage = errorText || errorMessage;
      }
      
      throw new Error(errorMessage);
    }
    
    console.log('[momentService] Delete successful');
  },

  updateMomentContent: async (
    momentId: number,
    content: string,
    token: string
  ): Promise<any> => {
    const API_URL = getApiUrl();
    const response = await fetch(`${API_URL}/moments/${momentId}/content`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update moment content');
    }

    const result = await response.json();
    return result.data;
  },
};

export default momentService;
