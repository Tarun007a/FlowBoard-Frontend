import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, forkJoin, interval, of, startWith, switchMap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NotificationResponse } from '../../core/models/notification.models';
import { NotificationService } from '../../core/services/notification.service';
import { readErrorMessage } from '../../core/utils/error.utils';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css'
})
export class NotificationsComponent implements OnInit {
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  error = '';
  notifications: NotificationResponse[] = [];
  unreadCount = 0;
  loading = true;
  actionBusy = false;

  ngOnInit(): void {
    interval(45000)
      .pipe(
        startWith(0),
        takeUntilDestroyed(this.destroyRef),
        switchMap(() => this.loadData())
      )
      .subscribe();
  }

  onNotificationClick(notification: NotificationResponse): void {
    if (notification.isRead || this.actionBusy) {
      return;
    }

    this.actionBusy = true;
    this.error = '';

    this.notificationService
      .markAsRead(notification.notificationId)
      .pipe(finalize(() => (this.actionBusy = false)))
      .subscribe({
        next: () => {
          this.notifications = this.notifications.map((item) =>
            item.notificationId === notification.notificationId
              ? { ...item, isRead: true }
              : item
          );
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        },
        error: (err) => {
          this.error = readErrorMessage(err);
          this.notificationService.error(this.error);
        }
      });
  }

  markAllAsRead(): void {
    if (this.actionBusy || this.unreadCount <= 0) {
      return;
    }

    this.actionBusy = true;
    this.error = '';

    this.notificationService
      .markAllAsRead()
      .pipe(finalize(() => (this.actionBusy = false)))
      .subscribe({
        next: () => {
          this.notifications = this.notifications.map((item) => ({ ...item, isRead: true }));
          this.unreadCount = 0;
        },
        error: (err) => {
          this.error = readErrorMessage(err);
          this.notificationService.error(this.error);
        }
      });
  }

  deleteNotification(notificationId: number, event: MouseEvent): void {
    event.stopPropagation();

    if (this.actionBusy) {
      return;
    }

    this.actionBusy = true;
    this.error = '';

    const target = this.notifications.find((item) => item.notificationId === notificationId) ?? null;

    this.notificationService
      .deleteNotification(notificationId)
      .pipe(finalize(() => (this.actionBusy = false)))
      .subscribe({
        next: () => {
          this.notifications = this.notifications.filter((item) => item.notificationId !== notificationId);
          if (target && !target.isRead) {
            this.unreadCount = Math.max(0, this.unreadCount - 1);
          }
        },
        error: (err) => {
          this.error = readErrorMessage(err);
          this.notificationService.error(this.error);
        }
      });
  }

  clearRead(): void {
    if (this.actionBusy || !this.notifications.length) {
      return;
    }

    this.actionBusy = true;
    this.error = '';

    this.notificationService
      .clearReadNotifications()
      .pipe(finalize(() => (this.actionBusy = false)))
      .subscribe({
        next: () => {
          this.notifications = this.notifications.filter((item) => !item.isRead);
        },
        error: (err) => {
          this.error = readErrorMessage(err);
          this.notificationService.error(this.error);
        }
      });
  }

  formatNotificationDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  }

  private loadData() {
    this.loading = true;
    this.error = '';

    return forkJoin({
      page: this.notificationService.getMyNotifications(0, 30, 'notificationId', 'DESC'),
      unread: this.notificationService.getUnreadCount().pipe(catchError(() => of(0)))
    }).pipe(
      finalize(() => (this.loading = false)),
      catchError((err) => {
        this.notifications = [];
        this.unreadCount = 0;
        this.error = readErrorMessage(err);
        return of({ page: { content: [] } as { content: NotificationResponse[] }, unread: 0 });
      }),
      switchMap((result) => {
        this.notifications = result.page.content;
        this.unreadCount = result.unread;
        return of(result);
      })
    );
  }
}