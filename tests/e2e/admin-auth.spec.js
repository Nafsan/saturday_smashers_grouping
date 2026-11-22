import { test, expect } from '@playwright/test';

// Browser contract test: the API and Google redirects are deliberately mocked.
// A separate staging run is required to verify the real provider and database.
test('signs in, shows admin actions, and signs out', async ({ page }) => {
  await page.clock.install();
  let signedIn = false;
  let sessionChecks = 0;
  const playerWrites = [];
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/auth/session') {
      sessionChecks += 1;
      return route.fulfill({ status: signedIn ? 200 : 401, json: signedIn ? { authenticated: true, email: 'admin@example.test' } : { detail: 'Admin session required' } });
    }
    if (url.pathname === '/api/auth/google/login') {
      signedIn = true;
      return route.fulfill({ status: 302, headers: { location: '/' } });
    }
    if (url.pathname === '/api/auth/logout') {
      signedIn = false;
      return route.fulfill({ status: 200, json: {} });
    }
    if (url.pathname === '/api/players' && route.request().method() === 'POST') {
      expect(signedIn).toBe(true);
      expect(url.searchParams.has('password')).toBe(false);
      const payload = route.request().postDataJSON();
      playerWrites.push(payload);
      return route.fulfill({ status: 201, json: { id: 101, name: payload.name, is_guest: false } });
    }
    if (url.pathname === '/api/fund/settings') return route.fulfill({ json: {default_venue_fee:0, default_ball_fee:0} });
    return route.fulfill({ json: [] });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Admin', exact: true }).click();
  await expect.poll(() => sessionChecks).toBeGreaterThan(0);
  const initialChecks = sessionChecks;
  await page.clock.fastForward(20000);
  expect(sessionChecks).toBe(initialChecks);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Sign in with Google' })).toBeVisible();
  await page.getByRole('link', { name: 'Sign in with Google' }).click();
  await page.getByRole('button', { name: 'Admin', exact: true }).click();
  await page.getByRole('button', { name: 'Add Player' }).click();
  await page.getByLabel('Player Name').fill('Browser Test Player');
  await page.getByRole('dialog').getByRole('button', { name: 'Add Player' }).click();
  await expect.poll(() => playerWrites.length).toBe(1);
  expect(playerWrites[0]).toEqual({ name: 'Browser Test Player' });
  await page.getByRole('button', { name: 'Admin', exact: true }).click();
  await page.getByRole('button', { name: 'Logout' }).click();
  await page.getByRole('button', { name: 'Admin', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Login', exact: true })).toBeVisible();
});
