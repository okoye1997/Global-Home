import { describe, expect, it } from 'vitest';
import { safeMediaUrl } from './media-url';
describe('public media links', () => {
  it('accepts secure URLs without credentials', () => expect(safeMediaUrl('https://example.com/tour')).toBe('https://example.com/tour'));
  it('rejects unsafe schemes and embedded credentials', () => { expect(safeMediaUrl('javascript:alert(1)')).toBeUndefined(); expect(safeMediaUrl('https://user:pass@example.com/')).toBeUndefined(); });
});
