import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';

/** True when running in a real browser (not during prerendering). */
export function injectIsBrowser(): boolean {
  return isPlatformBrowser(inject(PLATFORM_ID));
}

export function uid(prefix = ''): string {
  const bytes = new Uint8Array(10);
  globalThis.crypto.getRandomValues(bytes);
  const id = Array.from(bytes, (b) => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');
  return prefix ? `${prefix}_${id}` : id;
}

export function ticketId(): string {
  const bytes = new Uint8Array(6);
  globalThis.crypto.getRandomValues(bytes);
  return `VT-${Array.from(bytes, (b) => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[b % 31]).join('')}`;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function prefersReducedMotion(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'vitrine-card'
  );
}
