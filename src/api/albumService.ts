import { getApiUrl } from '../config/api';
import { Moment } from '../components/MomentCard';

export interface Album {
  id: number;
  title: string;
  description?: string;
  coverImageUrl?: string;
  itemCount: number;
  createdAt: string;
  moments?: Moment[];
}

export interface CreateAlbumRequest {
  title: string;
  description?: string;
}

const albumService = {
  /**
   * Get all albums for current user
   */
  async getUserAlbums(token: string): Promise<Album[]> {
    const API_URL = getApiUrl();
    console.log('[albumService] Fetching albums from:', `${API_URL}/albums`);
    
    try {
      const response = await fetch(`${API_URL}/albums`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[albumService] Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[albumService] Error response:', errorText);
        throw new Error(`Failed to fetch albums: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('[albumService] Albums result:', result);
      return result.data;
    } catch (error) {
      console.error('[albumService] Fetch error:', error);
      throw error;
    }
  },

  /**
   * Get album details with moments
   */
  async getAlbumDetails(albumId: number, token: string): Promise<Album> {
    const API_URL = getApiUrl();
    const response = await fetch(`${API_URL}/albums/${albumId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch album details');
    }

    const result = await response.json();
    return result.data;
  },

  /**
   * Create a new album
   */
  async createAlbum(request: CreateAlbumRequest, token: string): Promise<Album> {
    const API_URL = getApiUrl();
    const response = await fetch(`${API_URL}/albums`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create album');
    }

    const result = await response.json();
    return result.data;
  },

  /**
   * Update album
   */
  async updateAlbum(albumId: number, request: CreateAlbumRequest, token: string): Promise<Album> {
    const API_URL = getApiUrl();
    const response = await fetch(`${API_URL}/albums/${albumId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update album');
    }

    const result = await response.json();
    return result.data;
  },

  /**
   * Delete album
   */
  async deleteAlbum(albumId: number, token: string): Promise<void> {
    const API_URL = getApiUrl();
    const response = await fetch(`${API_URL}/albums/${albumId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete album');
    }
  },

  /**
   * Add moment to album
   */
  async addMomentToAlbum(albumId: number, momentId: number, token: string): Promise<Album> {
    const API_URL = getApiUrl();
    const response = await fetch(`${API_URL}/albums/${albumId}/moments/${momentId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to add moment to album');
    }

    const result = await response.json();
    return result.data;
  },

  /**
   * Remove moment from album
   */
  async removeMomentFromAlbum(albumId: number, momentId: number, token: string): Promise<Album> {
    const API_URL = getApiUrl();
    const response = await fetch(`${API_URL}/albums/${albumId}/moments/${momentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to remove moment from album');
    }

    const result = await response.json();
    return result.data;
  },

  /**
   * Reorder moment in album (left or right)
   */
  async reorderMomentInAlbum(albumId: number, momentId: number, direction: 'left' | 'right', token: string): Promise<Album> {
    const API_URL = getApiUrl();
    const response = await fetch(`${API_URL}/albums/${albumId}/moments/${momentId}/reorder?direction=${direction}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to reorder moment');
    }

    const result = await response.json();
    return result.data;
  },
  /**
   * Save (copy) a shared album from another user into current user's albums
   */
  async saveSharedAlbum(albumId: number, token: string): Promise<Album> {
    const API_URL = getApiUrl();
    const response = await fetch(`${API_URL}/albums/${albumId}/save`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Failed to save album');
    }
    const result = await response.json();
    return result.data;
  },
};

export default albumService;
