const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SCOPE = 'https://example.github.io/vegan-trip/';
const CURRENT_CACHE = 'danang-vegan:/vegan-trip/:v15';
const INDEX_URL = new URL('./index.html', SCOPE).href;

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function loadWorker({
  scope = SCOPE,
  fetchImpl = async () => new Response('network'),
  addAllError,
  putError,
  initialNames = [],
  initialEntries = [],
  deleteGate,
  onDeleteStart,
} = {}) {
  const listeners = {};
  const operations = [];
  const deleted = [];
  const addedFiles = [];
  const entries = new Map(initialEntries.map(([key, response]) => [key, response.clone()]));

  const keyOf = (request) =>
    typeof request === 'string' ? new URL(request, scope).href : request.url;

  const cache = {
    async addAll(files) {
      operations.push('cache.addAll');
      addedFiles.push(...files);
      for (const file of files) {
        assert.ok(fs.existsSync(path.resolve(PROJECT_ROOT, file)), file);
      }
      if (addAllError) throw addAllError;
    },
    async match(request) {
      const key = keyOf(request);
      operations.push(`cache.match:${key}`);
      return entries.get(key)?.clone();
    },
    async put(request, response) {
      const key = keyOf(request);
      operations.push(`cache.put:${key}`);
      if (putError) throw putError;
      entries.set(key, response.clone());
    },
  };

  const caches = {
    async open(name) {
      operations.push(`caches.open:${name}`);
      return cache;
    },
    async keys() {
      operations.push('caches.keys');
      return [...initialNames];
    },
    async delete(name) {
      operations.push(`caches.delete:start:${name}`);
      onDeleteStart?.();
      if (deleteGate) await deleteGate.promise;
      deleted.push(name);
      operations.push(`caches.delete:end:${name}`);
      return true;
    },
  };

  const workerFetch = async (request) => {
    operations.push(`fetch:${request.url}`);
    return fetchImpl(request);
  };

  const self = {
    registration: { scope },
    clients: {
      async claim() {
        operations.push('clients.claim');
      },
    },
    async skipWaiting() {
      operations.push('skipWaiting');
    },
    addEventListener(type, listener) {
      listeners[type] = listener;
    },
  };

  vm.runInNewContext(fs.readFileSync(path.join(PROJECT_ROOT, 'sw.js'), 'utf8'), {
    self,
    caches,
    fetch: workerFetch,
    URL,
    Set,
    Promise,
    Response,
  });

  return { listeners, operations, deleted, addedFiles, entries };
}

function lifecyclePromise(listener) {
  let pending;
  let calls = 0;
  listener({
    waitUntil(promise) {
      calls += 1;
      pending = promise;
    },
  });
  assert.equal(calls, 1, 'lifecycle event should register one promise');
  return pending;
}

function request(url, { method = 'GET', mode = 'cors' } = {}) {
  return { url, method, mode };
}

function dispatchFetch(worker, fetchRequest) {
  let responsePromise;
  worker.listeners.fetch({
    request: fetchRequest,
    respondWith(promise) {
      responsePromise = Promise.resolve(promise);
    },
  });
  return {
    handled: responsePromise !== undefined,
    responsePromise,
  };
}

test('install rejects when precaching fails and does not skip waiting', async () => {
  const worker = loadWorker({ addAllError: new Error('precache failed') });
  const pending = lifecyclePromise(worker.listeners.install);

  await assert.rejects(pending, /precache failed/);
  assert.deepEqual(worker.operations, [`caches.open:${CURRENT_CACHE}`, 'cache.addAll']);
});

test('install completes the app shell precache before skipWaiting', async () => {
  const worker = loadWorker();

  await lifecyclePromise(worker.listeners.install);

  assert.ok(worker.addedFiles.includes('./index.html'));
  assert.ok(worker.addedFiles.includes('./assets/styles.css'));
  assert.deepEqual(worker.operations, [
    `caches.open:${CURRENT_CACHE}`,
    'cache.addAll',
    'skipWaiting',
  ]);
});

test('activate deletes only old caches for this scope and waits before claim', async () => {
  const oldScopedCache = 'danang-vegan:/vegan-trip/:v11';
  const deleteGate = deferred();
  const deleteStarted = deferred();
  const worker = loadWorker({
    initialNames: [
      oldScopedCache,
      CURRENT_CACHE,
      'danang-vegan:/another-site/:v11',
      'unrelated-cache',
    ],
    deleteGate,
    onDeleteStart: deleteStarted.resolve,
  });
  const pending = lifecyclePromise(worker.listeners.activate);

  await deleteStarted.promise;
  assert.deepEqual(worker.operations, ['caches.keys', `caches.delete:start:${oldScopedCache}`]);

  deleteGate.resolve();
  await pending;

  assert.deepEqual(worker.deleted, [oldScopedCache]);
  assert.deepEqual(worker.operations, [
    'caches.keys',
    `caches.delete:start:${oldScopedCache}`,
    `caches.delete:end:${oldScopedCache}`,
    'clients.claim',
  ]);
});

