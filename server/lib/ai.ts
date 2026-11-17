import { createGoogle } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { generateText, Output, streamText, type LanguageModel, type ModelMessage } from 'ai';
import { z } from 'zod';
import { CATEGORIES, LIMITS } from '../../shared/constants';
import type { CopyField, GenerateResponse, ProductCopy } from '../../shared/types';
import type { ServerEnv } from '../env';
import { buildGeneratePrompt, GENERATE_SYSTEM, temperatureFor } from './prompts';
import { clampWords, tidyCopyText, uniqueKeywords } from './sanitize';
import { productCopySchema, type GenerateInput } from './schemas';

type ProviderName = 'groq' | 'gemini';

interface Candidate {
  provider: ProviderName;
  modelId: string;
  model: LanguageModel;
  providerOptions?: Record<string, Record<string, string | number | boolean | Record<string, string | number>>>;
}

export class AiUnavailableError extends Error {
  constructor(message = 'All AI providers are unavailable right now.') {
    super(message);
    this.name = 'AiUnavailableError';
  }
}

export function aiConfigured(env: ServerEnv): boolean {
  return env.aiMock || !!env.groqApiKey || !!env.geminiApiKey;
}

function geminiOptions(modelId: string): Candidate['providerOptions'] {
  if (/gemini-2\.5/.test(modelId)) return { google: { thinkingConfig: { thinkingBudget: 0 } } };
  if (/gemini-3/.test(modelId)) return { google: { thinkingConfig: { thinkingLevel: 'low' } } };
  return undefined;
}

function groqOptions(modelId: string): Candidate['providerOptions'] {
  if (/gpt-oss/.test(modelId)) return { groq: { reasoningEffort: 'low', structuredOutputs: true } };
  if (/qwen3/.test(modelId)) return { groq: { reasoningFormat: 'hidden' } };
  return undefined;
}

/** Ordered provider chain: preferred provider first, then the other, then the Groq backup model. */
export function candidates(env: ServerEnv, preference: 'auto' | 'groq' | 'gemini' = 'auto'): Candidate[] {
  const list: Candidate[] = [];
  const groq = env.groqApiKey ? createGroq({ apiKey: env.groqApiKey }) : null;
  const google = env.geminiApiKey ? createGoogle({ apiKey: env.geminiApiKey }) : null;
  const groqPrimary: Candidate | null = groq
    ? { provider: 'groq', modelId: env.groqModel, model: groq(env.groqModel), providerOptions: groqOptions(env.groqModel) }
    : null;
  const gemini: Candidate | null = google
    ? { provider: 'gemini', modelId: env.geminiModel, model: google(env.geminiModel), providerOptions: geminiOptions(env.geminiModel) }
    : null;
  const groqBackup: Candidate | null =
    groq && env.groqFallbackModel && env.groqFallbackModel !== env.groqModel
      ? {
          provider: 'groq',
          modelId: env.groqFallbackModel,
          model: groq(env.groqFallbackModel),
          providerOptions: groqOptions(env.groqFallbackModel),
        }
      : null;
  const order = preference === 'gemini' ? [gemini, groqPrimary, groqBackup] : [groqPrimary, gemini, groqBackup];
  for (const c of order) if (c) list.push(c);
  return list;
}

/* ------------------------------------------------------------------ */
/* Product copy generation                                             */
/* ------------------------------------------------------------------ */

const modelCopy = z.object({
  title: z.string().describe(`Product title, at most ${LIMITS.titleSeo} characters`),
  description: z.string().describe('Two or three sentences, about 140 to 220 characters'),
  keywords: z.array(z.string()).describe('Four to eight lowercase search keywords'),
});

function schemaFor(field: CopyField | undefined, count: number) {
  if (field === 'title') return z.object({ title: z.string().describe(`New product title, at most ${LIMITS.titleSeo} characters`) });
  if (field === 'description') return z.object({ description: z.string().describe('New description, 2-3 sentences, 140-220 characters') });
  if (field === 'keywords') return z.object({ keywords: z.array(z.string()).describe('Four to eight new lowercase search keywords') });
  return z.object({ variations: z.array(modelCopy).describe(`Exactly ${count} product card variation${count > 1 ? 's' : ''}`) });
}

