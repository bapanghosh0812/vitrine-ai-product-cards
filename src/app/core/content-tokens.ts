import { PUBLIC_ENV } from '../../environments/public-env';

const EMAIL_RE = /^[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}$/i;

/**
 * Fills tokens in build-time legal/help HTML. The support email comes from the public
 * build environment; when it is not configured we point to GitHub Issues instead.
 */
export function fillContentTokens(html: string): string {
  const email = PUBLIC_ENV.supportEmail;
  const contact = EMAIL_RE.test(email)
    ? `<a href="mailto:${email}">${email}</a>`
    : `the project's <a href="${PUBLIC_ENV.repoUrl}/issues" target="_blank" rel="noopener noreferrer">GitHub Issues page</a>`;
  return html.replaceAll('{{SUPPORT_EMAIL}}', contact);
}
