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
  function matchesRestaurant(p, query = '') {
    const words = normalized(query).trim().split(/\s+/).filter(Boolean);
    const text = normalized(
      [
        p.name,
        p.googlePlaceName,
        p.address,
        p.area,
        p.originalArea,
        p.veganNotes,
        p.tags,
        p.searchAliases,
      ].join(' '),
    );
    return words.every((word) => text.includes(word));
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
    const { origin, area = 'all', diet = 'all', query = '', operating = 'all' } = options;
    return records
      .filter(
        (p) =>
          (area === 'all' || p.area === area) &&
          (diet === 'all' || p.diet === diet) &&
          matchesRestaurant(p, query) &&
          (operating === 'all' ||
            (operating === 'available' && operationRank(p) !== 2) ||
            (operating === 'recent' && operationRank(p) === 0) ||
            (operating === 'unverified' && operationRank(p) === 1) ||
            (operating === 'closed' && operationRank(p) === 2)),
      )
      .map((p) => ({ ...p, distance: p.navigationHold ? null : distanceKm(origin, p) }))
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
        r.operatingEvidenceDate || r.checkedDate || '',
        r.operatingEvidenceText || '',
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
