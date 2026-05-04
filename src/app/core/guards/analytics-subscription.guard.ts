import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { SubscriptionService } from '../services/subscription.service';

export const analyticsSubscriptionGuard: CanActivateFn = () => {
  const router = inject(Router);
  const subscriptionService = inject(SubscriptionService);

  return subscriptionService.hasActiveSubscription().pipe(
    map((hasSubscription) => hasSubscription ? true : router.createUrlTree(['/analytics/premium'])),
    catchError(() => of(router.createUrlTree(['/analytics/premium'])))
  );
};