test('cache hit returns the cached response without fetching', async () => {
  const assetUrl = new URL('./assets/styles.css', SCOPE).href;
  const worker = loadWorker({
    initialEntries: [[assetUrl, new Response('cached stylesheet')]],
    fetchImpl: async () => {
      throw new Error('fetch should not run after a cache hit');
    },
  });
  const result = dispatchFetch(worker, request(assetUrl));

  assert.equal(result.handled, true);
  assert.equal(await (await result.responsePromise).text(), 'cached stylesheet');
  assert.deepEqual(worker.operations, [`caches.open:${CURRENT_CACHE}`, `cache.match:${assetUrl}`]);
});

test('cache miss returns and stores a successful network response', async () => {
  const assetUrl = new URL('./assets/styles.css', SCOPE).href;
  const worker = loadWorker({
    fetchImpl: async () => new Response('fresh stylesheet', { status: 200 }),
  });
  const result = dispatchFetch(worker, request(assetUrl));

  assert.equal(result.handled, true);
  assert.equal(await (await result.responsePromise).text(), 'fresh stylesheet');
  assert.equal(await worker.entries.get(assetUrl).text(), 'fresh stylesheet');
  assert.deepEqual(worker.operations, [
    `caches.open:${CURRENT_CACHE}`,
    `cache.match:${assetUrl}`,
    `fetch:${assetUrl}`,
    `cache.put:${assetUrl}`,
  ]);
});

test('cache miss returns an error response when the network fails', async () => {
  const assetUrl = new URL('./assets/styles.css', SCOPE).href;
  const worker = loadWorker({
    fetchImpl: async () => {
      throw new Error('offline');
    },
  });
  const result = dispatchFetch(worker, request(assetUrl));

  const response = await result.responsePromise;
  assert.equal(response.type, 'error');
  assert.equal(response.status, 0);
  assert.deepEqual(worker.operations, [
    `caches.open:${CURRENT_CACHE}`,
    `cache.match:${assetUrl}`,
    `fetch:${assetUrl}`,
  ]);
});

test('successful network response stays usable when opportunistic cache put fails', async () => {
  const assetUrl = new URL('./assets/styles.css', SCOPE).href;
  const worker = loadWorker({
    putError: new Error('quota exceeded'),
    fetchImpl: async () => new Response('network remains usable', { status: 200 }),
  });
  const result = dispatchFetch(worker, request(assetUrl));

  const response = await result.responsePromise;
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'network remains usable');
  assert.deepEqual(worker.operations, [
    `caches.open:${CURRENT_CACHE}`,
    `cache.match:${assetUrl}`,
    `fetch:${assetUrl}`,
    `cache.put:${assetUrl}`,
  ]);
});

test('query navigation to the scoped app uses the cached index document', async () => {
  const worker = loadWorker({
    initialEntries: [[INDEX_URL, new Response('cached app document')]],
    fetchImpl: async () => {
      throw new Error('fetch should not run for a cache hit');
    },
  });
  const result = dispatchFetch(worker, request(`${SCOPE}?day=2`, { mode: 'navigate' }));

  assert.equal(result.handled, true);
  assert.equal(await (await result.responsePromise).text(), 'cached app document');
  assert.ok(worker.operations.includes(`cache.match:${INDEX_URL}`));
});

test('only in-scope GET app resources and the app root navigation are handled', () => {
  const worker = loadWorker();
  const requests = [
    request(new URL('./assets/styles.css', SCOPE).href, { method: 'POST' }),
    request(new URL('./assets/styles.css?rev=2', SCOPE).href),
    request('https://cdn.example.net/vegan-trip/index.html'),
    request('https://example.github.io/vegan-trip-extra/index.html'),
    request(new URL('./tiles/1/2/3.png', SCOPE).href),
    request(new URL('./places/3', SCOPE).href, { mode: 'navigate' }),
  ];

  for (const fetchRequest of requests) {
    assert.equal(dispatchFetch(worker, fetchRequest).handled, false, fetchRequest.url);
  }
  assert.deepEqual(worker.operations, []);
});

test('map tile requests are outside the precache allowlist', () => {
  const worker = loadWorker();
  const externalTile = dispatchFetch(worker, request('https://tile.openstreetmap.org/12/1/1.png'));
  const sameOriginTile = dispatchFetch(worker, request(new URL('./12/1/1.png', SCOPE).href));

  assert.equal(externalTile.handled, false);
  assert.equal(sameOriginTile.handled, false);
  assert.deepEqual(worker.operations, []);
});