function fallbackKeywords(input: GenerateInput): string[] {
  const category = CATEGORIES.find((c) => c.id === input.category)?.label ?? input.category;
  return [input.name, category, `${category} gift`, `premium ${category}`].map((v) => v.toLowerCase());
}

/** Normalise one model-produced card and validate it. Returns null when it is not usable. */
export function finaliseCopy(raw: Partial<ProductCopy>, input: GenerateInput): ProductCopy | null {
  const title = clampWords(tidyCopyText(raw.title ?? ''), LIMITS.titleMax);
  const description = clampWords(tidyCopyText(raw.description ?? ''), LIMITS.descriptionMax);
  let keywords = uniqueKeywords(Array.isArray(raw.keywords) ? raw.keywords : [], LIMITS.keywordsMax);
  if (keywords.length < LIMITS.keywordsMin) {
    keywords = uniqueKeywords([...keywords, ...fallbackKeywords(input)], LIMITS.keywordsMax);
  }
  const parsed = productCopySchema.safeParse({ title, description, keywords });
  return parsed.success ? parsed.data : null;
}

interface CallOptions {
  deadline: number;
  signal?: AbortSignal;
  log?: (msg: string, extra?: Record<string, unknown>) => void;
}

export async function generateCopy(env: ServerEnv, input: GenerateInput, opts: CallOptions): Promise<GenerateResponse> {
  const started = Date.now();
  if (env.aiMock) return mockGenerate(input, started);

  const chain = candidates(env, input.provider ?? 'auto');
  if (!chain.length) throw new AiUnavailableError('No AI provider is configured on the server.');

  const count = input.field ? 1 : (input.variations ?? 1);
  const schema = schemaFor(input.field, count);
  const prompt = buildGeneratePrompt(input);
  let attempt = 0;

  for (const candidate of chain) {
    // Two tries per provider: the second one only if the first returned invalid JSON/copy.
    for (let i = 0; i < 2; i++) {
      const remaining = opts.deadline - Date.now();
      if (remaining < 1_200) throw new AiUnavailableError('The AI took too long to respond. Please try again.');
      attempt++;
      try {
        const result = await generateText({
          model: candidate.model,
          instructions: GENERATE_SYSTEM,
          prompt,
          output: Output.object({ schema, name: 'product_card', description: 'Product card copy' }),
          temperature: temperatureFor(input) + i * 0.1,
          maxOutputTokens: 900 * count,
          maxRetries: 0,
          timeout: Math.min(remaining - 200, 12_000),
          abortSignal: opts.signal,
          providerOptions: candidate.providerOptions,
        });
        const out = result.output as Record<string, unknown>;
        const variations = collectVariations(out, input, count);
        if (!variations.length) {
          opts.log?.('invalid_output', { provider: candidate.provider, attempt });
          continue;
        }
        return {
          variations,
          field: input.field,
          provider: candidate.provider,
          model: candidate.modelId,
          latencyMs: Date.now() - started,
          fallbackUsed: candidate !== chain[0],
        };
      } catch (error) {
        opts.log?.('provider_error', {
          provider: candidate.provider,
          attempt,
          error: error instanceof Error ? error.name : 'unknown',
        });
        if (opts.signal?.aborted) throw new AiUnavailableError('Request cancelled.');
        break; // a hard provider error moves straight to the next provider
      }
    }
  }
  throw new AiUnavailableError();
}

function collectVariations(out: Record<string, unknown>, input: GenerateInput, count: number): ProductCopy[] {
  if (input.field && input.current) {
    const merged: Partial<ProductCopy> = { ...input.current };
    if (input.field === 'title') merged.title = String(out['title'] ?? '');
    if (input.field === 'description') merged.description = String(out['description'] ?? '');
    if (input.field === 'keywords') merged.keywords = Array.isArray(out['keywords']) ? (out['keywords'] as string[]).map(String) : [];
    const card = finaliseCopy(merged, input);
    return card ? [card] : [];
  }
  const list = Array.isArray(out['variations']) ? (out['variations'] as Partial<ProductCopy>[]) : [];
  return list
    .slice(0, count)
    .map((v) => finaliseCopy(v, input))
    .filter((v): v is ProductCopy => v !== null);
}

/* ------------------------------------------------------------------ */
/* Deterministic mock (AI_MOCK=1): used by e2e tests and keyless dev   */
/* ------------------------------------------------------------------ */

