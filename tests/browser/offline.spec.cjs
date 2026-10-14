const { test, expect } = require('@playwright/test');
const { loadApp, mockMapTiles, waitForActiveWorker } = require('./helpers.cjs');

const port = Number(process.env.PLAYWRIGHT_TEST_PORT || 4173);
const serverURL = `http://127.0.0.1:${port}`;

test.describe('real service worker lifecycle in Chrome', () => {
  test.beforeEach(async ({ request }) => {
    const response = await request.post(`${serverURL}/__test__/worker-version`, {
      data: { version: 'browser-v1' },
    });
    expect(response.ok()).toBe(true);
  });

  test('installs in a project subdirectory and reloads its cached app while offline', async ({
    page,
    context,
  }) => {
    await mockMapTiles(context);
    await loadApp(page, '/trip/');
    await waitForActiveWorker(page, '/trip/');
    await expect(page.locator('html')).toHaveAttribute('data-test-shell-version', 'browser-v1');

    const cacheName = 'danang-vegan:/trip/:browser-v1';
    await expect.poll(() => page.evaluate(() => caches.keys())).toContain(cacheName);

    await page.reload();
    await expect
      .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
      .toBe(true);
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });

    await expect(page.locator('html')).toHaveAttribute('data-test-shell-version', 'browser-v1');
    await expect(page.locator('#trip-count')).toContainText('餐廳記錄');
    await expect(page.locator('#day-tabs [data-day="0"]')).toBeVisible();
    await expect(page.locator('#network-status')).toContainText('目前離線');
    await page.locator('[data-view="supplies"]').click();
    await expect(page.locator('#view-supplies')).toBeVisible();
    await expect(page.locator('#supply-noodles .supply-card')).toHaveCount(2);
    await expect(page.locator('#supply-snacks .supply-card')).toHaveCount(9);
    await expect(page.locator('#supply-handy-chay')).toContainText('品牌明確全素');
    await expect(page.locator('#supply-vifon-chay')).toContainText('仍需確認');
    await expect(page.locator('#view-supplies .supply-photo img')).toHaveCount(11);
    await page.waitForFunction(() => {
      const images = [...document.querySelectorAll('#view-supplies .supply-photo img')];
      return (
        images.length === 11 && images.every((image) => image.complete && image.naturalWidth > 0)
      );
    });
    await context.setOffline(false);
  });

  test('activates a new worker version without deleting another subdirectory cache', async ({
    page,
    context,
    request,
  }) => {
    await mockMapTiles(context);
    await loadApp(page, '/trip/');
    await waitForActiveWorker(page, '/trip/');
    await expect(page.locator('html')).toHaveAttribute('data-test-shell-version', 'browser-v1');
    await loadApp(page, '/other/');
    await waitForActiveWorker(page, '/other/');
    await expect(page.locator('html')).toHaveAttribute('data-test-shell-version', 'browser-v1');
    await loadApp(page, '/trip/');

    const previousTripCache = 'danang-vegan:/trip/:browser-v1';
    const otherScopeCache = 'danang-vegan:/other/:browser-v1';
    await expect
      .poll(() => page.evaluate(() => caches.keys()))
      .toEqual(expect.arrayContaining([previousTripCache, otherScopeCache]));

    const versionResponse = await request.post(`${serverURL}/__test__/worker-version`, {
      data: { version: 'browser-v2' },
    });
    expect(versionResponse.ok()).toBe(true);
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration.update();
    });

    const updatedTripCache = 'danang-vegan:/trip/:browser-v2';
    await expect.poll(() => page.evaluate(() => caches.keys())).toContain(updatedTripCache);
    await expect.poll(() => page.evaluate(() => caches.keys())).not.toContain(previousTripCache);
    await expect.poll(() => page.evaluate(() => caches.keys())).toContain(otherScopeCache);

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-test-shell-version', 'browser-v2');
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-test-shell-version', 'browser-v2');
    await expect(page.locator('#trip-count')).toContainText('餐廳記錄');
    await context.setOffline(false);
  });
});
