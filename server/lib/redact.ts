/**
 * Output redaction. Every byte the support bot streams to the browser passes through
 * `Redactor`, which masks anything that looks like a credential, an environment
 * variable dump, or a leak of the system prompt. It is the last line of defence after
 * the prompt rules, so it is intentionally strict.
 */

const PATTERNS: { name: string; re: RegExp }[] = [
  { name: 'groq-key', re: /gsk_[A-Za-z0-9]{20,}/g },
  { name: 'google-key', re: /AIza[0-9A-Za-z\-_]{30,}/g },
  { name: 'openai-key', re: /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/g },
  { name: 'github-token', re: /gh[pousr]_[A-Za-z0-9]{30,}/g },
  { name: 'slack-token', re: /xox[baprs]-[A-Za-z0-9-]{10,}/g },
  { name: 'aws-key', re: /AKIA[0-9A-Z]{16}/g },
  { name: 'jwt', re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
  { name: 'private-key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g },
  { name: 'env-assignment', re: /\b[A-Z][A-Z0-9_]{2,}_(?:KEY|SECRET|TOKEN|PASSWORD|PASS|PRIVATE_KEY)\s*[=:]\s*\S+/g },
  { name: 'env-name', re: /\b(?:GROQ_API_KEY|GEMINI_API_KEY|GOOGLE_GENERATIVE_AI_API_KEY|FIREBASE_SERVICE_ACCOUNT|OWNER_EMAIL|SUPPORT_EMAIL|SECRETS\.env)\b/g },
  { name: 'prompt-leak', re: /<\/?(?:knowledge_base|product_data|current_card)>/gi },
];

const REPLACEMENT = '[redacted]';

export function redact(text: string, extraSecrets: string[] = []): string {
  let out = text;
  for (const secret of extraSecrets) {
    if (secret.length >= 8) out = out.split(secret).join(REPLACEMENT);
  }
  for (const { re } of PATTERNS) out = out.replace(re, REPLACEMENT);
  return out;
}

/** Signs that the model is reciting its own instructions. Checked on the full answer. */
const LEAK_MARKERS = [
  /scope and safety rules/i,
  /highest priority, never break them/i,
  /allowed action ids/i,
  /you are kabir, the friendly support guide/i,
];

export function looksLikePromptLeak(text: string): boolean {
  return LEAK_MARKERS.some((re) => re.test(text));
}

/**
 * Streaming redactor: holds back a tail so a secret split across two chunks
 * is still caught before it is flushed to the client.
 */
export class StreamRedactor {
  private buffer = '';
  private readonly holdBack = 120;

  constructor(private readonly secrets: string[] = []) {}

  push(chunk: string): string {
    this.buffer += chunk;
    if (this.buffer.length <= this.holdBack) return '';
    const safeUntil = this.buffer.length - this.holdBack;
    // Never split inside a token (credentials contain no whitespace), so cut at the last whitespace.
    let cut = -1;
    for (let i = safeUntil; i > 0; i--) {
      if (/\s/.test(this.buffer[i] ?? '')) {
        cut = i;
        break;
      }
    }
    if (cut <= 0) {
      if (this.buffer.length < 4_000) return '';
      cut = safeUntil;
    }
    const ready = redact(this.buffer.slice(0, cut), this.secrets);
    this.buffer = this.buffer.slice(cut);
    return ready;
  }

  flush(): string {
    const rest = redact(this.buffer, this.secrets);
    this.buffer = '';
    return rest;
  }
}
