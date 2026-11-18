import { computed, effect, inject, Injectable, signal } from '@angular/core';
import {
  CATEGORIES,
  LIMITS,
  type CopyField,
  type CurrencyId,
  type LanguageId,
  type TemplateId,
  type ToneId,
} from '../../../shared/constants';
import type { CardStyle, GenerateRequest, GenerateResponse, ProductCopy, StoredCard } from '../../../shared/types';
import { ApiError, ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { BrandKitService } from '../core/brand-kit.service';
import { CardRepository, RepositoryError } from '../core/card-repository.service';
import { uid } from '../core/platform';
import { ProfileService } from '../core/profile.service';
import { SettingsService } from '../core/settings.service';
import { StorageService } from '../core/storage.service';
import { ToastService } from '../core/toast.service';
import { cleanStyle } from '../shared/card/card-style';

export interface StudioForm {
  name: string;
  category: string;
  audience: string;
  tone: ToneId;
  features: string;
  /** Optional long brief for the AI (story, materials, what to stress). */
  brief: string;
  price: string;
  currency: CurrencyId;
  language: LanguageId;
  variations: 1 | 3;
}

/** One undoable state of the card being designed. */
export interface CardSnapshot {
  variations: ProductCopy[];
  active: number;
  template: TemplateId;
  image: string | null;
  style: CardStyle;
}

export type StudioPhase = 'idle' | 'generating' | 'regenerating';

const HISTORY_LIMIT = 60;
const COALESCE_MS = 900;
const DRAFT_KEY = 'studio.draft';

function emptySnapshot(template: TemplateId): CardSnapshot {
  return { variations: [], active: 0, template, image: null, style: {} };
}

/**
 * Signal store for the Studio: form state, the current card, undo/redo history,
 * generation status and persistence. Components read signals and call methods;
 * nothing else mutates studio state.
 */
@Injectable({ providedIn: 'root' })
export class StudioStore {
  private readonly api = inject(ApiService);
  private readonly settings = inject(SettingsService);
  private readonly brandKit = inject(BrandKitService);
  private readonly repo = inject(CardRepository);
  private readonly toast = inject(ToastService);
  private readonly profile = inject(ProfileService);
  private readonly auth = inject(AuthService);
  private readonly storage = inject(StorageService);

  /* ---------------- state ---------------- */
  readonly form = signal<StudioForm>(this.defaultForm());
  private readonly present = signal<CardSnapshot>(emptySnapshot(this.settings.get('defaultTemplate')));
  private readonly past = signal<CardSnapshot[]>([]);
  private readonly future = signal<CardSnapshot[]>([]);
  readonly phase = signal<StudioPhase>('idle');
  readonly regeneratingField = signal<CopyField | null>(null);
  readonly error = signal<ApiError | null>(null);
  readonly cooldownUntil = signal(0);
  readonly meta = signal<Pick<GenerateResponse, 'provider' | 'model' | 'latencyMs' | 'fallbackUsed'> | null>(null);
  readonly savedId = signal<string | null>(null);
  readonly dirty = signal(false);
  readonly lastGeneratedAt = signal(0);

  private lastEdit: { key: string; at: number } | null = null;
  private inflight: AbortController | null = null;

  /* ---------------- derived ---------------- */
  readonly snapshot = this.present.asReadonly();
  readonly variations = computed(() => this.present().variations);
  readonly active = computed(() => this.present().active);
  readonly copy = computed<ProductCopy | null>(() => this.present().variations[this.present().active] ?? null);
  readonly template = computed(() => this.present().template);
  readonly image = computed(() => this.present().image);
  readonly style = computed(() => this.present().style);
  /** Instructions applied with "Ask AI" in this session (newest first). */
  readonly refineLog = signal<string[]>([]);
  readonly hasCard = computed(() => this.copy() !== null);
  readonly canUndo = computed(() => this.past().length > 0);
  readonly canRedo = computed(() => this.future().length > 0);
  readonly busy = computed(() => this.phase() !== 'idle');
  readonly category = computed(() => CATEGORIES.find((c) => c.id === this.form().category) ?? null);
  readonly historySize = computed(() => this.past().length);

  constructor() {
    const draft = this.storage.get<{ form: StudioForm; snapshot: CardSnapshot; savedId: string | null } | null>(DRAFT_KEY, null, 'preference');
    if (draft?.form && draft.snapshot) {
      this.form.set({ ...this.defaultForm(), ...draft.form });
      this.present.set({ ...emptySnapshot(this.settings.get('defaultTemplate')), ...draft.snapshot, style: cleanStyle(draft.snapshot.style) });
      this.savedId.set(draft.savedId ?? null);
    }
    effect(() => {
      const value = { form: this.form(), snapshot: this.present(), savedId: this.savedId() };
      if (this.settings.settings().keepHistory) this.storage.set(DRAFT_KEY, value, 'preference');
    });
  }

  defaultForm(): StudioForm {
    const s = this.settings.settings();
    return {
      name: '',
      category: '',
      audience: '',
      tone: s.defaultTone,
      features: '',
      brief: '',
      price: '',
      currency: 'INR',
      language: s.defaultLanguage,
      variations: s.defaultVariations,
    };
  }

  patchForm(patch: Partial<StudioForm>): void {
    this.form.update((f) => ({ ...f, ...patch }));
  }

  /* ---------------- history ---------------- */
  private commit(next: CardSnapshot, coalesceKey?: string): void {
    const now = Date.now();
    const coalesce = coalesceKey && this.lastEdit?.key === coalesceKey && now - this.lastEdit.at < COALESCE_MS;
    if (!coalesce) {
      this.past.update((p) => [...p, this.present()].slice(-HISTORY_LIMIT));
    }
    this.lastEdit = coalesceKey ? { key: coalesceKey, at: now } : null;
    this.future.set([]);
    this.present.set(next);
    this.dirty.set(true);
  }

  undo(): void {
    const past = this.past();
    const prev = past[past.length - 1];
    if (!prev) return;
    this.future.update((f) => [this.present(), ...f].slice(0, HISTORY_LIMIT));
    this.past.set(past.slice(0, -1));
    this.present.set(prev);
    this.lastEdit = null;
    this.dirty.set(true);
  }

  redo(): void {
    const [next, ...rest] = this.future();
    if (!next) return;
    this.past.update((p) => [...p, this.present()].slice(-HISTORY_LIMIT));
    this.future.set(rest);
    this.present.set(next);
    this.lastEdit = null;
    this.dirty.set(true);
  }

  /* ---------------- requests ---------------- */
  buildRequest(extra: Partial<GenerateRequest> = {}): GenerateRequest {
    const f = this.form();
    const s = this.settings.settings();
    const features = f.features
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, LIMITS.featuresMaxCount)
      .map((x) => x.slice(0, LIMITS.featureMax));
    const req: GenerateRequest = {
      name: f.name.trim(),
      category: f.category,
      tone: f.tone,
      language: f.language,
      variations: f.variations,
      creativity: s.creativity,
      provider: s.provider,
      ...extra,
    };
    if (f.audience.trim()) req.audience = f.audience.trim().slice(0, LIMITS.audienceMax);
    if (features.length) req.features = features;
    if (f.brief.trim()) req.brief = f.brief.trim().slice(0, LIMITS.briefMax);
    if (f.price.trim()) {
      req.price = f.price.trim();
      req.currency = f.currency;
    }
    const kit = this.brandKit.forRequest();
    if (kit) req.brandKit = kit;
    return req;
  }

  private handleError(error: unknown): void {
    if ((error as Error)?.name === 'AbortError') return;
    const e = error instanceof ApiError ? error : new ApiError(0, 'unknown', 'Something went wrong. Please try again.');
    this.error.set(e);
    if (e.retryAfter) this.cooldownUntil.set(Date.now() + e.retryAfter * 1000);
    this.toast.error(e.code === 'rate_limited' ? 'Slow down a little' : 'Generation failed', e.message);
  }

  async generate(): Promise<boolean> {
    if (this.busy()) return false;
    const req = this.buildRequest();
    if (req.name.length < LIMITS.nameMin || !req.category) return false;
    this.inflight?.abort();
    this.inflight = new AbortController();
    this.phase.set('generating');
    this.error.set(null);
    try {
      const res = await this.api.generate(req, this.inflight.signal);
      this.commit({ ...this.present(), variations: res.variations, active: 0 });
      this.meta.set({ provider: res.provider, model: res.model, latencyMs: res.latencyMs, fallbackUsed: res.fallbackUsed });
      this.savedId.set(null);
      this.lastGeneratedAt.set(Date.now());
      void this.profile.bumpStat('generated', 1, this.template());
      this.toast.success(res.variations.length > 1 ? `${res.variations.length} variations ready` : 'Your card is ready', `Written by ${labelFor(res.provider)} in ${(res.latencyMs / 1000).toFixed(1)}s.`);
      return true;
    } catch (error) {
      this.handleError(error);
      return false;
    } finally {
      this.phase.set('idle');
      this.inflight = null;
    }
  }

  async regenerate(field: CopyField): Promise<void> {
    const current = this.copy();
    if (!current || this.busy()) return;
    this.phase.set('regenerating');
    this.regeneratingField.set(field);
    this.error.set(null);
    try {
      const res = await this.api.generate(this.buildRequest({ field, current, variations: 1 }));
      const updated = res.variations[0];
      if (updated) {
        const variations = [...this.present().variations];
        variations[this.present().active] = updated;
        this.commit({ ...this.present(), variations });
        this.meta.set({ provider: res.provider, model: res.model, latencyMs: res.latencyMs, fallbackUsed: res.fallbackUsed });
        this.toast.success(`New ${field} ready`);
      }
    } catch (error) {
      this.handleError(error);
    } finally {
      this.phase.set('idle');
      this.regeneratingField.set(null);
    }
  }

  /** Revises the active card from a free-form instruction ("shorter", "mention free shipping"). */
  async refine(instruction: string): Promise<boolean> {
    const current = this.copy();
    const ask = instruction.trim().slice(0, LIMITS.instructionMax);
    if (!current || this.busy() || ask.length < 3) return false;
    this.phase.set('regenerating');
    this.error.set(null);
    try {
      const res = await this.api.generate(this.buildRequest({ current, instruction: ask, variations: 1 }));
      const updated = res.variations[0];
      if (!updated) return false;
      this.replaceActive(updated);
      this.meta.set({ provider: res.provider, model: res.model, latencyMs: res.latencyMs, fallbackUsed: res.fallbackUsed });
      this.refineLog.update((log) => [ask, ...log].slice(0, 5));
      this.toast.success('Card refined', 'Not quite right? Undo brings the previous version back.');
      return true;
    } catch (error) {
      this.handleError(error);
      return false;
    } finally {
      this.phase.set('idle');
    }
  }

  cancel(): void {
    this.inflight?.abort();
    this.phase.set('idle');
  }

  /* ---------------- edits ---------------- */
  editField(field: 'title' | 'description', value: string): void {
    const copy = this.copy();
    if (!copy) return;
    const max = field === 'title' ? LIMITS.titleMax : LIMITS.descriptionMax;
    this.replaceActive({ ...copy, [field]: value.slice(0, max) }, `edit:${field}`);
  }

  setKeywords(keywords: string[]): void {
    const copy = this.copy();
    if (!copy) return;
    const clean = [...new Set(keywords.map((k) => k.trim().toLowerCase().slice(0, LIMITS.keywordMax)).filter((k) => k.length >= 2))].slice(0, LIMITS.keywordsMax);
    this.replaceActive({ ...copy, keywords: clean });
  }

  private replaceActive(copy: ProductCopy, coalesceKey?: string): void {
    const variations = [...this.present().variations];
    variations[this.present().active] = copy;
    this.commit({ ...this.present(), variations }, coalesceKey);
  }

  selectVariation(index: number): void {
    if (index === this.active() || index < 0 || index >= this.variations().length) return;
    this.commit({ ...this.present(), active: index });
  }

  setTemplate(template: TemplateId): void {
    if (template === this.template()) return;
    this.commit({ ...this.present(), template });
  }

  setImage(image: string | null): void {
    this.commit({ ...this.present(), image });
  }

  /** Applies Style panel changes (undoable; quick slider moves are merged into one step). */
  setStyle(patch: Partial<CardStyle>): void {
    const next = cleanStyle({ ...this.present().style, ...patch });
    if (JSON.stringify(next) === JSON.stringify(this.present().style)) return;
    this.commit({ ...this.present(), style: next }, `style:${Object.keys(patch).sort().join(',')}`);
  }

  resetStyle(): void {
    if (!Object.keys(this.present().style).length) return;
    this.commit({ ...this.present(), style: {} });
  }

  /* ---------------- persistence ---------------- */
  async save(): Promise<StoredCard | null> {
    const copy = this.copy();
    const form = this.form();
    if (!copy) return null;
    if (this.auth.isSignedIn() && !this.auth.user()?.emailVerified && !this.auth.user()?.providers.includes('google.com')) {
      this.toast.warning('Verify your email to save', 'Open the link we emailed you, then try again. You can keep editing meanwhile.');
      return null;
    }
    const now = Date.now();
    const existing = this.savedId() ? this.repo.get(this.savedId()!) : undefined;
    const card: StoredCard = {
      id: this.savedId() ?? uid('card'),
      name: form.name.trim() || copy.title,
      category: form.category || 'other',
      template: this.template(),
      copy,
      inputs: {
        audience: form.audience || undefined,
        tone: form.tone,
        features: form.features ? form.features.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 5) : undefined,
        brief: form.brief.trim() ? form.brief.trim().slice(0, LIMITS.briefMax) : undefined,
        price: form.price || undefined,
        currency: form.price ? form.currency : undefined,
        language: form.language,
      },
      image: this.image(),
      style: Object.keys(this.style()).length ? this.style() : undefined,
      favourite: existing?.favourite ?? false,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      provider: this.meta()?.provider,
    };
    try {
      await this.repo.save(card);
      this.savedId.set(card.id);
      this.dirty.set(false);
      if (!existing) void this.profile.bumpStat('saved', 1, card.template);
      this.toast.success(existing ? 'Card updated' : 'Saved to Library', this.repo.mode() === 'cloud' ? 'Synced to your account.' : 'Stored in this browser.');
      return card;
    } catch (error) {
      this.toast.error('Could not save', error instanceof RepositoryError ? error.message : 'Please check your connection and try again.');
      return null;
    }
  }

  load(card: StoredCard): void {
    this.form.set({
      ...this.defaultForm(),
      name: card.name,
      category: card.category,
      audience: card.inputs.audience ?? '',
      tone: card.inputs.tone ?? this.settings.get('defaultTone'),
      features: (card.inputs.features ?? []).join('\n'),
      brief: typeof card.inputs.brief === 'string' ? card.inputs.brief.slice(0, LIMITS.briefMax) : '',
      price: card.inputs.price ?? '',
      currency: card.inputs.currency ?? 'INR',
      language: card.inputs.language ?? 'en',
    });
    this.present.set({ variations: [card.copy], active: 0, template: card.template, image: card.image ?? null, style: cleanStyle(card.style) });
    this.past.set([]);
    this.future.set([]);
    this.savedId.set(card.id);
    this.dirty.set(false);
    this.meta.set(null);
  }

  reset(): void {
    this.form.set(this.defaultForm());
    this.present.set(emptySnapshot(this.settings.get('defaultTemplate')));
    this.past.set([]);
    this.future.set([]);
    this.savedId.set(null);
    this.dirty.set(false);
    this.meta.set(null);
    this.error.set(null);
  }

  /** Prefill from a template page or a landing sample. */
  prefill(patch: Partial<StudioForm>, template?: TemplateId): void {
    this.form.update((f) => ({ ...f, ...patch }));
    if (template) this.setTemplate(template);
  }
}

export function labelFor(provider: string): string {
  if (provider === 'groq') return 'Groq';
  if (provider === 'gemini') return 'Gemini';
  if (provider === 'mock') return 'Offline mock engine';
  return provider;
}
