const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const C = require('../assets/core.js');
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync('assets/data.js', 'utf8'), ctx);
const D = ctx.window.TRAVEL_DATA;
const venue = (id) => D.restaurants.find((r) => r.id === id);
test('Chinese geography and strict vegan intent combine with accent-insensitive names', () => {
  assert.ok(C.matchesRestaurant(venue('hoian-kurumi'), '會安 全素 kurumi'));
  assert.ok(C.matchesRestaurant(venue('dn-roots'), '美溪'));
  assert.equal(C.matchesRestaurant(venue('hoian-peanuts'), '全素'), false);
  assert.ok(C.matchesRestaurant(venue('dn-lehoi'), '越式三明治'));
  assert.ok(C.matchesRestaurant(venue('dn-lehoi'), 'banh mi'));
});
test('meal searches describe reference service windows, never menu claims', () => {
  assert.ok(C.matchesRestaurant(venue('dn-roots'), '早餐'));
  assert.equal(C.matchesRestaurant(venue('hoian-chickpea'), '早餐'), false);
  assert.ok(C.matchesRestaurant(venue('hoian-chickpea'), '午餐'));
});
test('weekly data covers known schedules and preserves split services and Sunday starts', () => {
  assert.equal(D.restaurants.filter((r) => r.weeklyHours).length, 43);
  assert.equal(C.restaurantHours(venue('om-vegan'), '2026-10-21', '15:00').state, 'outside');
  assert.equal(C.restaurantHours(venue('dn-lehoi'), '2026-10-25', '08:30').state, 'outside');
  assert.equal(C.restaurantHours(venue('dn-lehoi'), '2026-10-25', '14:30').state, 'open');
  assert.equal(C.restaurantHours(venue('hoian-seeds'), '2026-10-22', '12:00').state, 'closed');
  assert.equal(C.restaurantHours(venue('dn-roots'), '2026-10-21', '22:00').state, 'closing');
  assert.equal(C.restaurantHours(venue('dn-roots'), '2026-10-21', '22:30').state, 'outside');
});
test('uncertain service hours and weekday conflicts never claim an open window', () => {
  assert.equal(C.restaurantHours(venue('dn-anmocnhien'), '2026-10-25', '12:00').state, 'uncertain');
  assert.equal(C.restaurantHours(venue('dn-anmocnhien'), '2026-10-24', '12:00').state, 'open');
  assert.equal(C.restaurantHours(venue('hoian-peanuts'), '2026-10-20', '12:00').state, 'uncertain');
  assert.equal(C.restaurantHours(venue('hoian-rau-oi'), '2026-10-21', '12:00').state, 'uncertain');
  assert.equal(C.restaurantHours(venue('khai-tam-city'), '2026-10-21', '12:00').state, 'uncertain');
  assert.equal(C.restaurantHours(venue('dn-everyday'), '2026-10-21', '12:00').state, 'closed');
});
test('invalid dates and time are unknown and overnight service uses previous weekday', () => {
  const r = { weeklyHours: [[], [[1200, 1560]], [], [], [], [], []] };
  assert.equal(C.restaurantHours(r, '2026-10-20', '01:00').state, 'open');
  assert.equal(C.restaurantHours(r, '2026-10-20', '02:00').state, 'closed');
  assert.equal(C.restaurantHours(r, '2026-02-30', '12:00').state, 'unknown');
  assert.equal(C.restaurantHours(r, '2026-10-20', '25:00').state, 'unknown');
  assert.equal(C.vietnamNow(new Date('2026-10-20T18:30:00Z')).date, '2026-10-21');
  assert.equal(C.vietnamNow(new Date('2026-10-20T18:30:00Z')).time, '01:30');
});
test('nearby radius separates unlocated alternatives without pretending they are in range', () => {
  const rows = [
    { id: 'near', lat: 16, lng: 108 },
    { id: 'far', lat: 17, lng: 108 },
    { id: 'unknown', lat: null, lng: null },
  ];
  const list = C.selectRestaurants(rows, { origin: { lat: 16, lng: 108 }, radius: 5 });
  assert.deepEqual(
    list.map((r) => r.id),
    ['near', 'unknown'],
  );
  assert.equal(list[1].outsideRadiusUnknown, true);
  assert.equal(C.selectRestaurants(rows, { radius: 5 })[0].outsideRadiusUnknown, true);
});
test('English vegan in an official business name remains searchable for uncertain venues', () => {
  assert.ok(C.matchesRestaurant(venue('hoian-fisherman'), 'fisherman vegan'));
  assert.equal(C.matchesRestaurant(venue('hoian-fisherman'), '全素 fisherman'), false);
});
test('geography intent uses the current area rather than another branch mentioned in notes', () => {
  assert.equal(C.matchesRestaurant(venue('dieu-hoa-city'), '會安'), false);
  assert.ok(C.matchesRestaurant(venue('hoian-kurumi'), '會安'));
});
test('meal queries respect selected date instead of a different weekday', () => {
  assert.equal(C.matchesRestaurant(venue('dn-lehoi'), '早餐', '2026-10-25'), false);
  assert.ok(C.matchesRestaurant(venue('dn-lehoi'), '早餐', '2026-10-21'));
});
test('selected date hours show only that weekday, including lunch breaks and closure', () => {
  assert.match(C.restaurantDayHours(venue('dn-lehoi'), '2026-10-25'), /週日.*14:30–22:00/);
  assert.doesNotMatch(C.restaurantDayHours(venue('dn-lehoi'), '2026-10-25'), /06:30/);
  assert.match(C.restaurantDayHours(venue('om-vegan'), '2026-10-21'), /10:30–14:00.*16:30–21:00/);
  assert.match(C.restaurantDayHours(venue('hoian-seeds'), '2026-10-22'), /休息/);
  assert.match(C.restaurantDayHours(venue('dn-anmocnhien'), '2026-10-25'), /需確認/);
  assert.match(C.restaurantDayHours(venue('khai-tam-city'), '2026-10-21'), /待確認|需確認/);
  assert.match(C.restaurantDayHours(venue('dn-roots'), 'bad'), /待確認/);
});
test('menu research covers all records and keeps prices, sources and branch evidence separate', () => {
  for (const r of D.restaurants) {
    assert.ok(r.menuInfo, r.id);
    assert.equal(r.menuInfo.id, r.id);
    for (const item of r.menuInfo.items) {
      assert.ok(item.name && item.veganEvidence && r.menuInfo.sourceUrls.length);
      assert.ok(item.priceVnd === null || (Number.isInteger(item.priceVnd) && item.priceVnd > 0));
    }
  }
  const dn = venue('dn-kurumi').menuInfo.items.find((i) => i.name.includes('Benedict'));
  const ha = venue('hoian-kurumi').menuInfo.items.find((i) => i.name.includes('Benedict'));
  assert.equal(dn.priceVnd, 110000);
  assert.equal(ha.priceVnd, 120000);
  assert.equal(venue('dn-alt').menuInfo.items.length, 0);
});
test('unspaced Chinese semantic searches preserve date and vegan constraints', () => {
  const options = { date: '2026-10-23', operating: 'available' };
  const ids = (q) =>
    Array.from(C.selectRestaurants(D.restaurants, { ...options, query: q }), (r) => r.id);
  assert.ok(ids('會安 全素 早餐').length > 0);
  assert.deepEqual(ids('會安全素早餐'), ids('會安 全素 早餐'));
  assert.deepEqual(ids('全素會安早餐'), ids('全素 會安 早餐'));
  assert.deepEqual(ids('美溪全素晚餐'), ids('美溪 全素 晚餐'));
  assert.deepEqual(ids('會安全素Kurumi'), ['hoian-kurumi']);
});
test('Chinese dish names remain literal instead of silently becoming strict store filters', () => {
  assert.ok(C.matchesRestaurant(venue('hoian-rau-oi'), '純素雞飯'));
  assert.equal(C.matchesRestaurant(venue('hoian-rau-oi'), '全素 純素雞飯'), false);
  assert.ok(C.matchesRestaurant(venue('dn-lehoi'), 'banh mi'));
  assert.ok(C.matchesRestaurant(venue('hoian-fisherman'), 'fisherman vegan'));
});
