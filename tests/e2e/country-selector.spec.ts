import { expect, test } from '@playwright/test';

test('desktop country search identifies currency and national flag', async ({ page }) => {
  await page.goto('/en');
  await page.getByRole('button', { name: 'Select country' }).click();
  const dialog = page.getByRole('dialog', { name: 'Select country' });
  await dialog.getByRole('searchbox').fill('NGN');
  const result = dialog.getByRole('button', { name: /Nigeria/ });
  await expect(result).toContainText('Nigerian Naira');
  await expect(result.locator('img')).toHaveAttribute('src', '/flags/ng.svg');
});

test('mobile selector fits viewport and remains searchable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/en');
  await page.getByRole('button', { name: 'Select country' }).click();
  const dialog = page.getByRole('dialog', { name: 'Select country' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('searchbox').fill('JPY');
  await expect(dialog.getByRole('button', { name: /Japan/ })).toBeVisible();
  const bounds = await dialog.boundingBox();
  expect(bounds && bounds.width <= 390 && bounds.height <= 844).toBeTruthy();
});

test('RTL language leaves the selected property currency independent', async ({ page }) => {
  await page.goto('/ar');
  await expect(page.locator('html')).toHaveAttribute('dir','rtl');
  await page.locator('.hero-search').getByRole('button').first().click();
  const dialog = page.getByRole('dialog').first();
  await dialog.getByRole('searchbox').fill('GBP');
  const result = dialog.getByRole('button',{name:/United Kingdom/});
  await expect(result).toContainText('GBP');
  await expect(result.locator('img')).toHaveAttribute('src','/flags/gb.svg');
});
