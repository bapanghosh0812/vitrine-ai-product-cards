import { describe, expect, it } from 'vitest';
import { createApp } from './app';
import { readEnv } from './env';
import { confirmationEmail, escapeHtml, notificationEmail } from './lib/email-templates';
import type { MailMessage, Mailer } from './lib/mailer';

const env = readEnv({ AI_MOCK: '1', SUPPORT_INBOX: 'team@vitrine.test', SITE_URL: 'https://vitrine.test' });

function capture(fail: 'none' | 'inbox' | 'user' = 'none') {
  const sent: MailMessage[] = [];
  const mailer: Mailer = {
    from: 'Vitrine Support <team@vitrine.test>',
    async send(m) {
      if (fail === 'inbox' && m.to === 'team@vitrine.test') throw new Error('smtp down');
      if (fail === 'user' && m.to !== 'team@vitrine.test') throw new Error('bounce');
      sent.push(m);
    },
  };
  return { sent, mailer };
}

const ticket = (over: Record<string, unknown> = {}) => ({
  name: 'Asha Rao',
  email: 'asha@example.com',
  phone: '+91 98765 43210',
  subject: 'PNG export looks blurry',
  message: 'My PNG export looks blurry on mobile, can you help?',
  page: '/studio',
  ...over,
});

async function post(app: ReturnType<typeof createApp>, body: unknown, ip = '198.51.100.10') {
  return app.request('/api/support/ticket', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });
}

describe('POST /api/support/ticket', () => {
  it('emails the support inbox and sends the guest a confirmation without their text', async () => {
    const { sent, mailer } = capture();
    const res = await post(createApp(env, { mailer }), ticket());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ticketId: string; emailed: boolean; confirmation: boolean };
    expect(body.ticketId).toMatch(/^VT-[A-Z0-9]{6}$/);
    expect(body.confirmation).toBe(true);
    const inbox = sent.find((m) => m.to === 'team@vitrine.test')!;
    const user = sent.find((m) => m.to === 'asha@example.com')!;
    expect(inbox.replyTo).toBe('asha@example.com');
    expect(inbox.html).toContain('PNG export looks blurry');
    expect(inbox.html).toContain('+91 98765 43210');
    expect(user.subject).toContain(body.ticketId);
    expect(user.html).not.toContain('Asha');
    expect(user.html).not.toContain('PNG export looks blurry');
  });

  it('escapes HTML and neutralises header injection from user fields', async () => {
    const { sent, mailer } = capture();
    await post(createApp(env, { mailer }), ticket({ name: 'Eve<script>alert(1)</script>', subject: 'Hi\r\nBcc: victim@example.com', message: '<img src=x onerror=alert(1)> please help me' }));
    const inbox = sent.find((m) => m.to === 'team@vitrine.test')!;
    expect(inbox.html).not.toContain('<script>');
    expect(inbox.html).not.toContain('<img src=x');
    expect(inbox.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(inbox.subject).not.toMatch(/[\r\n]/);
    expect(sent.every((m) => !m.to.includes('victim'))).toBe(true);
  });

  it('silently drops honeypot submissions', async () => {
    const { sent, mailer } = capture();
    const res = await post(createApp(env, { mailer }), ticket({ website: 'https://spam.example' }));
    expect(res.status).toBe(200);
    expect(sent).toHaveLength(0);
  });

  it('validates input', async () => {
    const { mailer } = capture();
    const app = createApp(env, { mailer });
    expect((await post(app, ticket({ email: undefined }))).status).toBe(422);
    expect((await post(app, ticket({ email: 'not-an-email' }), '198.51.100.11')).status).toBe(422);
    expect((await post(app, ticket({ phone: 'call me maybe' }), '198.51.100.12')).status).toBe(422);
    expect((await post(app, ticket({ message: 'short' }), '198.51.100.13')).status).toBe(422);
    expect((await post(app, ticket({ role: 'admin' }), '198.51.100.14')).status).toBe(422);
  });

  it('throttles bursts from one IP (anti-spam relay)', async () => {
    const { mailer } = capture();
    const app = createApp(env, { mailer });
    const statuses = [];
    for (let i = 0; i < 5; i++) statuses.push((await post(app, ticket({ email: `user${i}@example.com` }), '203.0.113.50')).status);
    expect(statuses.slice(0, 3)).toEqual([200, 200, 200]);
    expect(statuses.slice(3)).toEqual([429, 429]);
  });

  it('limits confirmations to the same recipient across IPs', async () => {
    const { mailer } = capture();
    const app = createApp(env, { mailer });
    const statuses = [];
    for (let i = 0; i < 4; i++) statuses.push((await post(app, ticket({ email: 'victim@example.com' }), `203.0.113.${60 + i}`)).status);
    expect(statuses).toEqual([200, 200, 200, 429]);
  });

  it('returns 503 when mail is not configured and 502 when the inbox cannot be reached', async () => {
    expect((await post(createApp(env, { mailer: null }), ticket())).status).toBe(503);
    const { mailer } = capture('inbox');
    expect((await post(createApp(env, { mailer }), ticket(), '198.51.100.20')).status).toBe(502);
  });

  it('still succeeds when only the confirmation bounces', async () => {
    const { mailer } = capture('user');
    const res = await post(createApp(env, { mailer }), ticket(), '198.51.100.21');
    expect(res.status).toBe(200);
    expect(((await res.json()) as { confirmation: boolean }).confirmation).toBe(false);
  });
});

describe('email templates', () => {
  it('escapes every user value', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
    const n = notificationEmail({ ticketId: 'VT-ABC234', siteUrl: 'https://v.test', name: '<b>x</b>', email: 'a@b.co', subject: '<i>s</i>', message: '<script>', verified: false });
    expect(n.html).not.toMatch(/<b>x<\/b>|<i>s<\/i>|<script>/);
  });

  it('personalises confirmations only when a name is provided', () => {
    const c = confirmationEmail({ ticketId: 'VT-ABC234', siteUrl: 'https://v.test', name: 'Asha Rao', subject: 'Export' });
    expect(c.html).toContain('Hello Asha,');
    expect(c.html).toContain('https://v.test/icons/icon-192.png');
    expect(c.text).toContain('VT-ABC234');
    const g = confirmationEmail({ ticketId: 'VT-ABC234', siteUrl: 'https://v.test' });
    expect(g.html).toContain('Hello,');
  });
});
