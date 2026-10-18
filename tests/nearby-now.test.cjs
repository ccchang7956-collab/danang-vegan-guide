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
