import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map, of, tap } from 'rxjs';
import {
  PaymentVerificationDto,
  RazorPayResponseDto,
  SubscriptionPlanResponseDto,
  SubscriptionRequestDto,
  SubscriptionResponseDto
} from '../models/subscription.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly currentSubscriptionSubject = new BehaviorSubject<SubscriptionResponseDto | null>(null);
  readonly currentSubscription$ = this.currentSubscriptionSubject.asObservable();

  constructor(private readonly api: ApiService) {}

  getCurrentSnapshot(): SubscriptionResponseDto | null {
    return this.currentSubscriptionSubject.value;
  }

  hasActiveSubscription(): Observable<boolean> {
    const snapshot = this.getCurrentSnapshot();

    if (snapshot) {
      return of(this.isActiveSubscription(snapshot));
    }

    return this.loadMySubscription().pipe(map((subscription) => this.isActiveSubscription(subscription)));
  }

  getPlanDetails(): Observable<SubscriptionPlanResponseDto[]> {
    return this.api.get<SubscriptionPlanResponseDto[]>('/api/v1/subscriptions/details');
  }

  buySubscription(request: SubscriptionRequestDto): Observable<RazorPayResponseDto> {
    return this.api.post<RazorPayResponseDto>('/api/v1/subscriptions/buy', request);
  }

  verifyPayment(dto: PaymentVerificationDto): Observable<SubscriptionResponseDto> {
    return this.api
      .post<SubscriptionResponseDto>('/api/v1/subscriptions/verify', dto)
      .pipe(tap((subscription) => this.currentSubscriptionSubject.next(subscription)));
  }

  loadMySubscription(): Observable<SubscriptionResponseDto> {
    return this.api
      .get<SubscriptionResponseDto>('/api/v1/subscriptions/my')
      .pipe(tap((subscription) => this.currentSubscriptionSubject.next(subscription)));
  }

  clearCurrentSubscription(): void {
    this.currentSubscriptionSubject.next(null);
  }

  private isActiveSubscription(subscription: SubscriptionResponseDto): boolean {
    if (subscription.status.toLowerCase() !== 'active') {
      return false;
    }

    if (!subscription.expiryDate) {
      return true;
    }

    const expiryDate = new Date(subscription.expiryDate);

    if (Number.isNaN(expiryDate.getTime())) {
      return true;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiryDate.setHours(0, 0, 0, 0);

    return expiryDate.getTime() >= today.getTime();
  }
}
