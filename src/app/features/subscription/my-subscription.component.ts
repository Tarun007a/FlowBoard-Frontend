import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { SubscriptionResponseDto } from '../../core/models/subscription.models';
import { NotificationService } from '../../core/services/notification.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { readErrorMessage } from '../../core/utils/error.utils';

@Component({
  selector: 'app-my-subscription-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './my-subscription.component.html',
  styleUrl: './my-subscription.component.css'
})
export class MySubscriptionComponent implements OnInit {
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  loading = false;
  error = '';
  noActiveSubscription = false;
  subscription: SubscriptionResponseDto | null = null;

  ngOnInit(): void {
    this.subscriptionService.currentSubscription$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((subscription) => {
        if (subscription) {
          this.subscription = subscription;
          this.noActiveSubscription = false;
        }
      });

    this.loadMySubscription();
  }

  loadMySubscription(): void {
    this.loading = true;
    this.error = '';

    this.subscriptionService.loadMySubscription().subscribe({
      next: (subscription) => {
        this.subscription = subscription;
        this.noActiveSubscription = false;
        this.loading = false;
        this.notify.info('Subscription loaded');
      },
      error: (err) => {
        const message = readErrorMessage(err);
        const status = Number((err as { status?: unknown }).status ?? 0);

        this.subscription = null;
        this.loading = false;

        if (status === 400 && message.toLowerCase().includes('user not found')) {
          this.noActiveSubscription = true;
          this.notify.info('No active plan');
          return;
        }

        this.error = message || 'Failed to load subscription';
        this.notify.error(this.error);
      }
    });
  }

  daysRemaining(): number | null {
    if (!this.subscription?.expiryDate) {
      return null;
    }

    const expiryDate = new Date(this.subscription.expiryDate);
    if (Number.isNaN(expiryDate.getTime())) {
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);

    const diffMs = expiry.getTime() - today.getTime();
    return Math.ceil(diffMs / 86400000);
  }

  renewalInfo(): string {
    const remaining = this.daysRemaining();

    if (remaining === null) {
      return 'Renewal data unavailable';
    }

    if (remaining < 0) {
      return 'Subscription expired';
    }

    if (remaining <= 7) {
      return 'Renewal due soon';
    }

    return 'Subscription active';
  }

  statusClass(status: string): 'active' | 'inactive' {
    return status.toLowerCase() === 'active' ? 'active' : 'inactive';
  }
}