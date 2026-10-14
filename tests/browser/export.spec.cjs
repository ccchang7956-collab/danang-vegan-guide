const fs = require('node:fs/promises');
const { test, expect } = require('@playwright/test');
const { loadApp, mockMapTiles, installPageClock } = require('./helpers.cjs');

test.use({ serviceWorkers: 'block' });

test('downloads one CSV with all current records despite active filters, at mobile width', async ({
  page,
  context,
}, testInfo) => {
  await installPageClock(page);
  await mockMapTiles(context);
  await page.setViewportSize({ width: 393, height: 852 });
  await loadApp(page);
  await page.locator('[data-view="nearby"]').click();
  await page.locator('#quick-vegan').click();
  const count = await page.evaluate(() => {
    window.TRAVEL_DATA.restaurants[0].address = '更新地址, Đà Nẵng';
    window.TRAVEL_DATA.restaurants.push({
      id: 'export-added',
      name: '新增店 "Chay"',
      address: '1 Hội An',
      diet: 'uncertain',
      operatingStatus: 'unverified',
      lat: null,
      lng: null,
    });
    return window.TRAVEL_DATA.restaurants.length;
  });
  const downloads = [];
  await page.evaluate(() => {
    window.__exportUrls = [];
    window.__revokedExportUrls = [];
    const create = URL.createObjectURL.bind(URL);
    const revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      const url = create(blob);
      window.__exportUrls.push(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      window.__revokedExportUrls.push(url);
      revoke(url);
    };
  });
  page.on('download', (download) => downloads.push(download));
  const button = page.getByRole('button', { name: '匯出 Google 我的地圖', exact: true });
  await expect(button).toBeVisible();
  await button.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  await page.screenshot({ path: testInfo.outputPath('export-mobile.png') });
  const downloadPromise = page.waitForEvent('download');
  await button.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('峴港與會安素食店家_2026-10-14.csv');
  const csv = await fs.readFile(await download.path(), 'utf8');
  expect(csv.startsWith('Name,Latitude,Longitude,Location,')).toBe(true);
  expect(csv).toContain('更新地址, Đà Nẵng');
  expect(csv).toContain('新增店 ""Chay""');
  expect(csv).toContain('【永久歇業】Everyday Vegan');
  expect(csv).toContain('Ngọc Chi（市中心店）');
  expect(csv).toContain('Khai Tâm');
  expect(csv).toContain('農曆公休仍未確認');
  expect(csv).not.toContain('\ufeff');
  await expect(page.locator('#toast')).toContainText(`已匯出 ${count} 筆店家`);
  expect(downloads).toHaveLength(1);
  await expect(page.locator('#mymaps-export-help')).toContainText('Location');
  await expect(page.locator('#mymaps-export-help')).toContainText('Name');
  await page.clock.runFor(1200);
  expect(await page.evaluate(() => window.__revokedExportUrls)).toEqual(
    await page.evaluate(() => window.__exportUrls),
  );
  await expect(page.locator('a[download]')).toHaveCount(0);
});

test('shows a retry message when CSV download cannot be created', async ({ page, context }) => {
  await mockMapTiles(context);
  await loadApp(page);
  await page.locator('[data-view="nearby"]').click();
  await page.evaluate(() => {
    URL.createObjectURL = () => {
      throw new Error('storage unavailable');
    };
  });
  await page.getByRole('button', { name: '匯出 Google 我的地圖', exact: true }).click();
  await expect(page.locator('#toast')).toContainText('匯出失敗');
});
