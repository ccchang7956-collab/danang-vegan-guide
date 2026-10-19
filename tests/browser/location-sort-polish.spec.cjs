const { test, expect } = require('@playwright/test');
const { mockMapTiles, installGeolocationCallbacks, openNearbyFilters } = require('./helpers.cjs');

test.use({ serviceWorkers: 'block', viewport: { width: 393, height: 852 } });
test.beforeEach(async ({ context, page }) => {
  await mockMapTiles(context);
  await installGeolocationCallbacks(context);
  await page.clock.install({ time: new Date('2026-10-23T05:00:00Z') });
});

async function fix(page, coords = {}) {
  await page.evaluate(
    (coords) =>
      window.__gpsCallbacks.at(-1).success({
        coords: { latitude: 16.05, longitude: 108.24, accuracy: 30, ...coords },
        timestamp: Date.now(),
      }),
    coords,
  );
}

for (const scenario of [
  { name: 'low accuracy', coords: { accuracy: 2500 }, message: '精度不足' },
  { name: 'invalid coordinates', coords: { latitude: NaN }, message: '座標' },
  { name: 'missing accuracy', coords: { accuracy: undefined }, message: '精度不足' },
  {
    name: 'outside the region',
    coords: { latitude: 25.03, longitude: 121.56 },
    message: '不在峴港／會安附近',
  },
]) {
  for (const inherited of [true, false]) {
    test(`exchange rejects ${scenario.name} GPS ${inherited ? 'inherited from nearby' : 'requested directly'} and recovers`, async ({
      page,
    }) => {
      if (inherited) await page.clock.setFixedTime(new Date('2026-10-19T05:00:00Z'));
      await page.goto(inherited ? '/' : '/#exchange?day=2026-10-21');
      await page.locator(inherited ? '#eat-now' : '#exchange-locate-btn').click();
      await fix(page, scenario.coords);
      await expect(page.locator('#location-status')).not.toContainText('NaN');
      if (inherited) await page.locator('[data-view="exchange"]').click();
      await expect(page.locator('#exchange-location-status')).toContainText(scenario.message);
      await expect(page.locator('#exchange-result-count')).toHaveText('定位待更新');
      await expect(page.locator('#exchange-search-summary')).toContainText('定位待更新');
      await expect(page.locator('#exchange-list .exchange-card')).toHaveCount(0);
      await page.locator('#view-exchange [data-display="map"]').click();
      await expect(page.locator('#map')).toBeHidden();
      await expect(page.locator('#map-message')).toContainText(scenario.message);
      await expect(page.locator('#map .leaflet-marker-icon')).toHaveCount(0);
      await page.locator('#exchange-use-route').click();
      await expect(page.locator('#exchange-location-status')).toContainText('當天行程');
      await expect(page.locator('#exchange-list .exchange-card')).toHaveCount(6);
      await page.locator('#view-exchange [data-display="map"]').click();
      await expect(page.locator('#map')).toBeVisible();
      await expect(page.locator('#map .leaflet-marker-icon').first()).toBeVisible();
      await page.locator('#exchange-locate-btn').click();
      await fix(page);
      await expect(page.locator('#exchange-location-status')).toContainText('我的位置');
      await expect(page.locator('#exchange-list .exchange-card')).toHaveCount(6);
      await expect(page.locator('#exchange-search-summary')).not.toContainText('定位待更新');
      await expect(page.locator('#exchange-location-warning')).toBeHidden();
      expect(
        await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage })),
      ).not.toMatch(/"lat"|"lng"|latitude|longitude/);
    });
  }
}

async function planLunch(page) {
  await page.goto('/#nearby?day=2026-10-21');
  await openNearbyFilters(page);
  await page.locator('#nearby-time').fill('12:00');
}

async function cardOrder(page) {
  return page.locator('#restaurant-list .restaurant-card').evaluateAll((cards) => {
    const D = window.TRAVEL_DATA;
    const origin = D.places.find((p) => p.id === document.querySelector('#reference-select').value);
    return cards.map((card) => {
      const r = D.restaurants.find((r) => card.id === 'card-nearby-' + r.id);
      return {
        id: r.id,
        diet: r.diet,
        distance: r.navigationHold ? null : window.TravelCore.distanceKm(origin, r),
      };
    });
  });
}

test('distance sorting stays monotonic across serving states and persists on reload', async ({
  page,
}) => {
  await planLunch(page);
  await page.locator('#nearby-sort').selectOption('distance');
  const order = await cardOrder(page);
  const distances = order.filter((r) => r.distance !== null).map((r) => r.distance);
  expect(distances.length).toBeGreaterThan(30);
  expect(distances).toEqual([...distances].sort((a, b) => a - b));
  await expect(page.locator('.nearby-planned-group')).toHaveCount(0);
  await expect(page.locator('#nearby-search-summary')).toContainText('距離優先');
  await page.reload();
  await expect(page.locator('#nearby-sort')).toHaveValue('distance');
  expect((await cardOrder(page)).map((r) => r.id)).toEqual(order.map((r) => r.id));
});

