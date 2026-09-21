import { test, expect, home, management } from './fixtures.js';

test('guest cannot open a protected management page', async ({ page }) => {
  await page.goto(`/#${management}`);
  await expect(page).toHaveURL(/#\/login$/);
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
});

test('login requires password and TOTP; session survives reload without localStorage tokens', async ({ page, api }) => {
  await page.goto('/#/login');
  await page.getByLabel(/email/i).fill('operator@example.test');
  await page.getByLabel(/^Password/i).fill('wrong-password');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Invalid credentials' })).toBeVisible();
  await expect(page.getByLabel(/^Code/)).toHaveCount(0);
  await page.getByLabel(/^Password/i).fill('Test-password-123!');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel(/^Code/).fill('000000');
  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Invalid code' })).toBeVisible();
  await page.getByLabel(/^Code/).fill('123456');
  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page).toHaveURL(`/#${home}`);
  await page.goto(`/#${management}`);
  await page.reload();
  await expect(page).toHaveURL(`/#${management}`);
  await expect.poll(() => api.calls.filter(c => c.path === '/auth/me/').length).toBeGreaterThan(0);
  expect(await page.evaluate(() => Object.entries(localStorage))).toEqual([]);
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await expect.poll(() => api.authenticated).toBe(false);
  await page.goto(`/#${management}`); await page.reload();
  await expect(page).toHaveURL(/#\/login$/);
});

test('wrong role cannot enter management', async ({ page, api }) => {
  api.authenticated = true; api.user.role = 'student';
  await page.goto(`/#${management}`);
  await expect(page.getByText(/Access restricted/i).first()).toBeVisible();
  expect(api.calls.filter(c => !c.path.startsWith('/auth/'))).toEqual([]);
});
