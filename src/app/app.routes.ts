import { Routes } from '@angular/router';
import { adminGuard, signedInGuard } from './core/guards';
import type { SeoData } from './core/seo.service';

const seo = (data: SeoData) => ({ seo: data });

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/landing/landing.page'),
    data: seo({
      title: 'Vitrine',
      description:
        'AI product-card generator. Type a product name and category and get a polished title, description and SEO keywords on a luxury card you can edit and export as PNG, JSON or HTML.',
    }),
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes'),
  },
  {
    path: 'help',
    loadComponent: () => import('./layout/public-shell'),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/help/help-center.page'),
        data: seo({ title: 'Help Center', description: 'Guides for generating product cards, templates, exports, accounts, privacy and more.' }),
      },
      { path: ':slug', loadComponent: () => import('./features/help/help-article.page') },
    ],
  },
  {
    path: 'legal',
    loadComponent: () => import('./layout/public-shell'),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/legal/legal-index.page'),
        data: seo({ title: 'Legal', description: 'Terms of Service, Privacy Policy, Cookie Policy, AI Disclaimer and Acceptable Use Policy for Vitrine.' }),
      },
      { path: ':doc', loadComponent: () => import('./features/legal/legal-doc.page') },
    ],
  },
  {
    path: 'offline',
    loadComponent: () => import('./features/system/offline.page'),
    data: seo({ title: 'You are offline', description: 'Vitrine is offline. Reconnect to keep generating.', noindex: true }),
  },
  {
    path: '',
    loadComponent: () => import('./layout/app-shell'),
    children: [
      {
        path: 'studio',
        loadComponent: () => import('./features/studio/studio.page'),
        data: seo({ title: 'Studio', description: 'Generate a product title, description and keywords with AI and design the card.', noindex: true }),
      },
      {
        path: 'library',
        loadComponent: () => import('./features/library/library.page'),
        data: seo({ title: 'Library', description: 'Your saved product cards.', noindex: true }),
      },
      {
        path: 'templates',
        loadComponent: () => import('./features/templates/templates.page'),
        data: seo({ title: 'Templates', description: 'Six product-card templates: Minimal, Luxe Gold, Glass, Bold, Instagram post and Marketplace listing.' }),
      },
      {
        path: 'brand-kit',
        loadComponent: () => import('./features/brand-kit/brand-kit.page'),
        data: seo({ title: 'Brand Kit', description: 'Your brand voice and colours, used in every generation.', noindex: true }),
      },
      {
        path: 'profile',
        canActivate: [signedInGuard],
        loadComponent: () => import('./features/profile/profile.page'),
        data: seo({ title: 'Profile', description: 'Your avatar, stats and badges.', noindex: true }),
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings.page'),
        data: seo({ title: 'Settings', description: 'Appearance, generation, export, privacy, notifications and accessibility settings.', noindex: true }),
      },
      {
        path: 'settings/:section',
        loadComponent: () => import('./features/settings/settings.page'),
        data: seo({ title: 'Settings', description: 'Vitrine settings.', noindex: true }),
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin/admin.page'),
        data: seo({ title: 'Admin', description: 'Support tickets.', noindex: true }),
      },
    ],
  },
  {
    path: '**',
    loadComponent: () => import('./features/system/not-found.page'),
    data: seo({ title: 'Page not found', description: 'This page does not exist.', noindex: true }),
  },
];
