import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, ElementRef, HostListener, NgZone, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterEvent, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { interval } from 'rxjs';
import { AuthStoreService } from '../core/services/auth-store.service';
import { AuthService } from '../core/services/auth.service';
import { NotificationService } from '../core/services/notification.service';
import { AuthSession, UserDto } from '../core/models/auth.models';
import { NotificationResponse } from '../core/models/notification.models';
import { CurrentUserProfileService } from '../core/services/current-user-profile.service';
import { SubscriptionService } from '../core/services/subscription.service';
import { isAdminRole } from '../core/utils/admin.utils';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css'
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
  // destroyRef auto-cleans up subscriptions when this component is destroyed
  private readonly destroyRef = inject(DestroyRef);

  // @ViewChild gives us a direct reference to a DOM element marked with #name in the template
  @ViewChild('notificationWrapper') private notificationWrapper?: ElementRef<HTMLElement>;
  @ViewChild('profileWrapper') private profileWrapper?: ElementRef<HTMLElement>;

  session: AuthSession | null = this.authStore.snapshot();
  profile: UserDto | null = null;
  unreadCount = 0;
  showNotificationsPanel = false;
  showProfileMenu = false;
  notifications: NotificationResponse[] = [];
  notificationsLoading = false;
  notificationsError = '';
  panelActionLoading = false;
  routeLoading = false;

  // Tracks which user's notifications are currently loaded (to avoid re-fetching unnecessarily)
  private notificationsLoadedForUserId: number | null = null;

  // Computed display values for the profile chip
  get displayName(): string {
    return this.profile?.fullName?.trim() || this.session?.email || 'My Profile';
  }

  get profileEmail(): string {
    return this.profile?.email?.trim() || this.session?.email || '';
  }

  get isAdmin(): boolean {
    return isAdminRole(this.session?.role);
  }

  // The first letter of the user's name, used as an avatar
  get avatarSeed(): string {
    const seed = this.profile?.fullName?.trim() || this.profileEmail || '';
    return seed.charAt(0).toUpperCase() || 'U';
  }

  ngOnInit(): void {
    this.authStore.restore();

    // Watch for session changes (login/logout) and update the UI accordingly
    this.authStore.session$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((session) => this.onSessionChanged(session));

    // Show a loading spinner during route navigation
    this.router.events
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => this.handleRouterEvent(event as RouterEvent));

    // Keep the profile chip up to date
    this.profileState.profile$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((profile) => { this.profile = profile; });

    // Poll for new notifications every 45 seconds
    interval(45000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (!this.session?.userId) return;
        this.refreshNotifications();
        if (this.showNotificationsPanel) this.loadNotifications(true);
      });
  }

  // @HostListener listens to events on the document (not just this component's element)
  // Pressing Escape closes any open panels
  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.closeNotificationsPanel();
    this.closeProfileMenu();
  }

  // Clicking anywhere outside the notification panel closes it
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.showNotificationsPanel) return;

    const target = event.target as Node | null;
    if (!target) return;

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

  closeNotificationsPanel(): void { this.showNotificationsPanel = false; }

  toggleProfileMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.showProfileMenu = !this.showProfileMenu;
  }

  closeProfileMenu(): void { this.showProfileMenu = false; }

  openMyProfile(): void {
    this.closeProfileMenu();
    this.router.navigate(['/profile']);
  }

  // Mark a single notification as read when clicked
  onNotificationClick(notification: NotificationResponse): void {
    if (notification.isRead) return;

    this.notificationService.markAsRead(notification.notificationId).subscribe({
      next: () => {
        this.notifications = this.notifications.map((item) =>
          item.notificationId === notification.notificationId ? { ...item, isRead: true } : item
        );
        this.refreshNotifications();
      },
      error: () => { /* Keep panel working even if mark-read fails */ }
    });
  }

  markAllNotificationsAsRead(): void {
    if (this.panelActionLoading || this.unreadCount <= 0) return;

    this.panelActionLoading = true;
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications = this.notifications.map((item) => ({ ...item, isRead: true }));
        this.unreadCount = 0;
        this.panelActionLoading = false;
      },
      error: () => { this.panelActionLoading = false; }
    });
  }

  clearReadNotifications(): void {
    if (this.panelActionLoading || !this.notifications.length) return;

    this.panelActionLoading = true;
    this.notificationService.clearReadNotifications().subscribe({
      next: () => {
        this.notifications = this.notifications.filter((item) => !item.isRead);
        this.panelActionLoading = false;
      },
      error: () => { this.panelActionLoading = false; }
    });
  }

  deleteNotificationFromPanel(notificationId: number, event: MouseEvent): void {
    // Stop the click from also triggering onNotificationClick()
    event.stopPropagation();
    if (this.panelActionLoading) return;

    this.panelActionLoading = true;
    const target = this.notifications.find((item) => item.notificationId === notificationId) ?? null;

    this.notificationService.deleteNotification(notificationId).subscribe({
      next: () => {
        this.notifications = this.notifications.filter((item) => item.notificationId !== notificationId);
        // Decrease unread count if the deleted notification was unread
        if (target && !target.isRead) this.unreadCount = Math.max(0, this.unreadCount - 1);
        this.panelActionLoading = false;
      },
      error: () => { this.panelActionLoading = false; }
    });
  }

  formatNotificationDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  }

  refreshNotifications(): void {
    if (!this.session?.userId) { this.unreadCount = 0; return; }
    this.notificationService.getUnreadCount().subscribe({
      next: (count) => (this.unreadCount = count),
      error: () => (this.unreadCount = 0)
    });
  }

  logout(): void {
    this.closeProfileMenu();
    this.profileState.clear();
    this.subscriptionService.clearCurrentSubscription();
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  private loadNotifications(force = false): void {
    const userId = this.session?.userId;
    if (!userId) { this.notifications = []; this.notificationsError = ''; this.notificationsLoading = false; return; }

    // Skip re-loading if we already have this user's notifications (unless forced)
    if (!force && this.notificationsLoadedForUserId === userId) return;

    this.notificationsLoading = true;
    this.notificationsError = '';

    this.notificationService.getMyNotifications(0, 20, 'notificationId', 'DESC').subscribe({
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

  // Handles route navigation events to show/hide the loading spinner
  private handleRouterEvent(event: RouterEvent): void {
    // zone.run() ensures Angular's change detection picks up the update
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

  // Called whenever the logged-in session changes (login or logout)
  private onSessionChanged(session: AuthSession | null): void {
    const previousUserId = this.session?.userId ?? null;
    this.session = session;

    if (!session) {
      // Reset everything on logout
      this.unreadCount = 0;
      this.notifications = [];
      this.notificationsError = '';
      this.notificationsLoading = false;
      this.panelActionLoading = false;
      this.notificationsLoadedForUserId = null;
      return;
    }

    // Reload user-specific data when switching accounts
    const shouldReload = previousUserId !== session.userId || this.profile?.userId !== session.userId;
    if (!shouldReload) return;

    this.notificationsLoadedForUserId = null;
    this.profileState.loadProfile(true).subscribe({ error: () => {} });
    this.refreshNotifications();
    if (this.showNotificationsPanel) this.loadNotifications(true);
  }
}
