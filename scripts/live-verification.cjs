const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createHash } = require('node:crypto');
const DEFAULT_URL = 'https://ccchang7956-collab.github.io/danang-vegan-guide/';
const ASSETS = [
  'sw.js',
  'index.html',
  'assets/app.js',
  'assets/core.js',
  'assets/ux.js',
  'assets/data.js',
  'assets/styles.css',
  'assets/mobile.css',
];
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
function workerVersion(source) {
  const match = source.match(/^\s*const VERSION\s*=\s*['"](v\d+)['"];?\s*$/m);
  if (!match) throw new Error('Service worker response has no recognized VERSION declaration');
  return match[1];
}
function assertWorkerSource(source, expected) {
  const actual = workerVersion(source);
  if (actual !== expected)
    throw new Error(`Service worker version: expected ${expected}, received ${actual}`);
  return actual;
}
function parseArgs(args, localSource) {
  const [mode, ...flags] = args;
  if (!['prepare', 'verify', 'webkit'].includes(mode))
    throw new Error(
      'Usage: verify:live -- prepare|verify --from v22 --to v23 [--url URL], or webkit --to v23',
    );
  const options = { mode, from: undefined, to: undefined, url: DEFAULT_URL };
  for (let i = 0; i < flags.length; i += 2) {
    const flag = flags[i];
    if (!['--from', '--to', '--url'].includes(flag)) throw new Error(`Unknown option ${flag}`);
    if (!flags[i + 1] || flags[i + 1].startsWith('--'))
      throw new Error(`Missing value for ${flag}`);
    options[flag.slice(2)] = flags[i + 1];
  }
  if (mode !== 'webkit' && !options.from)
    throw new Error('--from must be explicit for prepare and verify');
  options.to ||= workerVersion(localSource);
  for (const version of [options.from, options.to].filter(Boolean))
    if (!/^v\d+$/.test(version)) throw new Error(`Invalid version ${version}`);
  if (options.from === options.to) throw new Error('--from and --to must differ');
  const url = new URL(options.url);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.search ||
    url.hash ||
    !url.pathname.endsWith('/')
  )
    throw new Error('--url must be an HTTP(S) app scope ending in / without query or hash');
  options.url = url.href;
  return options;
}
function assertWorkerState(state, url, version) {
  const expectedURL = new URL('sw.js', url).href;
  if (
    state.scope !== url ||
    state.activeURL !== expectedURL ||
    state.controllerURL !== expectedURL ||
    state.activeState !== 'activated'
  )
    throw new Error(`Worker scope/controller is not activated for ${url}`);
  const prefix = `danang-vegan:${new URL(url).pathname}:`;
  const names = state.cacheNames.filter((name) => name.startsWith(prefix));
  if (names.length !== 1 || names[0] !== prefix + version)
    throw new Error(
      `Worker cache: expected only ${prefix + version}, received ${JSON.stringify(names)}`,
    );
  if (state.runtimeVersion !== undefined && state.runtimeVersion !== version)
    throw new Error(`Active worker runtime: expected ${version}, received ${state.runtimeVersion}`);
}
function profilePath(options) {
  return path.join(
    os.tmpdir(),
    `danang-release-${options.from}-${options.to}-${sha256(options.url).slice(0, 16)}`,
  );
}
function assertProof(proof, options) {
  if (
    !proof ||
    proof.schema !== 1 ||
    ['from', 'to', 'url'].some((key) => proof[key] !== options[key]) ||
    proof.sourceVersion !== options.from ||
    !/^[a-f0-9]{64}$/.test(proof.sourceSHA256 || '') ||
    !Number.isFinite(Date.parse(proof.preparedAt)) ||
    proof.favorite !== 'dn-kurumi' ||
    !proof.state
  )
    throw new Error(
      'Missing or invalid source proof for this origin and version transition; run prepare while the source release is live',
    );
  assertWorkerState(proof.state, options.url, options.from);
}
function localHashes(root, assets = ASSETS) {
  return Object.fromEntries(
    assets.map((asset) => [asset, sha256(fs.readFileSync(path.join(root, asset)))]),
  );
}
function assertAssetHash(asset, bytes, expected, source) {
  const actual = sha256(bytes);
  if (actual !== expected)
    throw new Error(
      `${source} asset ${asset} SHA256 mismatch: expected ${expected}, received ${actual}`,
    );
}
module.exports = {
  DEFAULT_URL,
  ASSETS,
  sha256,
  workerVersion,
  parseArgs,
  assertWorkerSource,
  assertWorkerState,
  profilePath,
  assertProof,
  localHashes,
  assertAssetHash,
};
