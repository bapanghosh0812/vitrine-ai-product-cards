/**
 * Luxury, email-client-safe templates (tables + inline styles). Every value that came
 * from a user is HTML-escaped. Guest confirmations deliberately contain NO user-supplied
 * text, so the form cannot be abused to send arbitrary content to arbitrary addresses.
 */
const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c] ?? c);

const EMERALD = '#0E4D3A';
const DEEP = '#05231A';
const GOLD = '#C9A35B';
const IVORY = '#FBF7F0';
const INK = '#12201A';
const MUTED = '#5F6B64';
const SERIF = "'Instrument Serif', Georgia, 'Times New Roman', serif";
const SANS = "'Geist', 'Segoe UI', Helvetica, Arial, sans-serif";

export function formatIst(date = new Date()): string {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(date) + ' IST';
}

function frame(siteUrl: string, preheader: string, body: string): string {
  const logo = `${siteUrl}/icons/icon-192.png`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>Vitrine</title></head>
<body style="margin:0;padding:0;background:#EFE8DA;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EFE8DA;padding:28px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${IVORY};border-radius:22px;overflow:hidden;border:1px solid #E6D7B5;">
<tr><td style="background:${EMERALD};background-image:linear-gradient(135deg,#1A7A5D 0%,${EMERALD} 45%,${DEEP} 100%);padding:30px 36px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td width="56" valign="middle"><img src="${logo}" width="52" height="52" alt="Vitrine" style="display:block;border-radius:14px;border:1px solid rgba(214,182,114,.45);"></td>
<td valign="middle" style="padding-left:14px;font-family:${SERIF};font-size:30px;line-height:1;color:#F6E3AE;">Vitrine<div style="font-family:${SANS};font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:rgba(251,247,240,.75);margin-top:6px;">Products, beautifully told.</div></td>
</tr></table>
</td></tr>
<tr><td style="height:4px;background:linear-gradient(90deg,#8F6E33,#D6B672,#F6E3AE,#C9A35B,#8F6E33);background-color:${GOLD};font-size:0;line-height:0;">&nbsp;</td></tr>
${body}
<tr><td style="padding:26px 36px 32px;border-top:1px solid #EADFC8;font-family:${SANS};font-size:12px;line-height:1.6;color:${MUTED};">
Designed &amp; built by <strong style="color:${INK};">Bapan Ghosh</strong> · Kolkata, India<br>
<a href="${siteUrl}/legal/privacy" style="color:${EMERALD};">Privacy</a> &nbsp;·&nbsp; <a href="${siteUrl}/legal/terms" style="color:${EMERALD};">Terms</a> &nbsp;·&nbsp; <a href="${siteUrl}/help" style="color:${EMERALD};">Help Center</a>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

const button = (href: string, label: string, primary: boolean) =>
  `<a href="${href}" style="display:inline-block;padding:13px 24px;border-radius:999px;font-family:${SANS};font-size:14px;font-weight:600;text-decoration:none;${
    primary ? `background:${GOLD};background-image:linear-gradient(180deg,#F1DBA3,#D6B672 45%,#B8913F);color:#2B200C;` : `border:1px solid ${EMERALD};color:${EMERALD};`
  }">${label}</a>`;

export interface ConfirmationInput {
  ticketId: string;
  siteUrl: string;
  /** Only for verified accounts; omitted for guests. */
  name?: string;
  subject?: string;
  submittedAt?: Date;
}

/** Auto-reply to the person who opened the ticket. */
export function confirmationEmail(input: ConfirmationInput): { subject: string; html: string; text: string } {
  const first = input.name ? input.name.trim().split(/\s+/)[0]!.slice(0, 40) : '';
  const greeting = first ? `Hello ${escapeHtml(first)},` : 'Hello,';
  const when = formatIst(input.submittedAt);
  const subjectRow = input.subject
    ? `<tr><td style="padding:6px 0;font-family:${SANS};font-size:13px;color:${MUTED};width:120px;">Subject</td><td style="padding:6px 0;font-family:${SANS};font-size:14px;color:${INK};">${escapeHtml(input.subject.slice(0, 120))}</td></tr>`
    : '';
  const body = `
<tr><td style="padding:38px 36px 10px;">
<p style="margin:0 0 6px;font-family:${SANS};font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#7D602B;font-weight:600;">Support request received</p>
<h1 style="margin:0 0 16px;font-family:${SERIF};font-weight:400;font-size:34px;line-height:1.1;color:${EMERALD};">${greeting}</h1>
<p style="margin:0 0 14px;font-family:${SANS};font-size:15px;line-height:1.65;color:${INK};">Thank you for reaching out to Vitrine. Your request is safely with us, and a member of our team will personally review it and reply to this email within <strong>1–2 business days</strong>.</p>
</td></tr>
<tr><td style="padding:6px 36px 6px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFDF8;border:1px solid #E2CB98;border-radius:16px;">
<tr><td style="padding:20px 22px;">
<p style="margin:0 0 4px;font-family:${SANS};font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#7D602B;font-weight:600;">Your ticket</p>
<p style="margin:0 0 12px;font-family:${SERIF};font-size:30px;color:${EMERALD};letter-spacing:.02em;">${escapeHtml(input.ticketId)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${subjectRow}
<tr><td style="padding:6px 0;font-family:${SANS};font-size:13px;color:${MUTED};width:120px;">Received</td><td style="padding:6px 0;font-family:${SANS};font-size:14px;color:${INK};">${escapeHtml(when)}</td></tr>
<tr><td style="padding:6px 0;font-family:${SANS};font-size:13px;color:${MUTED};">Status</td><td style="padding:6px 0;font-family:${SANS};font-size:14px;color:${EMERALD};font-weight:600;">Open · in our queue</td></tr>
</table>
</td></tr></table>
<p style="margin:12px 0 0;font-family:${SANS};font-size:13px;color:${MUTED};">Please keep this ticket ID; just reply to this email if you want to add anything.</p>
</td></tr>
<tr><td style="padding:24px 36px 8px;" align="left">
${button(`${input.siteUrl}/studio`, 'Open the Studio', true)}&nbsp;&nbsp;${button(`${input.siteUrl}/help`, 'Visit Help Center', false)}
</td></tr>
<tr><td style="padding:22px 36px 30px;">
<p style="margin:0 0 8px;font-family:${SERIF};font-size:20px;color:${INK};">While you wait</p>
<p style="margin:0;font-family:${SANS};font-size:14px;line-height:1.8;color:${INK};">
✦ <a href="${input.siteUrl}/help/exporting" style="color:${EMERALD};">Export your card as PNG, JSON or HTML</a><br>
✦ <a href="${input.siteUrl}/help/brand-kit" style="color:${EMERALD};">Make every generation sound like your brand</a><br>
✦ <a href="${input.siteUrl}/help/troubleshooting" style="color:${EMERALD};">Quick fixes for common issues</a>
</p>
<p style="margin:16px 0 0;font-family:${SANS};font-size:12px;line-height:1.6;color:${MUTED};">You are receiving this because a support request was submitted on Vitrine with this email address. If this wasn't you, you can safely ignore this message. We will never ask for your password.</p>
</td></tr>`;
  const text = [
    first ? `Hello ${first},` : 'Hello,',
    '',
    'Thank you for reaching out to Vitrine. Your request has been received and a member of our team will reply to this email within 1-2 business days.',
    '',
    `Ticket ID: ${input.ticketId}`,
    input.subject ? `Subject: ${input.subject.slice(0, 120)}` : '',
    `Received: ${when}`,
    '',
    `Open the Studio: ${input.siteUrl}/studio`,
    `Help Center: ${input.siteUrl}/help`,
    '',
    "If this wasn't you, ignore this email. We will never ask for your password.",
    '— Vitrine · Designed & built by Bapan Ghosh',
  ]
    .filter((l, i, a) => l !== '' || a[i - 1] !== '')
    .join('\n');
  return { subject: `We've received your request · ${input.ticketId} · Vitrine`, html: frame(input.siteUrl, `Ticket ${input.ticketId} is open. We'll reply within 1–2 business days.`, body), text };
}

export interface NotificationInput {
  ticketId: string;
  siteUrl: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  page?: string;
  transcript?: { role: string; content: string }[];
  verified: boolean;
  uid?: string;
  submittedAt?: Date;
}

/** Internal notification to the support inbox. */
export function notificationEmail(input: NotificationInput): { subject: string; html: string; text: string } {
  const row = (label: string, value: string) =>
    `<tr><td style="padding:8px 0;border-bottom:1px solid #EFE6D3;font-family:${SANS};font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:${MUTED};width:130px;vertical-align:top;">${label}</td><td style="padding:8px 0;border-bottom:1px solid #EFE6D3;font-family:${SANS};font-size:14px;color:${INK};">${value}</td></tr>`;
  const transcript = (input.transcript ?? [])
    .map((m) => `<p style="margin:0 0 8px;font-family:${SANS};font-size:13px;line-height:1.55;color:${INK};"><strong style="color:${m.role === 'user' ? EMERALD : '#7D602B'};">${m.role === 'user' ? 'User' : 'Kabir'}:</strong> ${escapeHtml(m.content)}</p>`)
    .join('');
  const badge = input.verified
    ? `<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:#DCF2E8;color:${EMERALD};font-size:12px;font-weight:600;">Verified account</span>`
    : `<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:#F6EDD6;color:#6F5428;font-size:12px;font-weight:600;">Guest · email not verified</span>`;
  const body = `
<tr><td style="padding:34px 36px 8px;">
<p style="margin:0 0 6px;font-family:${SANS};font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#7D602B;font-weight:600;">New support ticket</p>
<h1 style="margin:0 0 6px;font-family:${SERIF};font-weight:400;font-size:32px;line-height:1.1;color:${EMERALD};">${escapeHtml(input.ticketId)}</h1>
<p style="margin:0 0 18px;font-family:${SANS};font-size:16px;color:${INK};font-weight:600;">${escapeHtml(input.subject)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${row('From', `${escapeHtml(input.name)} &nbsp;${badge}`)}
${row('Email', `<a href="mailto:${escapeHtml(input.email)}" style="color:${EMERALD};">${escapeHtml(input.email)}</a>`)}
${row('Phone', input.phone ? escapeHtml(input.phone) : '<span style="color:#9AA49E;">not provided</span>')}
${row('Page', escapeHtml(input.page ?? '/'))}
${row('Received', escapeHtml(formatIst(input.submittedAt)))}
${input.uid ? row('User ID', `<code style="font-size:12px;">${escapeHtml(input.uid)}</code>`) : ''}
</table>
</td></tr>
<tr><td style="padding:16px 36px 8px;">
<p style="margin:0 0 8px;font-family:${SERIF};font-size:20px;color:${INK};">Message</p>
<div style="padding:16px 18px;background:#FFFDF8;border:1px solid #E2CB98;border-radius:14px;font-family:${SANS};font-size:14px;line-height:1.65;color:${INK};white-space:pre-wrap;">${escapeHtml(input.message)}</div>
</td></tr>
${transcript ? `<tr><td style="padding:16px 36px 8px;"><p style="margin:0 0 8px;font-family:${SERIF};font-size:20px;color:${INK};">Ask Kabir transcript</p>${transcript}</td></tr>` : ''}
<tr><td style="padding:16px 36px 28px;font-family:${SANS};font-size:13px;color:${MUTED};">Reply to this email to answer the customer directly (Reply-To is set to their address).</td></tr>`;
  const text = [
    `New support ticket ${input.ticketId}`,
    `Subject: ${input.subject}`,
    `From: ${input.name} (${input.verified ? 'verified account' : 'guest, email not verified'})`,
    `Email: ${input.email}`,
    `Phone: ${input.phone ?? 'not provided'}`,
    `Page: ${input.page ?? '/'}`,
    `Received: ${formatIst(input.submittedAt)}`,
    input.uid ? `User ID: ${input.uid}` : '',
    '',
    input.message,
    ...(input.transcript?.length ? ['', 'Transcript:', ...input.transcript.map((m) => `${m.role === 'user' ? 'User' : 'Kabir'}: ${m.content}`)] : []),
  ].join('\n');
  return { subject: `[Vitrine] ${input.ticketId} · ${input.subject.slice(0, 90)}`, html: frame(input.siteUrl, `New ticket from ${input.name}`, body), text };
}
