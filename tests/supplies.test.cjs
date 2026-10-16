const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'supplies-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const data = JSON.parse(
    fs.readFileSync(path.join(root, 'research/supermarket-supplies.json'), 'utf8'),
  );
  const html = path.join(dir, 'index.html');
  fs.copyFileSync(path.join(root, 'index.html'), html);
  return { dir, data, html };
}
function run(f, check = false) {
  const dataFile = path.join(f.dir, 'supplies.json');
  fs.writeFileSync(dataFile, JSON.stringify(f.data));
  return spawnSync(
    'python3',
    [
      path.join(root, 'scripts/supplies.py'),
      '--data',
      dataFile,
      '--html',
      f.html,
      '--asset-root',
      root,
      ...(check ? ['--check'] : []),
    ],
    { encoding: 'utf8' },
  );
}
test('JSON changes regenerate products and stores, preserve static content, and are deterministic', (t) => {
  const f = fixture(t);
  const before = fs.readFileSync(f.html, 'utf8');
  f.data.products[0].name = 'Changed fixture name';
  f.data.stores[0].note = 'Changed store note';
  assert.equal(run(f).status, 0);
  const after = fs.readFileSync(f.html, 'utf8');
  assert.match(after, /<h4>Changed fixture name<\/h4>/);
  assert.match(after, /Changed store note/);
  assert.equal((after.match(/class="supply-photo"/g) || []).length, 11);
  assert.equal(
    after.split('<!-- generated:supplies-noodles:start -->')[0],
    before.split('<!-- generated:supplies-noodles:start -->')[0],
  );
  assert.equal(
    after.slice(after.indexOf('<section id="supply-labels"')),
    before.slice(before.indexOf('<section id="supply-labels"')),
  );
  assert.equal(run(f, true).status, 0);
  assert.equal(run(f).status, 0);
  assert.equal(fs.readFileSync(f.html, 'utf8'), after);
});
test('all generated text and URL attributes are escaped', (t) => {
  const f = fixture(t);
  f.data.products[0].name = '<script>"&';
  f.data.products[0].source = 'https://example.com/?a=1&b="quoted"';
  f.data.stores[0].note = '<b>store & note</b>';
  assert.equal(run(f).status, 0);
  const html = fs.readFileSync(f.html, 'utf8');
  assert.match(html, /&lt;script&gt;&quot;&amp;/);
  assert.match(html, /https:\/\/example.com\/\?a=1&amp;b=&quot;quoted&quot;/);
  assert.match(html, /&lt;b&gt;store &amp; note&lt;\/b&gt;/);
});
for (const [name, mutate] of [
  [
    'invalid id',
    (d) => {
      d.products[0].id = 'bad id';
    },
  ],
  [
    'duplicate id',
    (d) => {
      d.products[1].id = d.products[0].id;
    },
  ],
  [
    'missing image',
    (d) => {
      d.products[0].imagePath = 'assets/products/missing.webp';
    },
  ],
  [
    'path traversal',
    (d) => {
      d.products[0].imagePath = 'assets/products/../../index.html';
    },
  ],
  [
    'unsafe source',
    (d) => {
      d.stores[0].source = 'javascript:alert(1)';
    },
  ],
  [
    'unknown category',
    (d) => {
      d.products[0].category = 'unknown';
    },
  ],
  [
    'unknown diet confidence',
    (d) => {
      d.products[0].confidence = 'certified';
    },
  ],
])
  test(`rejects ${name} without changing HTML`, (t) => {
    const f = fixture(t);
    mutate(f.data);
    const before = fs.readFileSync(f.html, 'utf8');
    const result = run(f);
    assert.notEqual(result.status, 0);
    assert.equal(fs.readFileSync(f.html, 'utf8'), before);
  });
test('--check detects stale generated content without writing', (t) => {
  const f = fixture(t);
  assert.equal(run(f).status, 0);
  const before = fs.readFileSync(f.html, 'utf8');
  f.data.products[0].note = 'New research note';
  const result = run(f, true);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /stale/i);
  assert.equal(fs.readFileSync(f.html, 'utf8'), before);
});
for (const id of ['noodles', 'store-lotte-danang']) {
  test(`rejects emitted HTML id collision ${id}`, (t) => {
    const f = fixture(t);
    f.data.products[0].id = id;
    const result = run(f);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /duplicate.*id/i);
  });
}
test('rejects missing generated markers without changing HTML', (t) => {
  const f = fixture(t);
  const before = fs
    .readFileSync(f.html, 'utf8')
    .replace('<!-- generated:supplies-stores:end -->', '');
  fs.writeFileSync(f.html, before);
  const result = run(f);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /markers/i);
  assert.equal(fs.readFileSync(f.html, 'utf8'), before);
});
