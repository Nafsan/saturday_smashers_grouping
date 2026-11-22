import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.live.js',
  timeout: 180000,
  use: { baseURL: process.env.E2E_LIVE_ORIGIN || 'http://localhost:5173', browserName: 'chromium', headless: false },
});
