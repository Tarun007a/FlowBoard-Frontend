import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NotificationResponse } from '../../core/models/notification.models';
import { NotificationService } from '../../core/services/notification.service';
import { readErrorMessage, splitCsvNumbers } from '../../core/utils/error.utils';
import { NotificationType, RelatedType } from '../../core/models/notification.models';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="stack">
      <section class="hero">
        <div class="badge">Notification APIs</div>
        <h1>Dispatch and read notifications</h1>
        <p class="muted">This page exercises single send, bulk send, read flags, unread counts, and cleanup endpoints.</p>
      </section>

      <section class="grid cols-2">
        <div class="panel section-card stack">
          <h2 class="section-title">Single notification</h2>
          <form class="stack" [formGroup]="singleForm" (ngSubmit)="sendSingle()">
            <div class="grid cols-2">
              <div class="field"><label>Recipient ID</label><input type="number" formControlName="recipientId" /></div>
              <div class="field"><label>Actor ID</label><input type="number" formControlName="actorId" /></div>
              <div class="field"><label>Type</label><select formControlName="notificationType"><option *ngFor="let item of notificationTypes" [ngValue]="item">{{ item }}</option></select></div>
              <div class="field"><label>Related ID</label><input type="number" formControlName="relatedId" /></div>
              <div class="field"><label>Related type</label><select formControlName="relatedType"><option *ngFor="let item of relatedTypes" [ngValue]="item">{{ item }}</option></select></div>
              <div class="field"><label>Title</label><input type="text" formControlName="title" /></div>
              <div class="field"><label>Message</label><textarea formControlName="message"></textarea></div>
            </div>
            <div class="actions">
              <button class="button accent" type="submit">Send</button>
              <button class="button secondary" type="button" (click)="loadRecipient()">Load recipient</button>
              <button class="button secondary" type="button" (click)="markRead()">Mark read</button>
              <button class="button secondary" type="button" (click)="markAllRead()">Mark all read</button>
              <button class="button secondary" type="button" (click)="deleteRead()">Delete read</button>
            </div>
          </form>
        </div>

        <div class="panel section-card stack">
          <h2 class="section-title">Bulk send</h2>
          <form class="stack" [formGroup]="bulkForm" (ngSubmit)="sendBulk()">
            <div class="grid cols-2">
              <div class="field"><label>Recipient IDs comma separated</label><textarea formControlName="recipientIds"></textarea></div>
              <div class="field"><label>Actor ID</label><input type="number" formControlName="actorId" /></div>
              <div class="field"><label>Type</label><select formControlName="notificationType"><option *ngFor="let item of notificationTypes" [ngValue]="item">{{ item }}</option></select></div>
              <div class="field"><label>Related ID</label><input type="number" formControlName="relatedId" /></div>
              <div class="field"><label>Related type</label><select formControlName="relatedType"><option *ngFor="let item of relatedTypes" [ngValue]="item">{{ item }}</option></select></div>
              <div class="field"><label>Title</label><input type="text" formControlName="title" /></div>
              <div class="field"><label>Message</label><textarea formControlName="message"></textarea></div>
            </div>
            <div class="actions"><button class="button accent" type="submit">Send bulk</button></div>
          </form>
          <div class="grid cols-2">
            <div class="field"><label>Recipient ID</label><input type="number" [formControl]="recipientId" /></div>
            <div class="field"><label>Notification ID</label><input type="number" [formControl]="notificationId" /></div>
            <div class="field"><label>Page</label><input type="number" [formControl]="page" /></div>
            <div class="field"><label>Size</label><input type="number" [formControl]="size" /></div>
          </div>
        </div>
      </section>

      <section class="panel section-card stack">
        <p class="error" *ngIf="error">{{ error }}</p>
        <p class="success" *ngIf="message">{{ message }}</p>
        <div class="muted" *ngIf="unreadCount !== null">Unread: {{ unreadCount }}</div>

        <table class="table" *ngIf="notifications.length">
          <thead><tr><th>ID</th><th>Recipient</th><th>Title</th><th>Type</th><th>Related</th><th>Read</th></tr></thead>
          <tbody>
            <tr *ngFor="let item of notifications">
              <td>{{ item.notificationId }}</td>
              <td>{{ item.recipientId }}</td>
              <td>{{ item.title }}</td>
              <td>{{ item.notificationType }}</td>
              <td>{{ item.relatedType }}:{{ item.relatedId }}</td>
              <td>{{ item.isRead ? 'Yes' : 'No' }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  `,
  styles: [` .section-card { padding: 18px; } `]
})
export class NotificationsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly notificationService = inject(NotificationService);

  error = '';
  message = '';
  notifications: NotificationResponse[] = [];
  unreadCount: number | null = null;
  notificationTypes: NotificationType[] = ['ASSIGNMENT', 'MENTION', 'DUE_DATE', 'COMMENT', 'MOVE', 'SYSTEM', 'BROADCAST'];
  relatedTypes: RelatedType[] = ['CARD', 'BOARD', 'COMMENT', 'WORKSPACE', 'USER'];

  singleForm = this.fb.nonNullable.group({
    recipientId: [null as number | null, [Validators.required]],
    actorId: [null as number | null, [Validators.required]],
    notificationType: ['COMMENT' as NotificationType, [Validators.required]],
    title: ['', [Validators.required]],
    message: ['', [Validators.required]],
    relatedId: [null as number | null, [Validators.required]],
    relatedType: ['CARD' as RelatedType, [Validators.required]]
  });

  bulkForm = this.fb.nonNullable.group({
    recipientIds: ['', [Validators.required]],
    actorId: [null as number | null, [Validators.required]],
    notificationType: ['COMMENT' as NotificationType, [Validators.required]],
    title: ['', [Validators.required]],
    message: ['', [Validators.required]],
    relatedId: [null as number | null, [Validators.required]],
    relatedType: ['CARD' as RelatedType, [Validators.required]]
  });

  recipientId = this.fb.nonNullable.control<number | null>(null);
  notificationId = this.fb.nonNullable.control<number | null>(null);
  page = this.fb.nonNullable.control(0);
  size = this.fb.nonNullable.control(10);

  sendSingle(): void {
    if (this.singleForm.invalid) {
      this.singleForm.markAllAsTouched();
      return;
    }

    const value = this.singleForm.getRawValue();
    this.notificationService.send({
      recipientId: value.recipientId as number,
      actorId: value.actorId as number,
      notificationType: value.notificationType,
      title: value.title,
      message: value.message,
      relatedId: value.relatedId as number,
      relatedType: value.relatedType
    }).subscribe({ next: (notification) => this.notifications = [notification, ...this.notifications], error: (err) => this.error = readErrorMessage(err) });
  }

  sendBulk(): void {
    if (this.bulkForm.invalid) {
      this.bulkForm.markAllAsTouched();
      return;
    }

    const value = this.bulkForm.getRawValue();
    const recipientIds = splitCsvNumbers(value.recipientIds);
    this.notificationService.sendBulk({
      recipientIds,
      actorId: value.actorId as number,
      notificationType: value.notificationType,
      title: value.title,
      message: value.message,
      relatedId: value.relatedId as number,
      relatedType: value.relatedType
    }).subscribe({ next: (items) => this.notifications = items, error: (err) => this.error = readErrorMessage(err) });
  }

  loadRecipient(): void {
    const recipientId = this.recipientId.value || this.singleForm.controls.recipientId.value;
    if (!recipientId) {
      this.error = 'Recipient id is required';
      return;
    }
    this.notificationService.getByRecipient(recipientId, this.page.value, this.size.value).subscribe({ next: (page) => this.notifications = page.content, error: (err) => this.error = readErrorMessage(err) });
    this.notificationService.unreadCount(recipientId).subscribe({ next: (count) => this.unreadCount = count, error: () => this.unreadCount = null });
  }

  markRead(): void {
    const notificationId = this.notificationId.value;
    if (!notificationId) {
      this.error = 'Notification id is required';
      return;
    }
    this.notificationService.markRead(notificationId).subscribe({ next: (message) => this.message = message, error: (err) => this.error = readErrorMessage(err) });
  }

  markAllRead(): void {
    const recipientId = this.recipientId.value || this.singleForm.controls.recipientId.value;
    if (!recipientId) {
      this.error = 'Recipient id is required';
      return;
    }
    this.notificationService.markAllRead(recipientId).subscribe({ next: (message) => this.message = message, error: (err) => this.error = readErrorMessage(err) });
  }

  deleteRead(): void {
    const recipientId = this.recipientId.value || this.singleForm.controls.recipientId.value;
    if (!recipientId) {
      this.error = 'Recipient id is required';
      return;
    }
    this.notificationService.deleteRead(recipientId).subscribe({ next: (message) => this.message = message, error: (err) => this.error = readErrorMessage(err) });
  }
}