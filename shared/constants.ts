/**
 * Constants shared by the Angular app and the Hono API.
 * Keep this file dependency-free so it can be bundled anywhere.
 */

export const APP_NAME = 'Vitrine';
export const APP_TAGLINE = 'Products, beautifully told.';
export const APP_AUTHOR = 'Bapan Ghosh';
export const APP_VERSION = '1.0.0';

/** Bump these when the legal documents change materially. Users are asked to re-consent. */
export const TERMS_VERSION = '2026-11-17';
export const PRIVACY_VERSION = '2026-11-17';

export interface CategoryDef {
  id: string;
  label: string;
  /** Fluent Emoji 3D asset slug in /emoji */
  emoji: string;
  hint: string;
}

export const CATEGORIES: readonly CategoryDef[] = [
  { id: 'fashion', label: 'Fashion & Apparel', emoji: 'dress', hint: 'Clothing, ethnic wear, outerwear' },
  { id: 'electronics', label: 'Electronics', emoji: 'laptop', hint: 'Laptops, phones, gadgets' },
  { id: 'audio', label: 'Audio', emoji: 'headphone', hint: 'Headphones, speakers, earbuds' },
  { id: 'beauty', label: 'Beauty & Makeup', emoji: 'lipstick', hint: 'Cosmetics, fragrance, nails' },
  { id: 'wellness', label: 'Skincare & Wellness', emoji: 'lotion-bottle', hint: 'Skincare, bath, self-care' },
  { id: 'home', label: 'Home & Living', emoji: 'couch-and-lamp', hint: 'Furniture, decor, lighting' },
  { id: 'kitchen', label: 'Food & Gourmet', emoji: 'croissant', hint: 'Snacks, tea, coffee, sweets' },
  { id: 'jewellery', label: 'Jewellery', emoji: 'ring', hint: 'Rings, necklaces, earrings' },
  { id: 'watches', label: 'Watches', emoji: 'watch', hint: 'Analog, smart, luxury watches' },
  { id: 'bags', label: 'Bags & Leather', emoji: 'handbag', hint: 'Handbags, wallets, backpacks' },
  { id: 'footwear', label: 'Footwear', emoji: 'running-shoe', hint: 'Sneakers, heels, sandals' },
  { id: 'sports', label: 'Sports & Fitness', emoji: 'soccer-ball', hint: 'Gear, equipment, activewear' },
  { id: 'gaming', label: 'Gaming', emoji: 'video-game', hint: 'Consoles, controllers, games' },
  { id: 'books', label: 'Books', emoji: 'books', hint: 'Fiction, non-fiction, journals' },
  { id: 'toys', label: 'Toys & Kids', emoji: 'teddy-bear', hint: 'Toys, baby care, learning' },
  { id: 'stationery', label: 'Stationery', emoji: 'fountain-pen', hint: 'Pens, notebooks, desk' },
  { id: 'art', label: 'Art & Craft', emoji: 'artist-palette', hint: 'Handmade, prints, supplies' },
  { id: 'plants', label: 'Plants & Garden', emoji: 'potted-plant', hint: 'Indoor plants, planters' },
  { id: 'pets', label: 'Pet Supplies', emoji: 'paw-prints', hint: 'Food, toys, grooming' },
  { id: 'other', label: 'Something else', emoji: 'sparkles', hint: 'Anything that deserves a spotlight' },
] as const;

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export const TONES = [
  { id: 'luxurious', label: 'Luxurious' },
  { id: 'friendly', label: 'Friendly' },
  { id: 'playful', label: 'Playful' },
  { id: 'professional', label: 'Professional' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'bold', label: 'Bold' },
] as const;
export type ToneId = (typeof TONES)[number]['id'];
export const TONE_IDS = TONES.map((t) => t.id) as ToneId[];

export const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'Hindi' },
  { id: 'bn', label: 'Bengali' },
  { id: 'es', label: 'Spanish' },
  { id: 'fr', label: 'French' },
  { id: 'de', label: 'German' },
  { id: 'ar', label: 'Arabic' },
  { id: 'ja', label: 'Japanese' },
] as const;
export type LanguageId = (typeof LANGUAGES)[number]['id'];
export const LANGUAGE_IDS = LANGUAGES.map((l) => l.id) as LanguageId[];

