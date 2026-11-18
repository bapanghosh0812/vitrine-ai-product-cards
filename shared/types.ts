import type { CopyField, CurrencyId, LanguageId, SupportActionId, TemplateId, ToneId } from './constants';

/** The three pieces of copy the assignment asks for. */
export interface ProductCopy {
  title: string;
  description: string;
  keywords: string[];
}

export interface BrandKitInput {
  brandName?: string;
  voice?: string;
  avoid?: string;
  colours?: string[];
}

export interface GenerateRequest {
  name: string;
  category: string;
  audience?: string;
  tone?: ToneId;
  features?: string[];
  /** Free-form notes from the seller (story, materials, what to stress). Treated as data. */
  brief?: string;
  price?: string;
  currency?: CurrencyId;
  language?: LanguageId;
  variations?: 1 | 3;
  /** Regenerate a single field, keeping the others as context. */
  field?: CopyField;
  current?: ProductCopy;
  /** Revise the current card following this request ("shorter", "mention free shipping"). */
  instruction?: string;
  brandKit?: BrandKitInput;
  creativity?: 'precise' | 'balanced' | 'creative';
  provider?: 'auto' | 'groq' | 'gemini';
}

export interface GenerateResponse {
  variations: ProductCopy[];
  /** Present when only one field was regenerated. */
  field?: CopyField;
  provider: 'groq' | 'gemini' | 'mock';
  model: string;
  latencyMs: number;
  fallbackUsed: boolean;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    retryAfter?: number;
  };
}

export interface SupportMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SupportRequest {
  messages: SupportMessage[];
  page?: string;
}

export interface KbSource {
  slug: string;
  title: string;
}

/** NDJSON events streamed by /api/support */
export type SupportEvent =
  | { t: 'meta'; sources: KbSource[]; actions: SupportActionId[]; provider: string }
  | { t: 'delta'; v: string }
  | { t: 'replace'; v: string }
  | { t: 'fallback'; articles: { slug: string; title: string; snippet: string }[]; reason: string }
  | { t: 'done'; actions: SupportActionId[] }
  | { t: 'error'; message: string };

/** Visual customisation of a card. Every field is optional; missing means "template default". */
export interface CardStyle {
  /** Palette id from CARD_PALETTES, or 'custom' with base/accent colours. */
  palette?: string;
  base?: string;
  accent?: string;
  font?: 'serif' | 'sans';
  titleCase?: 'title' | 'upper';
  titleSize?: 'sm' | 'lg';
  radius?: 'sharp' | 'round';
  imageFit?: 'contain';
  frame?: boolean;
  badge?: string;
  hideCategory?: boolean;
  hideDescription?: boolean;
  hideKeywords?: boolean;
  hidePrice?: boolean;
  /** Visible description lines (2-6). */
  lines?: number;
  /** Visible keywords (0-8). */
  keywords?: number;
}

export interface StoredCard {
  id: string;
  name: string;
  category: string;
  template: TemplateId;
  copy: ProductCopy;
  inputs: Omit<GenerateRequest, 'name' | 'category' | 'current' | 'field' | 'brandKit' | 'variations'>;
  image?: string | null;
  style?: CardStyle;
  favourite: boolean;
  createdAt: number;
  updatedAt: number;
  provider?: string;
}
