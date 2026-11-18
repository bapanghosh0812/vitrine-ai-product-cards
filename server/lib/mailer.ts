import nodemailer from 'nodemailer';

/**
 * Outbound email for support tickets (Gmail SMTP with an app password).
 * Credentials exist only in server environment variables. MAIL_MOCK=1 logs instead
 * of sending (tests and local previews).
 */
export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

export interface Mailer {
  readonly from: string;
  send(message: MailMessage): Promise<void>;
}

export interface MailEnv {
  smtpUser?: string;
  smtpPass?: string;
  mailMock: boolean;
}

/** Messages captured by the mock mailer (exposed for tests). */
export const sentMock: MailMessage[] = [];

export function createMailer(env: MailEnv): Mailer | null {
  if (env.mailMock) {
    return {
      from: 'Vitrine Support <support@vitrine.test>',
      async send(message) {
        sentMock.push(message);
      },
    };
  }
  if (!env.smtpUser || !env.smtpPass) return null;
  const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: env.smtpUser, pass: env.smtpPass.replace(/\s+/g, '') },
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 10_000,
  });
  const from = `"Vitrine Support" <${env.smtpUser}>`;
  return {
    from,
    async send(message) {
      await transport.sendMail({
        from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        replyTo: message.replyTo,
        headers: { 'X-Auto-Response-Suppress': 'All' },
      });
    },
  };
}
