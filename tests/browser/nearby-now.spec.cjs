const { test, expect } = require('@playwright/test');
const { mockMapTiles, installGeolocationCallbacks } = require('./helpers.cjs');

test.use({
  serviceWorkers: 'block',
  viewport: { width: 393, height: 852 },
  isMobile: true,
  hasTouch: true,
});
test.beforeEach(async ({ context, page }) => {
  await mockMapTiles(context);
  await installGeolocationCallbacks(context);
  await page.clock.install({ time: new Date('2026-10-23T05:00:00Z') });
});
async function fix(page, latitude = 16.05, longitude = 108.24, accuracy = 30) {
  await page.evaluate(
    ({ latitude, longitude, accuracy }) => {
      window.__gpsCallbacks
        .at(-1)
        .success({ coords: { latitude, longitude, accuracy }, timestamp: Date.now() });
    },
    { latitude, longitude, accuracy },
  );
}

test('new homepage is vegan nearby without prompting GPS or loading map tiles', async ({
  page,
}) => {
  let tiles = 0;
  page.on('request', (r) => {
    if (r.url().includes('tile.openstreetmap.org')) tiles++;
  });
  await page.goto('/');
  await expect(page.locator('#view-nearby')).toBeVisible();
  await expect(page.locator('#eat-now')).toHaveText('找我附近的全素');
  await expect(page.locator('#diet-filter')).toHaveValue('vegan');
  await expect(page.locator('#nearby-radius')).toHaveValue('3');
  await expect(page.locator('#nearby-time')).toHaveValue('12:00');
  expect(await page.evaluate(() => window.__gpsCallbacks.length)).toBe(0);
  expect(tiles).toBe(0);
  await expect(page.locator('#location-status')).toContainText('非目前位置');
});

test('one click resets planning filters and locates three km vegan candidates', async ({
  page,
}) => {
  await page.goto('/#nearby?day=2026-10-21');
  await page.evaluate(() => {
    document.querySelector('#search-input').value = 'old query';
    document.querySelector('#nearby-radius').value = '1';
    document.querySelector('#area-filter').value = 'hoian';
    document.querySelector('#grab-filter').value = 'official-link';
  });
  await page.locator('#eat-now').click();
  expect(await page.evaluate(() => window.__gpsCallbacks.length)).toBe(1);
  await expect(page.locator('#eat-now')).toBeDisabled();
  await fix(page);
  await expect(page.locator('#nearby-radius')).toHaveValue('3');
  await expect(page.locator('#diet-filter')).toHaveValue('vegan');
  await expect(page.locator('#nearby-date')).toHaveValue('2026-10-23');
  await expect(page.locator('#nearby-time')).toHaveValue('12:00');
  await expect(page.locator('#search-input')).toHaveValue('');
  await expect(page.locator('#area-filter')).toHaveValue('all');
  await expect(page.locator('#grab-filter')).toHaveValue('all');
  await expect(page.locator('#nearby-ready .restaurant-card')).toHaveCount(3);
  await expect(page.locator('#location-status')).toContainText('我的位置');
  const card = page.locator('#nearby-ready .restaurant-card').first();
  await expect(card.locator('.primary-action')).toHaveAttribute('href', /google.com\/maps\/dir/);
  expect(
    await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage })),
  ).not.toMatch(/"lat"|"lng"|latitude|longitude/);
});

test('GPS denial keeps a persistent error and an explicit landmark escape', async ({ page }) => {
  await page.goto('/');
  await page.locator('#eat-now').click();
  await page.evaluate(() => window.__gpsCallbacks.at(-1).error({ code: 1 }));
  await expect(page.locator('#location-status')).toContainText('未允許定位');
  await expect(page.locator('#eat-now')).toBeEnabled();
  await expect(page.locator('#choose-landmark')).toBeVisible();
  await page.locator('#choose-landmark').click();
  await expect(page.locator('#reference-select')).toBeVisible();
});

test('low accuracy and outside-region locations cannot masquerade as near candidates', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('#eat-now').click();
  await fix(page, 16.05, 108.24, 2500);
  await expect(page.locator('#location-status')).toContainText('精度不足');
  await expect(page.locator('#nearby-ready .restaurant-card')).toHaveCount(0);
  await page.locator('#eat-now').click();
  await fix(page, 25.03, 121.56);
  await expect(page.locator('#restaurant-list')).toContainText('不在峴港／會安附近');
  await expect(page.locator('#nearby-ready .restaurant-card')).toHaveCount(0);
});

test('radius expansion preserves vegan and map loads only after a map action', async ({ page }) => {
  let tiles = 0;
  page.on('request', (r) => {
    if (r.url().includes('tile.openstreetmap.org')) tiles++;
  });
  await page.goto('/');
  await page.locator('#eat-now').click();
  await fix(page, 16.12, 108.24);
  await page.locator('[data-expand-nearby="5"]').first().click();
  await expect(page.locator('#nearby-radius')).toHaveValue('5');
  await expect(page.locator('#diet-filter')).toHaveValue('vegan');
  expect(tiles).toBe(0);
  await page.locator('[data-display="map"]').first().click();
  await expect(page.locator('#map')).toBeVisible();
  await expect(page.locator('#map .leaflet-marker-icon').first()).toBeVisible();
  await expect.poll(() => tiles).toBeGreaterThan(0);
});

