const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm');
const context = { window: {} };
if (fs.existsSync('assets/data.js'))
  vm.runInNewContext(fs.readFileSync('assets/data.js', 'utf8'), context);
const D = context.window.TRAVEL_DATA;
test('reviewed weekly schedules retain source dates and superseded reports', () => {
  for (const id of [
    'dn-khong',
    'moms-kitchen',
    'hoian-seeds',
    'hoian-rau-oi',
    'hoian-ivegan',
    'dn-lehoi',
    'hoian-an-hy',
  ]) {
    const r = D.restaurants.find((r) => r.id === id);
    assert.equal(r.hoursStatus, 'google-weekly-schedule-reviewed', id);
    assert.equal(r.hoursCheckedDate, '2026-10-13');
    assert.equal(r.phoneCheckedDate, '2026-10-13');
    assert.equal(new URL(r.hoursSourceUrl).protocol, 'https:');
    assert.equal(new URL(r.phoneSourceUrl).protocol, 'https:');
    assert.ok(r.reportedHoursHistory.length, id);
    assert.ok(r.phone);
  }
});
test('same street addresses do not acquire false relocation metadata', () => {
  for (const id of ['hoian-kurumi', 'hoian-ivegan'])
    assert.equal(D.restaurants.find((r) => r.id === id).previousAddress, undefined, id);
  for (const id of ['dn-daibinh', 'hoian-an-hy'])
    assert.ok(D.restaurants.find((r) => r.id === id).previousAddress, id);
});
test('Le Hoi opens Wednesday and starts Sunday in the afternoon', () => {
  const r = D.restaurants.find((r) => r.id === 'dn-lehoi');
  assert.equal(r.closedWeekdays.length, 0);
  assert.match(r.hours, /週一至六 06:30–22:00/);
  assert.match(r.hours, /週日 14:30–22:00/);
});
test('unresolved opening conflicts are withheld and lunar exceptions remain qualified', () => {
  assert.equal(D.restaurants.find((r) => r.id === 'ngoc-chi-city').hours, null);
  const r = D.restaurants.find((r) => r.id === 'hoian-an-hy');
  assert.equal(r.hours, '每日 11:00–21:00');
  assert.match(r.hoursExceptionNote, /農曆初二、十六/);
  assert.match(r.hoursExceptionNote, /未確認/);
  assert.match(r.reportedHoursHistory[0].hours, /lunar/);
});
test('five daily itineraries preserve travel dates and hotels', () => {
  assert.ok(D, 'curated travel data is present');
  assert.equal(D.days.length, 5);
  assert.equal(D.days[0].date, '2026-10-21');
  assert.equal(D.days[4].date, '2026-10-25');
  assert.equal(D.days[1].hotel, D.days[2].hotel);
  for (const d of D.days) {
    assert.ok(d.stops.length);
    for (const s of d.stops)
      assert.ok(
        D.places.some((p) => p.id === s.id),
        s.id,
      );
  }
});
test('expanded restaurant catalogue has sources, dietary boundaries and valid map coordinates', () => {
  assert.ok(D, 'curated travel data is present');
  assert.ok(D.restaurants.length >= 35);
  const ids = new Set();
  let located = 0;
  for (const r of D.restaurants) {
    assert.ok(!ids.has(r.id), 'duplicate ' + r.id);
    ids.add(r.id);
    assert.ok(r.name && r.address && r.veganNotes);
    assert.ok(['vegan', 'vegetarian', 'mixed', 'uncertain'].includes(r.diet), r.name);
    assert.ok(r.sourceUrls.length);
    for (const u of r.sourceUrls) assert.equal(new URL(u).protocol, 'https:');
    if (r.lat !== null) {
      located++;
      assert.ok(r.lat > 15 && r.lat < 17);
      assert.ok(r.lng > 107 && r.lng < 109);
      assert.ok(r.coordinateStatus && !r.coordinateStatus.startsWith('unverified'));
    } else assert.equal(r.lng, null);
  }
  assert.ok(located >= 25, 'enough credible pins for nearby search');
});
test('recent moves and Ba Na dietary risk are visible', () => {
  assert.ok(D, 'curated travel data is present');
  assert.match(D.restaurants.find((r) => r.id === 'dn-roots').address, /266/);
  assert.match(D.restaurants.find((r) => r.id === 'dn-hanhphuc').address, /178/);
  const mountain = D.restaurants.find((r) => r.area === 'banahills');
  assert.ok(mountain);
  assert.notEqual(mountain.diet, 'vegan');
  assert.ok(mountain.veganNotes.length > 20);
});
test('direct Google audit retains all original 45 venues and archives confirmed closures', () => {
  assert.equal(D.restaurantAuditSummary.googleDirectRatings, 45);
  for (const r of D.restaurants.filter((r) => r.id !== 'loving-hut-danang')) {
    assert.equal(r.ratingSourceType, 'google-direct', r.id);
    assert.equal(r.ratingAsOfDate, '2026-10-13');
    assert.equal(r.googleLinkType, 'place');
    assert.ok(r.googleReviewCount >= 0);
    assert.equal(new URL(r.googleMapsUrl).protocol, 'https:');
  }
  for (const id of ['dn-everyday', 'hoian-emma'])
    assert.equal(D.restaurants.find((r) => r.id === id).operatingStatus, 'permanently-closed');
  assert.equal(
    D.restaurants.find((r) => r.id === 'ans-vegetarian').operatingStatus,
    'operating-evidence',
  );
  assert.match(D.restaurants.find((r) => r.id === 'hoian-ivegan').address, /672/);
});

