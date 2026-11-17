import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const signedInGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  auth.init();
  await auth.ready;
  return auth.isSignedIn() ? true : router.createUrlTree(['/auth/sign-in'], { queryParams: { next: state.url } });
};

export const guestOnlyGuard: CanActivateFn = async (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  auth.init();
  await auth.ready;
  if (!auth.isSignedIn()) return true;
  const next = route.queryParamMap.get('next');
  return router.parseUrl(next && next.startsWith('/') && !next.startsWith('//') ? next : '/studio');
};

export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  auth.init();
  await auth.ready;
  return auth.isAdmin() ? true : router.createUrlTree(['/studio']);
};
