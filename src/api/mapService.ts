import api from './api';

export interface FriendLocationResponse {
  userId: number;
  name: string;
  username: string;
  avatarUrl: string | null;
  latitude: number;
  longitude: number;
  lastSeenAt: string | null; // ISO-8601 string
  isOnline: boolean;
  profileUpdatedAt: string | null; // For avatar cache invalidation
}

const mapService = {
  /**
   * Returns all friends who have location sharing enabled,
   * including their last known GPS coordinates even when offline.
   */
  getFriendsLocations: async (): Promise<FriendLocationResponse[]> => {
    const response = await api.get<{ success: boolean; data: FriendLocationResponse[] }>(
      '/location/friends'
    );
    return response.data.data || [];
  },

  /**
   * Toggle the current user's location sharing on or off.
   * When disabled: friend map pins disappear for other users.
   */
  toggleLocationSharing: async (enabled: boolean): Promise<void> => {
    await api.put(`/location/sharing?enabled=${enabled}`);
  },

  /**
   * Get the current user's own sharing preference from the backend.
   */
  getSharingStatus: async (): Promise<boolean> => {
    const response = await api.get<{ success: boolean; data: boolean }>('/location/sharing/status');
    return response.data.data ?? true;
  },
};

export default mapService;
