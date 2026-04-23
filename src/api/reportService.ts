import { getApiUrl } from '../config/api';

export interface ReportRequest {
  targetId: number;
  targetType: 'MOMENT' | 'COMMENT' | 'USER';
  reason: string;
}

class ReportService {
  async submitReport(request: ReportRequest, token: string): Promise<void> {
    const { targetId, targetType, reason } = request;
    
    // Map targetType to backend path segments
    const pathMap: Record<string, string> = {
      'MOMENT': 'moments',
      'COMMENT': 'comments',
      'USER': 'users'
    };

    const typePath = pathMap[targetType] || 'moments';
    const response = await fetch(`${getApiUrl()}/reports/${typePath}/${targetId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason })
    });

    if (!response.ok) {
      try {
        const result = await response.json();
        throw new Error(result.message || 'Failed to submit report');
      } catch (e) {
        throw new Error(`Failed to submit report (Status: ${response.status})`);
      }
    }
  }
}

export default new ReportService();
