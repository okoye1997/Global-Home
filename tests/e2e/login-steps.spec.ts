import { expect, test } from '@playwright/test';

for (const width of [360, 390, 430, 768, 1366, 1920]) {
  test(`customer sign-in stays email and password only at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.goto('/en/login');
    await expect(page.getByRole('textbox', { name: 'Email address' })).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Forgot password?' })).toBeVisible();
    await expect(page.getByLabel('Authenticator code')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Resend verification email' })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  });
}

test('administrator code appears only after the password step returns an MFA challenge', async ({ page }) => {
  let passwordBody: Record<string, unknown> | undefined;
  await page.route('**/api/auth/login', async route => {
    passwordBody = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ mfaRequired: true }) });
  });
  await page.goto('/en/login');
  await page.getByRole('textbox', { name: 'Email address' }).fill('admin@example.invalid');
  await page.getByLabel('Password').fill('test-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByLabel('Authenticator code')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Verify and sign in' })).toBeVisible();
  expect(passwordBody).toEqual({ email: 'admin@example.invalid', password: 'test-password' });
  await page.getByRole('button', { name: 'Back to sign in' }).click();
  await expect(page.getByLabel('Authenticator code')).toHaveCount(0);
});

test('successful administrator MFA continues to the admin dashboard', async ({ page }) => {
  await page.addInitScript(() => {
    const original = history.pushState.bind(history);
    history.pushState = (data, unused, url) => {
      if (url) (window as typeof window & { __loginDestinations?: string[] }).__loginDestinations = [...((window as typeof window & { __loginDestinations?: string[] }).__loginDestinations || []), String(url)];
      return original(data, unused, url);
    };
  });
  await page.route('**/api/auth/login', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ mfaRequired: true }) }));
  await page.route('**/api/auth/login/mfa', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { role: 'admin' }, preferredLocale: 'en' }) }));
  await page.goto('/en/login');
  await page.getByRole('textbox', { name: 'Email address' }).fill('admin@example.invalid');
  await page.getByLabel('Password').fill('test-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByLabel('Authenticator code').fill('123456');
  await page.getByRole('button', { name: 'Verify and sign in' }).click();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __loginDestinations?: string[] }).__loginDestinations || [])).toContain('/en/admin');
});
