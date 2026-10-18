const { openPlanningControl } = require('./helpers.cjs');
const { openDailyFilters } = require('./helpers.cjs');
const { openNearbyFilters } = require('./helpers.cjs');
const { test, expect } = require('@playwright/test');
const { loadApp, mockMapTiles } = require('./helpers.cjs');
test.use({ serviceWorkers: 'block', viewport: { width: 393, height: 852 } });
test.beforeEach(async ({ context }) => mockMapTiles(context));
test('Chinese geography, strict vegan intent and cuisine aliases work in the list', async ({
  page,
}) => {
  await loadApp(page);
  await page.locator('[data-view="nearby"]').click();
  await page.locator('#search-input').fill('會安 全素 kurumi');
  await expect(page.locator('#restaurant-list .restaurant-card')).toHaveCount(1);
  await page.locator('#search-input').fill('越式三明治');
  await expect(page.locator('#restaurant-list .restaurant-card')).toHaveCount(2);
});
test('planned time exposes conflicts, Sunday starts and radius recovery', async ({ page }) => {
  await loadApp(page);
  await page.locator('[data-view="nearby"]').click();
  await openNearbyFilters(page);
  await page.locator('#nearby-date').fill('2026-10-25');
  await openNearbyFilters(page);
  await page.locator('#nearby-time').fill('08:30');
  await page.locator('#search-input').fill('an moc nhien');
  await expect(page.locator('#restaurant-list .restaurant-card')).toHaveCount(1);
  await expect(page.locator('#restaurant-list .hours-caution')).toContainText('週日');
  await expect(page.locator('#restaurant-list .planned-hours')).toContainText('需確認');
  await page.locator('#search-input').fill('le hoi');
  await openNearbyFilters(page);
  await page.locator('#area-filter').selectOption('sontra');
  await expect(page.locator('#card-nearby-dn-lehoi .planned-hours')).toContainText('不在牌告時段');
  await page.locator('#search-input').fill('kurumi');
  await openNearbyFilters(page);
  await page.locator('#area-filter').selectOption('hoian');
  await openPlanningControl(page, '#reference-select');
  await page.locator('#reference-select').selectOption('lesands');
  await openPlanningControl(page, '#nearby-radius');
  await page.locator('#nearby-radius').selectOption('1');
  await expect(page.locator('#restaurant-list .restaurant-card')).toHaveCount(0);
  await page.locator('[data-recover="radius"]').click();
  await expect(page.locator('#restaurant-list .restaurant-card')).toHaveCount(1);
  await openNearbyFilters(page);
  await page.locator('#reset-nearby').click();
  await expect(page.locator('#nearby-time')).toHaveValue('');
  await expect(page.locator('#nearby-radius')).toHaveValue('all');
});
test('each meal opens a dated vegan nearby search, mountain lunch stays on mountain', async ({
  page,
}) => {
  await loadApp(page);
  await page.locator('#meal-plan > details').evaluate((e) => (e.open = true));
  await page.locator('[data-meal-index="1"]').click();
  await expect(page.locator('#view-nearby')).toBeVisible();
  await expect(page.locator('#diet-filter')).toHaveValue('vegan');
  await expect(page.locator('#nearby-time')).toHaveValue('12:00');
  await expect(page.locator('#nearby-date')).toHaveValue('2026-10-21');
  await expect(page.locator('#reference-select')).toHaveValue('cathedral');
  await expect(page.locator('#meal-search-note')).toContainText('12:00');
  await openNearbyFilters(page);
  await page.locator('#nearby-time').fill('18:00');
  await expect(page.locator('#meal-search-note')).toBeHidden();
  await page.locator('[data-view="daily"]').click();
  await page.locator('[data-day="1"]').click();
  await page.locator('#meal-plan > details').evaluate((e) => (e.open = true));
  await page.locator('[data-meal-index="1"]').click();
  await expect(page.locator('#reference-select')).toHaveValue('bana');
  await expect(page.locator('#meal-search-note')).toContainText('園內全素供餐待確認');
  await expect(page.locator('#restaurant-list')).not.toContainText('KURUMI');
  await openNearbyFilters(page);
  await page.locator('#reset-nearby').click();
  await expect(page.locator('#meal-search-note')).toBeHidden();
});
test('daily planned time updates cards and new controls fit a narrow phone', async ({ page }) => {
  await loadApp(page);
  await openDailyFilters(page);
  await page.locator('#day-time').fill('15:00');
  await openDailyFilters(page);
  await page.locator('#day-search').fill('om vegan ve day');
  await expect(page.locator('#day-restaurant-list .restaurant-card')).toHaveCount(1);
  await expect(page.locator('#day-restaurant-list .planned-hours')).toContainText('不在牌告時段');
  await page.locator('[data-view="nearby"]').click();
  await page.setViewportSize({ width: 320, height: 740 });
  await openNearbyFilters(page);
  await expect(page.locator('#nearby-radius')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('#nearby-date').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/restaurant-search-320.png' });
  await page.setViewportSize({ width: 393, height: 852 });
  await openNearbyFilters(page);
  await page.locator('#nearby-time').fill('12:00');
  await page.locator('#search-input').fill('kurumi');
  await expect(page.locator('#restaurant-list .restaurant-card')).toHaveCount(2);
  await page.locator('#restaurant-list .restaurant-card').first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/restaurant-search-card-393.png' });
});

test('Vietnam now uses the destination timezone and removing chips resets the intended field', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-20T18:30:00Z') });
  await loadApp(page);
  await page.locator('[data-view="nearby"]').click();
  await openNearbyFilters(page);
  await page.locator('#nearby-now').click();
  await expect(page.locator('#nearby-date')).toHaveValue('2026-10-21');
  await expect(page.locator('#nearby-time')).toHaveValue('01:30');
  await page.locator('[data-remove-filter="nearby-time"]').click();
  await expect(page.locator('#nearby-time')).toHaveValue('');
  await openPlanningControl(page, '#nearby-radius');
  await page.locator('#nearby-radius').selectOption('3');
  await page.locator('[data-remove-filter="nearby-radius"]').click();
  await expect(page.locator('#nearby-radius')).toHaveValue('all');
});
