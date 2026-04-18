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
  template: `
    <div class="stack">
      <section class="panel section-card stack">
        <header class="notification-header">
          <div>
            <div class="badge">Notifications</div>
            <h1 class="section-title">Your notifications</h1>
            <p class="muted">Stay updated with mentions, assignments, and workspace activity.</p>
          </div>
          <div class="header-actions">
            <span class="unread-pill" *ngIf="unreadCount > 0">{{ unreadCount }} unread</span>
            <button class="button secondary" type="button" (click)="markAllAsRead()" [disabled]="loading || actionBusy || unreadCount <= 0">
              Mark all read
            </button>
            <button class="button secondary" type="button" (click)="clearRead()" [disabled]="loading || actionBusy || !notifications.length">
              Clear read
            </button>
          </div>
        </header>

        <div class="notification-state muted" *ngIf="loading">Loading notifications...</div>
        <p class="error notification-state" *ngIf="!loading && error">{{ error }}</p>

        <ul class="notification-list" *ngIf="!loading && !error && notifications.length">
          <li
            class="notification-item"
            *ngFor="let item of notifications"
            [class.unread]="!item.isRead"
            (click)="onNotificationClick(item)">
            <div class="notification-row">
              <p class="notification-title">{{ item.title || 'Notification' }}</p>
              <button
                type="button"
                class="item-delete"
                (click)="deleteNotification(item.notificationId, $event)"
                [disabled]="actionBusy"
                aria-label="Delete notification">
                Delete
              </button>
            </div>

            <p class="notification-message">{{ item.message }}</p>
            <div class="notification-meta">
              <span class="notification-badge" [class.read]="item.isRead">{{ item.isRead ? 'Read' : 'Unread' }}</span>
              <time class="notification-time">{{ formatNotificationDate(item.createdAt) }}</time>
            </div>
          </li>
        </ul>

        <div class="notification-state muted" *ngIf="!loading && !error && !notifications.length">
          No notifications yet
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .section-card {
        padding: 18px;
      }

      .notification-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      }

      .section-title {
        margin: 6px 0 4px;
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .unread-pill {
        display: inline-grid;
        place-items: center;
        border-radius: 999px;
        padding: 0.24rem 0.58rem;
        border: 1px solid #c7dcf7;
        background: #edf5ff;
        color: #1f4c80;
        font-size: 0.74rem;
        font-weight: 700;
      }

      .notification-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 10px;
      }

      .notification-item {
        border: 1px solid #dce8f7;
        border-radius: 12px;
        padding: 0.62rem 0.7rem;
        background: #fafdff;
        transition: background-color 120ms ease;
        cursor: pointer;
      }

      .notification-item.unread {
        border-color: #9ec5f3;
        background: #edf5ff;
      }

      .notification-item:hover {
        background: #eef6ff;
      }

      .notification-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .notification-title {
        margin: 0;
        font-size: 0.88rem;
        font-weight: 700;
        color: #1f3f65;
      }

      .item-delete {
        border: 1px solid #d4e5fa;
        background: #ffffff;
        color: #325a86;
        border-radius: 8px;
        padding: 0.24rem 0.48rem;
        font-size: 0.72rem;
        font-weight: 700;
        cursor: pointer;
      }

      .notification-message {
        margin: 0.3rem 0 0;
        font-size: 0.82rem;
        color: #405a79;
        line-height: 1.4;
      }

      .notification-meta {
        margin-top: 0.4rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .notification-badge {
        border-radius: 999px;
        padding: 0.16rem 0.5rem;
        border: 1px solid #9ec5f3;
        background: #e7f1ff;
        color: #1f4c80;
        font-size: 0.7rem;
        font-weight: 700;
      }

      .notification-badge.read {
        border-color: #d3dbe7;
        background: #f4f6f9;
        color: #556987;
      }

      .notification-time {
        color: #7288a4;
        font-size: 0.74rem;
      }

      .notification-state {
        padding: 0.6rem 0.1rem;
        margin: 0;
      }
    `
  ]
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