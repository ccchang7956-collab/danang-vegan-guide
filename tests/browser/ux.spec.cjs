const { openPlanningControl } = require('./helpers.cjs');
const { openDailyFilters, openRestaurantDetails } = require('./helpers.cjs');
const { openNearbyFilters } = require('./helpers.cjs');
const { test, expect } = require('@playwright/test');
const { loadApp, mockMapTiles } = require('./helpers.cjs');
test.use({ serviceWorkers: 'block', viewport: { width: 393, height: 852 } });
test.beforeEach(async ({ context }) => {
  await mockMapTiles(context);
});

test('search feedback, recovery, diet toggle and removable filters stay consistent', async ({
  page,
}) => {
  await loadApp(page);
  await page.locator('[data-view="nearby"]').click();
  await openNearbyFilters(page);
  await page.locator('#area-filter').selectOption('hoian');
  await page.locator('#search-input').fill('kurumi');
  await page.locator('#quick-vegan').click();
  await expect(page.locator('#search-input')).toHaveValue('kurumi');
  await expect(page.locator('#area-filter')).toHaveValue('hoian');
  await expect(page.locator('#nearby-search-summary')).toContainText('找到 1 間');
  await expect(page.locator('#quick-vegan')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-remove-filter="area-filter"]').click();
  await expect(page.locator('#area-filter')).toHaveValue('all');
  await page.locator('#search-input').fill('zzzz沒有資料');
  await expect(page.locator('#nearby-search-summary')).toContainText('找到 0 間');
  await page.locator('[data-recover="reset-nearby"]').click();
  await expect(page.locator('#search-input')).toHaveValue('');
  await expect(page.locator('#diet-filter')).toHaveValue('all');
});

test('mobile list and map switch preserve filters and support returning to the card', async ({
  page,
}) => {
  await loadApp(page);
  await page.locator('[data-view="nearby"]').click();
  await expect(page.locator('#nearby-map-slot')).toBeHidden();
  await page.locator('#search-input').fill('roots');
  const card = page.locator('#restaurant-list .restaurant-card').first();
  await expect(card).toContainText('Roots');
  await openRestaurantDetails(card);
  await card.locator('[data-map-id]').click();
  await expect(page.locator('#nearby-map-slot')).toBeVisible();
  await expect(page.locator('#return-to-card')).toBeVisible();
  await page.locator('#return-to-card').click();
  await expect(page.locator('#nearby-map-slot')).toBeHidden();
  await expect(card).toBeInViewport();
  await expect(page.locator('#search-input')).toHaveValue('roots');
});

test('favorites and shopping checklist survive reload without retaining GPS', async ({ page }) => {
  await loadApp(page);
  await page.locator('[data-view="nearby"]').click();
  await page.locator('#restaurant-list [data-favorite]').first().click();
  await page.locator('#favorites-only').click();
  await expect(page.locator('#restaurant-list .restaurant-card')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('#view-nearby')).toBeVisible();
  await expect(page.locator('#restaurant-list .restaurant-card')).toHaveCount(1);
  await page.locator('[data-view="supplies"]').click();
  await page.locator('[data-shopping]').first().check();
  await page.reload();
  await expect(page.locator('[data-shopping]').first()).toBeChecked();
  expect(await page.evaluate(() => localStorage.getItem('danang-ux-v1'))).not.toMatch(
    /latitude|longitude|gps|lat"|lng"/,
  );
});

test('phrase action is in first viewport and product image opens inside the site', async ({
  page,
}) => {
  await loadApp(page);
  await page.locator('[data-view="phrase"]').click();
  await expect(page.locator('#enlarge-phrase')).toBeInViewport();
  await page.locator('#enlarge-phrase').click();
  await expect(page.locator('#phrase-dialog')).toBeVisible();
  await page.locator('#close-phrase').click();
  await expect(page.locator('#enlarge-phrase')).toBeFocused();
  await page.locator('#enlarge-phrase').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#phrase-dialog')).not.toBeVisible();
  await expect(page.locator('#enlarge-phrase')).toBeFocused();
  await page.locator('[data-view="supplies"]').click();
  await page.locator('.supply-photo a').first().click();
  await expect(page.locator('#product-dialog')).toBeVisible();
  await expect(page.locator('#product-image')).toHaveAttribute('src', /handy-chay/);
  await page.locator('#close-product').click();
  await expect(page.locator('.supply-photo a').first()).toBeFocused();
});

