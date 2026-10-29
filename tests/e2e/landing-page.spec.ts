import { expect, test } from '@playwright/test';

test('desktop landing page has the approved sections and working entry points', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto('/en');
  await expect(page.getByRole('link', { name: 'GlobalHome home' })).toBeVisible();
  if (process.env.GH_EXPECT_TEST_CONTACTS === 'true') {
    await expect(page.locator('.utility-bar a[href^="mailto:"]')).toBeVisible();
    await expect(page.locator('.utility-bar a[href^="https://wa.me/"]')).toBeVisible();
  }
  await expect(page.getByRole('combobox', { name: 'Language' })).toBeVisible();
  await expect(page.locator('.header-actions').getByRole('link', { name: 'Login' })).toBeVisible();
  await expect(page.locator('.header-actions').getByRole('link', { name: 'Register' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Find, Rent, Buy or.*Invest in Properties.*Worldwide/ })).toBeVisible();
  await expect(page.locator('.hero-search').getByRole('button', { name: 'Select country' })).toBeVisible();
  await expect(page.locator('.hero-search').getByRole('combobox', { name: 'Property type' })).toBeVisible();
  await expect(page.locator('.hero-search').getByRole('combobox', { name: 'Purpose' })).toBeVisible();
  await expect(page.locator('.hero-search').getByRole('button', { name: 'Search Properties' })).toBeVisible();
  await expect(page.locator('.landing-categories a')).toHaveCount(6);
  await expect(page.locator('.stats .stat')).toHaveCount(5);
  await expect(page.locator('.landing').getByText('Explore by property type')).toHaveCount(0);
  await expect(page.locator('.landing .stat')).not.toHaveCount(4);
  await expect(page.locator('.top .brand-wordmark')).toContainText('GlobalHome');
  await expect(page.locator('.top .brand-wordmark')).toContainText('REAL ESTATE WORLDWIDE');
  await expect(page.locator('.hero-search .country-select-chevron')).toBeVisible();
  await expect(page.locator('.stats .stat').nth(2)).toContainText('Verified Listings');
  await expect(page.locator('.stats .stat').nth(2)).toContainText('All Properties');
  await expect(page.locator('.landing')).not.toContainText(/academic/i);
  for (const tile of await page.locator('.landing-categories a').all()) await expect(tile.locator('svg.category-icon')).toBeVisible();
  const hero = await page.locator('.landing .hero').evaluate(element => getComputedStyle(element).backgroundImage);
  expect(hero).toContain('/images/globalhome-hero-sunset.webp');
});

test('hero country dropdown visibly opens and submits the selected country', async ({ page }) => {
  await page.goto('/en');
  await page.locator('.hero-search .country-select-trigger').click();
  const dialog = page.getByRole('dialog', { name: 'Select country' });
  await dialog.getByRole('searchbox').fill('Nigeria');
  await dialog.getByRole('button', { name: /Nigeria/ }).click();
  await expect(page.locator('.hero-search .country-select-trigger')).toContainText('Nigeria');
  await page.locator('.hero-search').getByRole('button', { name: 'Search Properties' }).click();
  await expect(page).toHaveURL(/\/en\/properties\?country=NG/);
});

for (const width of [390, 768, 1366, 1920]) {
  test(`landing page fits ${width}px and keeps navigation usable`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/en');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await expect(page.locator('.landing-categories a')).toHaveCount(6);
    if (width < 1250) {
      await page.locator('.menu-toggle').click();
      await expect(page.locator('#mobile-nav').getByRole('link', { name: 'Login' })).toBeVisible();
      await expect(page.locator('#mobile-nav').getByRole('link', { name: 'Register' })).toBeVisible();
      if (process.env.GH_EXPECT_TEST_CONTACTS === 'true') {
        await expect(page.locator('#mobile-nav a[href^="mailto:"]')).toBeVisible();
        await expect(page.locator('#mobile-nav a[href^="https://wa.me/"]')).toBeVisible();
      }
    }
    await expect(page.getByRole('combobox', { name: 'Language' })).toBeVisible();
  });
}

test('Arabic landing page remains RTL', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('.landing-categories a')).toHaveCount(6);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test('language change preserves the current page and query filters', async ({ page }) => {
  await page.goto('/en/about?country=NG&purpose=rent');
  await page.getByRole('combobox', { name: 'Language' }).selectOption('fr');
  await expect(page).toHaveURL(/\/fr\/about\?country=NG&purpose=rent/);
  await expect.poll(async () => (await page.context().cookies()).find(cookie => cookie.name === 'gh_locale')?.value).toBe('fr');
});
