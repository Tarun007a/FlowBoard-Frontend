import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { NotificationService } from '../core/services/notification.service';

@Component({
  selector: 'app-notification-outlet',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-outlet.component.html',
  styleUrl: './notification-outlet.component.css'
})
export class NotificationOutletComponent {
  readonly notificationService = inject(NotificationService);
}
