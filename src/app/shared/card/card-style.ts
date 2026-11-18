import { CARD_PALETTES, STYLE_LIMITS } from '../../../../shared/constants';
import type { CardStyle } from '../../../../shared/types';

const HEX = /^#[0-9a-f]{6}$/i;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(n)));

/**
 * Keeps only known, valid style values. Used for anything that did not come from the Style panel
 * itself (saved drafts, Library cards, Firestore), so a tampered value can never reach the card.
 */
export function cleanStyle(raw: unknown): CardStyle {
  if (!raw || typeof raw !== 'object') return {};
  const r = raw as Record<string, unknown>;
  const s: CardStyle = {};
  if (typeof r['palette'] === 'string' && (r['palette'] === 'custom' || CARD_PALETTES.some((p) => p.id === r['palette']))) s.palette = r['palette'];
  if (typeof r['base'] === 'string' && HEX.test(r['base'])) s.base = r['base'];
  if (typeof r['accent'] === 'string' && HEX.test(r['accent'])) s.accent = r['accent'];
  if (r['font'] === 'serif' || r['font'] === 'sans') s.font = r['font'];
  if (r['titleCase'] === 'title' || r['titleCase'] === 'upper') s.titleCase = r['titleCase'];
  if (r['titleSize'] === 'sm' || r['titleSize'] === 'lg') s.titleSize = r['titleSize'];
  if (r['radius'] === 'sharp' || r['radius'] === 'round') s.radius = r['radius'];
  if (r['imageFit'] === 'contain') s.imageFit = 'contain';
  if (r['frame'] === true) s.frame = true;
  if (typeof r['badge'] === 'string') {
    const badge = [...r['badge']]
      .filter((ch) => ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) !== 127 && ch !== '<' && ch !== '>')
      .join('')
      .trim()
      .slice(0, STYLE_LIMITS.badgeMax);
    if (badge) s.badge = badge;
  }
  for (const key of ['hideCategory', 'hideDescription', 'hideKeywords', 'hidePrice'] as const) if (r[key] === true) s[key] = true;
  if (typeof r['lines'] === 'number' && Number.isFinite(r['lines'])) s.lines = clamp(r['lines'], STYLE_LIMITS.linesMin, STYLE_LIMITS.linesMax);
  if (typeof r['keywords'] === 'number' && Number.isFinite(r['keywords'])) s.keywords = clamp(r['keywords'], STYLE_LIMITS.keywordsMin, STYLE_LIMITS.keywordsMax);
  return s;
}

/** Colours chosen in the Style panel, or null to fall back to the Brand Kit / template colours. */
export function styleColours(style: CardStyle | null | undefined): { base: string; accent: string } | null {
  if (!style?.palette) return null;
  if (style.palette === 'custom') return style.base && style.accent ? { base: style.base, accent: style.accent } : null;
  const preset = CARD_PALETTES.find((p) => p.id === style.palette);
  return preset ? { base: preset.base, accent: preset.accent } : null;
}

/** Host classes for the product card. */
export function styleClasses(style: CardStyle | null | undefined): string {
  if (!style) return '';
  const c: string[] = [];
  if (style.font) c.push(`pc--font-${style.font}`);
  if (style.titleCase) c.push(`pc--case-${style.titleCase}`);
  if (style.radius) c.push(`pc--radius-${style.radius}`);
  if (style.imageFit) c.push('pc--fit-contain');
  if (style.frame) c.push('pc--frame');
  if (style.hideCategory) c.push('pc--hide-cat');
  if (style.hideDescription) c.push('pc--hide-desc');
  if (style.hideKeywords || style.keywords === 0) c.push('pc--hide-tags');
  if (style.hidePrice) c.push('pc--hide-price');
  return c.length ? ` ${c.join(' ')}` : '';
}

export const TITLE_SCALE = { sm: 0.86, lg: 1.16 } as const;
