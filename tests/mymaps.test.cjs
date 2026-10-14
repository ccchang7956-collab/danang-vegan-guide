const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const C = require('../assets/core.js');

// Independent CSV reader: quoted fields may contain commas and line breaks.
function readCsv(text) {
  const rows = [];
  let row = [],
    field = '',
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && c === ',') {
      row.push(field);
      field = '';
    } else if (!quoted && c === '\r' && text[i + 1] === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
    } else field += c;
  }
  assert.equal(quoted, false, 'CSV quotes must close');
  assert.deepEqual(row, [], 'every CSV record must end with CRLF');
  return rows;
}

test('My Maps CSV retains every current record with valid headers and original values', () => {
  assert.equal(typeof C.restaurantsCsv, 'function');
  const env = { window: {} };
  vm.runInNewContext(fs.readFileSync('assets/data.js', 'utf8'), env);
  const records = env.window.TRAVEL_DATA.restaurants;
  const before = JSON.stringify(records);
  const csv = C.restaurantsCsv(records);
  assert.ok(!csv.startsWith('\ufeff'));
  assert.match(csv.split('\r\n')[0], /^[A-Za-z,]+$/);
  const [headers, ...rows] = readCsv(csv);
  assert.deepEqual(headers, [
    'Name',
    'Latitude',
    'Longitude',
    'Location',
    'Address',
    'Area',
    'Diet',
    'DietNotes',
    'OperatingStatus',
    'ConfirmedHours',
    'ReportedHours',
    'HoursNotes',
    'Phone',
    'GoogleMaps',
    'AddressNotes',
    'CheckedDate',
    'OperatingNotes',
    'CoordinateStatus',
    'CoordinateSource',
    'Sources',
    'ID',
  ]);
  assert.equal(new Set(headers).size, headers.length);
  assert.ok(headers.every((h) => h.length <= 64 && !/["<>{}|]/.test(h)));
  assert.equal(rows.length, records.length);
  const exported = rows.map((row) => Object.fromEntries(headers.map((h, i) => [h, row[i]])));
  records.forEach((r, i) => {
    const e = exported[i];
    assert.equal(rows[i].length, headers.length);
    assert.equal(e.ID, r.id);
    assert.equal(e.Address, r.address);
    assert.equal(e.Location, `${r.name}, ${r.address}, Vietnam`);
    assert.equal(e.Latitude, String(r.lat ?? ''));
    assert.equal(e.Longitude, String(r.lng ?? ''));
    assert.equal(e.DietNotes, r.veganNotes || '');
    assert.equal(e.ConfirmedHours, r.hours || '');
    assert.equal(e.ReportedHours, r.reportedHours || '');
    for (const note of [r.hoursStatus, r.hoursReviewNote, r.hoursExceptionNote].filter(Boolean)) {
      assert.ok(e.HoursNotes.includes(note), `${r.id}: missing hours warning`);
    }
    assert.equal(e.GoogleMaps, r.googleMapsUrl || '');
    assert.equal(e.Sources, (r.sourceUrls || []).join('\n'));
    if (r.operatingStatus === 'permanently-closed') assert.match(e.Name, /^【永久歇業】/);
  });
  assert.equal(JSON.stringify(records), before, 'export does not mutate records');
});

test('My Maps export handles commas, quotes, newlines and changes made after an earlier export', () => {
  assert.equal(typeof C.restaurantsCsv, 'function');
  const records = [
    {
      id: 'new',
      name: '新店 "Café", chay',
      address: '1 Hội An',
      diet: 'uncertain',
      veganNotes: '先確認\n蛋奶、"魚露"',
      operatingStatus: 'unverified',
      lat: null,
      lng: null,
      reportedHours: '09:00–17:00（待確認）',
      sourceUrls: ['https://example.test/a', 'https://example.test/b'],
    },
  ];
  const [headers, first] = readCsv(C.restaurantsCsv(records));
  const cell = (key) => first[headers.indexOf(key)];
  assert.equal(cell('Name'), '【營運待確認】新店 "Café", chay');
  assert.equal(cell('DietNotes'), records[0].veganNotes);
  assert.equal(cell('Latitude'), '');
  assert.equal(cell('ConfirmedHours'), '');
  assert.equal(cell('ReportedHours'), records[0].reportedHours);
  records[0].address = '2 Hội An';
  records.push({
    id: 'added',
    name: '追加店家',
    address: '3 Đà Nẵng',
    operatingStatus: 'temporarily-closed',
  });
  const updated = readCsv(C.restaurantsCsv(records));
  assert.equal(updated.length, 3);
  assert.equal(updated[1][headers.indexOf('Address')], '2 Hội An');
  assert.equal(updated[2][headers.indexOf('Name')], '【暫停營業】追加店家');
  assert.equal(readCsv(C.restaurantsCsv([])).length, 1);
});
