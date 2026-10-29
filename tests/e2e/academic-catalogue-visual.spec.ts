import { expect, test } from '@playwright/test';
import countries from '../../src/data/countries.json';

const representatives = ['NG', 'GH', 'ZA', 'KE', 'ZW', 'US', 'CA', 'BR', 'GB', 'FR', 'DE', 'AE', 'SA', 'IN', 'CN', 'JP', 'KR', 'AU', 'NZ', 'AF'];

for (const code of representatives) {
  test(`${code} academic cards show varied covers, locations, prices and usable details`, async ({ page }) => {
    test.setTimeout(90_000);
    const country = countries.find(item => item.code === code)!;
    await page.goto(`/en/properties?country=${code}`);
    await expect(page.locator('.marketplace-toolbar')).toContainText('100 Properties');
    const cards = page.locator('.cards .card');
    await expect(cards).toHaveCount(24);
    const covers = await cards.locator('.card-image img').evaluateAll(images => images.map(image => image.getAttribute('src')));
    expect(new Set(covers).size).toBe(24);
    const titles = await cards.locator('h3').allTextContents();
    expect(new Set(titles).size).toBe(24);
    const cities = await cards.locator('.country-badge').allTextContents();
    expect(new Set(cities).size).toBeGreaterThan(1);
    const prices = await cards.locator('.price').allTextContents();
    expect(new Set(prices).size).toBeGreaterThan(1);
    expect(prices[0]).toContain(country.currencyCode);
    const firstImage = cards.first().locator('.card-image img');
    await expect.poll(() => firstImage.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    await cards.first().getByRole('link', { name: 'View Details' }).click();
    await expect(page.locator('.detail-gallery img')).toHaveCount(3);
    await expect(page.locator('.detail .price')).toContainText(country.currencyCode);
    await expect(page.locator('.detail > div > .panel')).toContainText('illustrative');
  });
}

test('simplified catalogue form fits mobile through wide desktop', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/en/properties?country=NG');
  for (const width of [320, 375, 430, 768, 1024, 1440, 1920, 2560]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator('.marketplace-filters').getByRole('searchbox')).toBeVisible();
    await expect(page.locator('.marketplace-filters').getByRole('button', { name: 'Search' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});
