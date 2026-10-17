const { test, expect } = require('@playwright/test');
const { loadApp, mockMapTiles, openNearbyFilters } = require('./helpers.cjs');
test.use({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
test.beforeEach(async ({ context }) => mockMapTiles(context));

test('nearby first result starts above the bottom navigation on a phone', async ({ page }) => {
  await loadApp(page);
  await page.locator('[data-view="nearby"]').click();
  expect(
    (await page.locator('#restaurant-list .restaurant-card').first().boundingBox()).y,
  ).toBeLessThan(760);
  await expect(page.locator('#quick-grab')).toBeVisible();
});

test('Grab shortcut intersects with search, diet and favorites and stays synchronized', async ({
  page,
}) => {
  await loadApp(page);
  await page.locator('[data-view="nearby"]').click();
  await page.locator('#quick-grab').click();
  await expect(page.locator('#restaurant-list .restaurant-card')).toHaveCount(3);
  await expect(page.locator('#quick-grab')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#quick-vegan').click();
  await page.locator('#search-input').fill('會安');
  await expect(page.locator('#restaurant-list .restaurant-card')).toHaveCount(1);
  await page.locator('#restaurant-list [data-favorite]').click();
  await page.locator('#favorites-only').click();
  await expect(page.locator('#restaurant-list .restaurant-card')).toHaveCount(1);
  await page.locator('[data-remove-filter="grab-filter"]').click();
  await expect(page.locator('#quick-grab')).toHaveAttribute('aria-pressed', 'false');
  await openNearbyFilters(page);
  await page.locator('#grab-filter').selectOption('official-link');
  await expect(page.locator('#quick-grab')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#reset-nearby').click();
  await expect(page.locator('#quick-grab')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#favorites-only')).toHaveAttribute('aria-pressed', 'false');
});

test('daily route precedes optional search and searching still opens results', async ({ page }) => {
  await loadApp(page);
  await expect(page.locator('#day-search')).toBeHidden();
  const route = await page.locator('#itinerary-list').boundingBox();
  const filters = await page.locator('#daily-filters').boundingBox();
  expect(route.y).toBeLessThan(filters.y);
  await page.locator('#daily-filters > summary').click();
  await page.locator('#day-search').fill('kurumi');
  await page.locator('#day-search').press('Enter');
  await expect(page.locator('#day-restaurant-list .restaurant-card')).toHaveCount(1);
  await expect(page.locator('#daily-food-heading')).toBeFocused();
});

test('daily shortcut opens the search tools and exchange results stay close to controls', async ({
  page,
}) => {
  await loadApp(page);
  await page.locator('[data-jump="daily-filters"]').click();
  await expect(page.locator('#day-search')).toBeVisible();
  await page.locator('[data-view="exchange"]').click();
  expect(
    (await page.locator('#exchange-list .exchange-card').first().boundingBox()).y,
  ).toBeLessThan(820);
});
