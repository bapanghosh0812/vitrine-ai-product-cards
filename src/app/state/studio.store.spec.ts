import { TestBed } from '@angular/core/testing';
import type { GenerateRequest, GenerateResponse } from '../../../shared/types';
import { ApiError, ApiService } from '../core/api.service';
import { StudioStore } from './studio.store';

function response(n = 1, prefix = 'Card'): GenerateResponse {
  return {
    variations: Array.from({ length: n }, (_, i) => ({
      title: `${prefix} ${i + 1}`,
      description: 'A thoughtfully made product with a calm, premium finish that suits every day.',
      keywords: ['one', 'two', 'three', 'four'],
    })),
    provider: 'mock',
    model: 'mock-1',
    latencyMs: 12,
    fallbackUsed: false,
  };
}

describe('StudioStore', () => {
  let store: StudioStore;
  let calls: GenerateRequest[];
  let next: () => Promise<GenerateResponse>;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    calls = [];
    next = async () => response();
    TestBed.configureTestingModule({
      providers: [{ provide: ApiService, useValue: { generate: async (req: GenerateRequest) => (calls.push(req), next()) } }],
    });
    store = TestBed.inject(StudioStore);
    store.patchForm({ name: 'Brass lamp', category: 'home' });
  });

  it('does not call the API when the form is incomplete', async () => {
    store.patchForm({ name: 'x', category: '' });
    expect(await store.generate()).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it('generates a card and records request options', async () => {
    store.patchForm({ features: 'Brass body\nTeak base', price: '3490', variations: 3 });
    next = async () => response(3);
    expect(await store.generate()).toBe(true);
    expect(store.variations()).toHaveLength(3);
    expect(store.copy()?.title).toBe('Card 1');
    expect(calls[0]).toMatchObject({ name: 'Brass lamp', category: 'home', features: ['Brass body', 'Teak base'], price: '3490', currency: 'INR', variations: 3 });
    expect(store.meta()?.provider).toBe('mock');
  });

  it('undo and redo walk the history of edits', async () => {
    await store.generate();
    store.editField('title', 'Edited title');
    expect(store.copy()?.title).toBe('Edited title');
    store.undo();
    expect(store.copy()?.title).toBe('Card 1');
    store.redo();
    expect(store.copy()?.title).toBe('Edited title');
  });

  it('coalesces fast typing in one field into a single undo step', async () => {
    await store.generate();
    store.editField('description', 'A');
    store.editField('description', 'AB');
    store.editField('description', 'ABC');
    store.undo();
    expect(store.copy()?.description).toContain('thoughtfully made');
  });

  it('template switches and variation selection are undoable', async () => {
    next = async () => response(3);
    await store.generate();
    store.setTemplate('bold');
    store.selectVariation(2);
    expect(store.copy()?.title).toBe('Card 3');
    store.undo();
    expect(store.active()).toBe(0);
    store.undo();
    expect(store.template()).not.toBe('bold');
  });

  it('regenerates a single field and keeps the rest', async () => {
    await store.generate();
    store.editField('title', 'Keep me');
    next = async () => ({ ...response(), field: 'description', variations: [{ title: 'Keep me', description: 'A brand new description that is long enough to pass validation.', keywords: ['one', 'two', 'three', 'four'] }] });
    await store.regenerate('description');
    expect(calls.at(-1)).toMatchObject({ field: 'description', current: { title: 'Keep me' } });
    expect(store.copy()?.title).toBe('Keep me');
    expect(store.copy()?.description).toContain('brand new');
  });

  it('sanitises keyword edits (dedupe, lowercase, max 10)', async () => {
    await store.generate();
    store.setKeywords(['Silk', 'silk', 'X', ...Array.from({ length: 15 }, (_, i) => `kw${i}`)]);
    const kw = store.copy()!.keywords;
    expect(kw[0]).toBe('silk');
    expect(kw).not.toContain('x');
    expect(kw.length).toBe(10);
  });

  it('surfaces rate-limit errors with a cooldown', async () => {
    next = async () => {
      throw new ApiError(429, 'rate_limited', 'Easy there!', 30);
    };
    expect(await store.generate()).toBe(false);
    expect(store.error()?.code).toBe('rate_limited');
    expect(store.cooldownUntil()).toBeGreaterThan(Date.now());
  });

  it('saves to the guest library and reloads a saved card', async () => {
    await store.generate();
    const saved = await store.save();
    expect(saved?.id).toMatch(/^card_/);
    expect(JSON.parse(localStorage.getItem('vitrine.guest.cards') ?? '[]')).toHaveLength(1);
    store.reset();
    expect(store.hasCard()).toBe(false);
    store.load(saved!);
    expect(store.copy()?.title).toBe('Card 1');
    expect(store.canUndo()).toBe(false);
  });
});
