import { describe, expect, it } from 'vitest';
import { direction, money, t } from './i18n';
describe('locale independence',()=>{it('uses French messages and preserves NGN currency',()=>{expect(t('fr','buy')).toBe('Acheter');expect(money(150000,'NGN','fr')).toContain('NGN')});it('supports Arabic RTL and fallback',()=>{expect(direction('ar')).toBe('rtl');expect(t('ar','brand')).toBe('GlobalHome')})});
