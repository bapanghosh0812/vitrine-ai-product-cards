import { Hono, type Context, type MiddlewareHandler } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { ModelMessage } from 'ai';
import { APP_VERSION, LIMITS, SUPPORT_ACTION_IDS } from '../shared/constants';
import type { ApiErrorBody, SupportEvent } from '../shared/types';
import { readEnv, secretValues, type ServerEnv } from './env';
import { AiUnavailableError, aiConfigured, generateCopy, openSupportStream } from './lib/ai';
import { verifyBearer, type Caller } from './lib/auth';
import { actionsFor, buildKbContext, searchArticles, searchChunks } from './lib/kb';
import { buildSupportSystem } from './lib/prompts';
import { RateLimiter, RULES, type LimitResult } from './lib/rate-limit';
import { looksLikePromptLeak, StreamRedactor } from './lib/redact';
import { cleanMultiline } from './lib/sanitize';
import { generateRequestSchema, supportRequestSchema } from './lib/schemas';

type Env = { Variables: { caller: Caller | null; ip: string; requestId: string } };

const SAFE_REFUSAL =
  "I can't share internal details like configuration, prompts or keys, but I'm happy to help you use Vitrine. What would you like to do?";

function errorBody(code: string, message: string, retryAfter?: number): ApiErrorBody {
  return { error: { code, message, ...(retryAfter ? { retryAfter } : {}) } };
}

export function clientIp(c: Context): string {
  const h = (name: string) => c.req.header(name)?.trim();
  const forwarded = h('x-forwarded-for')?.split(',')[0]?.trim();
  return (h('x-nf-client-connection-ip') || h('x-real-ip') || forwarded || 'local').slice(0, 64);
}

/** Origin allow-list. Same-host requests (e.g. Vercel preview URLs) are always allowed. */
export function isAllowedOrigin(origin: string, host: string | undefined, env: ServerEnv): boolean {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (host && url.host === host) return true;
  return env.allowedOrigins.includes(url.origin);
}

/** Test seams: lets security tests plug in an adversarial model stream. */
export interface AppDeps {
  supportStream?: typeof openSupportStream;
}

