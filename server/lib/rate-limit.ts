/**
 * Sliding-window rate limiter kept in memory.
 *
 * Serverless instances are short-lived and not shared, so this is a best-effort shield
 * against bursts from one client (it resets on cold start). Provider-side quotas and
 * client-side cooldowns form the next layers. See docs/adr/0004-rate-limiting.md.
 */
export interface LimitRule {
  /** Max requests inside the window. */
  limit: number;
  /** Window size in milliseconds. */
  windowMs: number;
}

export interface LimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

const MAX_KEYS = 5_000;

export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly now: () => number = Date.now) {}

  check(key: string, rule: LimitRule): LimitResult {
    const t = this.now();
    const from = t - rule.windowMs;
    const list = (this.hits.get(key) ?? []).filter((ts) => ts > from);
    if (list.length >= rule.limit) {
      const oldest = list[0] ?? t;
      this.hits.set(key, list);
      return { ok: false, remaining: 0, retryAfterSec: Math.max(1, Math.ceil((oldest + rule.windowMs - t) / 1000)) };
    }
    list.push(t);
    this.hits.set(key, list);
    if (this.hits.size > MAX_KEYS) this.sweep(from);
    return { ok: true, remaining: rule.limit - list.length, retryAfterSec: 0 };
  }

  /** Check several rules; all must pass. A hit is only recorded when every rule passes. */
  checkAll(entries: { key: string; rule: LimitRule }[]): LimitResult {
    let remaining = Number.POSITIVE_INFINITY;
    for (const { key, rule } of entries) {
      const peek = this.peek(key, rule);
      if (!peek.ok) return peek;
    }
    for (const { key, rule } of entries) {
      const r = this.check(key, rule);
      remaining = Math.min(remaining, r.remaining);
    }
    return { ok: true, remaining, retryAfterSec: 0 };
  }

  private peek(key: string, rule: LimitRule): LimitResult {
    const t = this.now();
    const list = (this.hits.get(key) ?? []).filter((ts) => ts > t - rule.windowMs);
    if (list.length >= rule.limit) {
      const oldest = list[0] ?? t;
      return { ok: false, remaining: 0, retryAfterSec: Math.max(1, Math.ceil((oldest + rule.windowMs - t) / 1000)) };
    }
    return { ok: true, remaining: rule.limit - list.length, retryAfterSec: 0 };
  }

  private sweep(from: number): void {
    for (const [key, list] of this.hits) {
      const kept = list.filter((ts) => ts > from);
      if (kept.length) this.hits.set(key, kept);
      else this.hits.delete(key);
    }
  }
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export const RULES = {
  generateGuestMinute: { limit: 8, windowMs: MINUTE },
  generateGuestHour: { limit: 60, windowMs: HOUR },
  generateUserMinute: { limit: 15, windowMs: MINUTE },
  generateUserHour: { limit: 150, windowMs: HOUR },
  generateIpMinute: { limit: 20, windowMs: MINUTE },
  supportIpMinute: { limit: 10, windowMs: MINUTE },
  supportIpHour: { limit: 80, windowMs: HOUR },
  supportUserMinute: { limit: 12, windowMs: MINUTE },
  healthIpMinute: { limit: 60, windowMs: MINUTE },
  // Support tickets send real emails, so they are throttled hard (anti-spam relay).
  ticketIpBurst: { limit: 3, windowMs: 10 * MINUTE },
  ticketIpDay: { limit: 8, windowMs: 24 * HOUR },
  ticketRecipientDay: { limit: 3, windowMs: 24 * HOUR },
  ticketGlobalDay: { limit: 300, windowMs: 24 * HOUR },
} satisfies Record<string, LimitRule>;
