const { test, expect } = require('@playwright/test');
const { mockMapTiles, installGeolocationCallbacks, captureLeafletMap } = require('./helpers.cjs');

test.use({ serviceWorkers: 'block', viewport: { width: 393, height: 852 } });
test.beforeEach(async ({ context }) => {
  await mockMapTiles(context);
  await installGeolocationCallbacks(context);
});

async function fix(page, { latitude = 16.05, longitude = 108.24, accuracy = 30 } = {}) {
  await page.evaluate(
    (coords) => window.__gpsCallbacks.at(-1).success({ coords, timestamp: Date.now() }),
    { latitude, longitude, accuracy },
  );
}

async function settleFrames(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      ),
  );
}

for (const scenario of [
  { name: 'low precision', coords: { accuracy: 2500 }, message: '精度不足' },
  {
    name: 'outside the travel region',
    coords: { latitude: 25.03, longitude: 121.56 },
    message: '不在峴港／會安附近',
  },
]) {
  test(`${scenario.name} cannot regain nearby results by editing planning filters`, async ({
    page,
  }) => {
    await page.clock.install({ time: new Date('2026-10-23T05:00:00Z') });
    await page.goto('/');
    await page.locator('#eat-now').click();
    await fix(page, scenario.coords);
    await page.locator('[data-jump="nearby-filters"]').click();
    await page.locator('#nearby-time').fill('12:30');
    await page.locator('#nearby-radius').selectOption('all');
    await page.locator('#diet-filter').selectOption('all');
    await page.locator('#apply-nearby-filters').click();
    await expect(page.locator('#restaurant-list .restaurant-card')).toHaveCount(0);
    await expect(page.locator('#restaurant-list')).toContainText(scenario.message);
    await expect(page.locator('#nearby-search-summary')).toContainText('定位待更新');
    await expect(page.locator('#result-count')).toHaveText('定位待更新');
    await page.locator('[data-display="map"]:visible').first().click();
    await expect(page.locator('#map')).toBeHidden();
    await expect(page.locator('.restaurant-marker')).toHaveCount(0);
    await expect(page.locator('#map-message')).toContainText(scenario.message);
    await page.locator('#map-list-return').click();
    await page.locator('#eat-now').click();
    await fix(page);
    await expect(page.locator('#nearby-ready .restaurant-card')).toHaveCount(3);
    await expect(page.locator('#nearby-search-summary')).not.toContainText('定位待更新');
  });
}

test('unreliable GPS can recover through a manual landmark without retaining its warning', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-23T05:00:00Z') });
  await page.goto('/');
  await page.locator('#eat-now').click();
  await fix(page, { accuracy: 2500 });
  await page.locator('#choose-landmark').click();
  await page.locator('#reference-select').selectOption('lesands');
  await expect(page.locator('#location-status')).toContainText('非目前位置');
  await expect(page.locator('#nearby-search-summary')).not.toContainText('定位待更新');
  await expect(page.locator('#restaurant-list .restaurant-card').first()).toBeAttached();
});

test('a different explicit view starts at the top rather than using the previous page scroll', async ({
  page,
}) => {
  await page.goto('/#nearby?day=2026-10-21');
  await settleFrames(page);
  await page.evaluate(() => scrollTo(0, 6000));
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(5000);
  await page.goto('/?entry=explicit#daily?day=2026-10-21');
  await settleFrames(page);
  await expect(page.locator('#view-daily')).toBeVisible();
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await expect(page.locator('#day-heading')).toBeInViewport();
});

test('desktop list mode hides the unloaded map and loads it on an explicit map action', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await captureLeafletMap(page);
  await page.goto('/');
  await expect(page.locator('#view-nearby')).toBeVisible();
  await expect(page.locator('#nearby-map-slot')).toBeHidden();
  expect(
    await page
      .locator('.nearby-layout > .content-column')
      .evaluate(
        (element) =>
          element.getBoundingClientRect().width /
          element.parentElement.getBoundingClientRect().width,
      ),
  ).toBeGreaterThan(0.99);
  expect(await page.evaluate(() => !!window.__browserTestLeafletMap)).toBe(false);
  await page.locator('[data-display="map"]:visible').first().click();
  await expect(page.locator('#nearby-map-slot')).toBeVisible();
  await expect(page.locator('#map .leaflet-marker-icon').first()).toBeVisible();
  await page.locator('#map-list-return').click();
  await expect(page.locator('#nearby-map-slot')).toBeHidden();
  await page.locator('[data-view="exchange"]').click();
  await expect(page.locator('#exchange-map-slot')).toBeHidden();
  await page.locator('#view-exchange [data-display="map"]').click();
  await expect(page.locator('#exchange-map-slot')).toBeVisible();
});

test('favoriting preserves the itinerary, expanded restaurant details and existing map pins', async ({
  page,
}) => {
  await page.goto('/#daily?day=2026-10-21');
  await page.locator('[data-jump="map-panel"]').click();
  await expect(page.locator('.restaurant-marker').first()).toBeVisible();
  const card = page.locator('#day-restaurant-list .restaurant-card').first();
  const id = await card.getAttribute('id');
  await card.locator('.restaurant-details > summary').click();
  await page.evaluate((id) => {
    window.__reviewNodes = {
      stop: document.querySelector('#itinerary-list article'),
      card: document.getElementById(id),
      pin: document.querySelector('.restaurant-marker'),
    };
  }, id);
  await card.locator('[data-favorite]').click();
  await expect(card.locator('[data-favorite]')).toHaveAttribute('aria-pressed', 'true');
  await expect(card.locator('.restaurant-details')).toHaveAttribute('open', '');
  expect(
    await page.evaluate(() =>
      Object.values(window.__reviewNodes).every((node) => node.isConnected),
    ),
  ).toBe(true);
  await expect(card.locator('[data-favorite]')).toBeFocused();
  await page.locator('[data-view="nearby"]').click();
  await expect(page.locator('#favorites-only')).toContainText('(1)');
  await expect(
    page.locator(`[data-favorite="${id.replace('card-daily-', '')}"]`).last(),
  ).toHaveAttribute('aria-pressed', 'true');
});

test('nearby favorite changes preserve details and synchronize the hidden daily card', async ({
  page,
}) => {
  await page.goto('/#daily?day=2026-10-21');
  const favoriteId = await page
    .locator('#day-restaurant-list [data-favorite]')
    .first()
    .getAttribute('data-favorite');
  await page.locator('[data-view="nearby"]').click();
  const card = page.locator('#card-nearby-' + favoriteId);
  await card.locator('.restaurant-details > summary').click();
  await card.locator('[data-favorite]').click();
  await expect(card.locator('.restaurant-details')).toHaveAttribute('open', '');
  await expect(page.locator('#favorites-only')).toContainText('(1)');
  await expect(page.locator(`#card-daily-${favoriteId} [data-favorite]`)).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.locator('#favorites-only').click();
  await expect(page.locator('#restaurant-list .restaurant-card')).toHaveCount(1);
  await page.locator(`#card-nearby-${favoriteId} [data-favorite]`).click();
  await expect(page.locator('#restaurant-list .restaurant-card')).toHaveCount(0);
  await expect(page.locator('#nearby-search-summary')).toBeFocused();
});
