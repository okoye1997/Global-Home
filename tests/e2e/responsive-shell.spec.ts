import { expect, test } from '@playwright/test';

for (const [label, width, height] of [
  ['small Android', 320, 700], ['iPhone', 390, 844], ['large mobile', 430, 900],
  ['tablet', 768, 1024], ['laptop', 1024, 768], ['desktop', 1440, 900], ['wide desktop', 1920, 1080],
] as const) {
  test(`home and authentication shell fit ${label}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    for (const path of ['/en', '/en/login', '/en/register']) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${path} at ${width}px`).toBeLessThanOrEqual(1);
      await expect(page.getByRole('combobox', { name: 'Language' })).toBeVisible();
    }
  });
}

test('Arabic mobile menu and language selector remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await page.locator('.menu-toggle').click();
  await expect(page.locator('#mobile-nav')).toBeVisible();
  await expect(page.locator('.mobile-controls select')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});
