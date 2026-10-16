(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TravelCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function hasCoordinates(p) {
    return (
      !!p &&
      typeof p.lat === 'number' &&
      Number.isFinite(p.lat) &&
      Math.abs(p.lat) <= 90 &&
      typeof p.lng === 'number' &&
      Number.isFinite(p.lng) &&
      Math.abs(p.lng) <= 180
    );
  }
  function distanceKm(a, b) {
    if (!hasCoordinates(a) || !hasCoordinates(b)) return null;
    const rad = (x) => (x * Math.PI) / 180;
    const dlat = rad(b.lat - a.lat),
      dlng = rad(b.lng - a.lng);
    const h =
      Math.sin(dlat / 2) ** 2 +
      Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dlng / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
  }
  function normalized(s) {
    return String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase();
  }
  const areaAliases = {
    'danang-city': '峴港 峴港市區 峴港市中心 da nang danang',
    'danang-beach': '峴港 美溪 海灘 安上 五行山 my khe an thuong',
    sontra: '峴港 山茶 山茶半島 安海 son tra an hai',
    hoian: '會安 會安古城 hoi an hoian',
    banahills: '巴拿山 ba na bana hills',
  };
  function matchesRestaurant(p, query = '', date = null) {
    const words = normalized(query).trim().split(/\s+/).filter(Boolean);
    const text = normalized(
      [
        p.name,
        p.googlePlaceName,
        p.address,
        p.area,
        p.originalArea,
        areaAliases[p.area],
        p.veganNotes,
        p.tags,
        p.searchAliases,
        p.cuisineAliases,
        p.menuInfo?.items?.map((item) => [item.name, item.nameZh].join(' ')),
      ].join(' '),
    );
    const meals = { 早餐: 510, 午餐: 720, 晚餐: 1080 };
    const geography = {
      會安: ['hoian'],
      會安古城: ['hoian'],
      美溪: ['danang-beach'],
      巴拿山: ['banahills'],
      峴港: ['danang-city', 'danang-beach', 'sontra'],
    };
    const dt = /^\d{4}-\d{2}-\d{2}$/.test(date || '') ? new Date(date + 'T12:00:00Z') : null;
    const weekday =
      dt && Number.isFinite(dt.getTime()) && dt.toISOString().slice(0, 10) === date
        ? dt.getUTCDay()
        : null;
    return words.every((word) => {
      if (['全素', '純素'].includes(word)) return p.diet === 'vegan';
      if (geography[word]) return geography[word].includes(p.area);
      if (meals[word] !== undefined) {
        const spans =
          weekday === null
            ? p.weeklyHours?.flat()
            : [
                ...(p.weeklyHours?.[weekday] || []),
                ...(p.weeklyHours?.[(weekday + 6) % 7] || [])
                  .filter(([, b]) => b > 1440)
                  .map(([a, b]) => [a - 1440, b - 1440]),
              ];
        return !!spans?.some(([a, b]) => a <= meals[word] && meals[word] < b);
      }
      return text.includes(word);
    });
  }
  function vietnamNow(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
    const get = (type) => parts.find((p) => p.type === type).value;
    return {
      date: `${get('year')}-${get('month')}-${get('day')}`,
      time: `${get('hour')}:${get('minute')}`,
    };
  }
  function restaurantDayHours(p, date) {
    const dt = /^\d{4}-\d{2}-\d{2}$/.test(date || '') ? new Date(date + 'T12:00:00Z') : null;
    if (!dt || !Number.isFinite(dt.getTime()) || dt.toISOString().slice(0, 10) !== date)
      return '當日時段待確認';
    const day = dt.getUTCDay();
    const prefix = '週' + '日一二三四五六'[day];
    if (operationRank(p) === 2) return prefix + ' · 歇業／暫停營業';
    if (!p.weeklyHours) return prefix + ' · 供餐時段待確認';
    const clock = (minute) =>
      (minute >= 1440 ? '翌日 ' : '') +
      String(Math.floor(minute / 60) % 24).padStart(2, '0') +
      ':' +
      String(minute % 60).padStart(2, '0');
    const carried = (p.weeklyHours[(day + 6) % 7] || []).filter(([, b]) => b > 1440);
    const text =
      [
        ...carried.map(([, b]) => `00:00–${clock(b - 1440)}（前日延續）`),
        ...(p.weeklyHours[day] || []).map(([a, b]) => `${clock(a)}–${clock(b)}`),
      ].join('、') || '休息';
    const caution = p.hoursCaution?.weekdays?.some(
      (d) => d === day || (carried.length && d === (day + 6) % 7),
    );
    return prefix + ' ' + text + (caution ? ' · 需確認' : '');
  }
  function restaurantHours(p, date, time) {
    const unknown = { state: 'unknown', rank: 2, label: '供餐時段待確認' };
    const dt = /^\d{4}-\d{2}-\d{2}$/.test(date || '') ? new Date(date + 'T12:00:00Z') : null;
    if (!dt || !Number.isFinite(dt.getTime()) || dt.toISOString().slice(0, 10) !== date)
      return unknown;
    const day = dt.getUTCDay();
    const caution = p.hoursCaution?.weekdays?.includes(day) ? p.hoursCaution : null;
    if (operationRank(p) === 2) return { state: 'closed', rank: 4, label: '歇業／暫停營業記錄' };
    if (caution)
      return { state: 'uncertain', rank: 2, label: '供餐時段需確認', caution: caution.message };
    if (!p.weeklyHours || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time || '')) return unknown;
    const minute = Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
    const today = p.weeklyHours[day] || [];
    const spans = [
      ...today,
      ...(p.weeklyHours[(day + 6) % 7] || [])
        .filter(([, b]) => b > 1440)
        .map(([a, b]) => [a - 1440, b - 1440]),
    ];
    const active = spans.find(([a, b]) => a <= minute && minute < b);
    if (active)
      return active[1] - minute <= 30
        ? { state: 'closing', rank: 1, label: '依牌告時段：30 分鐘內結束，先確認供餐' }
        : { state: 'open', rank: 0, label: '依牌告時段可用餐，最後點餐需確認' };
    return today.length
      ? { state: 'outside', rank: 3, label: '不在牌告時段內（含午休）' }
      : { state: 'closed', rank: 4, label: '此日牌告休息' };
  }
  function operationRank(p) {
    return ['permanently-closed', 'temporarily-closed'].includes(p.operatingStatus)
      ? 2
      : p.operatingStatus === 'operating-evidence' && !p.navigationHold
        ? 0
        : 1;
  }
  function canRecommend(p) {
    return operationRank(p) !== 2 && !p.navigationHold;
  }
  function selectRestaurants(records, options = {}) {
    const {
      origin,
      area = 'all',
      diet = 'all',
      query = '',
      operating = 'all',
      radius = null,
      date = null,
    } = options;
    return records
      .filter(
        (p) =>
          (area === 'all' || p.area === area) &&
          (diet === 'all' || p.diet === diet) &&
          matchesRestaurant(p, query, date) &&
          (operating === 'all' ||
            (operating === 'available' && operationRank(p) !== 2) ||
            (operating === 'recent' && operationRank(p) === 0) ||
            (operating === 'unverified' && operationRank(p) === 1) ||
            (operating === 'closed' && operationRank(p) === 2)),
      )
      .map((p) => {
        const distance = p.navigationHold ? null : distanceKm(origin, p);
        return { ...p, distance, outsideRadiusUnknown: Number(radius) > 0 && distance === null };
      })
      .filter((p) => !(Number(radius) > 0) || p.distance === null || p.distance <= Number(radius))
      .sort(
        (a, b) =>
          operationRank(a) - operationRank(b) ||
          (hasCoordinates(origin)
            ? (a.distance ?? Infinity) - (b.distance ?? Infinity)
            : (a.diet === 'vegan' ? 0 : 1) - (b.diet === 'vegan' ? 0 : 1)),
      );
  }
  function mapsUrl(p) {
    const u = new URL('https://www.google.com/maps/dir/');
    u.searchParams.set('api', '1');
    u.searchParams.set('destination', [p.name, p.address].filter(Boolean).join(', '));
    if (p.matchConfidence === 'verified' && p.googleMapsUrl) {
      try {
        const source = new URL(p.googleMapsUrl);
        if (
          source.protocol === 'https:' &&
          ['www.google.com', 'google.com', 'maps.google.com'].includes(source.hostname) &&
          /^\/maps(?:\/|$)/.test(source.pathname)
        ) {
          const placeId = source.searchParams.get('query_place_id');
          if (placeId) u.searchParams.set('destination_place_id', placeId);
        }
      } catch {}
    }
    return u.href;
  }
  function selectExchange(records, options = {}) {
    const { origins = [], currency = 'all' } = options,
      validOrigins = origins.filter(hasCoordinates);
    return records
      .filter(
        (p) =>
          currency === 'all' ||
          (currency === 'unknown' ? !p.currencies.length : p.currencies.includes(currency)),
      )
      .map((p) => {
        const distances = validOrigins.map((o) => distanceKm(o, p)).filter((d) => d !== null);
        return { ...p, distance: distances.length ? Math.min(...distances) : null };
      })
      .sort(
        (a, b) =>
          (a.distance === null ? 1 : 0) - (b.distance === null ? 1 : 0) ||
          (a.distance ?? Infinity) - (b.distance ?? Infinity),
      );
  }
  function restaurantsCsv(records) {
    const headers = [
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
    ];
    const areas = {
      'danang-city': '峴港市中心',
      'danang-beach': '峴港海灘區',
      sontra: '山茶區',
      hoian: '會安',
      banahills: '巴拿山',
    };
    const diets = {
      vegan: '全素',
      vegetarian: '素食（蛋奶等需確認）',
      mixed: '葷素混合（提供素食選項）',
      uncertain: '素食類型待確認',
    };
    const statuses = {
      'operating-evidence': '查核時有營運線索',
      'permanently-closed': '永久歇業',
      'temporarily-closed': '暫停營業',
      unverified: '營運待確認',
    };
    const quote = (value) => '"' + String(value ?? '').replace(/"/g, '""') + '"';
    const rows = records.map((r) => {
      const status = statuses[r.operatingStatus] || r.operatingStatus || '營運待確認';
      const closed = ['permanently-closed', 'temporarily-closed'].includes(r.operatingStatus);
      const prefix = closed
        ? `【${status}】`
        : r.navigationHold
          ? '【位置待確認】'
          : r.operatingStatus !== 'operating-evidence'
            ? '【營運待確認】'
            : '';
      const coordinateNote = closed
        ? '既有座標，歇業／暫停記錄，勿直接前往'
        : r.navigationHold
          ? '位置待確認，勿直接前往'
          : r.coordinateStatus || '';
      return [
        prefix + r.name,
        r.lat ?? '',
        r.lng ?? '',
        [r.name, r.address, 'Vietnam'].filter(Boolean).join(', '),
        r.address || '',
        areas[r.area] || r.area || '',
        diets[r.diet] || r.diet || '素食類型待確認',
        r.veganNotes || '',
        status,
        r.hours || '',
        r.reportedHours || '',
        [r.hoursStatus, r.hoursReviewNote, r.hoursExceptionNote].filter(Boolean).join('\n'),
        r.phone || '',
        r.googleMapsUrl || '',
        r.addressIssue || '',
        r.checkedDate || '',
        [
          r.operatingEvidenceText,
          r.operatingEvidenceDate ? `營運證據日期：${r.operatingEvidenceDate}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
        coordinateNote,
        r.coordinateSourceUrl || '',
        (r.sourceUrls || []).join('\n'),
        r.id,
      ]
        .map(quote)
        .join(',');
    });
    // An unquoted ASCII header without BOM avoids My Maps header parsing failures.
    return [headers.join(','), ...rows].join('\r\n') + '\r\n';
  }
  return {
    hasCoordinates,
    restaurantHours,
    restaurantDayHours,
    vietnamNow,
    distanceKm,
    normalized,
    matchesRestaurant,
    selectRestaurants,
    mapsUrl,
    operationRank,
    canRecommend,
    selectExchange,
    restaurantsCsv,
  };
});
