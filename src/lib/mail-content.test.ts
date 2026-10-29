import { describe, expect, it } from 'vitest';
import { mailHtmlFromText, smtpPort } from './mail-content';

describe('transactional mail content', () => {
  it('escapes user-controlled text in the HTML alternative', () => expect(mailHtmlFromText('<script>alert("x")</script>')).not.toContain('<script>'));
  it('validates the configured SMTP port', () => { expect(smtpPort('587')).toBe(587); expect(() => smtpPort('abc')).toThrow(); expect(() => smtpPort('0')).toThrow(); });
});
