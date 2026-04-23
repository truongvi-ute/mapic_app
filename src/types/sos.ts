/**
 * SOS Emergency Alert Types and Interfaces
 */

export enum SOSAlertStatus {
  ACTIVE = 'ACTIVE',
  RESOLVED = 'RESOLVED',
}

export enum LocationStatus {
  ACCURATE = 'ACCURATE',       // GPS accuracy < 50m
  APPROXIMATE = 'APPROXIMATE', // GPS accuracy 50-200m
  UNAVAILABLE = 'UNAVAILABLE', // No GPS data
}

export interface SOSAlert {
  id: number;
  senderId: number;
  senderName: string;
  senderAvatar?: string;
  triggeredAt: string; // ISO 8601 timestamp
  resolvedAt?: string; // ISO 8601 timestamp
  status: SOSAlertStatus;
  latitude?: number;
  longitude?: number;
  message?: string;
  locationStatus: LocationStatus;
  recipientCount: number;
}

export interface SOSAlertRecipient {
  id: number;
  alertId: number;
  recipientId: number;
  recipientName: string;
  recipientAvatar?: string;
  viewedAt?: string; // ISO 8601 timestamp
  hasResponded: boolean;
  createdAt: string; // ISO 8601 timestamp
}

export interface LocationUpdate {
  alertId: number;
  latitude: number;
  longitude: number;
  timestamp: string; // ISO 8601 timestamp
  locationStatus: LocationStatus;
}

export interface TriggerSOSRequest {
  latitude: number;
  longitude: number;
  message?: string;
  locationStatus: LocationStatus;
}

export interface TriggerSOSResponse {
  alertId: number;
  triggeredAt: string;
  recipientCount: number;
  recipients: RecipientInfo[];
}

export interface RecipientInfo {
  userId: number;
  name: string;
  avatarUrl?: string;
}

export interface ActiveAlertsResponse {
  asSender?: SOSAlert;
  asRecipient: SOSAlert[];
}

export interface AlertHistoryResponse {
  alerts: SOSAlert[];
  total: number;
  limit: number;
  offset: number;
}
