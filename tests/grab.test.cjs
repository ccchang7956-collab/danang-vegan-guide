const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const C = require('../assets/core.js');
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync('assets/data.js', 'utf8'), ctx);
const D = ctx.window.TRAVEL_DATA;
const grabResearch = JSON.parse(
  fs.readFileSync('research/restaurant-grab-2026-10-17.json', 'utf8'),
);

test('Grab search intent selects official entries and composes with other words', () => {
  for (const query of ['grab', 'GRAB', '有 Grab', '有grab', 'GrabFood']) {
    const rows = C.selectRestaurants(D.restaurants, { query });
    assert.equal(rows.length, 3, query);
    assert.ok(rows.every((r) => r.grabInfo.status === 'official-link'));
  }
  assert.deepEqual(
    Array.from(C.selectRestaurants(D.restaurants, { query: '會安有grab全素' }), (r) => r.id),
    ['hoian-kurumi'],
  );
  assert.equal(
    C.matchesRestaurant({ name: 'Grab 未確認', grabInfo: { status: 'reported' } }, 'grab'),
    false,
  );
});

test('all restaurant Grab records preserve branch identity and evidence level', () => {
  for (const r of D.restaurants) {
    assert.ok(r.grabInfo, r.id);
    assert.equal(r.grabInfo.id, r.id);
    assert.equal(r.grabInfo.branchAddress, r.address);
    assert.equal(
      r.grabInfo.checkedDate,
      grabResearch.restaurants.find((record) => record.id === r.id).checkedDate,
    );
    assert.ok(r.grabInfo.searchName);
    assert.ok(r.grabInfo.note);
    if (['official-link', 'reported', 'historical'].includes(r.grabInfo.status))
      assert.ok(r.grabInfo.sourceUrls.length, r.id);
    if (r.grabInfo.status === 'official-link') {
      const u = new URL(r.grabInfo.url);
      assert.equal(u.protocol, 'https:');
      assert.ok(['food.grab.com', 'grab.onelink.me'].includes(u.hostname));
    } else assert.equal(r.grabInfo.url, null);
  }
  const dn = D.restaurants.find((r) => r.id === 'dn-kurumi');
  const ha = D.restaurants.find((r) => r.id === 'hoian-kurumi');
  assert.notEqual(dn.grabInfo.url, ha.grabInfo.url);
  assert.equal(D.restaurants.find((r) => r.id === 'bana-ngoc-chi').grabInfo.status, 'unverified');
});

test('Grab filters distinguish official links, reports, old evidence and unknowns', () => {
  const rows = [
    { id: 'official', grabInfo: { status: 'official-link' } },
    { id: 'report', grabInfo: { status: 'reported' } },
    { id: 'old', grabInfo: { status: 'historical' } },
    { id: 'unknown' },
    { id: 'closed', operatingStatus: 'permanently-closed', grabInfo: { status: 'official-link' } },
    { id: 'held', navigationHold: true, grabInfo: { status: 'official-link' } },
  ];
  const ids = (grab) => C.selectRestaurants(rows, { grab }).map((r) => r.id);
  assert.deepEqual(ids('evidence'), ['official', 'report']);
  assert.deepEqual(ids('official-link'), ['official']);
  assert.deepEqual(ids('reported'), ['report']);
  assert.deepEqual(ids('historical'), ['old']);
  assert.deepEqual(ids('unverified'), ['unknown', 'held']);
  assert.deepEqual(ids('closed'), ['closed']);
  assert.equal(ids('all').length, rows.length);
});

test('Grab filters combine with dietary, area, operating and text conditions', () => {
  const rows = C.selectRestaurants(D.restaurants, {
    grab: 'official-link',
    area: 'hoian',
    diet: 'vegan',
    operating: 'available',
    query: 'kurumi',
  });
  assert.deepEqual(
    Array.from(rows, (r) => r.id),
    ['hoian-kurumi'],
  );
  assert.equal(C.grabStatus({}), 'unverified');
  assert.equal(C.grabStatus({ operatingStatus: 'temporarily-closed' }), 'closed');
});
