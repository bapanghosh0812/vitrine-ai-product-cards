import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withRouterConfig,
  withViewTransitions,
} from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { routes } from './app.routes';
import { AuthService } from './core/auth.service';
import { CookieConsentService } from './core/cookie-consent.service';
import { SeoService } from './core/seo.service';
import { ThemeService } from './core/theme.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
      withViewTransitions({
        skipInitialTransition: true,
        onViewTransitionCreated: ({ transition }) => {
          if (document.documentElement.getAttribute('data-motion') === 'reduced') transition.skipTransition();
        },
      }),
    ),
    provideClientHydration(withEventReplay()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideAppInitializer(() => {
      inject(ThemeService);
      inject(SeoService).init();
      inject(AuthService).init();
      inject(CookieConsentService).init();
    }),
  ],
};
