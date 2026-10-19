const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../assets/core.js');

const restaurant = (id, overrides = {}) => ({
  id,
  diet: 'vegan',
  operatingStatus: 'operating-evidence',
  lat: 16.05,
  lng: 108.24,
  distance: 1,
  weeklyHours: Array.from({ length: 7 }, () => [[480, 1260]]),
  ...overrides,
});

test('nearby candidates separate closing, uncertain, outside hours and unknown distance', () => {
  const groups = C.groupNearbyRestaurants(
    [
      restaurant('ready'),
      restaurant('closing', { weeklyHours: Array.from({ length: 7 }, () => [[480, 735]]) }),
      restaurant('unknown', { weeklyHours: null }),
      restaurant('outside', { weeklyHours: Array.from({ length: 7 }, () => [[900, 1260]]) }),
      restaurant('unlocated', { distance: null }),
      restaurant('hold', { navigationHold: true }),
      restaurant('old', { operatingStatus: 'unverified' }),
      restaurant('closed', { operatingStatus: 'permanently-closed' }),
    ],
    '2026-10-23',
    '12:00',
  );
  assert.deepEqual(
    groups.ready.map((r) => r.id),
    ['ready'],
  );
  assert.deepEqual(
    groups.confirm.map((r) => r.id),
    ['closing', 'unknown', 'old'],
  );
  assert.deepEqual(
    groups.other.map((r) => r.id),
    ['outside', 'closed'],
  );
  assert.deepEqual(
    groups.unlocated.map((r) => r.id),
    ['unlocated', 'hold'],
  );
});

test('grouping preserves the distance order within each readiness group', () => {
  const groups = C.groupNearbyRestaurants(
    [restaurant('near', { distance: 0.2 }), restaurant('far', { distance: 2.9 })],
    '2026-10-23',
    '12:00',
  );
  assert.deepEqual(
    groups.ready.map((r) => r.id),
    ['near', 'far'],
  );
});

test('GPS quality is shared across nearby and exchange including malformed fixes', () => {
  const local = { lat: 16.05, lng: 108.24 };
  assert.equal(C.gpsLocationIssue(local, 30), '');
  assert.equal(C.gpsLocationIssue(local, 1000), '');
  assert.match(C.gpsLocationIssue(local, 2500), /精度不足/);
  assert.match(C.gpsLocationIssue({ lat: 25.03, lng: 121.56 }, 30), /不在峴港／會安附近/);
  for (const accuracy of [undefined, NaN, Infinity, -1])
    assert.match(C.gpsLocationIssue(local, accuracy), /精度不足/);
  assert.match(C.gpsLocationIssue({ lat: NaN, lng: 108.24 }, 30), /座標/);
});

const sortRecords = () => [
  restaurant('far-ready', { distance: 25 }),
  restaurant('near-outside', {
    distance: 0.2,
    diet: 'vegetarian',
    weeklyHours: Array.from({ length: 7 }, () => [[900, 1260]]),
  }),
  restaurant('near-uncertain', { distance: 0.1, operatingStatus: 'unverified' }),
  restaurant('unlocated', { distance: null }),
];

test('distance priority ignores operating and serving rank while keeping unknown distance last', () => {
  const records = sortRecords();
  const sorted = C.sortNearbyRestaurants(records, {
    sort: 'distance',
    date: '2026-10-23',
    time: '12:00',
  });
  assert.deepEqual(
    sorted.map((r) => r.id),
    ['near-uncertain', 'near-outside', 'far-ready', 'unlocated'],
  );
  assert.deepEqual(
    records.map((r) => r.id),
    ['far-ready', 'near-outside', 'near-uncertain', 'unlocated'],
  );
});

test('vegan priority places located vegan restaurants before closer vegetarian restaurants', () => {
  assert.deepEqual(
    C.sortNearbyRestaurants(sortRecords(), {
      sort: 'vegan',
      date: '2026-10-23',
      time: '12:00',
    }).map((r) => r.id),
    ['near-uncertain', 'far-ready', 'near-outside', 'unlocated'],
  );
});

test('recommended sorting retains serving evidence and hours before distance', () => {
  assert.deepEqual(
    C.sortNearbyRestaurants(sortRecords(), {
      sort: 'recommended',
      date: '2026-10-23',
      time: '12:00',
    }).map((r) => r.id),
    ['far-ready', 'near-outside', 'near-uncertain', 'unlocated'],
  );
});
