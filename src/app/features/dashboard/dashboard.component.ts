import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStoreService } from '../../core/services/auth-store.service';
import { NotificationService } from '../../core/services/notification.service';
import { WorkspaceService } from '../../core/services/workspace.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private readonly authStore = inject(AuthStoreService);
  private readonly notificationService = inject(NotificationService);
  private readonly workspaceService = inject(WorkspaceService);

  // The currently logged-in user's session info
  session = this.authStore.snapshot();
  // null means "still loading", a number means loaded
  unreadCount: number | null = null;
  workspaceCount: number | null = null;

  ngOnInit(): void {
    // Restore session from localStorage/cookie
    this.session = this.authStore.restore();

    if (!this.session) return;

    // Load unread notification count
    this.notificationService.getUnreadCount().subscribe({
      next: (count) => (this.unreadCount = count),
      error: () => (this.unreadCount = null)
    });

    // Load total workspace count (we only fetch 1 item, just to get the total)
    this.workspaceService.getMyWorkspaces(0, 1).subscribe({
      next: (page) => (this.workspaceCount = page.totalNumberOfElements),
      error: () => (this.workspaceCount = null)
    });
  }
}
