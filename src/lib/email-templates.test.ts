import { describe, expect, it } from 'vitest';
import { authEmail, eventEmail } from './email-templates';

describe('localized auth email',()=>{
  it('uses the requested reviewed locale and preserves the private token URL',()=>{const email=authEmail('verify','fr','https://example.test/verify?token=abc');expect(email.subject).toContain('Vérifiez');expect(email.body).toContain('https://example.test/verify?token=abc');});
  it('falls back to English for an untranslated locale',()=>{expect(authEmail('reset','ja','https://example.test/reset').subject).toBe('Reset your GlobalHome password');});
});

describe('event emails', () => {
  it('does not include private message bodies', () => {
    const email = eventEmail('newMessage', 'en');
    expect(email.body).toContain('Sign in');
    expect(email.body).not.toContain('body');
  });
  it('uses stored status without exposing review notes', () => {
    const email = eventEmail('identityDecision', 'en', { status: 'approved' });
    expect(email.body).toContain('approved');
  });
  it('localizes new message notices without including message content', () => {
    expect(eventEmail('newMessage', 'fr').subject).toContain('Nouveau message');
    expect(eventEmail('newMessage', 'ar').subject).toContain('رسالة جديدة');
  });
});
