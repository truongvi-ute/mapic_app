import { getApiUrl } from '../config/api';

export interface ReportRequest {
  targetId: number;
  targetType: 'MOMENT' | 'COMMENT' | 'USER';
  reason: string;
}

class ReportService {
  async submitReport(request: ReportRequest, token: string): Promise<void> {
    const response = await fetch(`${getApiUrl()}/reports`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.message || 'Failed to submit report');
    }
  }
}

export default new ReportService();
