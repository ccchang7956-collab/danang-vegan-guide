const { test, expect } = require('@playwright/test');
const {
  loadApp,
  mockMapTiles,
  openNearbyFilters,
  installGeolocationCallbacks,
} = require('./helpers.cjs');
test.use({
  serviceWorkers: 'block',
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
test.beforeEach(async ({ context }) => mockMapTiles(context));

test('ordinary reload restores query, diet and the restaurant reading target', async ({ page }) => {
  await loadApp(page);
  await page.locator('[data-view="nearby"]').click();
  await page.locator('#search-input').fill('kurumi');
  await page.locator('#quick-vegan').click();
  await page.locator('#search-input').press('Enter');
  const card = page.locator('#card-nearby-dn-kurumi');
  await card.focus();
  await card.scrollIntoViewIfNeeded();
  await page.reload();
  await expect(page.locator('#search-input')).toHaveValue('kurumi');
  await expect(page.locator('#diet-filter')).toHaveValue('vegan');
  await expect(card).toBeInViewport();
});

test('first daily map has a visible return and the full toolbar stays on screen', async ({
  page,
}) => {
  await loadApp(page);
  await page.locator('[data-jump="map-panel"]').click();
  await expect(page.locator('#map-list-return')).toBeVisible();
  await expect(page.locator('#map-list-return')).toBeInViewport();
  await expect
    .poll(async () => (await page.locator('.map-toolbar').boundingBox()).y)
    .toBeGreaterThanOrEqual(0);
  await page.locator('#map-list-return').click();
  await expect(page.locator('#day-heading')).toBeInViewport();
});

test('eat now starts a clear Vietnam time vegan search and closes advanced controls', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-23T05:00:00Z') });
  await loadApp(page);
  await page.locator('[data-view="nearby"]').click();
  await page.locator('#search-input').fill('zzzz');
  await page.locator('#favorites-only').click();
  await page.locator('#eat-now').click();
  await expect(page.locator('#nearby-date')).toHaveValue('2026-10-23');
  await expect(page.locator('#nearby-time')).toHaveValue('12:00');
  await expect(page.locator('#diet-filter')).toHaveValue('vegan');
  await expect(page.locator('#search-input')).toHaveValue('');
  await expect(page.locator('#favorites-only')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#nearby-search-summary')).toContainText('2026-10-23');
  await expect(page.locator('#nearby-filters')).not.toHaveAttribute('open', '');
});

test('location shows the source and warns when the GPS fix is stale', async ({ page, context }) => {
  await installGeolocationCallbacks(context);
  await page.clock.install({ time: new Date('2026-10-23T05:00:00Z') });
  await loadApp(page);
  await page.locator('[data-view="nearby"]').click();
  await expect(page.locator('#location-status')).toContainText('非目前位置');
  await page.locator('#locate-btn').click();
  await page.evaluate(() =>
    window.__gpsCallbacks[0].success({
      coords: { latitude: 16.05, longitude: 108.24, accuracy: 30 },
      timestamp: Date.now(),
    }),
  );
  await expect(page.locator('#location-status')).toContainText('剛剛');
  await page.clock.fastForward(6 * 60 * 1000);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('#location-status')).toContainText('更新定位');
  expect(
    await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage })),
  ).not.toMatch(/"lat"|"lng"|latitude|longitude/);
});

test('first restaurant and exchange navigation fit above phone navigation', async ({ page }) => {
  await loadApp(page);
  for (const view of ['nearby', 'exchange']) {
    await page.locator(`[data-view="${view}"]`).click();
    await page.evaluate(() => scrollTo(0, 0));
    const action = page.locator(`#view-${view} article .primary-action`).first();
    const nav = await page.locator('.bottom-nav').boundingBox();
    const box = await action.boundingBox();
    expect(box.y + box.height).toBeLessThanOrEqual(nav.y);
  }
});

test('daily map reduces restaurants but can show the complete results', async ({ page }) => {
  await loadApp(page);
  await page.locator('[data-jump="map-panel"]').click();
  const small = await page.locator('.restaurant-marker').count();
  await page.locator('#map-all-restaurants').check();
  expect(await page.locator('.restaurant-marker').count()).toBeGreaterThan(small);
  await expect(page.locator('#hotel-shortcut')).toHaveAttribute('href', /google/);
});

test('advanced filter completion returns to named results', async ({ page }) => {
  await loadApp(page);
  await page.locator('[data-view="nearby"]').click();
  await openNearbyFilters(page);
  await page.locator('#area-filter').selectOption('hoian');
  await page.locator('#apply-nearby-filters').click();
  await expect(page.locator('#nearby-filters')).not.toHaveAttribute('open', '');
  await expect(page.locator('#nearby-results-heading')).toBeFocused();
});

test('shopping filters keep unbought products and empty state recoverable', async ({ page }) => {
  await loadApp(page);
  await page.locator('[data-view="supplies"]').click();
  await page.locator('#supply-handy-chay [data-shopping]').check();
  await page.locator('#shopping-filter').selectOption('unbought');
  await expect(page.locator('#supply-handy-chay')).toBeHidden();
  await page.locator('#supply-use-filter').selectOption('hot');
  await expect(page.locator('.supply-card:visible .supply-photo')).toHaveCount(1);
  await page.locator('#supply-vifon-chay [data-shopping]').check();
  await expect(page.locator('#shopping-empty')).toBeVisible();
  await page.locator('#reset-shopping-filters').click();
  await expect(page.locator('.supply-card:visible .supply-photo')).toHaveCount(11);
});

