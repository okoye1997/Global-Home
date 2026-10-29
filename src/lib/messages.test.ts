import { describe, expect, it } from 'vitest';
import { msg } from './messages';

describe('structured translation fallback', () => {
  it('renders a reviewed French marketplace label', () => expect(msg('fr', 'marketplace', 'filters')).toBe('Filtres'));
  it('renders an Arabic authentication label', () => expect(msg('ar', 'auth', 'password')).toBe('كلمة المرور'));
  it('falls back to source English when a key is not translated', () => expect(msg('ja', 'auth', 'password')).toBe('Password'));
  it('localizes account settings in LTR and RTL while retaining English fallback', () => {
    expect(msg('fr', 'settings', 'saveProfile')).toBe('Enregistrer le profil');
    expect(msg('ar', 'settings', 'saveProfile')).toBe('حفظ الملف الشخصي');
    expect(msg('ja', 'settings', 'saveProfile')).toBe('Save profile');
  });
  it('localizes map fallback and property actions', () => {
    expect(msg('fr', 'marketplace', 'mapFallback')).toContain('carte');
    expect(msg('ar', 'property', 'virtualTour')).toContain('الجولة');
    expect(msg('ja', 'property', 'virtualTour')).toBe('Open virtual tour');
  });
});