test('obsolete and contradictory schedules cannot appear as current weekly hours', () => {
  for (const id of ['ans-vegetarian', 'au-lac', 'dn-xinh', 'an-lac-tam-2', 'tinh-quan'])
    assert.equal(D.restaurants.find((r) => r.id === id).hours, null, id);
  for (const id of ['dn-xinh', 'an-lac-tam-2', 'tinh-quan'])
    assert.ok(D.restaurants.find((r) => r.id === id).hoursConflictSourceUrl);
});

test('Loving Hut addition preserves its Google share link and uncertainty without altering Loving Vegan', () => {
  const r = D.restaurants.find((r) => r.id === 'loving-hut-danang');
  assert.ok(r, 'new restaurant missing');
  assert.match(r.address, /380/);
  assert.equal(r.googleMapsUrl, 'https://share.google/4D2GrpTKifnpG4sc6');
  assert.equal(r.ratingSourceType, 'google-mirror');
  assert.equal(r.operatingStatus, 'unverified');
  assert.match(r.veganNotes, /奶|酪蛋白/);
  assert.equal(r.diet, 'uncertain');
  assert.equal(r.lat, 16.025067);
  assert.equal(r.lng, 108.249514);
  assert.equal(r.googleReviewCount, null);
  assert.match(D.restaurants.find((r) => r.id === 'dn-loving').address, /61/);
});

test('exchange recheck preserves authorization boundaries and traceable recommendations', () => {
  assert.equal(D.exchangeCheckedDate, '2026-10-14');
  assert.equal(D.exchangePoints.length, 6);
  const research = JSON.parse(fs.readFileSync('research/exchange-points.json', 'utf8'));
  assert.deepEqual(JSON.parse(JSON.stringify(D.exchangePoints)), research.points);
  for (const p of D.exchangePoints) {
    assert.ok(['bank', 'authorized-agent'].includes(p.kind));
    assert.ok(p.addressCheckedDate <= D.exchangeCheckedDate);
    assert.ok(p.currencyCheckedDate <= D.exchangeCheckedDate);
    assert.ok(p.currencies.every((code) => ['USD', 'TWD'].includes(code)));
    if (p.lat !== null) assert.ok(p.coordinateSourceUrl);
  }
  const vcb = D.exchangePoints.find((p) => p.id === 'vcb-danang');
  assert.equal(new URL(vcb.recommendationSourceUrl).hostname, 'www.outo.co');
  assert.match(vcb.recommendationLabel, /台灣/);
  assert.equal(D.exchangePoints.find((p) => p.id === 'aeon-vietinbank').currencies.length, 0);
  assert.ok(
    D.exchangePoints
      .filter((p) => p.id.startsWith('bidv-'))
      .every((p) => p.currencySourceUrls.some((url) => url.includes('cong-cu-doi-ty-gia'))),
  );
});
