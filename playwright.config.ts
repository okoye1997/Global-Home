import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  workers: 2,
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3100', browserName: 'chromium' },
  reporter: 'list',
});
