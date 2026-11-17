import { RenderMode, ServerRoute } from '@angular/ssr';
import { HELP_ARTICLES } from '../../shared/content/help.generated';
import { LEGAL_DOCS } from '../../shared/content/legal.generated';

/**
 * Public, content pages are prerendered to static HTML at build time (fast LCP, SEO).
 * Personal app pages (library, settings, profile, ...) render in the browser.
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'help', renderMode: RenderMode.Prerender },
  { path: 'help/:slug', renderMode: RenderMode.Prerender, getPrerenderParams: async () => HELP_ARTICLES.map((a) => ({ slug: a.slug })) },
  { path: 'legal', renderMode: RenderMode.Prerender },
  { path: 'legal/:doc', renderMode: RenderMode.Prerender, getPrerenderParams: async () => LEGAL_DOCS.map((d) => ({ doc: d.slug })) },
  { path: 'templates', renderMode: RenderMode.Prerender },
  // The Studio works for guests, so its first paint can be static too (hydration is skipped
  // for the page body because a saved draft may legitimately differ from the static HTML).
  { path: 'studio', renderMode: RenderMode.Prerender },
  { path: 'offline', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Client },
];