test('phrase points preserve all original Vietnamese sentences and offline help stays open', async ({
  page,
}) => {
  await loadApp(page);
  await page.locator('[data-view="phrase"]').click();
  const original = await page.locator('#phrase-vi').innerText();
  await page.locator('#enlarge-phrase').click();
  await page.locator('#phrase-points').click();
  const points = await page.locator('#phrase-points-text').innerText();
  expect(points.replace(/\s+/g, ' ').trim()).toBe(original.replace(/\s+/g, ' ').trim());
  await page.locator('#close-phrase').click();
  await page.locator('#network-status').click();
  await expect(page.locator('#offline-dialog')).toBeVisible();
  await expect(page.locator('#offline-dialog')).toContainText('地圖');
});

test('next meal opens all collapsed meal ancestors', async ({ page }) => {
  await loadApp(page);
  await page.locator('#meal-plan > details > summary').click();
  await page.locator('#next-meal-shortcut').click();
  await expect(page.locator('#meal-plan > details')).toHaveAttribute('open', '');
  await expect(page.locator('#daily-meal-1 .meal-details')).toHaveAttribute('open', '');
  await expect(page.locator('#daily-meal-1')).toBeInViewport();
});

test('a route without a requested date restores the saved travel day and search', async ({
  page,
}) => {
  await loadApp(page);
  await page.locator('[data-day="2"]').click();
  await page.locator('[data-view="nearby"]').click();
  await page.locator('#search-input').fill('kurumi');
  await page.locator('#search-input').press('Enter');
  await page.goto('/?entry=return#nearby');
  await expect(page.locator('#search-input')).toHaveValue('kurumi');
  await expect(page.locator('#nearby-date')).toHaveValue('2026-10-23');
  await expect(page).toHaveURL(/day=2026-10-23/);
});

test('a requested URL date takes priority over saved query date', async ({ page }) => {
  await loadApp(page);
  await page.locator('[data-view="nearby"]').click();
  await page.locator('#search-input').fill('kurumi');
  await page.goto('/?entry=dated#nearby?day=2026-10-24');
  await expect(page.locator('#nearby-date')).toHaveValue('2026-10-24');
  await expect(page.locator('#search-input')).toHaveValue('');
});

test('restored dates are labelled after a Vietnam date rollover', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-23T16:50:00Z') });
  await loadApp(page);
  await page.locator('[data-view="nearby"]').click();
  await openNearbyFilters(page);
  await page.locator('#nearby-now').click();
  await page.clock.setSystemTime(new Date('2026-10-23T17:10:00Z'));
  await page.reload();
  await expect(page.locator('#nearby-date')).toHaveValue('2026-10-23');
  await expect(page.locator('#restored-query-note')).toBeVisible();
});

test('offline external navigation opens persistent help without losing the restaurant', async ({
  page,
  context,
}) => {
  await loadApp(page);
  await page.locator('[data-view="nearby"]').click();
  await page.locator('#search-input').fill('kurumi');
  await page.locator('#search-input').press('Enter');
  await context.setOffline(true);
  await page.locator('#card-nearby-dn-kurumi .primary-action').click();
  await expect(page.locator('#offline-dialog')).toBeVisible();
  await expect(page.locator('#offline-link-name')).toContainText('KURUMI');
  await expect(page.locator('#offline-link-url')).toContainText('google.com');
  await page.locator('#close-offline').click();
  await expect(page.locator('#search-input')).toHaveValue('kurumi');
});

test('a restaurant outside daily map primaries can still open its pin and return', async ({
  page,
}) => {
  await loadApp(page);
  const card = page.locator('#day-restaurant-list .restaurant-card').first();
  const name = await card.locator('.restaurant-name').innerText();
  await card.locator('.restaurant-details > summary').click();
  await card.locator('[data-map-id]').click();
  await expect(page.locator('.leaflet-popup-content')).toContainText(name);
  await page.locator('#return-to-card').click();
  await expect(card).toBeFocused();
  await expect(card).toBeInViewport();
});

test('direct route initialization preserves the saved vegan preference in storage', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('danang-ux-v1', JSON.stringify({ diet: 'vegan' })),
  );
  await loadApp(page, '/#nearby?day=2026-10-21');
  await expect(page.locator('#diet-filter')).toHaveValue('vegan');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('danang-ux-v1')).diet)).toBe(
    'vegan',
  );
});

test('first navigation remains above an additional phone bottom inset', async ({ page }) => {
  await loadApp(page);
  await page.addStyleTag({ content: '.bottom-nav { padding-bottom: 42px; }' });
  for (const view of ['nearby', 'exchange']) {
    await page.locator(`[data-view="${view}"]`).click();
    await page.evaluate(() => scrollTo(0, 0));
    const action = await page
      .locator(`#view-${view} article .primary-action`)
      .first()
      .boundingBox();
    const nav = await page.locator('.bottom-nav').boundingBox();
    expect(action.y + action.height).toBeLessThanOrEqual(nav.y);
  }
});
