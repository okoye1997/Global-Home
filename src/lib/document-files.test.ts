import { describe, expect, it } from 'vitest';
import { privateDocumentLimit, validatePrivateDocument } from './document-files';

describe('private document validation', () => {
  const pdf = new Uint8Array(100); pdf.set(new TextEncoder().encode('%PDF-1.7'));
  it('accepts a bounded file with matching extension, MIME and signature', () => expect(validatePrivateDocument('agreement.pdf', 'application/pdf', pdf)).toBe('application/pdf'));
  it('rejects a mismatched extension', () => expect(() => validatePrivateDocument('agreement.exe', 'application/pdf', pdf)).toThrow());
  it('sets a 10 MiB maximum', () => expect(privateDocumentLimit).toBe(10 * 1024 * 1024));
});
