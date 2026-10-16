/* Release verification uses isolated /tmp profiles and real worker/cache evidence. */
const { chromium, webkit, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const checks = require('./live-verification.cjs');
const root = path.resolve(__dirname, '..');
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function readState(page, context, requireRuntime) {
  const state = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return {
      scope: registration?.scope,
      activeURL: registration?.active?.scriptURL,
      activeState: registration?.active?.state,
      controllerURL: navigator.serviceWorker.controller?.scriptURL,
      cacheNames: await caches.keys(),
    };
  });
  if (requireRuntime) {
    const worker = context
      .serviceWorkers()
      .filter((item) => item.url() === state.activeURL)
      .at(-1);
    if (!worker) throw new Error('Cannot inspect the active service worker runtime');
    state.runtimeVersion = await worker.evaluate('VERSION');
  }
  return state;
}
async function waitForState(page, context, options, version) {
  let state;
  await expect(async () => {
    state = await readState(page, context, options.mode !== 'webkit');
    checks.assertWorkerState(state, options.url, version);
  }).toPass({ timeout: 60000 });
  return state;
}
async function networkAssets(context, options, hashes) {
  for (const asset of checks.ASSETS) {
    const response = await context.request.get(new URL(asset, options.url).href, {
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (response.status() !== 200)
      throw new Error(`Network asset ${asset}: HTTP ${response.status()}`);
    checks.assertAssetHash(asset, await response.body(), hashes[asset], 'network');
  }
}
async function cacheAssets(page, options, hashes) {
  const cacheName = `danang-vegan:${new URL(options.url).pathname}:${options.to}`;
  for (const asset of checks.ASSETS.filter((item) => item !== 'sw.js')) {
    const bytes = await page.evaluate(
      async ({ cacheName, assetURL }) => {
        const cache = await caches.open(cacheName);
        const response = await cache.match(assetURL);
        if (!response) throw new Error(`Missing cached asset ${assetURL}`);
        return Array.from(new Uint8Array(await response.arrayBuffer()));
      },
      { cacheName, assetURL: new URL(asset, options.url).href },
    );
    checks.assertAssetHash(asset, Buffer.from(bytes), hashes[asset], 'cache');
  }
}
async function smoke(page, favorite) {
  await expect(page.locator('link[href="assets/mobile.css"]')).toHaveCount(1);
  await page.locator('[data-view="nearby"]').click();
  await expect(page.locator('#nearby-filters')).toBeVisible();
  await page.locator('#search-input').fill('會安 全素 kurumi');
  await expect(page.locator('#restaurant-list .restaurant-card')).toHaveCount(1);
  await expect(page.locator('#card-nearby-hoian-kurumi .menu-preview')).toContainText('115,000');
  if (favorite) {
    await page.locator('#search-input').fill('kurumi');
    await expect(page.locator('#card-nearby-dn-kurumi [data-favorite]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  }
}
async function run() {
  const localSource = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const options = checks.parseArgs(process.argv.slice(2), localSource);
  const fresh = options.mode === 'webkit';
  const profile = fresh
    ? fs.mkdtempSync(path.join(os.tmpdir(), `danang-webkit-${options.to}-`))
    : checks.profilePath(options);
  const proofPath = path.join(profile, 'source-proof.json');
  if (options.mode === 'verify') {
    let proof;
    try {
      proof = JSON.parse(fs.readFileSync(proofPath, 'utf8'));
    } catch {
      throw new Error(
        `Missing or unreadable source proof: ${proofPath}; run prepare while ${options.from} is live`,
      );
    }
    checks.assertProof(proof, options);
  }
  if (options.mode === 'prepare' && fs.existsSync(proofPath)) fs.unlinkSync(proofPath);
  if (options.mode !== 'prepare') checks.assertWorkerSource(localSource, options.to);
  const context = fresh
    ? await webkit.launchPersistentContext(profile, {
        headless: true,
        viewport: { width: 393, height: 852 },
      })
    : await chromium.launchPersistentContext(profile, {
        headless: true,
        offline: options.mode === 'verify',
        ...(fs.existsSync(chromePath) ? { executablePath: chromePath } : { channel: 'chrome' }),
        viewport: { width: 393, height: 852 },
      });
  try {
    const page = context.pages()[0] || (await context.newPage());
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const expected = options.mode === 'prepare' ? options.from : options.to;
    const workerResponse = await context.request.get(new URL('sw.js', options.url).href, {
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (workerResponse.status() !== 200)
      throw new Error(`Service worker response: HTTP ${workerResponse.status()}`);
    const workerBytes = await workerResponse.body();
    checks.assertWorkerSource(workerBytes.toString('utf8'), expected);
    const hashes = options.mode === 'prepare' ? null : checks.localHashes(root);
    if (hashes) await networkAssets(context, options, hashes);

    if (options.mode === 'verify') {
      // Inspect the persisted source while offline so no automatic update can erase its evidence.
      await context.setOffline(true);
      await page.goto(options.url, { waitUntil: 'domcontentloaded' });
      await waitForState(page, context, options, options.from);
      expect(
        await page.evaluate(
          () => JSON.parse(localStorage.getItem('danang-ux-v1') || '{}').favorites || [],
        ),
      ).toContain('dn-kurumi');
      await context.setOffline(false);
      await page.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        await registration.update();
      });
      await expect(page.locator('#update-banner')).toBeVisible({ timeout: 60000 });
      await page.locator('#reload-update').click();
    } else {
      const response = await page.goto(options.url, { waitUntil: 'domcontentloaded' });
      expect(response.status()).toBe(200);
      await page.waitForFunction(
        async () =>
          (await navigator.serviceWorker.getRegistration())?.active?.state === 'activated',
      );
      await page.reload({ waitUntil: 'domcontentloaded' });
    }
    const state = await waitForState(page, context, options, expected);
    if (options.mode === 'prepare') {
      await page.evaluate(() => {
        const key = 'danang-ux-v1';
        const saved = JSON.parse(localStorage.getItem(key) || '{}');
        saved.favorites = ['dn-kurumi'];
        localStorage.setItem(key, JSON.stringify(saved));
      });
      expect(errors).toEqual([]);
      const proof = {
        schema: 1,
        from: options.from,
        to: options.to,
        url: options.url,
        sourceVersion: expected,
        sourceSHA256: checks.sha256(workerBytes),
        state,
        favorite: 'dn-kurumi',
        preparedAt: new Date().toISOString(),
      };
      checks.assertProof(proof, options);
      fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2) + '\n', { mode: 0o600 });
      console.log(
        `Prepared and proved ${options.from} → ${options.to} at ${options.url}. Source proof: ${proofPath}`,
      );
      return;
    }
    await cacheAssets(page, options, hashes);
    await smoke(page, options.mode === 'verify');
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await smoke(page, options.mode === 'verify');
    await waitForState(page, context, options, options.to);
    expect(errors).toEqual([]);
    console.log(
      `${fresh ? 'Fresh WebKit ' + options.to : 'Chrome ' + options.from + ' → ' + options.to}: active scope/cache, network and cached asset SHA256, branch menu/search, ${fresh ? '' : 'favorite preserved, '}offline reload passed at ${options.url}.`,
    );
    if (!fresh) {
      // A successful transition consumes the proof: another upgrade requires a new source preparation.
      fs.unlinkSync(proofPath);
    }
  } finally {
    await context.close();
    if (fresh) fs.rmSync(profile, { recursive: true, force: true });
  }
}
run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
