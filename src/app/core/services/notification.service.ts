import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ApiPage } from '../models/api-page.model';
import { BulkNotificationRequest, NotificationRequest, NotificationResponse } from '../models/notification.models';
import { ApiService } from './api.service';

export type UiNotificationType = 'success' | 'error' | 'info';

export interface UiNotification {
  id: number;
  type: UiNotificationType;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  private readonly uiNotificationSubject = new BehaviorSubject<UiNotification | null>(null);
  readonly uiNotification$ = this.uiNotificationSubject.asObservable();
  private notificationSeed = 0;
  private dismissTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly api: ApiService) {}

  success(message: string): void {
    this.present('success', message);
  }

  error(message: string): void {
    this.present('error', message);
  }

  info(message: string): void {
    this.present('info', message);
  }

  clear(): void {
    this.uiNotificationSubject.next(null);
  }

  ngOnDestroy(): void {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
    }
  }

  send(request: NotificationRequest) {
    return this.api.post<NotificationResponse>('/api/v1/notifications/send', request);
  }

  sendBulk(request: BulkNotificationRequest) {
    return this.api.post<NotificationResponse[]>('/api/v1/notifications/bulk', request);
  }

  markRead(notificationId: number) {
    return this.api.putText(`/api/v1/notifications/read/${notificationId}`, {});
  }

  markAllRead(recipientId: number) {
    return this.api.putText(`/api/v1/notifications/readAll/${recipientId}`, {});
  }

  deleteRead(recipientId: number) {
    return this.api.deleteText(`/api/v1/notifications/delete-read/${recipientId}`);
  }

  getByRecipient(recipientId: number, page = 0, size = 10, sortBy = 'createdAt', direction = 'DESC') {
    return this.api.get<ApiPage<NotificationResponse>>(`/api/v1/notifications/recipient/${recipientId}`, { page, size, sortBy, direction });
  }

  unreadCount(recipientId: number) {
    return this.api.get<number>(`/api/v1/notifications/recipient/unread-count/${recipientId}`);
  }

  delete(notificationId: number) {
    return this.api.deleteText(`/api/v1/notifications/delete/${notificationId}`);
  }

  private present(type: UiNotificationType, message: string): void {
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    this.uiNotificationSubject.next({
      id: ++this.notificationSeed,
      type,
      message: trimmed
    });

    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
    }

    this.dismissTimer = setTimeout(() => {
      this.uiNotificationSubject.next(null);
    }, 2600);
  }
}