test('view history, date links and scroll restoration return to the same context', async ({
  page,
}) => {
  await loadApp(page);
  await page.locator('#day-tabs [data-day="2"]').click();
  await expect(page).toHaveURL(/day=2026-10-23/);
  await page.locator('[data-view="nearby"]').click();
  await page.locator('#restaurant-list .restaurant-card').nth(2).scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => window.scrollY);
  await page.locator('[data-view="phrase"]').click();
  await page.goBack();
  await expect(page.locator('#view-nearby')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(before);
  await page.goBack();
  await expect(page.locator('#view-daily')).toBeVisible();
  await expect(page.locator('#day-tabs [data-day="2"]')).toHaveAttribute('aria-pressed', 'true');
});

test('storage failure still allows search and session favorites', async ({ context, page }) => {
  await context.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error('quota');
    };
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await loadApp(page);
  await page.locator('[data-view="nearby"]').click();
  await page.locator('#search-input').fill('roots');
  await expect(page.locator('#nearby-search-summary')).toContainText('找到 1 間');
  await page.locator('#restaurant-list [data-favorite]').first().click();
  await expect(page.locator('#toast')).toContainText('本次瀏覽');
  await page.locator('#favorites-only').click();
  await expect(page.locator('#restaurant-list .restaurant-card')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('update reminder remains reachable after dismissal and network changes', async ({ page }) => {
  await loadApp(page);
  await page.evaluate(() => window.TravelUX.updateReady());
  await expect(page.locator('#update-banner')).toBeVisible();
  await page.locator('#dismiss-update').click();
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.locator('#network-status')).toContainText('新版');
  await page.locator('#network-status').click();
  await expect(page.locator('#update-banner')).toBeVisible();
});

test('switching views clears the old map return destination', async ({ page }) => {
  await loadApp(page);
  await page.locator('[data-view="nearby"]').click();
  await openRestaurantDetails(page.locator('#restaurant-list .restaurant-card').first());
  await page.locator('#restaurant-list [data-map-id]').first().click();
  await expect(page.locator('#return-to-card')).toBeVisible();
  await page.locator('[data-view="exchange"]').click();
  await page.locator('#view-exchange [data-display="map"]').click();
  await expect(page.locator('#return-to-card')).toBeHidden();
});

test('searching the full catalogue clears favorites restriction', async ({ page }) => {
  await loadApp(page);
  await page.locator('[data-view="nearby"]').click();
  await page.locator('#favorites-only').click();
  await expect(page.locator('#restaurant-list .restaurant-card')).toHaveCount(0);
  await page.locator('[data-view="daily"]').click();
  await openDailyFilters(page);
  await page.locator('#day-search').fill('roots');
  await page.locator('#search-all').click();
  await expect(page.locator('#nearby-search-summary')).toContainText('找到 1 間');
  await expect(page.locator('#favorites-only')).toHaveAttribute('aria-pressed', 'false');
});

test('updating from the phrase page restores non GPS travel and search settings', async ({
  page,
}) => {
  await loadApp(page);
  await page.locator('#day-tabs [data-day="2"]').click();
  await openDailyFilters(page);
  await page.locator('#day-anchor').selectOption('oldtown');
  await openDailyFilters(page);
  await page.locator('#day-radius').selectOption('15');
  await openDailyFilters(page);
  await page.locator('#day-time').fill('12:30');
  await openDailyFilters(page);
  await page.locator('#day-search').fill('kurumi');
  await page.locator('[data-view="exchange"]').click();
  await page.locator('#exchange-currency').selectOption('TWD');
  await openPlanningControl(page, '#exchange-anchor');
  await page.locator('#exchange-anchor').selectOption('oldtown');
  await page.locator('[data-view="nearby"]').click();
  await openPlanningControl(page, '#reference-select');
  await page.locator('#reference-select').selectOption('oldtown');
  await page.locator('#search-input').fill('kurumi');
  await openNearbyFilters(page);
  await page.locator('#area-filter').selectOption('hoian');
  await openNearbyFilters(page);
  await page.locator('#nearby-date').fill('2026-10-24');
  await openNearbyFilters(page);
  await page.locator('#nearby-time').fill('18:00');
  await openPlanningControl(page, '#nearby-radius');
  await page.locator('#nearby-radius').selectOption('5');
  await page.locator('[data-view="phrase"]').click();
  await page.evaluate(() => window.TravelUX.updateReady());
  await page.locator('#reload-update').click();
  await expect(page.locator('#view-phrase')).toBeVisible();
  await page.locator('[data-view="daily"]').click();
  await expect(page.locator('#day-anchor')).toHaveValue('oldtown');
  await expect(page.locator('#day-radius')).toHaveValue('15');
  await expect(page.locator('#day-time')).toHaveValue('12:30');
  await expect(page.locator('#day-search')).toHaveValue('kurumi');
  await page.locator('[data-view="exchange"]').click();
  await expect(page.locator('#exchange-currency')).toHaveValue('TWD');
  await expect(page.locator('#exchange-anchor')).toHaveValue('oldtown');
  await page.locator('[data-view="nearby"]').click();
  await expect(page.locator('#search-input')).toHaveValue('kurumi');
  await expect(page.locator('#reference-select')).toHaveValue('oldtown');
  await expect(page.locator('#area-filter')).toHaveValue('hoian');
  await expect(page.locator('#nearby-date')).toHaveValue('2026-10-24');
  await expect(page.locator('#nearby-time')).toHaveValue('18:00');
  await expect(page.locator('#nearby-radius')).toHaveValue('5');
  await expect(page.locator('#nearby-search-summary')).toContainText('找到 1 間');
});

test('travel date defaults use Vietnam time and URL dates take priority', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-21T17:30:00Z') });
  await loadApp(page);
  await expect(page.locator('#day-tabs [data-day="1"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#today-button')).toBeVisible();
  await page.goto('/#daily?day=2026-10-24');
  await expect(page.locator('#day-tabs [data-day="3"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#today-button').click();
  await expect(page.locator('#day-tabs [data-day="1"]')).toHaveAttribute('aria-pressed', 'true');
});

test('search summary stays visible above the results and advanced filters remain operable at small widths', async ({
  page,
}) => {
  await loadApp(page);
  await page.locator('[data-view="nearby"]').click();
  await expect(page.locator('#nearby-search-summary')).toBeInViewport();
  await expect(page.locator('#operating-filter')).toBeHidden();
  await page.locator('#nearby-filters > summary').click();
  await openNearbyFilters(page);
  await page.locator('#operating-filter').selectOption('closed');
  await expect(page.locator('#active-filters')).toContainText('歇業');
  await openNearbyFilters(page);
  await page.locator('#reset-nearby').click();
  await page.setViewportSize({ width: 320, height: 740 });
  for (const view of ['daily', 'nearby', 'exchange', 'supplies', 'phrase']) {
    await page.locator(`[data-view="${view}"]`).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      320,
    );
  }
});

test('favorites retain keyboard focus after cards rerender or disappear', async ({ page }) => {
  await loadApp(page);
  await page.locator('[data-view="nearby"]').click();
  const first = page.locator('#restaurant-list [data-favorite]').first();
  const id = await first.getAttribute('data-favorite');
  await first.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator(`#restaurant-list [data-favorite="${id}"]`)).toBeFocused();
  await page.locator('#favorites-only').click();
  await page.locator(`#restaurant-list [data-favorite="${id}"]`).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#nearby-search-summary')).toBeFocused();
});
