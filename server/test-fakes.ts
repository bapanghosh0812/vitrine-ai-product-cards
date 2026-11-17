/**
 * Fake credential-shaped strings for security tests. They are assembled at runtime from
 * fragments so that secret scanners (secretlint, gitleaks, GitHub push protection) never
 * see a literal token in the repository. None of these are real credentials.
 */
const j = (...parts: string[]) => parts.join('');

export const FAKE = {
  groq: j('gs', 'k_', 'FAKE'.repeat(7), '1234567890'),
  google: j('AI', 'za', 'SyFAKE1234567890FAKE1234567890abc'),
  openai: j('sk', '-proj-', 'AbC123dEf456GhI789jKl012MnO345'),
  github: j('gh', 'p_', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'),
  /** Unsigned JWT ({"alg":"none"}) claiming admin, used to prove forged tokens are rejected. */
  forgedJwt: j(Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url'), '.', Buffer.from('{"uid":"admin","admin":true}').toString('base64url'), '.', 'c2lnbmF0dXJl'),
};
