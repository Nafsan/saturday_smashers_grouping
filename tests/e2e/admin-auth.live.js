import { test, expect } from '@playwright/test';

// Requires an operator to sign in interactively with an approved Google account.
// This test uses the actual local backend and does not create or mutate app data.
test('real Google login creates a session and logout revokes it', async ({ page, request, baseURL }) => {
  const start = await page.goto('/api/auth/google/login');
  expect(start?.ok(), 'OAuth start must be configured on the local backend').toBeTruthy();
  await expect(page).toHaveURL(/accounts\.google\.com/, { timeout: 15000 });
  console.log('Complete Google sign-in in the opened Chromium window.');
  await page.waitForURL(url => url.origin === baseURL && url.searchParams.get('auth') === 'success', { timeout: 150000 });
  const session = await page.request.get('/api/auth/session');
  expect(session.status()).toBe(200);
  expect((await session.json()).authenticated).toBe(true);
  const logout = await page.request.post('/api/auth/logout', { headers: { Origin: baseURL }, maxRedirects: 0 });
  expect(logout.status()).toBe(303);
  expect((await page.request.get('/api/auth/session')).status()).toBe(401);
  const legacy = await page.request.post('/api/players?password=obsolete-test-value', {
    headers: { Origin: baseURL }, data: { name: 'OAuth test should never be created' },
  });
  expect(legacy.status()).toBe(401);
});
