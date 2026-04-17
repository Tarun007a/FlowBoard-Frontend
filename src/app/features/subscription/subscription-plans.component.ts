import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  SubscriptionPlan,
  SubscriptionPlanResponseDto
} from '../../core/models/subscription.models';
import { NotificationService } from '../../core/services/notification.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { readErrorMessage } from '../../core/utils/error.utils';

declare const Razorpay: any;

interface PlanCardView {
  plan: SubscriptionPlan | null;
  name: string;
  durationDays: number;
  price: number;
  isRecommended: boolean;
  details: SubscriptionPlanResponseDto;
}

@Component({
  selector: 'app-subscription-plans-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './subscription-plans.component.html',
  styleUrl: './subscription-plans.component.css'
})
export class SubscriptionPlansComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly notify = inject(NotificationService);

  loading = false;
  buying = false;
  error = '';
  plans: PlanCardView[] = [];

  ngOnInit(): void {
    this.loadPlans();
  }

  loadPlans(): void {
    this.loading = true;
    this.error = '';

    this.subscriptionService.getPlanDetails().subscribe({
      next: (items) => {
        this.plans = [...items]
          .sort((left, right) => left.price - right.price)
          .map((item) => this.toPlanCard(item));
        this.loading = false;
      },
      error: (err) => {
        const message = readErrorMessage(err);
        this.error = message;
        this.loading = false;
        this.notify.error(message || 'Failed to load plans');
      }
    });
  }

  payNow(plan: SubscriptionPlan | null): void {
    if (this.buying || !plan) return;

    this.buying = true;

    this.subscriptionService.buySubscription({ plan }).subscribe({
      next: (order) => {
        this.buying = false;

        if (!order?.orderId || !order?.keyId || !order?.amount || !order?.currency) {
          this.notify.error('Payment order response is incomplete. Please try again.');
          return;
        }

        if (typeof Razorpay === 'undefined') {
          this.notify.error('Payment gateway is unavailable. Please refresh and try again.');
          return;
        }

        const options = {
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          order_id: order.orderId,
          name: 'FlowBoard',
          description: `${plan} Plan`,
          handler: (response: any) => {
            this.subscriptionService.verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              plan
            }).subscribe({
              next: () => {
                this.notify.success('Subscription activated!');
                this.router.navigate(['/subscription/my']);
              },
              error: (err) => this.notify.error(readErrorMessage(err))
            });
          },
          prefill: { name: '', email: '', contact: '' },
          theme: { color: '#6366f1' }
        };

        const rzp = new Razorpay(options);
        rzp.on('payment.failed', (response: any) => {
          this.notify.error('Payment failed: ' + response.error.description);
        });
        rzp.open();
      },
      error: (err) => {
        this.buying = false;
        this.notify.error(readErrorMessage(err) || 'Failed to create order');
      }
    });
  }

  pricePerMonth(plan: PlanCardView): string {
    const monthly = Math.ceil((plan.price / plan.durationDays) * 30);
    return `~INR ${monthly}/month`;
  }

  private toPlanCard(details: SubscriptionPlanResponseDto): PlanCardView {
    const plan = this.resolvePlan(details);
    return {
      plan,
      name: this.displayPlanName(plan, details),
      durationDays: details.durationDays,
      price: details.price,
      isRecommended: plan === 'PRO',
      details
    };
  }

  private resolvePlan(details: SubscriptionPlanResponseDto): SubscriptionPlan | null {
    if (details.durationDays === 30 && details.price === 199) {
      return 'BASIC';
    }

    if (details.durationDays === 90 && details.price === 499) {
      return 'PRO';
    }

    if (details.durationDays === 365 && details.price === 999) {
      return 'PREMIUM';
    }

    return null;
  }

  private displayPlanName(plan: SubscriptionPlan | null, details: SubscriptionPlanResponseDto): string {
    if (plan) {
      return plan;
    }

    return `${details.durationDays} Day Plan`;
  }
}