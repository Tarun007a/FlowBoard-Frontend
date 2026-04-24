import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStoreService } from '../services/auth-store.service';
import { isAdminRole } from '../utils/admin.utils';

export const adminGuard: CanActivateFn = () => {
  const authStore = inject(AuthStoreService);
  const router = inject(Router);
  const session = authStore.snapshot();

  if (!session?.token) {
    return router.createUrlTree(['/login']);
  }

  return isAdminRole(session.role)
    ? true
    : router.createUrlTree(['/workspaces']);
};
