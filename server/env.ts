/**
 * Server-side configuration. Values come from the hosting platform's environment
 * (Vercel / Netlify project settings) or from `.env.local` during local development.
 * Nothing in here is ever sent to the browser.
 */
export interface ServerEnv {
  groqApiKey?: string;
  geminiApiKey?: string;
  groqModel: string;
  groqFallbackModel: string;
  geminiModel: string;
  firebaseProjectId?: string;
  allowedOrigins: string[];
  aiMock: boolean;
  nodeEnv: string;
  /** Support mailer (Gmail SMTP app password). */
  smtpUser?: string;
  smtpPass?: string;
  supportInbox?: string;
  mailMock: boolean;
  siteUrl: string;
}

const DEFAULT_ORIGINS = [
  'http://localhost:4200',
  'http://127.0.0.1:4200',
  'http://localhost:4000',
  'http://localhost:4173',
  'http://localhost:8787',
];

function list(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((v) => v.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

export function readEnv(source: Record<string, string | undefined> = process.env): ServerEnv {
  return {
    groqApiKey: source['GROQ_API_KEY']?.trim() || undefined,
    geminiApiKey: (source['GEMINI_API_KEY'] ?? source['GOOGLE_GENERATIVE_AI_API_KEY'])?.trim() || undefined,
    groqModel: source['GROQ_MODEL']?.trim() || 'openai/gpt-oss-120b',
    groqFallbackModel: source['GROQ_FALLBACK_MODEL']?.trim() || 'openai/gpt-oss-20b',
    geminiModel: source['GEMINI_MODEL']?.trim() || 'gemini-3.1-flash-lite',
    firebaseProjectId: source['FIREBASE_PROJECT_ID']?.trim() || source['NG_APP_FIREBASE_PROJECT_ID']?.trim() || undefined,
    allowedOrigins: [...DEFAULT_ORIGINS, ...list(source['ALLOWED_ORIGINS'])],
    aiMock: source['AI_MOCK'] === '1',
    nodeEnv: source['NODE_ENV'] ?? 'production',
    smtpUser: source['SMTP_USER']?.trim() || undefined,
    smtpPass: source['SMTP_PASS']?.trim() || undefined,
    supportInbox: source['SUPPORT_INBOX']?.trim() || source['SMTP_USER']?.trim() || undefined,
    mailMock: source['MAIL_MOCK'] === '1',
    siteUrl: (source['SITE_URL'] || source['NG_APP_SITE_URL'] || 'https://vitrine-ai-product-cards.vercel.app').trim().replace(/\/+$/, ''),
  };
}

/** Values that must never appear in any response body. Used by the redaction filter. */
export function secretValues(env: ServerEnv): string[] {
  return [env.groqApiKey, env.geminiApiKey, env.smtpPass, env.smtpPass?.replace(/\s+/g, '')].filter((v): v is string => !!v && v.length >= 8);
}