test('vegan sorting prioritizes vegan restaurants across serving states', async ({ page }) => {
  await planLunch(page);
  await page.locator('#nearby-sort').selectOption('vegan');
  const located = (await cardOrder(page)).filter((r) => r.distance !== null);
  const firstOther = located.findIndex((r) => r.diet !== 'vegan');
  expect(firstOther).toBeGreaterThan(0);
  expect(located.slice(firstOther).every((r) => r.diet !== 'vegan')).toBe(true);
  await expect(page.locator('.nearby-planned-group')).toHaveCount(0);
});

test('recommended planned searches show labeled serving groups without hiding cards', async ({
  page,
}) => {
  await planLunch(page);
  await page.locator('#nearby-time').fill('15:00');
  await expect(page.locator('#nearby-sort')).toHaveValue('recommended');
  await expect(page.locator('#nearby-planned-ready > h4')).toContainText('可用餐');
  await expect(page.locator('#nearby-planned-other > h4')).toContainText('其他時段');
  await expect(page.locator('#nearby-planned-unlocated > h4')).toContainText('位置待確認');
  const cards = page.locator('#restaurant-list .restaurant-card');
  expect(await cards.count()).toBe(44);
  expect(
    await cards.evaluateAll((cards) => cards.every((card) => card.getClientRects().length > 0)),
  ).toBe(true);
  await page.locator('#nearby-sort').selectOption('distance');
  await expect(page.locator('.nearby-planned-group')).toHaveCount(0);
  await page.locator('#nearby-sort').selectOption('recommended');
  await expect(page.locator('#nearby-planned-ready')).toBeVisible();
});

test('legacy now-mode snapshots migrate their former distance label to recommended', async ({
  context,
  page,
}) => {
  await context.addInitScript(() => {
    if (sessionStorage.getItem('legacy-seeded')) return;
    sessionStorage.setItem('legacy-seeded', 'true');
    sessionStorage.setItem(
      'danang-travel-session-v1',
      JSON.stringify({
        view: 'nearby',
        date: '2026-10-21',
        savedDate: '2026-10-23',
        scroll: 0,
        snapshot: {
          dayIndex: 0,
          nearbyNowMode: true,
          nowSearchTimestamp: Date.now(),
          nearbyDate: '2026-10-23',
          nearbyTime: '12:00',
          nearbyRadius: '3',
          diet: 'vegan',
          sort: 'distance',
        },
      }),
    );
  });
  await page.goto('/#nearby?day=2026-10-21');
  await expect(page.locator('#nearby-sort')).toHaveValue('recommended');
  await expect(page.locator('#view-nearby')).toHaveAttribute('data-now-mode', 'true');
  await page.locator('[data-jump="nearby-filters"]').click();
  await page.locator('#nearby-sort').selectOption('distance');
  await expect(page.locator('#view-nearby')).toHaveAttribute('data-now-mode', 'false');
});

test('summary displays date once and distinguishes located results from unknown positions', async ({
  page,
}) => {
  await planLunch(page);
  const text = await page.locator('#nearby-search-summary').innerText();
  expect(text.match(/2026-10-21/g)).toHaveLength(1);
  expect(text).toContain('42 間有距離資料');
  expect(text).toContain('2 間位置待確認');
  expect(text).toContain('12:00');
});

for (const width of [320, 393]) {
  test(`exchange service hours are visible before navigation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 852 });
    await page.goto('/#exchange?day=2026-10-21');
    const card = page
      .locator('#exchange-list .exchange-card')
      .filter({ hasText: 'AEON MALL Thanh Khê' });
    const hours = card.locator('.exchange-hours-note');
    await expect(hours).toBeVisible();
    await expect(hours).toContainText('櫃檯');
    expect(
      await hours.evaluate(
        (node) =>
          node.compareDocumentPosition(node.closest('article').querySelector('.primary-action')) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ).toBeTruthy();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await card.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/exchange-service-${width}.png` });
  });
}

test('manual exchange references and the daily map remain usable after an invalid nearby fix', async ({
  page,
}) => {
  await page.goto('/#exchange?day=2026-10-21');
  await page.locator('#exchange-reference > summary').click();
  await page.locator('#exchange-anchor').selectOption('cathedral');
  await page.locator('[data-view="nearby"]').click();
  await page.locator('#eat-now').click();
  await fix(page, { accuracy: 2500 });
  await expect(page.locator('#nearby-search-summary')).toContainText('定位待更新');
  await page.locator('[data-view="exchange"]').click();
  await expect(page.locator('#exchange-anchor')).toHaveValue('cathedral');
  await expect(page.locator('#exchange-location-status')).toContainText('粉紅教堂');
  await expect(page.locator('#exchange-list .exchange-card')).toHaveCount(6);
  await expect(page.locator('#exchange-location-warning')).toBeHidden();
  await page.locator('[data-view="daily"]').click();
  await page.locator('[data-jump="map-panel"]').click();
  await expect(page.locator('#map')).toBeVisible();
  await expect(page.locator('#map .leaflet-marker-icon').first()).toBeVisible();
  await expect(page.locator('#map-heading')).not.toContainText('定位待更新');
});
