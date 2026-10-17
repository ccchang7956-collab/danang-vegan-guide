const { openRestaurantDetails } = require('./helpers.cjs');
const { test, expect } = require('@playwright/test');
const { loadApp, mockMapTiles } = require('./helpers.cjs');
test.use({
  serviceWorkers: 'block',
  viewport: { width: 393, height: 852 },
  hasTouch: true,
  isMobile: true,
});
test.beforeEach(async ({ context }) => mockMapTiles(context));

test('mobile search prioritizes results and reveals advanced controls on demand', async ({
  page,
}) => {
  await loadApp(page);
  await page.locator('[data-view="nearby"]').click();
  await expect(page.locator('#nearby-filters')).toBeVisible();
  await expect(page.locator('#nearby-time')).toBeHidden();
  await expect(page.locator('#search-input')).toBeInViewport();
  const first = page.locator('#restaurant-list .restaurant-card').first();
  expect((await first.boundingBox()).y).toBeLessThan(1100);
  await page.locator('#search-input').fill('kurumi');
  await page.locator('#search-input').press('Enter');
  await expect(page.locator('#nearby-results-heading')).toBeFocused();
  await expect(first).toContainText('KURUMI');
  await page.locator('#nearby-filters > summary').click();
  await page.locator('#nearby-date').fill('2026-10-25');
  await page.locator('#search-input').fill('le hoi');
  await expect(page.locator('#card-nearby-dn-lehoi .day-hours')).toContainText('週日 14:30–22:00');
});

test('mobile cards show branch menu data and compact source details', async ({ page }) => {
  await loadApp(page);
  await page.locator('[data-view="nearby"]').click();
  await page.locator('#search-input').fill('kurumi');
  await expect(page.locator('#restaurant-list .restaurant-card')).toHaveCount(2);
  const card = page.locator('#card-nearby-dn-kurumi');
  await expect(card.locator('.menu-preview')).toContainText('115,000');
  await expect(card.locator('.rating-age')).toBeHidden();
  await card.locator('.restaurant-details > summary').click();
  await expect(card.locator('.menu-items')).toContainText('燕麥椰奶鬆餅');
  await expect(card.locator('.menu-source')).toHaveAttribute('href', /branch=danang/);
});

test('mobile meals distinguish primary and independent backup and open a local card', async ({
  page,
}) => {
  await loadApp(page);
  await expect(page.locator('.meal-choice-primary').first()).toContainText('首選');
  await expect(page.locator('.meal-choice-backup').first()).toContainText('備援');
  await page.locator('[data-meal-restaurant="dn-kurumi"]').first().click();
  await expect(page.locator('#view-nearby')).toBeVisible();
  await expect(page.locator('#card-nearby-dn-kurumi')).toBeFocused();
  await expect(page.locator('#card-nearby-dn-kurumi')).toBeInViewport();
});

test('mobile map always returns to the list and preserves card focus', async ({ page }) => {
  await loadApp(page);
  await page.locator('[data-view="nearby"]').click();
  await page.locator('#search-input').fill('roots');
  const card = page.locator('#card-nearby-dn-roots');
  await expect(page.locator('#restaurant-list .restaurant-card')).toHaveCount(1);
  await openRestaurantDetails(card);
  await card.locator('[data-map-id]').click();
  await expect(page.locator('#map-heading')).toBeFocused();
  await expect(page.locator('#map-list-return')).toBeVisible();
  await page.locator('#map-list-return').click();
  await expect(card).toBeFocused();
  await expect(card).toBeInViewport();
  await page.locator('[data-view="phrase"]').click();
  await page.locator('[data-view="nearby"]').click();
  await expect(card).toBeFocused();
  await page.locator('[data-view="daily"]').click();
  await page.locator('#view-daily [data-jump="map-panel"]').click();
  await expect(page.locator('#map-list-return')).toBeVisible();
  await page.locator('#map-list-return').click();
  await expect(page.locator('#daily-food-heading')).toBeFocused();
});

for (const [width, height] of [
  [320, 740],
  [393, 852],
  [430, 932],
  [852, 393],
]) {
  test(`mobile layout ${width}x${height} fits all views and usable controls`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await loadApp(page);
    for (const view of ['daily', 'nearby', 'exchange', 'supplies', 'phrase']) {
      await page.locator(`[data-view="${view}"]`).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    await page.locator('[data-view="nearby"]').click();
    await page.locator('#nearby-filters > summary').click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    for (const id of ['search-input', 'locate-btn', 'nearby-date', 'nearby-time'])
      expect((await page.locator('#' + id).boundingBox()).height).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: `test-results/mobile-${width}x${height}.png` });
  });
}

test('mobile risk warnings and mountain exit instructions remain directly visible', async ({
  page,
}) => {
  await loadApp(page);
  await page.locator('[data-day="1"]').click();
  await expect(page.locator('#meal-advice-1')).toBeVisible();
  await expect(page.locator('#meal-advice-1')).toContainText('下山交通');
  await page.locator('[data-view="nearby"]').click();
  await page.locator('#search-input').fill('khai tam');
  await expect(page.locator('#card-nearby-khai-tam-city')).toContainText('營業待確認');
});

test('mobile enlarged text fits and viewport keyboard handling returns to named results', async ({
  page,
}) => {
  await loadApp(page);
  await page.locator('[data-view="nearby"]').click();
  await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => (document.documentElement.style.fontSize = ''));
  await page.evaluate(() =>
    Object.defineProperty(window.visualViewport, 'height', {
      configurable: true,
      get: () => innerHeight / 2,
    }),
  );
  await page.locator('#search-input').focus();
  await expect(page.locator('body')).toHaveClass(/keyboard-open/);
  await page.locator('#search-input').fill('roots');
  await page.locator('#search-input').press('Enter');
  await expect(page.locator('#nearby-results-heading')).toBeFocused();
  await expect(page.locator('body')).not.toHaveClass(/keyboard-open/);
});

test('unspaced Chinese search works on phone without changing strict diet filters', async ({
  page,
}) => {
  await loadApp(page);
  await page.locator('[data-view="nearby"]').click();
  await page.locator('#search-input').fill('會安全素早餐');
  await page.locator('#search-input').press('Enter');
  const ids = await page
    .locator('#restaurant-list .restaurant-card')
    .evaluateAll((cards) => cards.map((card) => card.id));
  expect(ids.length).toBeGreaterThan(0);
  await page.locator('#search-input').fill('會安 全素 早餐');
  await page.locator('#search-input').press('Enter');
  await expect
    .poll(() =>
      page
        .locator('#restaurant-list .restaurant-card')
        .evaluateAll((cards) => cards.map((card) => card.id)),
    )
    .toEqual(ids);
  await expect(page.locator('#diet-filter')).toHaveValue('all');
});

test('generated store cards stay stores and never acquire product shopping actions', async ({
  page,
}) => {
  await loadApp(page);
  await page.locator('[data-view="supplies"]').click();
  await expect(page.locator('.supply-photo')).toHaveCount(11);
  await expect(page.locator('[data-shopping]')).toHaveCount(11);
  await expect(page.locator('#supply-stores .shopping-check')).toHaveCount(0);
  await expect(page.locator('#supply-stores .supply-use')).toHaveCount(0);
  await expect(page.locator('#supply-stores')).not.toContainText('複製越南文品名');
  await expect(page.locator('#supply-handy-chay')).not.toContainText('乾燥豆腐');
});
