const { expect } = require('@playwright/test');

const transparentPixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p1sAAAAASUVORK5CYII=',
  'base64',
);

async function mockMapTiles(context) {
  await context.route('https://tile.openstreetmap.org/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: transparentPixel,
    }),
  );
}

async function installGeolocationCallbacks(context) {
  await context.addInitScript(() => {
    const callbacks = [];
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition(success, error, options) {
          callbacks.push({ success, error, options });
        },
        watchPosition() {
          return callbacks.length;
        },
        clearWatch() {},
      },
    });
    window.__gpsCallbacks = callbacks;
  });
}

async function loadApp(page, path = '/') {
  await page.goto(path);
  await expect(page.locator('#trip-count')).toContainText('餐廳記錄');
  await expect(page.locator('[data-view="daily"]')).toBeVisible();
}

async function waitForActiveWorker(page, expectedScope) {
  await page.waitForFunction(
    async (scopePath) => {
      const registration = await navigator.serviceWorker.getRegistration(scopePath);
      return registration?.active?.state === 'activated';
    },
    expectedScope,
    { timeout: 10_000 },
  );
}

async function observeListMutations(page, containerSelector, inputSelector) {
  await page.evaluate(
    ({ containerSelector: container, inputSelector: input }) => {
      const state = { inputTimes: [], mutationTimes: [] };
      document
        .querySelector(input)
        .addEventListener('input', () => state.inputTimes.push(performance.now()), true);
      new MutationObserver(() => state.mutationTimes.push(performance.now())).observe(
        document.querySelector(container),
        { childList: true },
      );
      window.__browserListWatch = state;
    },
    { containerSelector, inputSelector },
  );
}

async function installPageClock(page) {
  await page.clock.install({ time: new Date('2026-10-14T00:00:00.000Z') });
}

async function pausePageClock(page) {
  await page.clock.pauseAt(new Date('2026-10-14T01:00:00.000Z'));
}

async function dispatchInput(page, selector, value, options = {}) {
  await page.locator(selector).evaluate(
    (input, { nextValue, inputType, isComposing }) => {
      input.value = nextValue;
      input.dispatchEvent(
        new InputEvent('input', {
          bubbles: true,
          inputType,
          data: nextValue,
          isComposing,
        }),
      );
    },
    {
      nextValue: value,
      inputType: options.inputType || 'insertText',
      isComposing: options.isComposing || false,
    },
  );
}

async function captureLeafletMap(page) {
  await page.addInitScript(() => {
    let leaflet;
    Object.defineProperty(window, 'L', {
      configurable: true,
      get() {
        return leaflet;
      },
      set(value) {
        leaflet = value;
        if (!value || value.__browserTestMapCapture) return;
        const createMap = value.map;
        value.map = function (...args) {
          const map = createMap.apply(this, args);
          window.__browserTestLeafletMap = map;
          return map;
        };
        Object.defineProperty(value, '__browserTestMapCapture', { value: true });
      },
    });
  });
}

module.exports = {
  captureLeafletMap,
  dispatchInput,
  installPageClock,
  installGeolocationCallbacks,
  loadApp,
  mockMapTiles,
  observeListMutations,
  pausePageClock,
  waitForActiveWorker,
};

async function openNearbyFilters(page) {
  const filters = page.locator('#nearby-filters');
  if ((await filters.count()) && !(await filters.evaluate((element) => element.open)))
    await filters.locator(':scope > summary').click();
}
module.exports.openNearbyFilters = openNearbyFilters;
