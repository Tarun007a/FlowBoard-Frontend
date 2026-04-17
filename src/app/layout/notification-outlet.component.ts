import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { NotificationService } from '../core/services/notification.service';

@Component({
  selector: 'app-notification-outlet',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-container *ngIf="notificationService.uiNotification$ | async as notice">
      <div class="app-toast" [class.success]="notice.type === 'success'" [class.error]="notice.type === 'error'" [class.info]="notice.type === 'info'">
        {{ notice.message }}
      </div>
    </ng-container>
  `,
  styles: [
    `
      .app-toast {
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 200;
        max-width: min(420px, calc(100vw - 32px));
        border-radius: 10px;
        padding: 0.72rem 0.88rem;
        color: #ffffff;
        font-weight: 600;
        box-shadow: 0 14px 32px rgba(15, 23, 42, 0.3);
        animation: toastIn 180ms ease;
      }

      .app-toast.success {
        background: #166534;
      }

      .app-toast.error {
        background: #b42318;
      }

      .app-toast.info {
        background: #1d4ed8;
      }

      @keyframes toastIn {
        from {
          opacity: 0;
          transform: translateY(8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `
  ]
})
export class NotificationOutletComponent {
  readonly notificationService = inject(NotificationService);
}
