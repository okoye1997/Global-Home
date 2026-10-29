import { describe, expect, it } from 'vitest';
import { explicitDatabaseName } from './db-target';

describe('country initialization database guard', () => {
  it('refuses an implicit driver default database', () => {
    expect(() => explicitDatabaseName('mongodb+srv://user:secret@example.test/')).toThrow(/verified existing database/);
  });
  it('accepts a named URI database or a verified explicit override', () => {
    expect(explicitDatabaseName('mongodb://localhost:27017/globalhome_dev')).toBe('globalhome_dev');
    expect(explicitDatabaseName('mongodb+srv://user:secret@example.test/', 'globalhome_existing')).toBe('globalhome_existing');
  });
  it('rejects invalid database names', () => {
    expect(() => explicitDatabaseName('mongodb://localhost/', 'other/db')).toThrow(/invalid/);
  });
});
