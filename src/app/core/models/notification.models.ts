export type NotificationType = 'ASSIGNMENT' | 'MENTION' | 'DUE_DATE' | 'COMMENT' | 'MOVE' | 'SYSTEM' | 'BROADCAST';
export type RelatedType = 'CARD' | 'BOARD' | 'COMMENT' | 'WORKSPACE' | 'USER';

export interface NotificationRequest {
  recipientId: number;
  actorId: number;
  notificationType: NotificationType;
  title: string;
  message: string;
  relatedId: number;
  relatedType: RelatedType;
}

export interface BulkNotificationRequest {
  recipientIds: number[];
  actorId: number;
  title: string;
  message: string;
  relatedId: number;
  notificationType: NotificationType;
  relatedType: RelatedType;
}

export interface NotificationResponse {
  notificationId: number;
  recipientId: number;
  actorId: number;
  notificationType: NotificationType;
  title: string;
  message: string;
  relatedId: number;
  relatedType: RelatedType;
  isRead: boolean;
  createdAt: string;
}