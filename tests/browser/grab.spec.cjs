const { openDailyFilters, openRestaurantDetails } = require('./helpers.cjs');
const { test, expect } = require('@playwright/test');
const { loadApp, mockMapTiles, openNearbyFilters } = require('./helpers.cjs');
test.use({ serviceWorkers: 'block', viewport: { width: 393, height: 852 } });
test.beforeEach(async ({ context }) => mockMapTiles(context));

test('official Grab venues have a visible tag and can be found by typing Grab', async ({
  page,
}) => {
  await loadApp(page);
  await page.locator('[data-view="nearby"]').click();
  await page.locator('#search-input').fill('有 Grab');
  await expect(page.locator('#restaurant-list .restaurant-card')).toHaveCount(3);
  await expect(page.locator('#restaurant-list .grab-badge')).toHaveCount(3);
  await expect(page.locator('#card-nearby-dn-kurumi .grab-badge')).toHaveText('Grab 入口');
  await page.locator('#search-input').fill('會安有grab全素');
  await expect(page.locator('#restaurant-list .restaurant-card')).toHaveCount(1);
  await expect(page.locator('#card-nearby-hoian-kurumi .grab-badge')).toBeVisible();
  await page.locator('[data-view="daily"]').click();
  await openDailyFilters(page);
  await page.locator('#day-search').fill('grab');
  await expect(page.locator('#day-restaurant-list .restaurant-card')).toHaveCount(1);
  await expect(page.locator('#day-restaurant-list .grab-badge')).toHaveText('Grab 入口');
});

test('Grab evidence filter combines with search, exposes distinct branch links and resets', async ({
  page,
}) => {
  await loadApp(page);
  await page.locator('[data-view="nearby"]').click();
  await openNearbyFilters(page);
  await page.locator('#grab-filter').selectOption('official-link');
  await expect(page.locator('#restaurant-list .restaurant-card')).toHaveCount(3);
  const dn = page.locator('#card-nearby-dn-kurumi .grab-action');
  const ha = page.locator('#card-nearby-hoian-kurumi .grab-action');
  expect(await dn.getAttribute('href')).toContain('5-C2BVPADKJA2AR2');
  expect(await ha.getAttribute('href')).toContain('5-C63GATEKGREVVT');
  await page.locator('#search-input').fill('會安 kurumi');
  await expect(page.locator('#restaurant-list .restaurant-card')).toHaveCount(1);
  await expect(page.locator('[data-remove-filter="grab-filter"]')).toBeVisible();
  await page.locator('[data-remove-filter="grab-filter"]').click();
  await expect(page.locator('#grab-filter')).toHaveValue('all');
  await openNearbyFilters(page);
  await page.locator('#grab-filter').selectOption('reported');
  await expect(page.locator('#restaurant-list .restaurant-card')).toHaveCount(0);
  await page.locator('[data-recover="reset-nearby"]').click();
  await expect(page.locator('#grab-filter')).toHaveValue('all');
  await expect(page.locator('#search-input')).toHaveValue('');
});

test('Grab clipboard uses branch name, falls back to selectable text and closed venues have no delivery actions', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text) => {
          window.__copiedGrab = text;
        },
      },
    });
  });
  await loadApp(page);
  await page.locator('[data-view="nearby"]').click();
  await page.locator('#search-input').fill('loving vegan');
  await expect(page.locator('#restaurant-list .restaurant-card')).toHaveCount(1);
  const card = page.locator('#card-nearby-dn-loving');
  await openRestaurantDetails(card);
  await card.locator('.grab-details summary').click();
  await card.locator('[data-copy-grab]').click();
  expect(await page.evaluate(() => window.__copiedGrab)).toBe('Loving Vegan');
  await page.evaluate(() => {
    navigator.clipboard.writeText = async () => {
      throw new Error('denied');
    };
  });
  await card.locator('[data-copy-grab]').click();
  await expect(page.locator('#toast')).toContainText('長按');
  await expect(card.locator('.grab-search-name')).toContainText('Loving Vegan');
  await openNearbyFilters(page);
  await page.locator('#operating-filter').selectOption('closed');
  await page.locator('#search-input').fill('');
  await expect(page.locator('#restaurant-list .restaurant-card')).toHaveCount(2);
  await expect(page.locator('#restaurant-list .grab-action')).toHaveCount(0);
  await expect(page.locator('#restaurant-list [data-copy-grab]')).toHaveCount(0);
});

test('Grab filter survives update snapshot restore and narrow cards do not overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 852 });
  await loadApp(page);
  await page.locator('[data-view="nearby"]').click();
  await openNearbyFilters(page);
  await page.locator('#grab-filter').selectOption('official-link');
  await page.evaluate(() => window.TravelUX.updateReady());
  await page.locator('#reload-update').click();
  await expect(page.locator('#grab-filter')).toHaveValue('official-link');
  await expect(page.locator('#restaurant-list .restaurant-card')).toHaveCount(3);
  const card = page.locator('#card-nearby-hoian-peanuts');
  await openRestaurantDetails(card);
  await card.locator('.grab-details summary').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await card.screenshot({ path: 'test-results/grab-320.png' });
});
