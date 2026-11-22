import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/pwa',
  use: { baseURL: 'http://127.0.0.1:4177', browserName: 'chromium' },
  webServer: { command: 'node tests/pwa/server.cjs', url: 'http://127.0.0.1:4177/', reuseExistingServer: false },
});