test('explicit daily links keep their route, returning to nearby keeps the current query', async ({
  page,
}) => {
  await page.goto('/#daily?day=2026-10-24');
  await expect(page.locator('#view-daily')).toBeVisible();
  await expect(page.locator('[data-day="3"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-view="nearby"]').click();
  await page.locator('#eat-now').click();
  await fix(page);
  await page.locator('[data-view="daily"]').click();
  await page.locator('[data-view="nearby"]').click();
  expect(await page.evaluate(() => window.__gpsCallbacks.length)).toBe(1);
  await expect(page.locator('#nearby-time')).toHaveValue('12:00');
});

test('old now searches offer an update on return without silently replacing the time', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('#eat-now').click();
  await fix(page);
  await page.clock.fastForward(31 * 60 * 1000);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('#now-search-stale')).toBeVisible();
  await expect(page.locator('#nearby-time')).toHaveValue('12:00');
});

test('returning to a fourth candidate keeps its group open and reload keeps now mode', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('#eat-now').click();
  await fix(page);
  await page.locator('#nearby-more-ready > summary').click();
  const card = page.locator('#nearby-more-ready .restaurant-card').first();
  const id = await card.getAttribute('id');
  await card.focus();
  await card.scrollIntoViewIfNeeded();
  await page.locator('[data-view="phrase"]').click();
  await page.locator('[data-view="nearby"]').click();
  await expect(page.locator('#nearby-more-ready')).toHaveAttribute('open', '');
  await expect(page.locator('#' + id)).toBeInViewport();
  await page.reload();
  await expect(page.locator('#view-nearby')).toHaveAttribute('data-now-mode', 'true');
  await expect(page.locator('#diet-filter')).toHaveValue('vegan');
  await expect(page.locator('#nearby-time')).toHaveValue('12:00');
  await expect(page.locator('#location-status')).toContainText('非目前位置');
});

test('GPS timeout and a subsequent landmark choice ignore the late location callback', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('#eat-now').click();
  await page.evaluate(() => window.__gpsCallbacks.at(-1).error({ code: 3 }));
  await expect(page.locator('#location-status')).toContainText('定位逾時');
  await page.locator('#eat-now').click();
  await page.locator('#choose-landmark').click();
  await page.locator('#reference-select').selectOption('sonhotel');
  await fix(page);
  await expect(page.locator('#location-status')).toContainText('非目前位置');
  await expect(page.locator('#reference-select')).toHaveValue('sonhotel');
});

test('changing a planned time leaves the search and favorites controls accessible', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('[data-jump="nearby-filters"]').click();
  await page.locator('#nearby-time').fill('18:00');
  await expect(page.locator('#search-input')).toBeVisible();
  await expect(page.locator('#favorites-only')).toBeVisible();
});

test('a map pin can open a candidate inside a previously collapsed group', async ({ page }) => {
  await page.goto('/');
  await page.locator('#eat-now').click();
  await fix(page);
  const card = page.locator('#nearby-more-ready .restaurant-card').first();
  const id = await card.getAttribute('id');
  const name = await card.locator('.restaurant-name').textContent();
  await page.locator('[data-display="map"]').first().click();
  await page.getByTitle(name, { exact: true }).focus();
  await page.getByTitle(name, { exact: true }).press('Enter');
  await page.clock.runFor(1000);
  await page
    .locator('.leaflet-popup-content')
    .getByRole('button', { name: '查看餐廳卡片' })
    .click();
  await expect(page.locator('#nearby-more-ready')).toHaveAttribute('open', '');
  await expect(page.locator('#' + id)).toBeInViewport();
});

test('low precision GPS cannot display restaurant pins through the map', async ({ page }) => {
  await page.goto('/');
  await page.locator('#eat-now').click();
  await fix(page, 16.05, 108.24, 2500);
  await page.locator('[data-display="map"]').first().click();
  await expect(page.locator('#map-message')).toContainText('精度不足');
  await expect(page.locator('#map')).toBeHidden();
  await expect(page.locator('.restaurant-marker')).toHaveCount(0);
});

test('reload retains the last restaurant even when its GPS area differs from the hotel', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('#eat-now').click();
  await fix(page, 16.05, 108.24);
  const card = page.locator('#nearby-ready .restaurant-card').first();
  const id = await card.getAttribute('id');
  await card.focus();
  await card.scrollIntoViewIfNeeded();
  await page.reload();
  await expect(page.locator('#' + id)).toBeInViewport();
  await expect(page.locator('#returned-nearby')).toContainText('上次查看');
  await expect(page.locator('#' + id + ' .distance-badge')).not.toContainText('距定位');
});

for (const width of [320, 393, 430]) {
  test(`now homepage at ${width}px keeps the primary candidate usable and fits large text`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 852 });
    await page.goto('/');
    await page.locator('#eat-now').click();
    await fix(page);
    const nav = await page.locator('.bottom-nav').boundingBox();
    const action = await page.locator('#nearby-ready .primary-action').first().boundingBox();
    expect(action.y + action.height).toBeLessThanOrEqual(nav.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    await page.screenshot({ path: `test-results/nearby-now-${width}.png`, fullPage: false });
    await page.addStyleTag({ content: 'html { font-size: 125%; }' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  });
}
