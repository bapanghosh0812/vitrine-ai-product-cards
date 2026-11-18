import { Routes } from '@angular/router';
import { guestOnlyGuard, signedInGuard } from '../../core/guards';
import AuthLayout from './auth-layout';

export default [
  {
    path: '',
    component: AuthLayout,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'sign-in' },
      {
        path: 'sign-in',
        canActivate: [guestOnlyGuard],
        loadComponent: () => import('./sign-in.page'),
        data: { seo: { title: 'Sign in', description: 'Sign in to Vitrine to sync your product cards across devices.' } },
      },
      {
        path: 'sign-up',
        canActivate: [guestOnlyGuard],
        loadComponent: () => import('./sign-up.page'),
        data: { seo: { title: 'Create your account', description: 'Create a free Vitrine account to save cards, a Brand Kit and your profile.' } },
      },
      {
        path: 'forgot-password',
        loadComponent: () => import('./forgot-password.page'),
        data: { seo: { title: 'Reset your password', description: 'Get a link to reset your Vitrine password.', noindex: true } },
      },
      {
        path: 'email-link',
        loadComponent: () => import('./email-link.page'),
        data: { seo: { title: 'Signing you in', description: 'Finish signing in with your email link.', noindex: true } },
      },
      {
        path: 'verify-email',
        canActivate: [signedInGuard],
        loadComponent: () => import('./verify-email.page'),
        data: { seo: { title: 'Verify your email', description: 'Confirm your email address.', noindex: true } },
      },
    ],
  },
] satisfies Routes;