const MOCK_ANGLES = [
  { lead: 'Crafted for everyday brilliance', mood: 'quietly confident and made to last' },
  { lead: 'A small luxury you will reach for daily', mood: 'warm, tactile and thoughtfully finished' },
  { lead: 'Designed to turn heads', mood: 'bold in character yet effortless to live with' },
];

export function mockGenerate(input: GenerateInput, started = Date.now()): GenerateResponse {
  const category = CATEGORIES.find((c) => c.id === input.category)?.label ?? 'Product';
  const count = input.field ? 1 : (input.variations ?? 1);
  const variations: ProductCopy[] = [];
  for (let i = 0; i < count; i++) {
    const angle = MOCK_ANGLES[i % MOCK_ANGLES.length]!;
    const card = finaliseCopy(
      {
        title: `${input.name}: ${angle.lead}`.slice(0, 60),
        description: `${input.name} brings ${category.toLowerCase()} done right: ${angle.mood}. ${
          input.features?.length ? `Highlights include ${input.features.slice(0, 2).join(' and ')}.` : 'Every detail is considered, from first look to daily use.'
        }`,
        keywords: [input.name, category, `${category} online`, `best ${input.name}`, 'premium quality', 'gift idea'],
      },
      input,
    );
    if (card) variations.push(card);
  }
  if (input.field && input.current) {
    const base = { ...input.current };
    const fresh = variations[0]!;
    if (input.field === 'title') base.title = `${fresh.title.replace(/:.*/, '')}: refreshed`;
    if (input.field === 'description') base.description = fresh.description;
    if (input.field === 'keywords') base.keywords = [...fresh.keywords].reverse();
    const merged = finaliseCopy(base, input);
    return { variations: merged ? [merged] : variations, field: input.field, provider: 'mock', model: 'mock-1', latencyMs: Date.now() - started, fallbackUsed: false };
  }
  return { variations, provider: 'mock', model: 'mock-1', latencyMs: Date.now() - started, fallbackUsed: false };
}

/* ------------------------------------------------------------------ */
/* Support chat streaming                                              */
/* ------------------------------------------------------------------ */

export interface SupportStreamResult {
  provider: string;
  stream: AsyncGenerator<string>;
}

/**
 * Opens a text stream with the first provider that produces a first token.
 * Throws AiUnavailableError when no provider can start a stream.
 */
export async function openSupportStream(
  env: ServerEnv,
  system: string,
  messages: ModelMessage[],
  opts: CallOptions,
): Promise<SupportStreamResult> {
  const chain = candidates(env, 'auto');
  for (const candidate of chain) {
    const remaining = opts.deadline - Date.now();
    if (remaining < 1_500) break;
    try {
      const result = streamText({
        model: candidate.model,
        instructions: system,
        messages,
        temperature: 0.3,
        maxOutputTokens: 450,
        maxRetries: 0,
        timeout: { totalMs: Math.min(remaining, 20_000), firstChunkMs: Math.min(remaining, 7_000) },
        abortSignal: opts.signal,
        providerOptions: candidate.providerOptions,
      });
      const iterator = result.fullStream[Symbol.asyncIterator]();
      // Pull until the first text delta (or an error) so we can fall back before streaming to the user.
      let first: string | null = null;
      while (first === null) {
        const next = await iterator.next();
        if (next.done) break;
        const part = next.value;
        if (part.type === 'error') throw part.error instanceof Error ? part.error : new Error('stream error');
        if (part.type === 'text-delta' && part.text) first = part.text;
      }
      if (first === null) throw new Error('empty stream');
      const firstChunk = first;
      async function* rest(): AsyncGenerator<string> {
        yield firstChunk;
        while (true) {
          const next = await iterator.next();
          if (next.done) return;
          const part = next.value;
          if (part.type === 'text-delta' && part.text) yield part.text;
          if (part.type === 'error') return;
        }
      }
      return { provider: `${candidate.provider}:${candidate.modelId}`, stream: rest() };
    } catch (error) {
      opts.log?.('support_provider_error', { provider: candidate.provider, error: error instanceof Error ? error.name : 'unknown' });
      if (opts.signal?.aborted) break;
    }
  }
  throw new AiUnavailableError();
}
