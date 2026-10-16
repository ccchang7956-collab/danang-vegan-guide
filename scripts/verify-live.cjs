/* Production smoke check; uses isolated browser storage under /tmp. */
const { chromium, webkit, expect } = require('@playwright/test');
const fs = require('node:fs');
const mode = process.argv[2];
const live = 'https://ccchang7956-collab.github.io/danang-vegan-guide/';
const profile = '/tmp/danang-release-upgrade-v22';
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
async function run() {
  const useWebkit = mode === 'webkit';
  const context = useWebkit
    ? await webkit.launchPersistentContext('/tmp/danang-release-webkit-v22', {
        headless: true,
        viewport: { width: 393, height: 852 },
      })
    : await chromium.launchPersistentContext(profile, {
        headless: true,
        ...(fs.existsSync(chromePath) ? { executablePath: chromePath } : { channel: 'chrome' }),
        viewport: { width: 393, height: 852 },
      });
  try {
    const page = context.pages()[0] || (await context.newPage());
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const response = await page.goto(live, { waitUntil: 'domcontentloaded' });
    expect(response.status()).toBe(200);
    await expect(page.locator('#trip-count')).toContainText('46');
    await page.waitForFunction(async () => {
      const r = await navigator.serviceWorker.getRegistration();
      return r?.active?.state === 'activated';
    });
    if (mode === 'prepare') {
      await page.reload();
      await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
      await page.evaluate(() => {
        const key = 'danang-ux-v1';
        const saved = JSON.parse(localStorage.getItem(key) || '{}');
        saved.favorites = ['dn-kurumi'];
        localStorage.setItem(key, JSON.stringify(saved));
      });
      console.log(
        'Prepared production v20 cache and a restaurant favorite in isolated Chrome profile.',
      );
      return;
    }
    if (mode === 'verify') {
      await expect(page.locator('#update-banner')).toBeVisible({ timeout: 60000 });
      await page.locator('#reload-update').click();
    }
    await expect(page.locator('link[href="assets/mobile.css"]')).toHaveCount(1);
    await page.locator('[data-view="nearby"]').click();
    await expect(page.locator('#nearby-filters')).toBeVisible();
    await page.locator('#search-input').fill('會安 全素 kurumi');
    await expect(page.locator('#restaurant-list .restaurant-card')).toHaveCount(1);
    await expect(page.locator('#card-nearby-hoian-kurumi .menu-preview')).toContainText('115,000');
    if (mode === 'verify') {
      await page.locator('#search-input').fill('kurumi');
      await expect(page.locator('#card-nearby-dn-kurumi [data-favorite]')).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    }
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('#nearby-filters')).toBeVisible();
    await page.locator('#search-input').fill('會安 全素 kurumi');
    await expect(page.locator('#restaurant-list .restaurant-card')).toHaveCount(1);
    await expect(page.locator('#restaurant-list .menu-preview')).toContainText('115,000');
    expect(errors).toEqual([]);
    console.log(
      `Production ${useWebkit ? 'WebKit' : 'Chrome v20→v22 upgrade'}: search, branch menu, ${mode === 'verify' ? 'favorite preserved, ' : ''}offline reload passed.`,
    );
  } finally {
    await context.close();
  }
}
run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
