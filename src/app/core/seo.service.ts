import { DOCUMENT, inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { APP_NAME, APP_TAGLINE } from '../../../shared/constants';
import { PUBLIC_ENV } from '../../environments/public-env';

export interface SeoData {
  title: string;
  description: string;
  image?: string;
  noindex?: boolean;
  type?: 'website' | 'article';
}

const DEFAULT_DESCRIPTION =
  'Vitrine is an AI product-card generator: type a product name and category, get a polished title, description and SEO keywords on a beautiful card you can edit and export.';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  init(): void {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      let r = this.route.snapshot;
      while (r.firstChild) r = r.firstChild;
      const seo = r.data['seo'] as SeoData | undefined;
      if (seo) this.set(seo);
    });
  }

  set(seo: SeoData): void {
    const fullTitle = seo.title === APP_NAME ? `${APP_NAME} · ${APP_TAGLINE}` : `${seo.title} · ${APP_NAME}`;
    const description = seo.description || DEFAULT_DESCRIPTION;
    const path = this.router.url.split(/[?#]/)[0] ?? '/';
    const url = `${PUBLIC_ENV.siteUrl}${path === '/' ? '/' : path}`;
    const image = seo.image ?? `${PUBLIC_ENV.siteUrl}/brand/og-image.png`;

    this.title.setTitle(fullTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: seo.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large' });
    this.meta.updateTag({ property: 'og:title', content: fullTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: seo.type ?? 'website' });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ property: 'og:image:alt', content: 'Vitrine: emerald and gold app icon with a product card under a glass arch' });
    this.meta.updateTag({ property: 'og:site_name', content: APP_NAME });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: fullTitle });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: image });

    let link = this.doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}
