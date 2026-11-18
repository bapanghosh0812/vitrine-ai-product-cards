import { inject, Injectable } from '@angular/core';
import { APP_VERSION, CATEGORIES, TEMPLATES } from '../../../../shared/constants';
import type { CardStyle, ProductCopy } from '../../../../shared/types';
import { downloadBlob, slugify } from '../../core/platform';
import { ProfileService } from '../../core/profile.service';
import { SettingsService } from '../../core/settings.service';
import { ToastService } from '../../core/toast.service';
import { cleanStyle, styleColours } from '../../shared/card/card-style';

export interface ExportInput {
  copy: ProductCopy;
  name: string;
  category: string;
  template: string;
  price?: string;
  currency?: string;
  language?: string;
  provider?: string;
  model?: string;
  image?: string | null;
  style?: CardStyle;
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);
}

@Injectable({ providedIn: 'root' })
export class ExportService {
  private readonly settings = inject(SettingsService);
  private readonly toast = inject(ToastService);
  private readonly profile = inject(ProfileService);

  async png(node: HTMLElement, data: ExportInput): Promise<void> {
    try {
      const { toBlob } = await import('html-to-image');
      await document.fonts?.ready;
      const blob = await toBlob(node, {
        pixelRatio: this.settings.get('exportScale'),
        cacheBust: true,
        skipAutoScale: true,
        filter: (el) => !(el instanceof HTMLElement && el.dataset['exportIgnore'] === 'true'),
      });
      if (!blob) throw new Error('empty');
      downloadBlob(blob, `${slugify(data.name || data.copy.title)}-${data.template}.png`);
      void this.profile.bumpStat('exported');
      this.toast.success('PNG downloaded', `Exported at ${this.settings.get('exportScale')}x scale.`);
    } catch {
      this.toast.error('PNG export failed', 'Please wait for images to load and try again.');
    }
  }

  toJson(data: ExportInput): string {
    const category = CATEGORIES.find((c) => c.id === data.category);
    return JSON.stringify(
      {
        $schema: 'https://vitrine.app/schemas/product-card.v1.json',
        name: data.name,
        category: { id: data.category, label: category?.label ?? data.category },
        template: data.template,
        title: data.copy.title,
        description: data.copy.description,
        keywords: data.copy.keywords,
        price: data.price ? { amount: Number(data.price), currency: data.currency ?? 'INR' } : null,
        language: data.language ?? 'en',
        style: data.style && Object.keys(data.style).length ? cleanStyle(data.style) : null,
        generatedBy: data.provider ? { provider: data.provider, model: data.model ?? null } : null,
        exportedAt: new Date().toISOString(),
        exporter: `Vitrine ${APP_VERSION}`,
      },
      null,
      2,
    );
  }

  json(data: ExportInput): void {
    downloadBlob(new Blob([this.toJson(data)], { type: 'application/json' }), `${slugify(data.name || data.copy.title)}.json`);
    void this.profile.bumpStat('exported');
    this.toast.success('JSON downloaded');
  }

  /** Self-contained HTML snippet. Every value is escaped; no scripts, no external assets. */
  toHtml(data: ExportInput): string {
    const t = TEMPLATES.find((x) => x.id === data.template);
    const style = cleanStyle(data.style);
    const chosen = styleColours(style);
    const dark = !!chosen || data.template === 'luxe' || data.template === 'bold';
    const bg = chosen?.base ?? (dark ? '#0e4d3a' : '#fbf7f0');
    const ink = dark ? '#f6efe1' : '#12201a';
    const muted = dark ? 'rgba(246,239,225,.8)' : '#4b5852';
    const accent = chosen?.accent ?? '#c9a35b';
    const price =
      data.price && Number.isFinite(Number(data.price))
        ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: data.currency ?? 'INR' }).format(Number(data.price))
        : '';
    const image = data.image && /^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(data.image) ? data.image : '';
    const tags = data.copy.keywords
      .slice(0, style.hideKeywords ? 0 : (style.keywords ?? data.copy.keywords.length))
      .map((k) => `<li style="display:inline-block;margin:0 6px 6px 0;padding:3px 10px;border:1px solid ${accent};border-radius:999px;font-size:12px;color:${dark ? '#ecd9a8' : '#2c3b34'}">${escapeHtml(k)}</li>`)
      .join('');
    return `<!-- Product card exported from Vitrine (${escapeHtml(t?.label ?? data.template)} style) -->
<article style="max-width:420px;padding:28px;border-radius:20px;background:${bg};color:${ink};font-family:Georgia,'Times New Roman',serif;box-shadow:0 20px 50px -20px rgba(0,0,0,.35)">
  ${style.badge ? `<p style="display:inline-block;margin:0 0 14px;padding:4px 12px;border-radius:999px;background:${accent};color:#1a1408;font:700 11px/1.4 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase">${escapeHtml(style.badge)}</p>` : ''}
  ${image ? `<img src="${image}" alt="${escapeHtml(data.copy.title)}" style="width:100%;border-radius:14px;margin-bottom:18px;object-fit:${style.imageFit === 'contain' ? 'contain' : 'cover'}" />` : ''}
  ${style.hideCategory ? '' : `<p style="margin:0 0 8px;font:600 11px/1.4 system-ui,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:${accent}">${escapeHtml(CATEGORIES.find((c) => c.id === data.category)?.label ?? '')}</p>`}
  <h2 style="margin:0 0 10px;font-size:26px;line-height:1.15;font-weight:400${style.titleCase === 'upper' ? ';text-transform:uppercase' : ''}">${escapeHtml(data.copy.title)}</h2>
  ${style.hideDescription ? '' : `<p style="margin:0 0 16px;font:15px/1.6 system-ui,sans-serif;color:${muted}">${escapeHtml(data.copy.description)}</p>`}
  ${tags ? `<ul style="list-style:none;margin:0;padding:0;font-family:system-ui,sans-serif">${tags}</ul>` : ''}
  ${price && !style.hidePrice ? `<p style="margin:14px 0 0;font-size:22px;color:${dark ? '#f1dba3' : '#0e4d3a'}">${escapeHtml(price)}</p>` : ''}
</article>`;
  }

  html(data: ExportInput): void {
    downloadBlob(new Blob([this.toHtml(data)], { type: 'text/html' }), `${slugify(data.name || data.copy.title)}.html`);
    void this.profile.bumpStat('exported');
    this.toast.success('HTML snippet downloaded');
  }

  async copyText(copy: ProductCopy): Promise<void> {
    const text = `${copy.title}\n\n${copy.description}\n\nKeywords: ${copy.keywords.join(', ')}`;
    try {
      await navigator.clipboard.writeText(text);
      this.toast.success('Copied to clipboard');
    } catch {
      this.toast.error('Could not copy', 'Your browser blocked clipboard access.');
    }
  }
}
