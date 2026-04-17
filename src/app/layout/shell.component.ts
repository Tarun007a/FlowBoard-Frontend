import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, ElementRef, HostListener, NgZone, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterEvent, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStoreService } from '../core/services/auth-store.service';
import { AuthService } from '../core/services/auth.service';
import { NotificationService } from '../core/services/notification.service';
import { AuthSession, UserDto } from '../core/models/auth.models';
import { NotificationResponse } from '../core/models/notification.models';
import { CurrentUserProfileService } from '../core/services/current-user-profile.service';
import { SubscriptionService } from '../core/services/subscription.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="app-shell">
      <header class="top-nav">
        <div class="top-nav-inner">
          <a class="brand" routerLink="/workspaces">
            <span class="brand-mark">F</span>
            <span class="brand-name">FlowBoard</span>
          </a>

          <nav class="top-links">
            <a routerLink="/workspaces" routerLinkActive="active">Workspaces</a>
            <a routerLink="/subscription/plans" routerLinkActive="active">Subscription</a>
            <a routerLink="/subscription/my" routerLinkActive="active">My Plan</a>
          </nav>

          <div class="top-actions" *ngIf="session">
            <div class="notification-wrapper" #notificationWrapper>
              <button
                type="button"
                class="icon-button"
                (click)="toggleNotificationsPanel($event)"
                [attr.aria-expanded]="showNotificationsPanel"
                aria-label="Open notifications">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 01-3.46 0" />
                </svg>
                <span class="count-pill" *ngIf="unreadCount !== null">{{ unreadCount }}</span>
              </button>

              <section class="notification-panel" *ngIf="showNotificationsPanel" (click)="$event.stopPropagation()">
                <header class="notification-head">
                  <h3>Notifications</h3>
                  <button type="button" class="panel-refresh" (click)="refreshNotificationPanel()">Refresh</button>
                </header>

                <div class="notification-state muted" *ngIf="notificationsLoading">Loading notifications...</div>
                <p class="error notification-state" *ngIf="!notificationsLoading && notificationsError">{{ notificationsError }}</p>

                <ul class="notification-list" *ngIf="!notificationsLoading && !notificationsError && notifications.length">
                  <li
                    class="notification-item"
                    *ngFor="let item of notifications"
                    [class.unread]="!item.isRead"
                    (click)="onNotificationClick(item)">
                    <p class="notification-title">{{ item.title || 'Notification' }}</p>
                    <p class="notification-message">{{ item.message }}</p>
                    <time class="notification-time">{{ formatNotificationDate(item.createdAt) }}</time>
                  </li>
                </ul>

                <div class="notification-state muted" *ngIf="!notificationsLoading && !notificationsError && !notifications.length">
                  No notifications yet
                </div>
              </section>
            </div>

            <div class="profile-wrapper" #profileWrapper>
              <button
                type="button"
                class="profile-chip profile-button"
                (click)="toggleProfileMenu($event)"
                [attr.aria-expanded]="showProfileMenu"
                aria-label="Open profile menu"
                title="Open profile menu">
                <span class="profile-avatar">{{ avatarSeed }}</span>
                <span class="profile-meta">
                  <strong class="profile-name">{{ displayName }}</strong>
                  <span class="profile-email">{{ profileEmail }}</span>
                </span>
              </button>

              <section class="profile-menu" *ngIf="showProfileMenu" (click)="$event.stopPropagation()">
                <button type="button" class="profile-menu-item" (click)="openMyProfile()">My Profile</button>
                <button type="button" class="profile-menu-item danger" (click)="logout()">Logout</button>
              </section>
            </div>
          </div>
        </div>
      </header>

      <div class="page-frame">
        <main class="content-panel">
          <router-outlet />
        </main>
      </div>

      <div class="route-loading-overlay" *ngIf="routeLoading" aria-live="polite" aria-label="Loading next page">
        <div class="route-spinner"></div>
      </div>
    </div>
  `,
  styles: [
    `
      @media (max-width: 960px) {
        .top-nav-inner {
          padding: 0.7rem 1rem;
        }
        .top-nav-inner,
        .top-links,
        .top-actions {
          flex-wrap: wrap;
        }
        .top-actions {
          width: 100%;
          justify-content: flex-end;
        }
        .profile-email {
          max-width: 160px;
        }
      }

      .top-nav {
        position: sticky;
        top: 0;
        z-index: 50;
        border-bottom: 1px solid #c7dbf3;
        background: linear-gradient(120deg, #1f78d8, #4ea2ef);
        backdrop-filter: blur(8px);
      }

      .top-nav-inner {
        width: min(1320px, calc(100% - 24px));
        margin: 0 auto;
        min-height: 64px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.85rem;
      }

      .brand {
        display: inline-flex;
        align-items: center;
        gap: 0.55rem;
        color: #ffffff;
      }

      .brand-mark {
        width: 34px;
        height: 34px;
        border-radius: 10px;
        display: grid;
        place-items: center;
        background: rgba(255, 255, 255, 0.22);
        font-weight: 800;
      }

      .brand-name {
        font-family: 'Sora', 'Space Grotesk', 'Segoe UI', sans-serif;
        font-size: 1.1rem;
        letter-spacing: 0.01em;
        font-weight: 700;
      }

      .top-links {
        display: flex;
        gap: 0.4rem;
      }

      .top-links a {
        color: rgba(255, 255, 255, 0.82);
        padding: 0.45rem 0.7rem;
        border-radius: 10px;
        font-weight: 600;
      }

      .top-links a.active {
        color: #ffffff;
        background: rgba(255, 255, 255, 0.18);
      }

      .top-actions {
        display: flex;
        align-items: center;
        gap: 0.55rem;
      }

      .profile-wrapper {
        position: relative;
      }

      .notification-wrapper {
        position: relative;
      }

      .icon-button {
        border: 0;
        width: 40px;
        height: 40px;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.2);
        color: #ffffff;
        display: grid;
        place-items: center;
        position: relative;
        cursor: pointer;
      }

      .icon-button:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      .icon-button svg {
        width: 19px;
        height: 19px;
      }

      .count-pill {
        position: absolute;
        top: -4px;
        right: -4px;
        min-width: 18px;
        height: 18px;
        border-radius: 999px;
        display: inline-grid;
        place-items: center;
        padding: 0 4px;
        background: #e9f2ff;
        color: #0f4b8e;
        font-size: 0.68rem;
        font-weight: 800;
      }

      .notification-panel {
        position: absolute;
        top: calc(100% + 10px);
        right: 0;
        width: min(360px, calc(100vw - 24px));
        max-height: min(68vh, 520px);
        overflow-y: auto;
        border-radius: 14px;
        border: 1px solid #cfdff4;
        background: #ffffff;
        box-shadow: 0 18px 35px rgba(30, 74, 135, 0.2);
        padding: 0.72rem;
        color: #1d2a3a;
        animation: panelIn 140ms ease;
        z-index: 70;
      }

      .notification-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        padding: 0.2rem 0.1rem 0.55rem;
      }

      .notification-head h3 {
        margin: 0;
        font-size: 0.96rem;
        color: #1f3c5f;
      }

      .panel-refresh {
        border: 1px solid #c9dbf4;
        background: #edf5ff;
        color: #315985;
        border-radius: 8px;
        padding: 0.3rem 0.55rem;
        font-size: 0.76rem;
        font-weight: 700;
        cursor: pointer;
      }

      .panel-refresh:hover {
        background: #e2efff;
      }

      .notification-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 0.45rem;
      }

      .notification-item {
        border: 1px solid #dce8f7;
        border-radius: 12px;
        padding: 0.55rem 0.62rem;
        cursor: pointer;
        background: #fafdff;
      }

      .notification-item.unread {
        border-color: #9ec5f3;
        background: #edf5ff;
      }

      .notification-item:hover {
        background: #eef6ff;
      }

      .notification-title {
        margin: 0;
        font-size: 0.82rem;
        font-weight: 700;
        color: #1f3f65;
      }

      .notification-message {
        margin: 0.24rem 0 0;
        font-size: 0.8rem;
        color: #405a79;
        line-height: 1.38;
      }

      .notification-time {
        display: block;
        margin-top: 0.34rem;
        color: #7288a4;
        font-size: 0.74rem;
      }

      .notification-state {
        padding: 0.62rem 0.28rem;
        margin: 0;
      }

      @keyframes panelIn {
        from {
          opacity: 0;
          transform: translateY(4px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .profile-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        max-width: 280px;
        border: 1px solid rgba(255, 255, 255, 0.24);
        background: rgba(255, 255, 255, 0.12);
        border-radius: 999px;
        padding: 0.24rem 0.65rem 0.24rem 0.28rem;
        color: #ffffff;
      }

      .profile-button {
        border: 0;
        cursor: pointer;
        text-align: left;
      }

      .profile-avatar {
        width: 26px;
        height: 26px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        background: #d9ecff;
        color: #0e4e91;
        font-weight: 800;
        font-size: 0.75rem;
      }

      .profile-email {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 0.72rem;
        opacity: 0.92;
      }

      .profile-meta {
        display: grid;
        min-width: 0;
      }

      .profile-menu {
        position: absolute;
        top: calc(100% + 10px);
        right: 0;
        min-width: 190px;
        display: grid;
        padding: 6px;
        border-radius: 12px;
        border: 1px solid #d1e1f4;
        background: #ffffff;
      }

      .profile-menu-item {
        border: 0;
        border-radius: 8px;
        background: #ffffff;
        color: #1f3c5f;
        text-align: left;
        font-size: 0.82rem;
        font-weight: 600;
        padding: 0.48rem 0.56rem;
        cursor: pointer;
      }

      .profile-menu-item.danger {
        color: #a1261a;
      }

      .page-frame {
        width: min(1320px, calc(100% - 24px));
        margin: 0 auto;
        padding: 16px 0 24px;
      }

      .content-panel {
        min-width: 0;
      }

      .route-loading-overlay {
        position: fixed;
        inset: 0;
        z-index: 120;
        background: rgba(232, 242, 255, 0.46);
        display: grid;
        place-items: center;
        backdrop-filter: blur(1px);
      }

      .route-spinner {
        width: 44px;
        height: 44px;
        border-radius: 999px;
        border: 4px solid #cde2fb;
        border-top-color: #2b7edb;
        animation: routeSpin 700ms linear infinite;
      }

      @keyframes routeSpin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
    `
  ]
})
export class ShellComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly authStore = inject(AuthStoreService);
  private readonly profileState = inject(CurrentUserProfileService);
  private readonly notificationService = inject(NotificationService);
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  @ViewChild('notificationWrapper') private notificationWrapper?: ElementRef<HTMLElement>;
  @ViewChild('profileWrapper') private profileWrapper?: ElementRef<HTMLElement>;

  session: AuthSession | null = this.authStore.snapshot();
  profile: UserDto | null = null;
  unreadCount: number | null = null;
  showNotificationsPanel = false;
  showProfileMenu = false;
  notifications: NotificationResponse[] = [];
  notificationsLoading = false;
  notificationsError = '';
  routeLoading = false;
  private notificationsLoadedForUserId: number | null = null;

  get displayName(): string {
    return this.profile?.fullName?.trim() || this.session?.email || 'My Profile';
  }

  get profileEmail(): string {
    return this.profile?.email?.trim() || this.session?.email || '';
  }

  get avatarSeed(): string {
    const seed = this.profile?.fullName?.trim() || this.profileEmail || '';
    return seed.charAt(0).toUpperCase() || 'U';
  }

  ngOnInit(): void {
    this.session = this.authStore.restore();

    this.router.events
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => this.handleRouterEvent(event as RouterEvent));

    this.profileState.profile$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((profile) => {
        this.profile = profile;
      });

    this.profileState.loadProfile().subscribe({
      error: () => {
        // Keep navbar usable even if profile fetch fails.
      }
    });

    this.refreshNotifications();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.closeNotificationsPanel();
    this.closeProfileMenu();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.showNotificationsPanel) {
      return;
    }

    const target = event.target as Node | null;
    if (!target) {
      return;
    }

    if (!this.notificationWrapper?.nativeElement.contains(target)) {
      this.closeNotificationsPanel();
    }

    if (this.showProfileMenu && !this.profileWrapper?.nativeElement.contains(target)) {
      this.closeProfileMenu();
    }
  }

  toggleNotificationsPanel(event: MouseEvent): void {
    event.stopPropagation();
    this.showNotificationsPanel = !this.showNotificationsPanel;

    if (this.showNotificationsPanel) {
      this.loadNotifications();
      this.refreshNotifications();
    }
  }

  closeNotificationsPanel(): void {
    this.showNotificationsPanel = false;
  }

  toggleProfileMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.showProfileMenu = !this.showProfileMenu;
  }

  closeProfileMenu(): void {
    this.showProfileMenu = false;
  }

  openMyProfile(): void {
    this.closeProfileMenu();
    this.router.navigate(['/profile']);
  }

  refreshNotificationPanel(): void {
    this.loadNotifications(true);
    this.refreshNotifications();
  }

  onNotificationClick(notification: NotificationResponse): void {
    if (notification.isRead) {
      return;
    }

    this.notificationService.markRead(notification.notificationId).subscribe({
      next: () => {
        this.notifications = this.notifications.map((item) =>
          item.notificationId === notification.notificationId
            ? { ...item, isRead: true }
            : item
        );
        this.refreshNotifications();
      },
      error: () => {
        // Keep panel interaction non-blocking if mark-read fails.
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

  refreshNotifications(): void {
    const userId = this.session?.userId;
    if (!userId) {
      this.unreadCount = null;
      return;
    }

    this.notificationService.unreadCount(userId).subscribe({
      next: (count) => (this.unreadCount = count),
      error: () => (this.unreadCount = null)
    });
  }

  private loadNotifications(force = false): void {
    const userId = this.session?.userId;
    if (!userId) {
      this.notifications = [];
      this.notificationsError = '';
      this.notificationsLoading = false;
      return;
    }

    if (!force && this.notificationsLoadedForUserId === userId) {
      return;
    }

    this.notificationsLoading = true;
    this.notificationsError = '';

    this.notificationService.getByRecipient(userId, 0, 20, 'createdAt', 'DESC').subscribe({
      next: (page) => {
        this.notifications = page.content;
        this.notificationsLoadedForUserId = userId;
        this.notificationsLoading = false;
      },
      error: () => {
        this.notifications = [];
        this.notificationsError = 'Failed to load notifications.';
        this.notificationsLoading = false;
      }
    });
  }

  logout(): void {
    this.closeProfileMenu();
    this.profileState.clear();
    this.subscriptionService.clearCurrentSubscription();
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  private handleRouterEvent(event: RouterEvent): void {
    this.zone.run(() => {
      if (event instanceof NavigationStart) {
        this.routeLoading = true;
        this.cdr.detectChanges();
        return;
      }

      if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
        this.routeLoading = false;
        this.cdr.detectChanges();
      }
    });
  }
}
