import { expect, test } from '@playwright/test';

test('academic catalogue is visible on the actual unfiltered page and country selector', async ({ page }) => {
  await page.goto('/en/properties');
  await expect(page.locator('.marketplace-toolbar')).toContainText('24300 Properties');
  await expect(page.locator('.card')).toHaveCount(24);
  await expect(page.locator('.card img').first()).toBeVisible();
  await expect(page.locator('.card .price').first()).not.toBeEmpty();
  await expect(page.locator('.academic-notice')).toHaveCount(0);
  const filters = page.locator('.marketplace-filters');
  await expect(filters.locator('label')).toHaveCount(2);
  await expect(filters.getByRole('searchbox')).toHaveCount(1);
  await expect(filters.getByRole('button')).toHaveCount(2);
  await expect(filters.getByRole('checkbox')).toHaveCount(0);
  await expect(filters.getByRole('combobox')).toHaveCount(0);

  const country = page.getByRole('button', { name: 'Select country' });
  await country.click();
  await page.getByRole('dialog', { name: 'Select country' }).getByRole('searchbox').fill('Nigeria');
  await page.getByRole('dialog', { name: 'Select country' }).getByRole('button', { name: /Nigeria/ }).click();
  await page.locator('.marketplace-filters').getByRole('button', { name: 'Search' }).click();
  await expect(page).toHaveURL(/country=NG/);
  await expect(page.locator('.marketplace-toolbar')).toContainText('100 Properties');
  await expect(page.locator('.card .price').first()).toContainText('NGN');

  await page.goto('/en/properties?country=JP');
  await expect(page.locator('.marketplace-toolbar')).toContainText('100 Properties');
  await expect(page.locator('.card .price').first()).toContainText('JPY');
});

test('academic categories, purposes, pagination and detail remain browsable', async ({ page }) => {
  test.setTimeout(90_000);
  for (const type of ['house', 'apartment', 'land', 'investment-property', 'event-centre']) {
    await page.goto(`/en/properties?country=NG&type=${type}`);
    await expect(page.locator('.card').first()).toBeVisible();
    await expect(page.locator('.card-body').first()).toContainText(type.replaceAll('-', ' '), { ignoreCase: true });
  }
  for (const purpose of ['buy', 'rent', 'lease', 'invest']) {
    await page.goto(`/en/properties?country=NG&purpose=${purpose}`);
    await expect(page.locator('.marketplace-toolbar')).toContainText('25 Properties');
    await expect(page.locator('.card').first()).toBeVisible();
  }
  await page.goto('/en/properties?country=NG&page=2');
  await expect(page.locator('.pagination')).toContainText('2 / 5');
  await expect(page.locator('.card').first()).toBeVisible();

  await page.goto('/en/properties?country=NG&type=house');
  await page.locator('.card').first().getByRole('link', { name: 'View Details' }).click();
  await expect(page.locator('.detail-gallery img')).toHaveCount(3);
  await expect(page.locator('.detail .price')).not.toBeEmpty();
  const details = page.locator('.detail > div > .panel');
  await expect(details).toContainText('approximate illustrative location');
  await expect(details).toContainText('illustrative');
  await expect(page.locator('.detail')).not.toContainText(/academic/i);
  await expect(details).toContainText('Parking');
});

test('homepage, country cards, search and map view use updated academic records', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/en');
  await expect(page.locator('.stats')).toContainText('24,300');
  await page.goto('/en/countries/NG');
  await expect(page.locator('.cards .card').first()).toBeVisible();
  const firstImage = page.locator('.cards .card img').first();
  await expect(firstImage).toBeVisible();
  await expect.poll(() => firstImage.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  await page.goto('/en/properties?country=NG&q=Abuja');
  await expect(page.locator('.card').first()).toBeVisible();
  await page.goto('/en/properties?country=NG&view=map');
  await expect(page.locator('.property-map-list .panel').first()).toBeVisible();
  await expect(page.locator('.property-map-list').getByRole('link', { name: 'View on Google Maps' }).first()).toHaveAttribute('href', /google\.com\/maps/);
});

test('one search field matches mixed property, city, country and purpose words', async ({ page }) => {
  test.setTimeout(90_000);
  for (const query of ['house in Lagos', 'apartment Tokyo', 'land Nigeria', 'hotel Dubai', 'investment property London', 'event centre Accra']) {
    await page.goto(`/en/properties?q=${encodeURIComponent(query)}`);
    await expect(page.locator('.card').first(), query).toBeVisible();
  }
});

test('academic investment detail shows one local-currency 30% projection and private contact actions', async ({ page }) => {
  await page.goto('/en/properties?country=US&purpose=invest');
  await page.locator('.card').first().getByRole('link', { name: 'View Details' }).click();
  await expect(page.locator('.detail aside .notice')).toContainText('Illustrative projected monthly profit at 30%');
  await expect(page.getByRole('button', { name: 'Contact Admin to Proceed' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Message Admin' })).toBeVisible();
  if (process.env.GH_EXPECT_TEST_CONTACTS === 'true') {
    await expect(page.getByRole('link', { name: 'Email Admin' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'WhatsApp Admin' })).toBeVisible();
  }
});

test('property detail and similar listings fit narrow screens', async ({ page }) => {
  for (const width of [320, 390, 600, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/en/properties/academic-ng-0002');
    await expect(page.locator('.detail-gallery img').first()).toBeVisible();
    await expect(page.locator('.similar-properties .panel').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${width}px`).toBeLessThanOrEqual(0);
  }
});
