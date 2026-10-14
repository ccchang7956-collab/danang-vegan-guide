/* Browser-only state: GPS is never stored or sent to this site. */
(() => {
  'use strict';
  const D = window.TRAVEL_DATA,
    C = window.TravelCore,
    $ = (id) => document.getElementById(id);
  if (!D || !C) {
    document.body.insertAdjacentHTML(
      'afterbegin',
      '<p role="alert">資料未完整載入，請確認已上傳 assets 資料夾後重新整理。</p>',
    );
    return;
  }
  const labels = {
    vegan: '全素店',
    vegetarian: '素食店・確認蛋奶',
    mixed: '葷素店・可做全素',
    uncertain: '全素條件待確認',
  };
  const areas = {
    'danang-city': '峴港市區',
    'danang-beach': '美溪・安上・五行山',
    sontra: '山茶・安海',
    hoian: '會安',
    banahills: '巴拿山',
  };
  let dayIndex = 0,
    view = 'daily',
    gps = null,
    gpsAccuracy = null,
    referenceId = D.days[0].hotel,
    dayAnchor = 'route',
    dayRadius = 10,
    dayQuery = '',
    nearbyQuery = '',
    exchangeAnchor = 'route',
    exchangeUseGps = false,
    exchangeVisited = false,
    exchangeManualMode = false,
    exchangeFollowGpsRequest = false,
    exchangeCurrency = 'all',
    map = null,
    markers = new Map(),
    layer = null,
    displayed = [],
    locating = false,
    locationRequest = 0,
    locationError = '',
    offlineReady = false;
  let dayButtons = [],
    daySearchTimer = null,
    nearbySearchTimer = null,
    daySearchComposing = false,
    nearbySearchComposing = false;
  const esc = (s) =>
    String(s ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const safeUrl = (s) => {
    try {
      const u = new URL(s);
      return u.protocol === 'https:' ? u.href : '#';
    } catch {
      return '#';
    }
  };
  const place = (id) => D.places.find((p) => p.id === id);
  const currentDay = () => D.days[dayIndex];
  const toast = (message) => {
    const el = $('toast');
    el.hidden = false;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => {
      el.classList.remove('show');
      el.hidden = true;
    }, 3500);
  };
  const distanceText = (r) =>
    r.distance === null || r.distance === undefined
      ? '尚無查證座標'
      : `${r.distance < 1 ? Math.round(r.distance * 1000) + ' m' : r.distance.toFixed(1) + ' km'}・直線`;
  const link = (href, text, cls = '') =>
    `<a class="${cls}" href="${esc(safeUrl(href))}" target="_blank" rel="noopener noreferrer">${text}<span class="sr-only">（開新分頁）</span></a>`;
  const operationLabels = {
    'operating-evidence': 'Google 未標歇業',
    'permanently-closed': '永久歇業',
    'temporarily-closed': '暫停營業',
    unverified: '營業待確認',
  };
  const locationWaitingMessage = '請允許瀏覽器取得位置；定位只用於本頁距離計算。';
  const exchangeLocateButton =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>使用我的位置';
  function googleRestaurantUrl(r) {
    if (r.googleMapsUrl) return r.googleMapsUrl;
    const u = new URL('https://www.google.com/maps/search/');
    u.searchParams.set('api', '1');
    u.searchParams.set('query', [r.name, r.address].join(', '));
    return u.href;
  }
  function restaurantCard(r) {
    const phone = r.phone
      ? `<a href="tel:${esc(r.phone.replace(/[^+\d]/g, ''))}">打電話確認</a>`
      : '';
    const state = r.operatingStatus || 'unverified',
      status = operationLabels[state] || operationLabels.unverified;
    const held = !!r.navigationHold,
      canNavigate = C.canRecommend(r);
    const coords = held
      ? '原址有衝突，停用舊址導航與圖釘。'
      : C.hasCoordinates(r)
        ? '座標依來源地圖；抵達路線以導航為準。'
        : '尚無可查證座標，不參與最近距離排序；可按地址導航。';
    const googleLabel =
      r.googleLinkType === 'place'
        ? r.matchConfidence === 'ambiguous'
          ? 'Google 資料（地址待核對） ↗'
          : 'Google 商家／評價 ↗'
        : r.googleLinkType === 'shared-business'
          ? 'Google 商家分享連結 ↗'
          : 'Google 搜尋店家 ↗';
    const ratingType =
      r.ratingSourceType === 'google-mirror'
        ? 'Google 評分參考（轉載）'
        : r.ratingSourceType === 'google-indexed'
          ? 'Google 評分（搜尋索引）'
          : 'Google 評分（查核快照）';
    const count = Number.isInteger(r.googleReviewCount)
      ? ` · ${r.googleReviewCount.toLocaleString('zh-TW')} 則`
      : '';
    const rating =
      typeof r.googleRating === 'number'
        ? `<div class="google-rating-box"><p class="rating-source-label">${ratingType}</p><p class="rating-value">★ ${r.googleRating.toFixed(1)} / 5${count}</p><p class="rating-age">${r.ratingAsOfDate ? (r.ratingSourceType === 'google-direct' ? '直接查核 ' : '來源更新 ') + esc(r.ratingAsOfDate) : '快照日期未公布'} · 非即時評分</p></div>`
        : '<p class="rating-unavailable">Google 評分未核實；請開商家頁查看最新評價。</p>';
    const sourceUrls = [
      ...new Set([
        ...(r.sourceUrls || []),
        ...(r.operatingSourceUrls || []),
        ...(r.ratingSourceUrl ? [r.ratingSourceUrl] : []),
      ]),
    ];
    const sources = sourceUrls
      .map((u, i) => link(u, `${esc(new URL(u).hostname.replace('www.', ''))} ${i + 1}`))
      .join('');
    const addressIssue = r.addressIssue ? `<p class="note warning">${esc(r.addressIssue)}</p>` : '';
    const evidence =
      r.operatingEvidenceText ||
      '尚未取得可核對的近期營業資料，出發前請先開 Google 商家頁或聯絡店家。';
    const actions =
      (canNavigate ? link(C.mapsUrl(r), '開始導航 ↗', 'primary-action') : '') +
      link(googleRestaurantUrl(r), googleLabel, canNavigate ? '' : 'primary-action') +
      (!held && C.hasCoordinates(r)
        ? `<button type="button" data-map-id="${esc(r.id)}">${C.operationRank(r) === 2 ? '查看舊址位置' : '在地圖看'}</button>`
        : '') +
      phone;
    return `
<article class="restaurant-card" id="card-${view}-${esc(r.id)}">
  <div class="card-top">
    <span class="diet-badge ${esc(r.diet)}">${labels[r.diet]}</span>
    <span class="distance-badge">${distanceText(r)}</span>
  </div>
  <h3 class="restaurant-name">${esc(r.name)}</h3>
  <div class="operation-row">
    <span class="operation-badge ${esc(state)}">${status}</span>
    <span class="audit-date">查核 ${esc(r.checkedDate)}</span>
  </div>
  ${addressIssue}
  ${held ? '<p class="note warning">暫停提供舊址導航與圖釘；請先核對最新地址。</p>' : ''}
  ${rating}
  <p class="restaurant-address">${esc(r.address)}${held ? '（既有記錄，勿直接前往）' : ''}</p>
  <p class="restaurant-note">${esc(r.veganNotes)}</p>
  ${r.hoursExceptionNote ? `<p class="note warning">${esc(r.hoursExceptionNote)}</p>` : ''}
  ${r.dailyClosed ? '<p class="note warning">此日來源列為休息日，請另選店家或先聯絡確認。</p>' : ''}
  ${r.risk ? `<p class="note warning">${esc(r.risk)}</p>` : ''}
  <p class="hours-note">參考時段：${esc(r.hours || '未確認／來源有衝突，出發前聯絡')}<br><span>營業紀錄與牌告時段不保證旅行當日開門；出發前查看 Google 最新資訊。</span></p>
  <div class="card-actions">${actions}</div>
  <details class="source-details">
    <summary>查證來源與備註</summary>
    <p class="operation-evidence">${r.operatingEvidenceDate ? '<strong>查核資料 ' + esc(r.operatingEvidenceDate) + '</strong> · ' : ''}${esc(evidence)}</p>
    <p>查詢日期 ${esc(r.checkedDate)} · ${coords}</p>
    ${r.googleLinkType === 'search' ? '<p>Google 連結是店名與地址搜尋，尚未核對唯一商家頁；請確認分店與地址。</p>' : ''}
    ${r.hoursReviewNote ? `<p>${esc(r.hoursReviewNote)}</p>` : ''}
    ${r.googleObservedHoursSnippet ? `<p>Google 查核當日片段（非每週時刻表）：${esc(r.googleObservedHoursSnippet)}</p>` : ''}
    ${r.ratingNote ? `<p>${esc(r.ratingNote)}</p>` : ''}
    ${r.hoursStatus && /conflict|old|unreliable|unverified/i.test(r.hoursStatus) ? '<p>營業時間來源不足、較舊或互有落差，請以店家當日回覆為準。</p>' : ''}
    <div class="source-links">${sources}</div>
  </details>
</article>
`.trim();
  }
  function exchangeCard(p) {
    const reference =
      exchangeUseGps && gps
        ? '你的定位'
        : exchangeAnchor === 'route'
          ? '行程最近地標'
          : place(exchangeAnchor)?.name || '參考地標';
    const distance =
      p.distance === null
        ? C.hasCoordinates(p)
          ? '參考位置沒有可靠座標，無法估算距離'
          : '尚無可靠座標，不參與距離排序'
        : `距${reference} ${p.distance < 1 ? Math.round(p.distance * 1000) + ' m' : p.distance.toFixed(1) + ' km'}・直線`;
    const currencyBadges = ['USD', 'TWD']
      .map((code) =>
        p.currencies.includes(code)
          ? `<span class="currency-badge confirmed">${code}・${p.kind === 'bank' ? '銀行層級' : '櫃檯'}有官方資料</span>`
          : `<span class="currency-badge unconfirmed">${code}・資料待確認</span>`,
      )
      .join('');
    const phone = p.phone
      ? `<a href="tel:${esc(p.phone.replace(/[^+\d]/g, ''))}">電話確認</a>`
      : '';
    const nav = link(C.mapsUrl(p), 'Google Maps 導航 ↗', 'primary-action');
    const sourceUrls = [
      ...new Set([
        ...(p.sourceUrls || []),
        ...(p.currencySourceUrls || []),
        ...(p.coordinateSourceUrl ? [p.coordinateSourceUrl] : []),
        ...(p.recommendationSourceUrl ? [p.recommendationSourceUrl] : []),
      ]),
    ];
    const sourceLinks = sourceUrls.map((u, i) => link(u, `來源 ${i + 1}`)).join('');
    const recommendation = p.recommendationLabel
      ? `<div class="exchange-recommendation"><strong>${esc(p.recommendationLabel)}</strong><p>${esc(p.recommendationNote)}</p>${p.recommendationSourceUrl ? link(p.recommendationSourceUrl, esc(p.recommendationSourceLabel || '推薦依據') + ' ↗') : ''}</div>`
      : '';
    return `
<article class="exchange-card" id="card-exchange-${esc(p.id)}">
  <div class="exchange-card-top">
    <span class="exchange-status">${esc(p.statusLabel)}</span>
    <span class="distance-badge">${esc(distance)}</span>
  </div>
  <h3>${esc(p.name)}</h3>
  ${recommendation}
  <p class="exchange-address">${esc(p.address)}</p>
  <div class="currency-badges">${currencyBadges}</div>
  <p class="exchange-evidence">${esc(p.currencyStatus)}</p>
  ${p.hoursNote ? `<p class="exchange-hours-note">${esc(p.hoursNote)}</p>` : ''}
  ${p.phoneLabel ? `<p class="exchange-contact-note">${esc(p.phoneLabel)}</p>` : ''}
  <div class="card-actions">
    ${nav}
    ${C.hasCoordinates(p) ? `<button type="button" data-map-id="${esc(p.id)}">在地圖看</button>` : ''}
    ${phone}
  </div>
  <details class="source-details">
    <summary>授權、幣別與地址來源</summary>
    <p>地址查核 ${esc(p.addressCheckedDate || D.exchangeCheckedDate)} · 幣別資料查核 ${esc(p.currencyCheckedDate || D.exchangeCheckedDate)}</p>
    <p>${esc(p.coordinateStatus || '地址依官方資料核對；地圖座標未核實')}。</p>
    <div class="source-links">${sourceLinks}</div>
  </details>
</article>
`.trim();
  }
  function cancelDailySearch() {
    if (daySearchTimer !== null) {
      clearTimeout(daySearchTimer);
      daySearchTimer = null;
    }
  }
  function cancelNearbySearch() {
    if (nearbySearchTimer !== null) {
      clearTimeout(nearbySearchTimer);
      nearbySearchTimer = null;
    }
  }
  function cancelSearchTimers() {
    cancelDailySearch();
    cancelNearbySearch();
  }
  function flushActiveSearch({ fitMap = true } = {}) {
    const dailyPending = daySearchTimer !== null,
      nearbyPending = nearbySearchTimer !== null;
    cancelSearchTimers();
    if (view === 'daily' && dailyPending && !daySearchComposing) {
      dayQuery = $('day-search').value;
      renderDailyFood();
      renderMap(fitMap);
      return true;
    }
    if (view === 'nearby' && nearbyPending && !nearbySearchComposing) {
      nearbyQuery = $('search-input').value;
      renderNearby();
      renderMap(fitMap);
      return true;
    }
    return false;
  }
  function scheduleDailySearch() {
    cancelDailySearch();
    if (daySearchComposing) return;
    dayQuery = $('day-search').value;
    if (view !== 'daily') return;
    if (!dayQuery.trim()) {
      renderDailyFood();
      renderMap();
      return;
    }
    daySearchTimer = setTimeout(() => {
      daySearchTimer = null;
      if (view === 'daily') {
        renderDailyFood();
        renderMap();
      }
    }, 150);
  }
  function scheduleNearbySearch() {
    cancelNearbySearch();
    if (nearbySearchComposing) return;
    nearbyQuery = $('search-input').value;
    if (view !== 'nearby') return;
    if (!nearbyQuery.trim()) {
      renderNearby();
      renderMap();
      return;
    }
    nearbySearchTimer = setTimeout(() => {
      nearbySearchTimer = null;
      if (view === 'nearby') {
        renderNearby();
        renderMap();
      }
    }, 150);
  }
  function updateLocationControls() {
    const nearbyStatus =
      locationError ||
      (locating
        ? locationWaitingMessage
        : gps
          ? `依你的定位排序 · GPS 精度約 ${Math.round(gpsAccuracy)} m · 距離為直線`
          : `依「${place(referenceId).name}」排序，尚未使用 GPS。`);
    const anchor =
      exchangeAnchor === 'route' ? '當天行程' : place(exchangeAnchor)?.name || '當天行程';
    const exchangeStatus =
      locationError ||
      (locating
        ? locationWaitingMessage
        : exchangeUseGps && gps
          ? `依你的定位排序 · GPS 精度約 ${Math.round(gpsAccuracy)} m · 直線距離`
          : `依 ${currentDay().shortDate}「${anchor}」排序 · 距離為直線`);
    $('location-status').textContent = nearbyStatus;
    $('exchange-location-status').textContent = exchangeStatus;
    $('locate-btn').disabled = locating;
    $('locate-btn').textContent = locating ? '正在取得位置…' : '用我的位置找最近';
    $('exchange-locate-btn').disabled = locating;
    $('exchange-locate-btn').innerHTML = locating ? '正在取得位置…' : exchangeLocateButton;
  }
  function renderDays() {
    if (dayButtons.length === 0) {
      dayButtons = D.days.map((day, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'day-tab';
        button.dataset.day = String(index);
        const label = document.createElement('span');
        label.textContent = `DAY ${index + 1}`;
        const date = document.createElement('strong');
        date.textContent = day.shortDate;
        const weekday = document.createElement('small');
        weekday.textContent = `週${day.weekday}`;
        const summary = document.createElement('span');
        summary.className = 'day-label';
        summary.textContent = `・${day.tabLabel}`;
        weekday.append(summary);
        button.append(label, date, weekday);
        $('day-tabs').append(button);
        return button;
      });
    }
    dayButtons.forEach((button, index) => {
      const selected = index === dayIndex;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    $('day-heading').textContent = currentDay().title;
    $('day-subtitle').textContent = currentDay().subtitle;
  }
  function renderMealPlan() {
    const plan = D.mealPlans?.find((p) => p.date === currentDay().date);
    if (!plan) {
      $('meal-plan').innerHTML = '';
      return;
    }
    const mountain = plan.date === '2026-10-22';
    const meals = plan.meals
      .map(
        (meal) =>
          `<div class="meal-row"><strong>${esc(meal.label)}</strong><p>${esc(meal.advice)}</p><div class="meal-links">${meal.restaurantIds
            .map((id) => D.restaurants.find((r) => r.id === id))
            .filter((r) => r && C.canRecommend(r))
            .map((r) => link(googleRestaurantUrl(r), esc(r.name) + ' ↗'))
            .join('')}</div></div>`,
      )
      .join('');
    $('meal-plan').innerHTML =
      `<h3>今天怎麼吃</h3><p>${esc(plan.headline)}</p>${mountain ? `<p class="note warning">${esc(plan.warning)}</p>` : ''}<details><summary>早餐、午餐、晚餐與備援店家</summary>${!mountain ? `<p class="small-note">${esc(plan.warning)}</p>` : ''}${meals}<p class="small-note">建議安排，尚未訂位；餐廳按鈕開啟 Google 商家，先核對當日供餐。</p><div class="source-links">${plan.sources.map((s) => link(s.url, esc(s.title))).join('')}</div></details>`;
  }
  function renderItinerary() {
    const d = currentDay();
    $('day-notes').innerHTML = d.notes
      .map((n) => `<p class="note${n.warning ? ' warning' : ''}">${esc(n.text || n)}</p>`)
      .join('');
    $('itinerary-list').innerHTML = d.stops
      .map((s, i) => {
        const p = place(s.id);
        return `<article class="stop-card"><span class="stop-number ${p.type === 'hotel' ? 'hotel-number' : ''}">${p.type === 'hotel' ? '宿' : i + 1}</span><div class="stop-body"><div class="stop-meta"><span class="stop-time">${esc(s.time || '彈性安排')}</span><span>${p.type === 'hotel' ? '住宿' : s.optional ? '原表備選' : '景點'}</span></div><h3>${esc(p.name)}</h3><p>${esc(s.note || p.address)}</p><div class="stop-actions"><button type="button" data-map-id="${esc(p.id)}">地圖位置</button>${link(C.mapsUrl(p), '導航 ↗')}</div></div></article>`;
      })
      .join('');
    const ids = [...new Set(d.stops.map((s) => s.id))];
    $('day-anchor').innerHTML =
      '<option value="route">整天行程附近</option>' +
      ids.map((id) => `<option value="${id}">${esc(place(id).name)} 附近</option>`).join('');
    $('day-anchor').value = dayAnchor;
  }
  function dailyRestaurants() {
    const d = currentDay(),
      stops = dayAnchor === 'route' ? d.stops.filter((s) => !s.optional) : [{ id: dayAnchor }],
      origins = stops.map((s) => place(s.id)).filter(C.hasCoordinates);
    const ids = stops.map((s) => s.id),
      regions = new Set();
    if (ids.includes('bana')) regions.add('banahills');
    if (ids.some((id) => ['oldtown', 'memories', 'sonhotel', 'coconut'].includes(id)))
      regions.add('hoian');
    if (ids.some((id) => ['cathedral', 'hanmarket', 'dragon', 'airport'].includes(id)))
      regions.add('danang-city');
    if (ids.some((id) => ['mandila', 'lesands', 'dragon', 'nightmarket'].includes(id)))
      regions.add('danang-beach');
    if (ids.some((id) => ['sontra', 'lesands', 'nightmarket'].includes(id))) regions.add('sontra');
    const weekday = new Date(d.date + 'T12:00:00Z').getUTCDay();
    return D.restaurants
      .filter(C.canRecommend)
      .map((r) => {
        const ds = origins.map((o) => C.distanceKm(o, r)).filter((v) => v !== null);
        const distance = ds.length ? Math.min(...ds) : null;
        return { ...r, distance, dailyClosed: r.closedWeekdays?.includes(weekday) || false };
      })
      .filter(
        (r) =>
          ((r.distance !== null && r.distance <= dayRadius) ||
            (r.distance === null && regions.has(r.area))) &&
          C.matchesRestaurant(r, dayQuery),
      )
      .sort(
        (a, b) =>
          C.operationRank(a) - C.operationRank(b) ||
          (a.distance === null ? 1 : 0) - (b.distance === null ? 1 : 0) ||
          Number(a.dailyClosed) - Number(b.dailyClosed) ||
          (a.diet === 'vegan' ? 0 : 1) - (b.diet === 'vegan' ? 0 : 1) ||
          (a.distance ?? Infinity) - (b.distance ?? Infinity),
      );
  }
  function renderDailyFood() {
    const items = dailyRestaurants();
    $('day-food-count').textContent = items.length + ' 間';
    $('day-radius').value = String(dayRadius);
    const name = dayAnchor === 'route' ? '當天任一景點／住宿' : place(dayAnchor).name;
    const intro = `<p class="small-note">距離以${esc(name)}為參考，顯示 ${dayRadius} km 內點位；Google 未標歇業者優先，待確認排後。無座標備選依區域地址收錄並列於後方，無法保證距離。山區道路可能繞行。${dayQuery ? ` 搜尋：${esc(dayQuery)}。搜尋僅限本頁整理的店家。` : ''}</p>`;
    $('day-restaurant-list').innerHTML =
      intro +
      (items.length
        ? items.map(restaurantCard).join('')
        : `<div class="empty-state"><h3>${dayQuery ? '這天範圍內沒有符合搜尋的店家' : '這一站範圍內尚無可選店家'}</h3><p>可以擴大直線範圍、清除搜尋，或按上方「搜尋全清單」找其他區域。沒找到不代表店家不存在或已歇業。</p></div>`);
    displayed = items;
  }
  function origin() {
    return gps || place(referenceId);
  }
  function renderNearby() {
    const options = {
      origin: origin(),
      area: $('area-filter').value,
      diet: $('diet-filter').value,
      query: nearbyQuery,
      operating: $('operating-filter').value || 'available',
    };
    displayed = C.selectRestaurants(D.restaurants, options);
    $('result-count').textContent = displayed.length + ' 間';
    const recent = D.restaurants.filter((r) => C.operationRank(r) === 0).length,
      closed = D.restaurants.filter((r) => C.operationRank(r) === 2).length;
    $('audit-summary').textContent =
      `${D.restaurants.length} 筆查核記錄 · ${recent} 家 Google 未標歇業 · ${D.restaurants.length - recent - closed} 家待確認 · ${closed} 家歇業／暫停`;
    $('restaurant-list').innerHTML = displayed.length
      ? displayed.map(restaurantCard).join('')
      : '<div class="empty-state"><h3>這個條件沒有找到餐廳</h3><p>試著改成所有區域，或調整飲食分類與營業查核條件。</p></div>';
    $('reference-select').value = gps ? 'gps' : referenceId;
  }
  function popup(p, kind) {
    const isFood = kind === 'food',
      isExchange = kind === 'exchange';
    const box = document.createElement('div');
    box.className = 'map-popup';
    const title = document.createElement('strong');
    title.textContent = p.name;
    box.append(title);
    const desc = document.createElement('p');
    desc.textContent = isFood
      ? labels[p.diet] + ' · ' + (operationLabels[p.operatingStatus] || operationLabels.unverified)
      : isExchange
        ? `${p.statusLabel} · ${p.currencies?.length ? p.currencies.join(' / ') + ' 有官方資料' : '幣別需確認'}`
        : p.coordinateStatus?.startsWith('approximate')
          ? '區域代表點・請確認入口'
          : '來源地圖點位・請確認入口';
    box.append(desc);
    const address = document.createElement('p');
    address.textContent = p.address;
    box.append(address);
    const canNavigate = !isFood || C.canRecommend(p);
    const a = document.createElement('a');
    a.href = safeUrl(canNavigate ? C.mapsUrl(p) : googleRestaurantUrl(p));
    a.textContent = canNavigate
      ? 'Google Maps 導航 ↗'
      : p.googleLinkType === 'place'
        ? 'Google 商家／評價 ↗'
        : 'Google 搜尋店家 ↗';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    box.append(a);
    if (isFood || isExchange) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = isFood ? '查看餐廳卡片' : '查看換匯點資訊';
      b.addEventListener('click', () => {
        const card = $('card-' + view + '-' + p.id);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'start' });
          card.classList.add('selected-card');
          setTimeout(() => card.classList.remove('selected-card'), 2500);
        }
      });
      box.append(b);
    }
    return box;
  }
  function initMap() {
    if (map) return;
    if (!window.L) {
      $('map').innerHTML =
        '<div class="empty-state"><p>互動地圖未載入，仍可用下方列表與 Google Maps 導航。</p></div>';
      return;
    }
    map = L.map('map', { scrollWheelZoom: false, zoomControl: true }).setView([16.04, 108.23], 12);
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    let failures = 0;
    tiles.on('tileerror', () => {
      failures++;
      if (failures >= 3) {
        $('map-message').hidden = false;
        $('map-message').textContent = '底圖連線不穩；點位與列表仍可使用，導航可開 Google Maps。';
      }
    });
    tiles.on('tileload', () => {
      if (navigator.onLine) {
        $('map-message').hidden = true;
        failures = 0;
      }
    });
    layer = L.layerGroup().addTo(map);
  }
  function addMarker(p, kind, label) {
    if (!C.hasCoordinates(p) || (kind === 'food' && p.navigationHold)) return;
    const markerClass =
      kind === 'food'
        ? 'restaurant-marker ' +
          (C.operationRank(p) === 2 ? 'closed' : p.diet === 'vegan' ? 'vegan' : 'conditional')
        : kind === 'hotel'
          ? 'hotel-marker'
          : kind === 'exchange'
            ? 'exchange-marker' + (p.currencies?.length ? '' : ' exchange-unknown-marker')
            : 'place-marker';
    const icon = L.divIcon({
      className: 'custom-marker',
      html: `<span class="${markerClass}">${esc(label)}</span>`,
      iconSize: [44, 44],
      iconAnchor: [22, 38],
      popupAnchor: [0, -30],
    });
    const marker = L.marker([p.lat, p.lng], { icon, title: p.name, keyboard: true })
      .bindPopup(popup(p, kind))
      .addTo(layer);
    markers.set(p.id, marker);
  }
  function renderMap(fit = true) {
    if (view === 'phrase' || view === 'supplies') return;
    const slot =
      view === 'daily'
        ? 'daily-map-slot'
        : view === 'nearby'
          ? 'nearby-map-slot'
          : 'exchange-map-slot';
    $(slot).append($('map-panel'));
    initMap();
    if (!map) return;
    layer.clearLayers();
    markers.clear();
    const exchangeView = view === 'exchange';
    ['legend-vegan', 'legend-conditional'].forEach((id) => ($(id).hidden = exchangeView));
    $('legend-exchange').hidden = !exchangeView;
    $('legend-exchange-unknown').hidden = !exchangeView;
    const exchangeStops =
      exchangeAnchor === 'route'
        ? currentDay()
            .stops.filter((s) => !s.optional)
            .map((s) => place(s.id))
        : [place(exchangeAnchor)];
    $('legend-attraction').hidden =
      exchangeView &&
      (exchangeUseGps ||
        !exchangeStops.some(
          (p) => C.hasCoordinates(p) && (exchangeAnchor !== 'route' || p.type !== 'hotel'),
        ));
    $('legend-hotel').hidden =
      exchangeView &&
      (exchangeUseGps ||
        exchangeAnchor !== 'route' ||
        !exchangeStops.some((p) => C.hasCoordinates(p) && p.type === 'hotel'));
    let bounds = [];
    if (view === 'daily') {
      currentDay().stops.forEach((s, i) => {
        const p = place(s.id);
        addMarker(p, p.type === 'hotel' ? 'hotel' : 'place', p.type === 'hotel' ? '宿' : i + 1);
        if (C.hasCoordinates(p) && (dayAnchor === 'route' || p.id === dayAnchor))
          bounds.push([p.lat, p.lng]);
      });
      displayed.filter(C.hasCoordinates).forEach((p) => bounds.push([p.lat, p.lng]));
      displayed.forEach((p) =>
        addMarker(p, 'food', C.operationRank(p) === 2 ? '×' : p.diet === 'vegan' ? '葉' : '!'),
      );
      $('map-heading').textContent = '這一天的行程地圖';
      const anchor = dayAnchor === 'route' ? place(currentDay().reference) : place(dayAnchor);
      $('map-external').href = C.mapsUrl(anchor);
    } else if (view === 'nearby') {
      const o = origin();
      displayed.forEach((p) =>
        addMarker(p, 'food', C.operationRank(p) === 2 ? '×' : p.diet === 'vegan' ? '葉' : '!'),
      );
      if (o) {
        if (gps) {
          L.circleMarker([o.lat, o.lng], {
            radius: 8,
            color: '#fff',
            weight: 3,
            fillColor: '#2866cc',
            fillOpacity: 1,
          })
            .bindTooltip('你的定位')
            .addTo(layer);
          L.circle([o.lat, o.lng], {
            radius: Math.min(gpsAccuracy || 30, 1000),
            color: '#2866cc',
            weight: 1,
            fillOpacity: 0.07,
          }).addTo(layer);
        } else addMarker(o, 'place', '◎');
        bounds = [[o.lat, o.lng]];
        const close = displayed.filter((p) => p.distance !== null && p.distance < 10).slice(0, 15);
        close.forEach((p) => bounds.push([p.lat, p.lng]));
      }
      if (bounds.length <= 1 && !gps && displayed.some(C.hasCoordinates))
        bounds = displayed
          .filter(C.hasCoordinates)
          .slice(0, 15)
          .map((p) => [p.lat, p.lng]);
      if ($('area-filter').value !== 'all' || $('search-input').value.trim())
        bounds = displayed.filter(C.hasCoordinates).map((p) => [p.lat, p.lng]);
      $('map-heading').textContent = gps ? '你附近的素食地圖' : '參考位置附近的素食';
      $('map-external').href =
        'https://www.google.com/maps/search/?api=1&query=' +
        encodeURIComponent(
          gps ? 'vegan restaurants near me' : 'vegan restaurants near ' + place(referenceId).name,
        );
    } else {
      const d = currentDay();
      if (exchangeUseGps && gps) {
        L.circleMarker([gps.lat, gps.lng], {
          radius: 8,
          color: '#fff',
          weight: 3,
          fillColor: '#2866cc',
          fillOpacity: 1,
        })
          .bindTooltip('你的定位')
          .addTo(layer);
        bounds.push([gps.lat, gps.lng]);
      } else if (exchangeAnchor === 'route')
        d.stops
          .filter((s) => !s.optional)
          .forEach((s, i) => {
            const p = place(s.id);
            if (C.hasCoordinates(p)) {
              const q = { ...p, id: `exchange-route-${i}` };
              addMarker(
                q,
                p.type === 'hotel' ? 'hotel' : 'place',
                p.type === 'hotel' ? '宿' : i + 1,
              );
              bounds.push([p.lat, p.lng]);
            }
          });
      else {
        const p = place(exchangeAnchor);
        if (C.hasCoordinates(p)) {
          addMarker({ ...p, id: `exchange-anchor-${p.id}` }, 'place', '◎');
          bounds.push([p.lat, p.lng]);
        }
      }
      displayed.forEach((p) => {
        addMarker(p, 'exchange', p.currencies?.length ? '銀' : '?');
        if (C.hasCoordinates(p)) bounds.push([p.lat, p.lng]);
      });
      $('map-heading').textContent = `${d.shortDate} 換匯點與行程地圖`;
      $('map-external').href = displayed.length
        ? C.mapsUrl(displayed[0])
        : 'https://www.google.com/maps';
    }
    requestAnimationFrame(() => {
      map.invalidateSize();
      if (fit && bounds.length) map.fitBounds(bounds, { padding: [35, 35], maxZoom: 15 });
    });
  }
  function renderExchange() {
    if (!exchangeVisited) {
      exchangeUseGps = !!gps && !exchangeManualMode;
      if (locating && !exchangeManualMode) exchangeFollowGpsRequest = true;
      exchangeVisited = true;
    }
    $('exchange-day').innerHTML = D.days
      .map(
        (d, i) =>
          `<option value="${i}">${esc(d.shortDate)}（週${esc(d.weekday)}）· ${esc(d.tabLabel)}</option>`,
      )
      .join('');
    $('exchange-day').value = String(dayIndex);
    const d = currentDay(),
      stops = d.stops.filter((s) => !s.optional);
    $('exchange-anchor').innerHTML =
      (gps ? '<option value="gps">我的 GPS 定位</option>' : '') +
      '<option value="route">當天行程路線</option>' +
      stops
        .map((s) => `<option value="${esc(s.id)}">${esc(place(s.id).name)} 附近</option>`)
        .join('');
    $('exchange-anchor').value = exchangeUseGps && gps ? 'gps' : exchangeAnchor;
    let origins = [];
    if (exchangeUseGps && gps) origins = [gps];
    else if (exchangeAnchor === 'route')
      origins = stops.map((s) => place(s.id)).filter(C.hasCoordinates);
    else {
      const p = place(exchangeAnchor);
      if (C.hasCoordinates(p)) origins = [p];
    }
    displayed = C.selectExchange(D.exchangePoints, { origins, currency: exchangeCurrency });
    $('exchange-currency').value = exchangeCurrency;
    $('exchange-filter-note').textContent =
      exchangeCurrency === 'all'
        ? '列出銀行與已公告授權櫃檯；有可靠座標者依距離排序，其餘列於後方。幣別資料不等於分行當日受理。'
        : exchangeCurrency === 'unknown'
          ? '這些授權櫃檯未公開完整幣別名單；先確認 TWD／USD 現鈔。'
          : '只顯示有 ' +
            exchangeCurrency +
            ' 官方現鈔資料的據點；銀行層級資料不保證分行當日受理。其他據點可能也能換，請切換「全部銀行／授權櫃檯」詢問。';
    $('exchange-result-count').textContent = displayed.length + ' 個';
    $('exchange-list').innerHTML = displayed.length
      ? displayed.map(exchangeCard).join('')
      : '<div class="empty-state"><h3>這個幣別條件沒有資料</h3><p>切換「全部銀行／授權櫃檯」查看其他據點；沒有資料不代表拒收這個幣別。</p></div>';
    $('exchange-legal-sources').innerHTML = D.exchangeLegalNotes
      .flatMap((n) => n.sourceUrls)
      .filter((u, i, a) => a.indexOf(u) === i)
      .map((u, i) => link(u, `法規／換匯參考 ${i + 1}`))
      .join('');
  }
  function render() {
    cancelSearchTimers();
    renderDays();
    if (view === 'daily') {
      renderItinerary();
      renderMealPlan();
      renderDailyFood();
    }
    if (view === 'nearby') renderNearby();
    if (view === 'exchange') renderExchange();
    renderMap();
    updateLocationControls();
  }
  function changeView(next) {
    cancelSearchTimers();
    view = next;
    ['daily', 'nearby', 'exchange', 'supplies', 'phrase'].forEach(
      (v) => ($('view-' + v).hidden = v !== view),
    );
    document.body.setAttribute('data-current-view', view);
    document.querySelectorAll('[data-view]').forEach((b) => {
      b.classList.toggle('active', b.dataset.view === view);
      if (b.dataset.view === view) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
    render();
  }
  function finishLocation() {
    locating = false;
    updateLocationControls();
  }
  function cancelLocation() {
    locationRequest++;
    exchangeFollowGpsRequest = false;
    locationError = '';
    finishLocation();
  }
  function setDay(index) {
    if (!Number.isInteger(index) || !D.days[index]) return;
    cancelSearchTimers();
    cancelLocation();
    daySearchComposing = false;
    dayIndex = index;
    dayAnchor = 'route';
    dayQuery = '';
    $('day-search').value = '';
    exchangeAnchor = 'route';
    exchangeUseGps = false;
    exchangeManualMode = false;
    exchangeVisited = true;
    referenceId = currentDay().hotel || currentDay().reference;
    fillReference();
    render();
  }
  function locate(targetView = 'nearby') {
    if (locating) return;
    if (view !== targetView) changeView(targetView);
    if (!navigator.geolocation || !window.isSecureContext) {
      locationError = '此環境無法定位；請使用 HTTPS 網站，或選行程地標作參考位置。';
      updateLocationControls();
      return;
    }
    const request = ++locationRequest;
    locating = true;
    locationError = '';
    exchangeFollowGpsRequest = targetView === 'exchange';
    if (targetView === 'exchange') exchangeManualMode = false;
    updateLocationControls();
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (request !== locationRequest) return;
        gps = { lat: p.coords.latitude, lng: p.coords.longitude };
        gpsAccuracy = p.coords.accuracy;
        locationError = '';
        if (targetView === 'exchange' || exchangeFollowGpsRequest) {
          exchangeUseGps = true;
          exchangeManualMode = false;
        }
        exchangeFollowGpsRequest = false;
        finishLocation();
        fillReference();
        render();
        if (C.distanceKm(gps, { lat: 16.02, lng: 108.2 }) > 150)
          toast('你目前不在峴港／會安附近，可改選行程地標作參考位置。');
      },
      (e) => {
        if (request !== locationRequest) return;
        gps = null;
        gpsAccuracy = null;
        exchangeUseGps = exchangeManualMode ? exchangeUseGps : false;
        exchangeFollowGpsRequest = false;
        locationError =
          ({ 1: '未允許定位', 2: '暫時無法取得位置', 3: '定位逾時' }[e.code] || '定位失敗') +
          '；已改依行程地標排序，可選上方參考位置或再試一次。';
        finishLocation();
        fillReference();
        render();
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }
  function fillReference() {
    $('reference-select').innerHTML =
      (gps ? '<option value="gps">我的 GPS 定位</option>' : '') +
      D.places
        .filter(C.hasCoordinates)
        .map((p) => `<option value="${p.id}">${esc(p.name)}</option>`)
        .join('');
    $('reference-select').value = gps ? 'gps' : referenceId;
  }
  const phrases = {
    vi: 'Tôi ăn thuần chay. Tôi không ăn thịt, cá, hải sản, trứng, sữa, bơ sữa, phô mai, mật ong, nước mắm, dầu hào hoặc nước dùng từ động vật. Tôi có thể ăn hành và tỏi. Xin vui lòng dùng nguyên liệu hoàn toàn từ thực vật. Cảm ơn!',
    en: 'I am vegan. No meat, fish, seafood, eggs, dairy, butter, cheese, honey, fish sauce, oyster sauce or animal stock, please. Onion and garlic are OK. Please use only plant-based ingredients. Thank you!',
    zh: '我吃全素。不吃肉、魚、海鮮、蛋、奶、奶油、起司、蜂蜜、魚露、蠔油或動物高湯。可以吃蔥和蒜。請只使用植物性食材，謝謝！',
  };
  Object.entries(phrases).forEach(([lang, text]) => ($('phrase-' + lang).textContent = text));
  $('enlarge-phrase').addEventListener('click', () => {
    const text = $('phrase-dialog').querySelector('.large-phrase');
    text.textContent = phrases.vi;
    $('phrase-dialog').showModal();
  });
  $('close-phrase').addEventListener('click', () => $('phrase-dialog').close());
  $('copy-phrase').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(phrases.vi + '\n\n' + phrases.en);
      toast('越南文與英文已複製');
    } catch {
      toast('無法自動複製，請長按點餐文字選取。');
    }
  });
  $('day-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-day]');
    if (!b) return;
    setDay(Number(b.dataset.day));
  });
  $('day-anchor').addEventListener('change', () => {
    cancelDailySearch();
    if (!daySearchComposing) dayQuery = $('day-search').value;
    dayAnchor = $('day-anchor').value;
    renderDailyFood();
    renderMap();
  });
  $('day-radius').addEventListener('change', () => {
    const radius = Number($('day-radius').value);
    if (![6, 10, 15].includes(radius)) return;
    cancelDailySearch();
    if (!daySearchComposing) dayQuery = $('day-search').value;
    dayRadius = radius;
    renderDailyFood();
    renderMap();
  });
  $('day-search').addEventListener('compositionstart', () => {
    daySearchComposing = true;
    cancelDailySearch();
  });
  $('day-search').addEventListener('compositionend', () => {
    daySearchComposing = false;
    scheduleDailySearch();
  });
  $('day-search').addEventListener('input', scheduleDailySearch);
  $('clear-day-search').addEventListener('click', () => {
    cancelDailySearch();
    daySearchComposing = false;
    dayQuery = '';
    $('day-search').value = '';
    renderDailyFood();
    renderMap();
  });
  $('search-all').addEventListener('click', () => {
    cancelSearchTimers();
    daySearchComposing = false;
    nearbySearchComposing = false;
    dayQuery = $('day-search').value;
    nearbyQuery = dayQuery;
    $('search-input').value = nearbyQuery;
    $('area-filter').value = 'all';
    $('diet-filter').value = 'all';
    $('operating-filter').value = 'available';
    changeView('nearby');
    $('search-input').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  $('locate-btn').addEventListener('click', () => locate('nearby'));
  $('exchange-locate-btn').addEventListener('click', () => locate('exchange'));
  $('exchange-day').addEventListener('change', () => {
    setDay(Number($('exchange-day').value));
  });
  $('exchange-anchor').addEventListener('change', () => {
    cancelLocation();
    cancelSearchTimers();
    const selected = $('exchange-anchor').value;
    exchangeManualMode = selected !== 'gps';
    exchangeUseGps = selected === 'gps' && !!gps;
    if (selected !== 'gps') exchangeAnchor = selected;
    locationError = '';
    renderExchange();
    renderMap();
    updateLocationControls();
  });
  $('exchange-currency').addEventListener('change', () => {
    cancelSearchTimers();
    exchangeCurrency = $('exchange-currency').value;
    renderExchange();
    renderMap();
  });
  $('reference-select').addEventListener('change', () => {
    cancelSearchTimers();
    cancelNearbySearch();
    if (!nearbySearchComposing) nearbyQuery = $('search-input').value;
    if ($('reference-select').value !== 'gps') {
      cancelLocation();
      referenceId = $('reference-select').value;
      gps = null;
      gpsAccuracy = null;
      exchangeUseGps = false;
      exchangeManualMode = true;
      locationError = '';
      fillReference();
    }
    renderNearby();
    renderMap();
    updateLocationControls();
  });
  $('search-input').addEventListener('compositionstart', () => {
    nearbySearchComposing = true;
    cancelNearbySearch();
  });
  $('search-input').addEventListener('compositionend', () => {
    nearbySearchComposing = false;
    scheduleNearbySearch();
  });
  $('search-input').addEventListener('input', scheduleNearbySearch);
  ['area-filter', 'diet-filter', 'operating-filter'].forEach((id) =>
    $(id).addEventListener('change', () => {
      cancelNearbySearch();
      if (!nearbySearchComposing) nearbyQuery = $('search-input').value;
      renderNearby();
      renderMap();
    }),
  );
  $('quick-vegan').addEventListener('click', () => {
    cancelNearbySearch();
    nearbySearchComposing = false;
    nearbyQuery = '';
    $('search-input').value = '';
    $('area-filter').value = 'all';
    $('diet-filter').value = 'vegan';
    $('operating-filter').value = 'available';
    renderNearby();
    renderMap();
  });
  $('map-reset').addEventListener('click', () => {
    if (!flushActiveSearch()) renderMap();
  });
  document.addEventListener('click', (e) => {
    const jump = e.target.closest('[data-jump]');
    if (jump) {
      flushActiveSearch();
      $(jump.dataset.jump)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const nav = e.target.closest('[data-view]');
    if (nav) {
      changeView(nav.dataset.view);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const b = e.target.closest('[data-map-id]');
    if (b) {
      const mapId = b.dataset.mapId;
      flushActiveSearch({ fitMap: false });
      const m = markers.get(mapId);
      if (!m) {
        const inCurrentResults = displayed.some((item) => item.id === mapId);
        const knownMapEntity = place(mapId) || D.exchangePoints.some((item) => item.id === mapId);
        toast(
          inCurrentResults || knownMapEntity
            ? '此地點尚無可靠地圖點位，請用地址導航。'
            : '搜尋或篩選已更新，此地點已不在目前結果中。請從目前清單選擇。',
        );
        return;
      }
      if (map) {
        $('map-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
        map.setView(m.getLatLng(), 16);
        m.openPopup();
      }
    }
  });
  function network() {
    const online = navigator.onLine;
    if (online && $('map-message').textContent.startsWith('目前離線'))
      $('map-message').hidden = true;
    $('network-status').textContent = online
      ? offlineReady
        ? '離線功能已啟用・地圖需網路'
        : '線上瀏覽・離線尚未備妥'
      : '目前離線・已載入文字可閱讀';
    $('network-status').classList.toggle('offline', !online);
    if (!online) {
      $('map-message').hidden = false;
      $('map-message').textContent =
        '目前離線，底圖與導航需連線。已快取的行程、地址、點餐卡可閱讀。';
    }
  }
  window.addEventListener('online', network);
  window.addEventListener('offline', network);
  $('trip-count').textContent = D.restaurants.length + ' 筆餐廳記錄';
  fillReference();
  network();
  render();
  if (
    'serviceWorker' in navigator &&
    location.protocol !== 'file:' &&
    navigator.serviceWorker.controller
  )
    navigator.serviceWorker.addEventListener('controllerchange', () =>
      toast('新版已下載，請重新整理以載入最新行程與店家。'),
    );
  if ('serviceWorker' in navigator && location.protocol !== 'file:')
    navigator.serviceWorker
      .register('./sw.js')
      .then(() => navigator.serviceWorker.ready)
      .then(() => {
        offlineReady = true;
        network();
      })
      .catch(() => {
        offlineReady = false;
        network();
        console.info('離線快取未啟用；線上內容仍可使用。');
      });
})();
