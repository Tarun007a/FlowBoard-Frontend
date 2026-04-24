import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStoreService } from '../services/auth-store.service';

export const landingGuard: CanActivateFn = () => {
  const authStore = inject(AuthStoreService);
  const router = inject(Router);
  const session = authStore.snapshot() ?? authStore.restore();

  return session?.token ? router.createUrlTree(['/workspaces']) : true;
};
