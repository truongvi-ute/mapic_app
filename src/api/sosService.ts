import axios from 'axios';
import { getApiUrl } from '../config/api';
import { 
  TriggerSOSRequest, 
  TriggerSOSResponse, 
  ActiveAlertsResponse, 
  AlertHistoryResponse 
} from '../types/sos';

const API_URL = `${getApiUrl()}/sos`;

const sosService = {
  /**
   * Trigger a new SOS alert
   */
  triggerSOS: async (request: TriggerSOSRequest, token: string): Promise<TriggerSOSResponse> => {
    const response = await axios.post<any>(`${API_URL}/trigger`, request, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
  },

  /**
   * Resolve an active SOS alert
   */
  resolveSOS: async (alertId: number, token: string): Promise<void> => {
    await axios.post(`${API_URL}/${alertId}/resolve`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  /**
   * Get active alerts for current user
   */
  getActiveAlerts: async (token: string): Promise<ActiveAlertsResponse> => {
    const response = await axios.get<any>(`${API_URL}/active`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
  },

  /**
   * Get SOS alert history
   */
  getAlertHistory: async (token: string, limit = 20, offset = 0): Promise<AlertHistoryResponse> => {
    const response = await axios.get<any>(`${API_URL}/history`, {
      params: { limit, offset },
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
  },

  /**
   * Mark an alert as viewed by recipient
   */
  markAsViewed: async (alertId: number, token: string): Promise<void> => {
    await axios.post(`${API_URL}/${alertId}/view`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
};

export default sosService;