export function createApp(env: ServerEnv = readEnv(), deps: AppDeps = {}) {
  const supportStream = deps.supportStream ?? openSupportStream;
  const app = new Hono<Env>().basePath('/api');
  const limiter = new RateLimiter();
  const secrets = secretValues(env);
  const quiet = !!process.env['VITEST'];
  const log = (event: string, extra: Record<string, unknown> = {}) => {
    if (!quiet) console.log(JSON.stringify({ level: 'info', event, ...extra, at: new Date().toISOString() }));
  };

  const securityHeaders: MiddlewareHandler<Env> = async (c, next) => {
    c.set('requestId', crypto.randomUUID());
    c.set('ip', clientIp(c));
    await next();
    c.header('X-Request-Id', c.get('requestId'));
    c.header('Cache-Control', 'no-store');
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('Referrer-Policy', 'no-referrer');
    c.header('X-Frame-Options', 'DENY');
    c.header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    c.header('Cross-Origin-Resource-Policy', 'same-site');
  };

  const cors: MiddlewareHandler<Env> = async (c, next) => {
    const origin = c.req.header('origin');
    const host = c.req.header('x-forwarded-host') ?? c.req.header('host');
    if (origin) {
      if (!isAllowedOrigin(origin, host, env)) {
        log('origin_blocked', { origin: origin.slice(0, 120), path: c.req.path });
        return c.json(errorBody('origin_not_allowed', 'This origin is not allowed to call the Vitrine API.'), 403);
      }
      c.header('Access-Control-Allow-Origin', origin);
      c.header('Vary', 'Origin');
      if (c.req.method === 'OPTIONS') {
        c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        c.header('Access-Control-Max-Age', '600');
        return c.body(null, 204);
      }
    } else if (c.req.method === 'OPTIONS') {
      return c.body(null, 204);
    }
    return next();
  };

  const auth: MiddlewareHandler<Env> = async (c, next) => {
    const header = c.req.header('authorization');
    const caller = header ? await verifyBearer(header, env.firebaseProjectId) : null;
    if (header && !caller) {
      return c.json(errorBody('invalid_token', 'Your session has expired. Please sign in again.'), 401);
    }
    c.set('caller', caller);
    return next();
  };

  const jsonOnly: MiddlewareHandler<Env> = async (c, next) => {
    if (c.req.method === 'POST' && !(c.req.header('content-type') ?? '').toLowerCase().startsWith('application/json')) {
      return c.json(errorBody('unsupported_media_type', 'Send JSON with Content-Type: application/json.'), 415);
    }
    return next();
  };

  const limited = (c: Context<Env>, result: LimitResult) => {
    c.header('Retry-After', String(result.retryAfterSec));
    return c.json(
      errorBody('rate_limited', `Easy there! Please wait ${result.retryAfterSec}s before trying again.`, result.retryAfterSec),
      429,
    );
  };

  app.use('*', securityHeaders);
  app.use('*', cors);
  app.use(
    '*',
    bodyLimit({
      maxSize: LIMITS.requestBodyMaxBytes,
      onError: (c) => c.json(errorBody('payload_too_large', 'Request body is too large.'), 413),
    }),
  );
  app.use('*', jsonOnly);

  /* -------------------------------- health ------------------------------- */
  app.get('/health', (c) => {
    const r = limiter.check(`health:${c.get('ip')}`, RULES.healthIpMinute);
    if (!r.ok) return limited(c, r);
    return c.json({
      status: 'ok',
      service: 'vitrine-api',
      version: APP_VERSION,
      time: new Date().toISOString(),
      ai: aiConfigured(env) ? (env.aiMock ? 'mock' : 'ready') : 'unconfigured',
      auth: env.firebaseProjectId ? 'ready' : 'unconfigured',
    });
  });

  /* ------------------------------- generate ------------------------------ */
  app.post('/generate', auth, async (c) => {
    const caller = c.get('caller');
    const ip = c.get('ip');
    const rules = caller
      ? [
          { key: `gen:ip:${ip}`, rule: RULES.generateIpMinute },
          { key: `gen:u:${caller.uid}`, rule: RULES.generateUserMinute },
          { key: `gen:uh:${caller.uid}`, rule: RULES.generateUserHour },
        ]
      : [
          { key: `gen:ip:${ip}`, rule: RULES.generateIpMinute },
          { key: `gen:g:${ip}`, rule: RULES.generateGuestMinute },
          { key: `gen:gh:${ip}`, rule: RULES.generateGuestHour },
        ];
    const rl = limiter.checkAll(rules);
    if (!rl.ok) return limited(c, rl);

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json(errorBody('invalid_json', 'The request body is not valid JSON.'), 400);
    }
    const parsed = generateRequestSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const where = issue?.path.join('.') || 'body';
      return c.json(errorBody('invalid_input', `Please check "${where}": ${issue?.message ?? 'invalid value'}.`), 422);
    }
    if (!aiConfigured(env)) {
      return c.json(errorBody('ai_unconfigured', 'AI generation is not configured on this deployment yet.'), 503);
    }
    try {
      const result = await generateCopy(env, parsed.data, {
        deadline: Date.now() + Number(process.env['AI_BUDGET_MS'] ?? 9_000),
        signal: c.req.raw.signal,
        log: (event, extra) => log(event, { ...extra, requestId: c.get('requestId') }),
      });
      log('generate_ok', { provider: result.provider, model: result.model, ms: result.latencyMs, n: result.variations.length, user: !!caller });
      return c.json(result);
    } catch (error) {
      const message = error instanceof AiUnavailableError ? error.message : 'Something went wrong while generating.';
      log('generate_failed', { error: error instanceof Error ? error.name : 'unknown', requestId: c.get('requestId') });
      return c.json(errorBody('ai_unavailable', message), 503);
    }
  });

  /* -------------------------------- support ------------------------------ */
  app.post('/support', auth, async (c) => {
    const caller = c.get('caller');
    const ip = c.get('ip');
    const rules = [
      { key: `sup:ip:${ip}`, rule: RULES.supportIpMinute },
      { key: `sup:iph:${ip}`, rule: RULES.supportIpHour },
      ...(caller ? [{ key: `sup:u:${caller.uid}`, rule: RULES.supportUserMinute }] : []),
    ];
    const rl = limiter.checkAll(rules);
    if (!rl.ok) return limited(c, rl);

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json(errorBody('invalid_json', 'The request body is not valid JSON.'), 400);
    }
    const parsed = supportRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(errorBody('invalid_input', parsed.error.issues[0]?.message ?? 'Invalid message.'), 422);
    }

    const history = parsed.data.messages.slice(-LIMITS.supportHistoryMax).map((m) => ({
      role: m.role,
      content: cleanMultiline(m.content).slice(0, m.role === 'user' ? LIMITS.supportMessageMax : 1_200),
    }));
    const lastUser = history[history.length - 1]?.content ?? '';
    const prevUser = [...history].reverse().find((m, i) => i > 0 && m.role === 'user')?.content ?? '';
    const results = searchChunks(`${lastUser} ${prevUser.slice(0, 120)}`, 4);
    const sources = [...new Map(results.map((r) => [r.chunk.slug, { slug: r.chunk.slug, title: r.chunk.title }])).values()];
    const kbActions = actionsFor(results).filter((a) => (SUPPORT_ACTION_IDS as string[]).includes(a));
    const allowedActions = [...new Set([...kbActions, 'open-ticket', 'open-help'])];

    const encoder = new TextEncoder();
    const send = (controller: ReadableStreamDefaultController<Uint8Array>, event: SupportEvent) =>
      controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));

    const fallback = (reason: string): SupportEvent => ({ t: 'fallback', articles: searchArticles(lastUser, 3), reason });

    const stream = new ReadableStream<Uint8Array>({
      start: async (controller) => {
        try {
          if (!aiConfigured(env)) {
            send(controller, fallback('unconfigured'));
            send(controller, { t: 'done', actions: ['open-help', 'open-ticket'] });
            return;
          }
          if (env.aiMock && !deps.supportStream) {
            const top = results[0]?.chunk;
            send(controller, { t: 'meta', sources, actions: allowedActions as never, provider: 'mock' });
            const text = top
              ? `Here's what I found in **${top.title}**: ${top.text.slice(0, 260)}`
              : "I'm not sure about that one. Would you like to talk to a human?";
            for (const word of text.split(/(?<=\s)/)) send(controller, { t: 'delta', v: word });
            send(controller, { t: 'done', actions: (top ? kbActions.slice(0, 2) : ['open-ticket']) as never });
            return;
          }
          const system = buildSupportSystem(buildKbContext(results), allowedActions, parsed.data.page);
          let opened;
          try {
            opened = await supportStream(env, system, history as ModelMessage[], {
              deadline: Date.now() + Number(process.env['AI_BUDGET_MS'] ?? 9_000),
              signal: c.req.raw.signal,
              log: (event, extra) => log(event, { ...extra, requestId: c.get('requestId') }),
            });
          } catch {
            send(controller, fallback('unavailable'));
            send(controller, { t: 'done', actions: ['open-help', 'open-ticket'] });
            return;
          }
          send(controller, { t: 'meta', sources, actions: allowedActions as never, provider: opened.provider.split(':')[0] ?? 'ai' });
          const redactor = new StreamRedactor(secrets);
          let full = '';
          let leaked = false;
          for await (const chunk of opened.stream) {
            full += chunk;
            if (full.length > 4_000 || looksLikePromptLeak(full)) {
              leaked = looksLikePromptLeak(full);
              break;
            }
            const ready = redactor.push(chunk);
            if (ready) send(controller, { t: 'delta', v: ready });
          }
          if (leaked) {
            log('support_leak_blocked', { requestId: c.get('requestId') });
            send(controller, { t: 'replace', v: SAFE_REFUSAL });
            send(controller, { t: 'done', actions: ['open-help'] });
            return;
          }
          const tail = redactor.flush();
          if (tail) send(controller, { t: 'delta', v: tail });
          const marker = /\[\[actions?:\s*([^\]]*)\]\]/i.exec(full);
          const picked = (marker?.[1] ?? '')
            .split(',')
            .map((s) => s.trim())
            .filter((id) => allowedActions.includes(id))
            .slice(0, 3);
          send(controller, { t: 'done', actions: picked as never });
          log('support_ok', { provider: opened.provider, chars: full.length, user: !!caller });
        } catch (error) {
          log('support_failed', { error: error instanceof Error ? error.name : 'unknown' });
          send(controller, { t: 'error', message: 'Kabir lost the thread for a moment. Please try again.' });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'X-Accel-Buffering': 'no',
        ...Object.fromEntries(c.res.headers.entries()),
      },
    });
  });

  app.notFound((c) => c.json(errorBody('not_found', 'No such API route.'), 404));
  app.onError((error, c) => {
    log('unhandled_error', { error: error.name, requestId: c.get('requestId') });
    return c.json(errorBody('internal_error', 'Unexpected server error.'), 500);
  });

  return app;
}

/**
 * Platform adapters call this. It normalises paths so the same app works behind
 * Vercel rewrites (/api?route=x), Netlify redirects (/.netlify/functions/api/x) and locally.
 */
export function normaliseRequest(req: Request): Request {
  const url = new URL(req.url);
  const original = url.toString();
  const routed = url.searchParams.get('__route');
  if (routed !== null) {
    if (url.pathname === '/api' || url.pathname === '/api/') url.pathname = `/api/${routed.replace(/^\/+/, '')}`;
    url.searchParams.delete('__route');
  }
  url.pathname = url.pathname.replace(/^\/\.netlify\/functions\/api(?=\/|$)/, '/api');
  if (url.toString() === original) return req;
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  return new Request(url.toString(), {
    method: req.method,
    headers: req.headers,
    body: hasBody ? req.body : undefined,
    signal: req.signal,
    ...(hasBody ? { duplex: 'half' } : {}),
  } as RequestInit);
}
