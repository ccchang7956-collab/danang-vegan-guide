const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const checks = require('../scripts/live-verification.cjs');
const url = 'https://example.test/guide/';
const state = {
  scope: url,
  activeURL: url + 'sw.js',
  controllerURL: url + 'sw.js',
  activeState: 'activated',
  cacheNames: ['danang-vegan:/guide/:v22'],
  runtimeVersion: 'v22',
};
test('requires explicit source for upgrade and derives a missing target from local source', () => {
  assert.throws(
    () => checks.parseArgs(['prepare', '--to', 'v23'], "const VERSION = 'v23';"),
    /--from/,
  );
  assert.deepEqual(checks.parseArgs(['verify', '--from', 'v22'], "const VERSION = 'v23';"), {
    mode: 'verify',
    from: 'v22',
    to: 'v23',
    url: checks.DEFAULT_URL,
  });
  assert.throws(() => checks.parseArgs(['webkit', '--to', 'v23', '--bogus'], ''), /Unknown/);
});
test('actual worker response must declare requested version', () => {
  assert.equal(checks.assertWorkerSource("const VERSION = 'v22';", 'v22'), 'v22');
  assert.throws(
    () => checks.assertWorkerSource("const VERSION = 'v23';", 'v22'),
    /expected v22.*v23/,
  );
});
test('requires active scope, controller, exact cache namespace and runtime version', () => {
  checks.assertWorkerState(state, url, 'v22');
  for (const patch of [
    { scope: 'https://example.test/' },
    { controllerURL: null },
    { activeState: 'installing' },
    { cacheNames: ['danang-vegan:/guide/:v21'] },
    { cacheNames: [...state.cacheNames, 'danang-vegan:/guide/:v21'] },
    { runtimeVersion: 'v23' },
  ])
    assert.throws(() => checks.assertWorkerState({ ...state, ...patch }, url, 'v22'));
});
test('proof cannot be missing, use wrong transition or invent source evidence', () => {
  const options = { from: 'v22', to: 'v23', url };
  assert.throws(() => checks.assertProof(null, options), /proof/i);
  const proof = {
    schema: 1,
    ...options,
    sourceVersion: 'v22',
    sourceSHA256: checks.sha256('source'),
    state,
    favorite: 'dn-kurumi',
    preparedAt: new Date().toISOString(),
  };
  checks.assertProof(proof, options);
  assert.throws(() => checks.assertProof(proof, { ...options, from: 'v21' }), /proof/i);
  assert.throws(() => checks.assertProof({ ...proof, sourceVersion: 'v21' }, options), /proof/i);
  assert.throws(
    () => checks.assertProof({ ...proof, state: { ...state, cacheNames: [] } }, options),
    /cache/i,
  );
  assert.notEqual(checks.profilePath(options), checks.profilePath({ ...options, to: 'v24' }));
  assert.notEqual(
    checks.profilePath(options),
    checks.profilePath({ ...options, url: 'https://elsewhere.test/guide/' }),
  );
});
test('hash validation compares byte contents and rejects stale network or cached assets', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'live-hash-test-'));
  try {
    fs.writeFileSync(path.join(dir, 'app.js'), 'new bytes\n');
    const hashes = checks.localHashes(dir, ['app.js']);
    checks.assertAssetHash('app.js', Buffer.from('new bytes\n'), hashes['app.js'], 'network');
    assert.throws(
      () =>
        checks.assertAssetHash('app.js', Buffer.from('old bytes\n'), hashes['app.js'], 'network'),
      /network.*app.js.*SHA256/,
    );
    assert.throws(
      () => checks.assertAssetHash('app.js', Buffer.from('new bytes'), hashes['app.js'], 'cache'),
      /cache.*app.js.*SHA256/,
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
