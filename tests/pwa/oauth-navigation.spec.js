import { test, expect } from '@playwright/test';

test('service worker allows OAuth login navigation to reach the server', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await page.goto('/api/auth/google/login');
  await expect(page).toHaveTitle('OAuth endpoint reached');
});

