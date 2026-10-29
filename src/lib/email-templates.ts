import { msg } from './messages';

export function authEmail(kind: 'verify' | 'reset', locale: string, url: string) {
  const subject = msg(locale, 'email', kind === 'verify' ? 'verifySubject' : 'resetSubject');
  const body = msg(locale, 'email', kind === 'verify' ? 'verifyBody' : 'resetBody').replace('{url}', url);
  return { subject, body };
}

export function accountEmail(kind: 'passwordChanged', locale: string) {
  return { subject: msg(locale, 'email', `${kind}Subject`), body: msg(locale, 'email', `${kind}Body`) };
}

export type EventEmailKind = 'welcome' | 'identitySubmitted' | 'identityDecision' | 'enquiryCreated' | 'newMessage';
export function eventEmail(kind: EventEmailKind, locale: string, values: Record<string, string> = {}) {
  const subject = msg(locale, 'email', `${kind}Subject`);
  const body = msg(locale, 'email', `${kind}Body`).replace(/\{([a-zA-Z]+)\}/g, (_, key: string) => values[key] || '');
  return { subject, body };
}
