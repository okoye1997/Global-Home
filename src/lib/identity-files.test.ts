import { describe, expect, it } from 'vitest';
import { detectedIdentityMime, identityFileLimit, validIdentityExtension } from './identity-files';

describe('private identity file validation', () => {
  it('detects approved signatures', () => {
    expect(detectedIdentityMime(new TextEncoder().encode('%PDF-1.7'))).toBe('application/pdf');
    expect(detectedIdentityMime(Uint8Array.from([255, 216, 255, 0]))).toBe('image/jpeg');
    expect(detectedIdentityMime(Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe('image/png');
  });
  it('rejects unknown content and caps files at 8 MiB', () => {
    expect(detectedIdentityMime(new TextEncoder().encode('<script>'))).toBeNull();
    expect(identityFileLimit).toBe(8 * 1024 * 1024);
  });
  it('requires a matching permitted filename extension', () => {
    expect(validIdentityExtension('passport.PDF', 'application/pdf')).toBe(true);
    expect(validIdentityExtension('portrait.jpeg', 'image/jpeg')).toBe(true);
    expect(validIdentityExtension('portrait.png.exe', 'image/png')).toBe(false);
    expect(validIdentityExtension('document.pdf', 'image/jpeg')).toBe(false);
  });
});
