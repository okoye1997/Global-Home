import pino from 'pino';
import { Notification } from './models';
import { eventEmail, type EventEmailKind } from './email-templates';
import { sendEmail } from './mail';

const log = pino({ name: 'globalhome-notifications', redact: ['*.password', '*.token', '*.secret'] });

export async function notifyAccount(input: { userId: string; email: string; locale: string; key: string; emailKind?: EventEmailKind; payload?: Record<string, string> }) {
  try {
    await Notification.create({ userId: input.userId, key: input.key, payload: input.payload || {} });
  } catch {
    log.warn({ event: input.key }, 'In-app notification storage failed');
  }
  if (!input.emailKind) return;
  try {
    const template = eventEmail(input.emailKind, input.locale, input.payload);
    await sendEmail(input.email, template.subject, template.body);
  } catch {
    log.warn({ event: input.key }, 'Transactional email delivery failed');
  }
}
