const fs = require('node:fs/promises');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const {
  captureLeafletMap,
  dispatchInput,
  installGeolocationCallbacks,
  installPageClock,
  loadApp,
  mockMapTiles,
  observeListMutations,
  pausePageClock,
} = require('./helpers.cjs');

const port = Number(process.env.PLAYWRIGHT_TEST_PORT || 4173);
const serverURL = `http://127.0.0.1:${port}`;
const missingRestaurantQuery = '___no matching restaurant___';

test.describe('real browser UI regressions', () => {
  test.use({ serviceWorkers: 'block' });

  test.beforeEach(async ({ context, page, request }) => {
    await installPageClock(page);
    await mockMapTiles(context);
    const response = await request.post(`${serverURL}/__test__/worker-version`, {
      data: { version: 'browser-v1' },
    });
    expect(response.ok()).toBe(true);
  });

  test('keeps keyboard focus on the chosen date after cancelling a pending GPS callback', async ({
    page,
    context,
  }) => {
    await installGeolocationCallbacks(context);
    await loadApp(page);
    await page.locator('[data-view="nearby"]').click();
    await page.locator('#locate-btn').click();
    await expect.poll(() => page.evaluate(() => window.__gpsCallbacks.length)).toBe(1);
    await page.locator('[data-view="daily"]').click();

    const secondDay = page.locator('#day-tabs [data-day="1"]');
    await secondDay.focus();
    await page.keyboard.press('Enter');

    await expect(secondDay).toHaveAttribute('aria-pressed', 'true');
    expect(
      await page.evaluate(
        () => document.activeElement === document.querySelector('#day-tabs [data-day="1"]'),
      ),
    ).toBe(true);
    await page.evaluate(() => {
      window.__gpsCallbacks[0].success({
        coords: { latitude: 16.05, longitude: 108.22, accuracy: 18 },
      });
    });

    expect(
      await page.evaluate(
        () => document.activeElement === document.querySelector('#day-tabs [data-day="1"]'),
      ),
    ).toBe(true);
    await expect(page.locator('#reference-select')).not.toHaveValue('gps');
    await expect(page.locator('#location-status')).toContainText('尚未使用 GPS');
  });

  test('keeps the focused date button through a successful nearby GPS rerender', async ({
    page,
    context,
  }) => {
    await installGeolocationCallbacks(context);
    await loadApp(page);
    await page.locator('[data-view="nearby"]').click();
    await page.locator('#locate-btn').click();
    await expect.poll(() => page.evaluate(() => window.__gpsCallbacks.length)).toBe(1);
    await page.locator('[data-view="daily"]').click();

    const firstDay = page.locator('#day-tabs [data-day="0"]');
    await firstDay.focus();
    await page.evaluate(() => {
      window.__gpsCallbacks[0].success({
        coords: { latitude: 16.05, longitude: 108.22, accuracy: 18 },
      });
    });

    expect(
      await page.evaluate(
        () => document.activeElement === document.querySelector('#day-tabs [data-day="0"]'),
      ),
    ).toBe(true);
    await expect(page.locator('#reference-select')).toHaveValue('gps');
  });

  test('uses a nearby GPS result on the first Exchange visit when the callback completes later', async ({
    page,
    context,
  }) => {
    await installGeolocationCallbacks(context);
    await loadApp(page);
    await page.locator('[data-view="nearby"]').click();
    await page.locator('#locate-btn').click();
    await expect.poll(() => page.evaluate(() => window.__gpsCallbacks.length)).toBe(1);

    await page.locator('[data-view="exchange"]').click();
    await expect(page.locator('#exchange-anchor')).toHaveValue('route');
    await page.evaluate(() => {
      window.__gpsCallbacks[0].success({
        coords: { latitude: 16.05, longitude: 108.22, accuracy: 18 },
      });
    });

    await expect(page.locator('#exchange-anchor')).toHaveValue('gps');
    await expect(page.locator('#exchange-location-status')).toContainText('你的定位');
  });

  test('lets a manual landmark cancel nearby GPS before the first Exchange visit completes', async ({
    page,
    context,
  }) => {
    await installGeolocationCallbacks(context);
    await loadApp(page);
    await page.locator('[data-view="nearby"]').click();
    await page.locator('#locate-btn').click();
    await expect.poll(() => page.evaluate(() => window.__gpsCallbacks.length)).toBe(1);

    await page.locator('[data-view="exchange"]').click();
    const exchangeAnchor = page.locator('#exchange-anchor');
    await expect(exchangeAnchor).toHaveValue('route');
    const manualAnchor = await exchangeAnchor.locator('option').nth(1).getAttribute('value');
    expect(manualAnchor).toBeTruthy();
    await exchangeAnchor.selectOption(manualAnchor);

    await page.evaluate(() => {
      window.__gpsCallbacks[0].success({
        coords: { latitude: 16.05, longitude: 108.22, accuracy: 18 },
      });
    });

    await expect(exchangeAnchor).toHaveValue(manualAnchor);
    await expect(page.locator('#exchange-location-status')).not.toContainText(/GPS|你的定位/);
  });

  test('debounces nearby search for 150 ms and renders only the newest query', async ({ page }) => {
    await loadApp(page);
    await page.locator('[data-view="nearby"]').click();
    await observeListMutations(page, '#restaurant-list', '#search-input');
    await pausePageClock(page);

    await dispatchInput(page, '#search-input', '___first search has no result___');
    await page.clock.runFor(100);
    await dispatchInput(page, '#search-input', missingRestaurantQuery);
    await page.clock.runFor(149);
    expect(await page.evaluate(() => window.__browserListWatch.mutationTimes)).toEqual([]);
    await page.clock.runFor(1);

    await expect
      .poll(() => page.evaluate(() => window.__browserListWatch.mutationTimes.length))
      .toBeGreaterThan(0);
    const timing = await page.evaluate(() => window.__browserListWatch);
    const lastInputTime = timing.inputTimes.at(-1);
    expect(timing.mutationTimes[0] - lastInputTime).toBe(150);
    await expect(page.locator('#result-count')).toHaveText('0 間');
  });

  test('holds nearby search while Chinese IME composition is active', async ({ page }) => {
    await loadApp(page);
    await page.locator('[data-view="nearby"]').click();
    await observeListMutations(page, '#restaurant-list', '#search-input');
    await pausePageClock(page);

    await page.evaluate((query) => {
      const input = document.querySelector('#search-input');
      input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
      input.value = query;
      input.dispatchEvent(
        new InputEvent('input', {
          bubbles: true,
          inputType: 'insertCompositionText',
          data: query,
          isComposing: true,
        }),
      );
    }, '不存在的店家');
    await page.clock.runFor(200);
    expect(await page.evaluate(() => window.__browserListWatch.mutationTimes)).toEqual([]);

    await page.evaluate(() => {
      const input = document.querySelector('#search-input');
      input.dispatchEvent(
        new CompositionEvent('compositionend', { bubbles: true, data: '不存在的店家' }),
      );
      input.dispatchEvent(
        new InputEvent('input', {
          bubbles: true,
          inputType: 'insertText',
          data: '',
          isComposing: false,
        }),
      );
    });
    await page.clock.runFor(149);
    expect(await page.evaluate(() => window.__browserListWatch.mutationTimes)).toEqual([]);
    await page.clock.runFor(1);
    await expect
      .poll(() => page.evaluate(() => window.__browserListWatch.mutationTimes.length))
      .toBeGreaterThan(0);
    await expect(page.locator('#result-count')).toHaveText('0 間');
  });

  test('cancels a queued search when the clear-to-vegan action replaces the filters', async ({
    page,
  }) => {
    await loadApp(page);
    await page.locator('[data-view="nearby"]').click();
    await pausePageClock(page);
    await dispatchInput(page, '#search-input', missingRestaurantQuery);
    await page.locator('#quick-vegan').evaluate((button) => button.click());

    await expect(page.locator('#search-input')).toHaveValue('');
    await expect(page.locator('#diet-filter')).toHaveValue('vegan');
    const resultCount = await page.locator('#result-count').textContent();
    expect(Number.parseInt(resultCount, 10)).toBeGreaterThan(0);
    await page.clock.runFor(220);
    await expect(page.locator('#result-count')).toHaveText(resultCount);
    await expect(page.locator('#restaurant-list .diet-badge:not(.vegan)')).toHaveCount(0);
  });

  test('carries an in-progress daily search into the all-list page', async ({ page }) => {
    await loadApp(page);
    await pausePageClock(page);
    const query = '___cross page query___';
    await dispatchInput(page, '#day-search', query);
    await page.locator('#search-all').evaluate((button) => button.click());

    await expect(page.locator('#view-nearby')).toBeVisible();
    await expect(page.locator('#search-input')).toHaveValue(query);
    await expect(page.locator('#result-count')).toHaveText('0 間');
    await page.clock.runFor(200);
    await expect(page.locator('#result-count')).toHaveText('0 間');

    await page.locator('[data-view="daily"]').click();
    await expect(page.locator('#day-search')).toHaveValue(query);
    await expect(page.locator('#day-food-count')).toHaveText('0 間');
  });

  test('keeps the selected map card at zoom 16 when a pending search is flushed', async ({
    page,
  }) => {
    await captureLeafletMap(page);
    await loadApp(page);
    await page.locator('[data-view="nearby"]').click();

    const mapButton = page.locator('#restaurant-list .restaurant-card button[data-map-id]').first();
    await expect(mapButton).toBeVisible();
    const restaurantId = await mapButton.getAttribute('data-map-id');
    const card = page.locator(`#card-nearby-${restaurantId}`);
    const restaurantName = await card.locator('.restaurant-name').textContent();
    const selectedRestaurant = await page.evaluate((id) => {
      const restaurant = window.TRAVEL_DATA.restaurants.find((item) => item.id === id);
      return { lat: restaurant.lat, lng: restaurant.lng, name: restaurant.name };
    }, restaurantId);
    await page.evaluate(() => {
      const map = window.__browserTestLeafletMap;
      const state = { autoPanStarted: false, autoPanSettled: false };
      map.once('autopanstart', () => {
        state.autoPanStarted = true;
        map.once('moveend', () => {
          state.autoPanSettled = true;
        });
      });
      window.__browserMapAutoPan = state;
    });
    await pausePageClock(page);
    await dispatchInput(page, '#search-input', restaurantName.trim());
    await page.clock.runFor(149);
    await mapButton.click();

    const twoFrames = page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    await Promise.all([twoFrames, page.clock.runFor(1_000)]);
    await expect(page.locator(`#card-nearby-${restaurantId}`)).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => window.__browserMapAutoPan))
      .toEqual({ autoPanStarted: true, autoPanSettled: true });
    const mapMetrics = await page.evaluate(({ lat, lng }) => {
      const map = window.__browserTestLeafletMap;
      const mapElement = map?.getContainer();
      const popup = mapElement?.querySelector('.leaflet-popup');
      const popupContent = popup?.querySelector('.leaflet-popup-content');
      const mapRect = mapElement?.getBoundingClientRect();
      const popupRect = popup?.getBoundingClientRect();
      const contentRect = popupContent?.getBoundingClientRect();
      const snapshotRect = (rect) =>
        rect
          ? {
              left: rect.left,
              top: rect.top,
              right: rect.right,
              bottom: rect.bottom,
              width: rect.width,
              height: rect.height,
            }
          : null;
      const contentStyle = popupContent ? window.getComputedStyle(popupContent) : null;
      return {
        zoom: map?.getZoom() ?? null,
        selectedMarkerInBounds: Boolean(map?.getBounds().contains([lat, lng])),
        popupText: popupContent?.textContent ?? null,
        popupContentVisible: Boolean(
          popupContent &&
          contentRect?.width > 0 &&
          contentRect?.height > 0 &&
          contentStyle?.visibility !== 'hidden' &&
          contentStyle?.display !== 'none' &&
          contentStyle?.opacity !== '0',
        ),
        popupContentInsideMap: Boolean(
          mapRect &&
          contentRect &&
          contentRect.left >= mapRect.left - 1 &&
          contentRect.right <= mapRect.right + 1 &&
          contentRect.top >= mapRect.top - 1 &&
          contentRect.bottom <= mapRect.bottom + 1,
        ),
        mapRect: snapshotRect(mapRect),
        popupRect: snapshotRect(popupRect),
        contentRect: snapshotRect(contentRect),
      };
    }, selectedRestaurant);
    const metricsDescription = `Leaflet map metrics:\n${JSON.stringify(mapMetrics, null, 2)}`;
    expect(mapMetrics.zoom, metricsDescription).toBe(16);
    expect(mapMetrics.selectedMarkerInBounds, metricsDescription).toBe(true);
    expect(mapMetrics.popupText, metricsDescription).toContain(selectedRestaurant.name);
    expect(mapMetrics.popupContentVisible, metricsDescription).toBe(true);
    expect(mapMetrics.popupContentInsideMap, metricsDescription).toBe(true);
  });

  test('shows four usable navigation entries and card actions at a 393 px viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await captureLeafletMap(page);
    await loadApp(page);
    const navItems = page.locator('.bottom-nav [data-view]');
    await expect(navItems).toHaveCount(4);
    const screenshotDirectory = path.resolve('test-results');
    await fs.mkdir(screenshotDirectory, { recursive: true });

    for (const view of ['daily', 'nearby', 'exchange', 'phrase']) {
      await page.locator(`.bottom-nav [data-view="${view}"]`).click();
      await page.waitForFunction(() => window.scrollY === 0);
      await expect(page.locator(`#view-${view}`)).toBeVisible();
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(width).toBeLessThanOrEqual(393);
      await page.screenshot({ path: path.join(screenshotDirectory, `mobile-${view}-393x852.png`) });

      if (view === 'nearby') {
        const mapButton = page
          .locator('#restaurant-list .restaurant-card button[data-map-id]')
          .first();
        await expect(mapButton).toBeVisible();
        const restaurantId = await mapButton.getAttribute('data-map-id');
        const selectedRestaurant = await page.evaluate((id) => {
          const restaurant = window.TRAVEL_DATA.restaurants.find((item) => item.id === id);
          return { lat: restaurant.lat, lng: restaurant.lng, name: restaurant.name };
        }, restaurantId);
        await mapButton.scrollIntoViewIfNeeded();
        await page.screenshot({
          path: path.join(screenshotDirectory, 'mobile-nearby-card-393x852.png'),
        });
        await mapButton.click();
        await page.evaluate(
          () =>
            new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
        );
        await page.waitForFunction(
          ({ lat, lng, name }) => {
            const map = window.__browserTestLeafletMap;
            const mapElement = map?.getContainer();
            const popup = mapElement?.querySelector('.leaflet-popup');
            const popupContent = popup?.querySelector('.leaflet-popup-content');
            if (
              !map ||
              map.getZoom() !== 16 ||
              !map.getBounds().contains([lat, lng]) ||
              !popupContent?.textContent.includes(name)
            )
              return false;
            const mapRect = mapElement.getBoundingClientRect();
            const popupRect = popup.getBoundingClientRect();
            return (
              popupRect.left >= mapRect.left &&
              popupRect.right <= mapRect.right &&
              popupRect.top >= mapRect.top &&
              popupRect.bottom <= mapRect.bottom
            );
          },
          selectedRestaurant,
          { timeout: 5_000 },
        );
        await expect(page.locator('.leaflet-popup-content')).toContainText(selectedRestaurant.name);
      }

      if (view === 'phrase') {
        await page.locator('#enlarge-phrase').click();
        await expect(page.locator('#phrase-dialog')).toBeVisible();
        await page.screenshot({
          path: path.join(screenshotDirectory, 'mobile-phrase-dialog-393x852.png'),
        });
        await page.locator('#close-phrase').click();
      }
    }

    await page.locator('.bottom-nav [data-view="daily"]').click();
    await page.waitForFunction(() => window.scrollY === 0);
    const actions = page.locator('#day-restaurant-list .restaurant-card .card-actions').first();
    await expect(actions).toBeVisible();
    expect(await actions.locator('a, button').count()).toBeGreaterThan(0);
  });
});
