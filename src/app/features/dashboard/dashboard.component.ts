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
  template: `
    <div class="stack dashboard-stack">
      <section class="hero panel">
        <div class="badge">Flowboard</div>
        <h1>One clear flow from workspace to card</h1>
        <p class="muted">Start with workspaces, then move through members, boards, and cards with one responsibility per route.</p>
        <div class="actions">
          <a class="button accent" routerLink="/workspaces">Start with workspaces</a>
        </div>
      </section>

      <section class="panel section-card metrics">
        <article class="metric-item">
          <span class="muted">Signed in</span>
          <strong>{{ session?.email || '-' }}</strong>
        </article>
        <article class="metric-item">
          <span class="muted">My workspaces</span>
          <strong>{{ workspaceCount ?? '-' }}</strong>
        </article>
        <article class="metric-item">
          <span class="muted">Unread notifications</span>
          <strong>{{ unreadCount ?? '-' }}</strong>
        </article>
      </section>

      <section class="panel section-card">
        <h2 class="section-title">Progressive steps</h2>
        <div class="step-grid">
          <a class="step" routerLink="/workspaces">
            <span class="step-no">01</span>
            <h3>Workspaces</h3>
            <p class="muted">Create and browse workspaces.</p>
          </a>
          <article class="step disabled">
            <span class="step-no">02</span>
            <h3>Members</h3>
            <p class="muted">Open any workspace to manage members.</p>
          </article>
          <article class="step disabled">
            <span class="step-no">03</span>
            <h3>Boards</h3>
            <p class="muted">Create boards inside the workspace.</p>
          </article>
          <article class="step disabled">
            <span class="step-no">04</span>
            <h3>Lists and cards</h3>
            <p class="muted">Organize execution on the board canvas.</p>
          </article>
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .dashboard-stack { gap: 16px; }
      .section-card { padding: 20px; }
      .metrics {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }
      .metric-item {
        display: grid;
        gap: 8px;
        border: 1px solid #dbe3ef;
        border-radius: 12px;
        padding: 14px;
        background: #fdfefe;
      }
      .metric-item strong {
        font-size: 1.05rem;
        color: #1f2a44;
      }
      .step-grid {
        margin-top: 12px;
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
      }
      .step {
        display: grid;
        gap: 8px;
        border: 1px solid #dbe3ef;
        border-radius: 12px;
        padding: 14px;
        background: #ffffff;
      }
      .step-no {
        display: inline-flex;
        width: fit-content;
        padding: 0.2rem 0.45rem;
        border-radius: 6px;
        background: #edf3ff;
        color: #1d4ed8;
        font-size: 0.78rem;
        font-weight: 700;
      }
      .step h3 {
        margin: 0;
        color: #1f2a44;
        font-size: 1rem;
      }
      .step p {
        margin: 0;
      }
      .step.disabled {
        opacity: 0.75;
      }
      @media (max-width: 1100px) {
        .metrics,
        .step-grid {
          grid-template-columns: 1fr;
        }
      }
    `
  ]
})
export class DashboardComponent implements OnInit {
  private readonly authStore = inject(AuthStoreService);
  private readonly notificationService = inject(NotificationService);
  private readonly workspaceService = inject(WorkspaceService);

  session = this.authStore.snapshot();
  unreadCount: number | null = null;
  workspaceCount: number | null = null;

  ngOnInit(): void {
    this.session = this.authStore.restore();

    if (!this.session) {
      return;
    }

    this.notificationService.getUnreadCount().subscribe({
      next: (count) => (this.unreadCount = count),
      error: () => (this.unreadCount = null)
    });

    this.workspaceService.getMyWorkspaces(0, 1).subscribe({
      next: (page) => (this.workspaceCount = page.totalNumberOfElements),
      error: () => (this.workspaceCount = null)
    });
  }
}
