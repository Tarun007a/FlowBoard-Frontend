import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { ApiPage } from '../models/api-page.model';
import { NotificationResponse } from '../models/notification.models';
import { AuthStoreService } from './auth-store.service';
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

  constructor(
    private readonly api: ApiService,
    private readonly authStore: AuthStoreService
  ) {}

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

  getMyNotifications(page = 0, size = 20, sortBy = 'notificationId', direction = 'DESC'): Observable<ApiPage<NotificationResponse>> {
    const recipientId = this.currentUserId();
    if (!recipientId) {
      return throwError(() => new Error('User not authenticated'));
    }

    return this.api.get<ApiPage<NotificationResponse>>(`/api/v1/notifications/recipient/${recipientId}`, {
      page,
      size,
      sortBy,
      direction
    });
  }

  getUnreadCount(): Observable<number> {
    const recipientId = this.currentUserId();
    if (!recipientId) {
      return throwError(() => new Error('User not authenticated'));
    }

    return this.api.get<number>(`/api/v1/notifications/recipient/unread-count/${recipientId}`);
  }

  markAsRead(notificationId: number): Observable<string> {
    return this.api.putText(`/api/v1/notifications/read/${notificationId}`, {});
  }

  markAllAsRead(): Observable<string> {
    const recipientId = this.currentUserId();
    if (!recipientId) {
      return throwError(() => new Error('User not authenticated'));
    }

    return this.api.putText(`/api/v1/notifications/readAll/${recipientId}`, {});
  }

  clearReadNotifications(): Observable<string> {
    const recipientId = this.currentUserId();
    if (!recipientId) {
      return throwError(() => new Error('User not authenticated'));
    }

    return this.api.deleteText(`/api/v1/notifications/delete-read/${recipientId}`);
  }

  deleteNotification(notificationId: number): Observable<string> {
    return this.api.deleteText(`/api/v1/notifications/delete/${notificationId}`);
  }

  private currentUserId(): number | null {
    return this.authStore.snapshot()?.userId ?? null;
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