export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'JPY'] as const;
export type CurrencyId = (typeof CURRENCIES)[number];

export const TEMPLATES = [
  { id: 'minimal', label: 'Minimal', blurb: 'Quiet ivory, generous whitespace.' },
  { id: 'luxe', label: 'Luxe Gold', blurb: 'Deep emerald with gilded detail.' },
  { id: 'glass', label: 'Glass', blurb: 'Frosted panes over soft light.' },
  { id: 'bold', label: 'Bold', blurb: 'Big type, high contrast, no apologies.' },
  { id: 'instagram', label: 'Instagram post', blurb: 'Square 1:1, ready to share.' },
  { id: 'marketplace', label: 'Marketplace listing', blurb: 'Clean listing with price and bullets.' },
] as const;
export type TemplateId = (typeof TEMPLATES)[number]['id'];
export const TEMPLATE_IDS = TEMPLATES.map((t) => t.id) as TemplateId[];

export type CopyField = 'title' | 'description' | 'keywords';

/** Hard limits shared by client validation and server zod schemas. */
export const LIMITS = {
  nameMin: 2,
  nameMax: 80,
  audienceMax: 80,
  featureMax: 80,
  featuresMaxCount: 5,
  priceMax: 12,
  brandNameMax: 60,
  brandVoiceMax: 240,
  brandAvoidMax: 160,
  brandColoursMax: 5,
  titleMax: 80,
  titleSeo: 60,
  descriptionMin: 40,
  descriptionMax: 400,
  descriptionSeo: 160,
  keywordsMin: 4,
  keywordsMax: 10,
  keywordMax: 32,
  supportMessageMax: 600,
  supportHistoryMax: 8,
  ticketSubjectMax: 120,
  ticketMessageMax: 2000,
  imageMaxBytes: 300_000,
  requestBodyMaxBytes: 16_384,
} as const;

/** Actions the support bot may suggest. Anything else is dropped by both server and client. */
export const SUPPORT_ACTIONS = {
  'open-studio': { label: 'Open Studio', kind: 'navigate', target: '/studio' },
  'open-library': { label: 'Open Library', kind: 'navigate', target: '/library' },
  'open-templates': { label: 'Browse templates', kind: 'navigate', target: '/templates' },
  'open-brand-kit': { label: 'Open Brand Kit', kind: 'navigate', target: '/brand-kit' },
  'open-settings': { label: 'Open Settings', kind: 'navigate', target: '/settings' },
  'open-appearance': { label: 'Appearance settings', kind: 'navigate', target: '/settings/appearance' },
  'open-privacy': { label: 'History & Privacy', kind: 'navigate', target: '/settings/privacy' },
  'open-profile': { label: 'Open Profile', kind: 'navigate', target: '/profile' },
  'open-help': { label: 'Help Center', kind: 'navigate', target: '/help' },
  'open-sign-in': { label: 'Sign in', kind: 'navigate', target: '/auth/sign-in' },
  'open-sign-up': { label: 'Create account', kind: 'navigate', target: '/auth/sign-up' },
  'open-terms': { label: 'Terms of Service', kind: 'navigate', target: '/legal/terms' },
  'open-privacy-policy': { label: 'Privacy Policy', kind: 'navigate', target: '/legal/privacy' },
  'theme-light': { label: 'Switch to light', kind: 'theme', target: 'light' },
  'theme-dark': { label: 'Switch to dark', kind: 'theme', target: 'dark' },
  'theme-oled': { label: 'Switch to OLED', kind: 'theme', target: 'oled' },
  'open-ticket': { label: 'Talk to a human', kind: 'ticket', target: '' },
} as const;
export type SupportActionId = keyof typeof SUPPORT_ACTIONS;
export const SUPPORT_ACTION_IDS = Object.keys(SUPPORT_ACTIONS) as SupportActionId[];

