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
    gpsTimestamp = null,
    selectedMapRestaurant = null,
    referenceId = D.days[0].hotel,
    dayAnchor = 'route',
    dayRadius = 10,
    dayQuery = '',
    nearbyQuery = '',
    mealContext = null,
    previousDiet = 'all',
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
    nearbyNowMode = false,
    nowSearchTimestamp = null,
    nearbyLocationIssue = '',
    returnedRestaurantId = null,
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
      : `${r.nearestPlace ? '距' + r.nearestPlace + ' ' : view === 'nearby' ? (gps ? '距定位 ' : '距地標 ') : ''}${r.distance < 1 ? Math.round(r.distance * 1000) + ' m' : r.distance.toFixed(1) + ' km'}・直線`;
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
  const grabLabels = {
    'official-link': 'Grab：有官方入口',
    reported: 'Grab：有回報或索引線索・需確認',
    historical: 'Grab：僅舊資料・需確認',
    unverified: 'Grab：待確認',
    closed: 'Grab：歇業記錄・停止推薦',
  };
  function grabDetails(r) {
    const g = r.grabInfo;
    const status = C.grabStatus(r);
    const canOrder = C.canRecommend(r) && status !== 'closed';
    const searchName = g?.searchName || r.name;
    const sourceLinks = (g?.sourceUrls || [])
      .map((url, i) => link(url, `Grab 查核來源 ${i + 1} ↗`))
      .join('');
    return `<details class="grab-details"><summary>Grab 外送查核與搜尋</summary>
      <p>${esc(g?.note || '尚未完成此分店的 Grab 查核；查不到不代表沒有上架。')}</p>
      <p class="small-note">查核 ${esc(g?.checkedDate || '日期未記錄')} · 證據日期：${esc(g?.evidenceDate || '未標示／未核實')}。查核日期不代表即時接單。</p>
      ${canOrder ? `<p>Grab 搜尋名稱：<strong class="grab-search-name">${esc(searchName)}</strong></p><p class="small-note">核對分店：${esc(r.address)}</p><div class="card-actions"><button type="button" data-copy-grab="${esc(r.id)}">複製 Grab 搜尋名稱</button>${status === 'official-link' ? '' : link('https://www.grab.com/vn/en/food/', '開啟 GrabFood 越南 ↗', 'grab-action')}</div><p class="small-note">${status === 'official-link' ? '官方提供的連結；手機可嘗試開 App，若轉到下載頁，請改用搜尋名稱。' : '此入口不是本店直達；請在 Grab 選 Food、貼上店名並核對地址。'}配送範圍、餐點、價格、接單及運費以 App 為準。</p>` : ''}
      <div class="source-links">${sourceLinks}</div></details>`;
  }
  function restaurantCard(r) {
    const compact = view === 'nearby' && nearbyNowMode;
    const plannedDate = view === 'daily' ? currentDay().date : $('nearby-date').value;
    const plannedTime = view === 'daily' ? $('day-time').value : $('nearby-time').value;
    const timing = C.restaurantHours(r, plannedDate, plannedTime);
    const caution = r.hoursCaution;
    const planned = plannedTime
      ? `<p class="planned-hours ${esc(timing.state)}">${compact ? '' : esc(plannedDate) + ' ' + esc(plannedTime) + ' · '}${esc(timing.label)}</p>`
      : '';
    const cautionText = caution
      ? `<p class="note warning hours-caution">${esc(caution.message)}</p>`
      : '';

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
    const minorAddressIssue = r.addressIssue && /73-12|門牌寫法/.test(r.addressIssue) && !held;
    const addressIssue =
      r.addressIssue && !minorAddressIssue
        ? `<p class="note warning">${esc(r.addressIssue)}</p>`
        : '';
    const evidence =
      r.operatingEvidenceText ||
      '尚未取得可核對的近期營業資料，出發前請先開 Google 商家頁或聯絡店家。';
    const actions =
      (canNavigate
        ? link(C.mapsUrl(r), '開始導航 ↗', 'primary-action')
        : link(googleRestaurantUrl(r), googleLabel, 'primary-action')) +
      (canNavigate && C.grabStatus(r) === 'official-link'
        ? link(r.grabInfo.url, '開啟 Grab 分店 ↗', 'grab-action')
        : '');
    const secondaryActions =
      (canNavigate ? link(googleRestaurantUrl(r), googleLabel) : '') +
      (!held && C.hasCoordinates(r)
        ? `<button type="button" data-map-id="${esc(r.id)}">${C.operationRank(r) === 2 ? '查看舊址位置' : '在地圖看'}</button>`
        : '') +
      phone;
    const menu = r.menuInfo;
    const firstDish = menu?.items?.[0];
    const price = (value) =>
      value === null ? '價格待確認' : Number(value).toLocaleString('zh-TW') + ' VND';
    const menuPreview = firstDish
      ? `<p class="menu-preview">${menu.menuKind === 'categories' ? '官方分類介紹' : menu.priceAge === 'dated-menu' ? '舊版菜單參考' : '菜單參考'} · ${esc(firstDish.nameZh || firstDish.name)} · ${esc(price(firstDish.priceVnd))}</p>`
      : '<p class="menu-preview unavailable">菜單／價格待確認</p>';
    const menuDetails = menu
      ? `<section class="menu-info"><h4>${menu.menuKind === 'categories' ? '官方產品分類介紹' : '菜單與價位參考'}</h4>
      ${menu.items.length ? `<ul class="menu-items">${menu.items.map((item) => `<li><strong>${esc(item.nameZh || item.name)}</strong>${item.nameZh ? `<span class="menu-original">${esc(item.name)}</span>` : ''}<span class="menu-price">${esc(price(item.priceVnd))}</span></li>`).join('')}</ul>` : ''}
      <p class="small-note">${esc(menu.priceNote)} ${esc(menu.menuNote)}</p>
      ${menu.items.length ? `<p class="small-note">僅列來源支持的植物性品項／分類，非逐道成分認證；醬料、湯底及加點仍需確認。</p>` : ''}
      <p class="small-note">菜單查閱 ${esc(menu.checkedDate)} · 非價格生效日；供應與售價以現場為準。</p>
      ${menu.menuUrl ? link(menu.menuUrl, '查看本店菜單來源 ↗', 'menu-source') : ''}</section>`
      : '';
    const ratingInline =
      typeof r.googleRating === 'number'
        ? `<p class="rating-inline">★ ${r.googleRating.toFixed(1)}${count} · 查核快照</p>`
        : '';
    return `
<article class="restaurant-card" id="card-${view}-${esc(r.id)}">
  <div class="card-top"><div class="card-badges"><span class="diet-badge ${esc(r.diet)}">${labels[r.diet]}</span>${C.grabStatus(r) === 'official-link' ? '<span class="grab-badge" title="店家官網提供 Grab 分店入口；實際接單以 App 為準">Grab 入口</span>' : ''}</div><span class="distance-badge">${distanceText(r)}</span></div>
  <h3 class="restaurant-name">${esc(r.name)}</h3>
  ${ratingInline}
  ${compact ? '' : `<p class="day-hours"><strong>${esc(plannedDate?.slice(5).replace('-', '/') || '所選日期')} · ${esc(C.restaurantDayHours(r, plannedDate))}</strong><span class="input-help"> · 參考時段，非即時</span></p>`}
  ${planned}${cautionText}
  ${C.operationRank(r) === 1 ? '<p class="note warning">營業待確認 · 出發前請聯絡店家。</p>' : ''}
  ${C.operationRank(r) === 2 ? `<p class="note warning">${esc(status)}，請另選餐廳。</p>` : ''}
  ${addressIssue}
  ${held ? '<p class="note warning">暫停提供舊址導航與圖釘；請先核對最新地址。</p>' : ''}
  ${r.diet !== 'vegan' ? `<p class="restaurant-diet-summary">${esc(r.veganNotes)}</p>` : ''}
  ${r.hoursExceptionNote && !caution ? `<p class="note warning">${esc(r.hoursExceptionNote)}</p>` : ''}
  ${r.dailyClosed ? '<p class="note warning">此日來源列為休息日，請另選店家或先聯絡確認。</p>' : ''}
  ${r.risk ? `<p class="note warning">${esc(r.risk)}</p>` : ''}
  <div class="card-actions primary-actions">${actions}${compact && (timing.state !== 'open' || C.operationRank(r) !== 0) ? phone : ''}</div>
  ${compact ? '' : `<p class="restaurant-address">${esc(r.address)}${held ? '（既有記錄，勿直接前往）' : ''}</p>`}
  ${compact && !firstDish ? '' : menuPreview}
  <details class="restaurant-details"><summary>${compact ? '菜單・地址・聯絡' : '店家詳情'} <span>菜單・聯絡・Grab 查核</span></summary>
    ${compact ? `<p class="restaurant-address">${esc(r.name)}<br>${esc(r.address)}${held ? '（既有記錄，勿直接前往）' : ''}</p>` : ''}
    <div class="card-actions secondary-actions">${secondaryActions}</div>
    ${minorAddressIssue ? `<p class="note">${esc(r.addressIssue)}</p>` : ''}
    ${menuDetails}<p class="restaurant-note">${esc(r.veganNotes)}</p>
    <p class="hours-note">完整每週參考時段：${esc(r.hours || '未確認／來源有衝突，出發前聯絡')}<br><span>牌告不保證旅行當日開門與廚房接單；出發前查看 Google 最新資訊。</span></p>
  <p class="grab-status ${esc(C.grabStatus(r))}">${esc(grabLabels[C.grabStatus(r)])}</p>
  ${grabDetails(r)}
  <details class="source-details"><summary>查證來源與備註</summary>
    <div class="operation-row"><span class="operation-badge ${esc(state)}">${status}</span><span class="audit-date">查核 ${esc(r.checkedDate)}</span></div>
    ${rating}
    <p class="operation-evidence">${r.operatingEvidenceDate ? '<strong>查核資料 ' + esc(r.operatingEvidenceDate) + '</strong> · ' : ''}${esc(evidence)}</p>
    <p>查詢日期 ${esc(r.checkedDate)} · ${coords}</p>
    ${r.googleLinkType === 'search' ? '<p>Google 連結是店名與地址搜尋，尚未核對唯一商家頁；請確認分店與地址。</p>' : ''}
    ${r.hoursReviewNote ? `<p>${esc(r.hoursReviewNote)}</p>` : ''}
    ${r.googleObservedHoursSnippet ? `<p>Google 查核當日片段（非每週時刻表）：${esc(r.googleObservedHoursSnippet)}</p>` : ''}
    ${r.ratingNote ? `<p>${esc(r.ratingNote)}</p>` : ''}
    ${r.hoursStatus && /conflict|old|unreliable|unverified/i.test(r.hoursStatus) ? '<p>營業時間來源不足、較舊或互有落差，請以店家當日回覆為準。</p>' : ''}
    <div class="source-links">${sources}</div>
  </details>
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
  <div class="currency-badges">${currencyBadges}</div>
  <p class="exchange-service-caution">分行當日受理與服務時間請先確認。</p>
  <div class="card-actions">
    ${nav}
    ${C.hasCoordinates(p) ? `<button type="button" data-map-id="${esc(p.id)}">在地圖看</button>` : ''}
    ${phone}
  </div>
  <p class="exchange-address">${esc(p.address)}</p>
  <details class="source-details">
    <summary>服務說明、授權與幣別來源</summary>
    ${recommendation}
    ${p.hoursNote ? `<p class="exchange-hours-note">${esc(p.hoursNote)}</p>` : ''}
    ${p.phoneLabel ? `<p class="exchange-contact-note">${esc(p.phoneLabel)}</p>` : ''}
    <p class="exchange-evidence">${esc(p.currencyStatus)}</p>
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
  function locationAge() {
    const minutes = Math.max(0, Math.floor((Date.now() - (gpsTimestamp || Date.now())) / 60000));
    return minutes === 0
      ? '剛剛取得'
      : `${minutes} 分鐘前取得${minutes >= 5 ? '・請更新定位' : ''}`;
  }
  function updateLocationControls() {
    const nearbyStatus =
      locationError ||
      (locating
        ? locationWaitingMessage
        : gps
          ? `我的位置・${locationAge()}・GPS 精度約 ${Math.round(gpsAccuracy)} m・直線距離${nearbyLocationIssue ? '・' + nearbyLocationIssue : ''}`
          : `依「${place(referenceId).name}」排序・非目前位置`);
    const anchor =
      exchangeAnchor === 'route' ? '當天行程' : place(exchangeAnchor)?.name || '當天行程';
    const exchangeStatus =
      locationError ||
      (locating
        ? locationWaitingMessage
        : exchangeUseGps && gps
          ? `我的位置・${locationAge()}・GPS 精度約 ${Math.round(gpsAccuracy)} m・直線距離`
          : `依 ${currentDay().shortDate}「${anchor}」排序 · 距離為直線`);
    $('location-status').textContent = nearbyStatus;
    $('eat-now').disabled = locating;
    $('eat-now').textContent = locating
      ? '正在取得位置…'
      : locationError || nearbyLocationIssue
        ? '重新定位找全素'
        : gps && nearbyNowMode
          ? '更新位置與時間'
          : '找我附近的全素';
    $('locate-btn').hidden = nearbyNowMode;
    $('view-nearby').dataset.nowMode = String(nearbyNowMode);
    $('view-nearby').dataset.hasGps = String(!!gps);
    $('now-context').textContent = nearbyNowMode
      ? `全素・越南 ${$('nearby-date').value} ${$('nearby-time').value}・${$('nearby-radius').value === 'all' ? '不限距離' : $('nearby-radius').value + ' km'}`
      : '';
    $('now-search-stale').hidden =
      !nearbyNowMode ||
      !nowSearchTimestamp ||
      (Date.now() - nowSearchTimestamp < 5 * 60000 &&
        (!gpsTimestamp || Date.now() - gpsTimestamp < 5 * 60000));
    $('exchange-location-status').textContent = exchangeStatus;
    $('locate-btn').disabled = locating;
    $('locate-btn').textContent = locating ? '正在取得位置…' : gps ? '更新定位' : '使用定位';
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
    const hotel = place(currentDay().hotel);
    $('hotel-shortcut').href = C.mapsUrl(hotel);
    $('hotel-shortcut').textContent = '今晚住宿導航';
    $('hotel-shortcut').setAttribute('aria-label', '導航至今晚住宿：' + hotel.name);
    const meals = D.mealPlans?.find((plan) => plan.date === currentDay().date)?.meals || [];
    const now = C.vietnamNow();
    const foundMeal =
      currentDay().date === now.date ? meals.findIndex((meal) => meal.time >= now.time) : 1;
    const next = foundMeal < 0 ? Math.max(0, meals.length - 1) : foundMeal;
    $('next-meal-shortcut').textContent = '用餐：' + (meals[next]?.label || '晚餐');
    $('next-meal-shortcut').dataset.mealTarget = String(next);
  }
  function renderMealPlan() {
    const plan = D.mealPlans?.find((p) => p.date === currentDay().date);
    if (!plan) {
      $('meal-plan').innerHTML = '';
      return;
    }
    const now = C.vietnamNow();
    const nextMeal =
      plan.date === now.date ? plan.meals.findIndex((meal) => meal.time >= now.time) : 1;
    const mountain = plan.date === '2026-10-22';
    const meals = plan.meals
      .map((meal, index) => {
        const choices = meal.restaurantIds
          .map((id) => D.restaurants.find((r) => r.id === id))
          .filter((r) => r && C.canRecommend(r));
        const rows = choices
          .map(
            (r, i) =>
              `<div class="meal-choice ${i ? 'meal-choice-backup' : 'meal-choice-primary'}"><span class="meal-role">${meal.searchWarning ? '下山後市區備援' : i ? '備援' : '首選'}</span><strong>${esc(r.searchAliases?.find((name) => name) || r.name)}</strong><div class="meal-choice-actions"><button type="button" class="text-button" data-meal-restaurant="${esc(r.id)}" data-meal-source-index="${index}">在這裡看店家</button>${link(C.mapsUrl(r), '導航 ↗')}</div></div>`,
          )
          .join('');
        return `<section class="meal-row" id="daily-meal-${index}"><details class="meal-details" ${index === (nextMeal < 0 ? plan.meals.length - 1 : nextMeal) ? 'open' : ''}><summary><span>${esc(meal.label)}</span><span>${esc(meal.time)} · 越南時間</span></summary><p class="small-note">${esc(place(meal.anchorId)?.name || '')}附近${meal.searchWarning ? ' · 園內全素待確認' : ''}</p>
        ${meal.searchWarning ? `<p class="note warning">${esc(meal.searchWarning)}</p>` : ''}${rows}
        ${choices.length < 2 ? '<p class="small-note">尚無已確認的獨立餐廳備援，請先確認飯店或行前用餐安排。</p>' : ''}
        <button type="button" class="secondary-button meal-search" data-meal-index="${index}">${meal.searchWarning ? '查園內供餐（需確認）' : '查看這餐附近的全素店'}</button>
        <button type="button" class="text-button" data-meal-advice="${index}" aria-expanded="${meal.searchWarning ? 'true' : 'false'}" aria-controls="meal-advice-${index}">交通與用餐提醒</button></details><p id="meal-advice-${index}" class="meal-advice" ${meal.searchWarning ? '' : 'hidden'}>${esc(meal.advice)}</p></section>`;
      })
      .join('');
    $('meal-plan').innerHTML =
      `<h3>今天怎麼吃</h3><p>${esc(plan.headline)}</p>${mountain ? `<p class="note warning">${esc(plan.warning)}</p>` : ''}<details open><summary>三餐首選與備援</summary>${!mountain ? `<p class="small-note">${esc(plan.warning)}</p>` : ''}${meals}<p class="small-note">行程建議，尚未訂位；出發前先核對供餐與交通。</p><div class="source-links">${plan.sources.map((source) => link(source.url, esc(source.title))).join('')}</div></details>`;
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
        const nearest =
          distance === null ? null : origins.find((o) => C.distanceKm(o, r) === distance);
        return {
          ...r,
          distance,
          nearestPlace: nearest?.name,
          dailyClosed: r.closedWeekdays?.includes(weekday) || false,
        };
      })
      .filter(
        (r) =>
          ((r.distance !== null && r.distance <= dayRadius) ||
            (r.distance === null && regions.has(r.area))) &&
          C.matchesRestaurant(r, dayQuery, d.date),
      )
      .sort(
        (a, b) =>
          C.operationRank(a) - C.operationRank(b) ||
          (a.distance === null ? 1 : 0) - (b.distance === null ? 1 : 0) ||
          ($('day-time').value
            ? C.restaurantHours(a, d.date, $('day-time').value).rank -
              C.restaurantHours(b, d.date, $('day-time').value).rank
            : 0) ||
          Number(a.dailyClosed) - Number(b.dailyClosed) ||
          (a.diet === 'vegan' ? 0 : 1) - (b.diet === 'vegan' ? 0 : 1) ||
          (a.distance ?? Infinity) - (b.distance ?? Infinity),
      );
  }
  function renderDailyFood() {
    const items = dailyRestaurants();
    $('day-food-count').textContent = items.length + ' 間';
    $('daily-food-heading').setAttribute(
      'aria-label',
      '當日餐廳搜尋結果，共 ' + items.length + ' 間',
    );
    $('day-radius').value = String(dayRadius);
    const name = dayAnchor === 'route' ? '當天任一景點／住宿' : place(dayAnchor).name;
    const intro = `<p class="small-note">距離以${esc(name)}為參考，顯示 ${dayRadius} km 內點位；Google 未標歇業者優先，待確認排後。無座標備選依區域地址收錄並列於後方，無法保證距離。山區道路可能繞行。${dayQuery ? ` 搜尋：${esc(dayQuery)}。搜尋僅限本頁整理的店家。` : ''}</p>`;
    $('day-restaurant-list').innerHTML =
      intro +
      (items.length
        ? items.map(restaurantCard).join('')
        : `<div class="empty-state"><h3>${dayQuery ? '這天範圍內沒有符合搜尋的店家' : '這一站範圍內尚無可選店家'}</h3><p>可以擴大直線範圍、清除搜尋，或按上方「搜尋全清單」找其他區域。沒找到不代表店家不存在或已歇業。</p><div class="empty-actions"><button type="button" class="secondary-button" data-recover="clear-daily">清除搜尋</button><button type="button" class="secondary-button" data-recover="expand-daily">擴大到 15 km</button><button type="button" class="secondary-button" data-recover="search-all">搜尋全清單</button></div></div>`);
    displayed = items;
    window.TravelUX?.updated({ view, items, day: currentDay(), dayRadius, dayAnchor });
  }
  function origin() {
    return gps || place(referenceId);
  }
  function nowRestaurantResults(items) {
    const groups = C.groupNearbyRestaurants(items, $('nearby-date').value, $('nearby-time').value);
    const radius = $('nearby-radius').value;
    const expand =
      radius !== 'all' && Number(radius) < 10
        ? `<button class="secondary-button" type="button" data-expand-nearby="${Number(radius) < 5 ? 5 : 10}">擴大到 ${Number(radius) < 5 ? 5 : 10} km</button>`
        : '';
    const section = (label, records, id) =>
      records.length
        ? `<details class="nearby-result-group" id="${id}"><summary>${label}（${records.length} 間）</summary><div class="restaurant-list">${records.map(restaurantCard).join('')}</div></details>`
        : '';
    $('result-count').textContent = `${groups.ready.length} 間可用餐`;
    const primary = groups.ready.length
      ? `<div id="nearby-ready" class="restaurant-list">${groups.ready.slice(0, 3).map(restaurantCard).join('')}</div>${section(`查看全部 ${groups.ready.length} 間候選的其餘店家`, groups.ready.slice(3), 'nearby-more-ready')}`
      : `<div class="empty-state"><h3>${radius === 'all' ? '本站清單暫無符合目前條件的用餐候選' : `${esc(radius)} km 內暫無符合目前條件的全素用餐候選`}</h3><p>僅搜尋本站整理的店家；可擴大範圍，或展開下方需確認與其他時段的店家。</p>${expand}</div><div id="nearby-ready"></div>`;
    return `${!gps ? '<p class="nearby-preview-note">地標附近預覽・尚未取得目前位置</p>' : ''}${primary}
      ${section('即將結束／供餐需確認', groups.confirm, 'nearby-confirm')}
      ${section('其他時段・午休／休息', groups.other, 'nearby-other')}
      ${section('距離未確認，不計入附近範圍', groups.unlocated, 'nearby-unlocated')}
      ${groups.ready.length ? `<div class="nearby-expand">${expand}</div>` : ''}`;
  }
  function renderNearby() {
    updateLocationControls();
    const locationIssue = gps ? nearbyLocationIssue : '';
    const openGroups = Array.from(
      $('restaurant-list').querySelectorAll?.('details[id][open]') || [],
      (node) => node.id,
    );
    const options = {
      origin: origin(),
      area: $('area-filter').value,
      diet: $('diet-filter').value,
      query: nearbyQuery,
      operating: $('operating-filter').value || 'available',
      grab: $('grab-filter').value,
      radius: $('nearby-radius').value,
      date: $('nearby-date').value,
    };
    displayed = locationIssue
      ? []
      : C.selectRestaurants(D.restaurants, options).filter(
          (r) => window.TravelUX?.includeRestaurant(r.id) ?? true,
        );
    displayed.sort(
      (a, b) =>
        C.operationRank(a) - C.operationRank(b) ||
        Number(a.distance === null) - Number(b.distance === null) ||
        ($('nearby-time').value
          ? C.restaurantHours(a, $('nearby-date').value, $('nearby-time').value).rank -
            C.restaurantHours(b, $('nearby-date').value, $('nearby-time').value).rank
          : 0) ||
        ($('nearby-sort')?.value === 'vegan'
          ? Number(b.diet === 'vegan') - Number(a.diet === 'vegan')
          : 0) ||
        (a.distance ?? Infinity) - (b.distance ?? Infinity),
    );
    const activeMealContext =
      mealContext &&
      mealContext.date === $('nearby-date').value &&
      mealContext.time === $('nearby-time').value &&
      mealContext.anchorId === referenceId &&
      !gps;
    $('meal-search-note').hidden = !activeMealContext;
    $('meal-search-note').textContent = activeMealContext ? mealContext.message : '';
    $('grab-filter-note').hidden = $('grab-filter').value !== 'official-link';
    $('quick-grab').setAttribute(
      'aria-pressed',
      String($('grab-filter').value === 'official-link'),
    );
    $('quick-vegan').setAttribute('aria-pressed', String($('diet-filter').value === 'vegan'));
    $('result-count').textContent = locationIssue ? '定位待更新' : displayed.length + ' 間';
    $('nearby-results-heading').setAttribute(
      'aria-label',
      locationIssue ? '餐廳搜尋結果，定位待更新' : '餐廳搜尋結果，共 ' + displayed.length + ' 間',
    );
    const recent = D.restaurants.filter((r) => C.operationRank(r) === 0).length,
      closed = D.restaurants.filter((r) => C.operationRank(r) === 2).length;
    $('audit-summary').textContent =
      `${D.restaurants.length} 筆查核記錄 · ${recent} 家 Google 未標歇業 · ${D.restaurants.length - recent - closed} 家待確認 · ${closed} 家歇業／暫停`;
    const located = displayed.filter((r) => r.distance !== null);
    const unlocated = displayed.filter((r) => r.distance === null);
    $('restaurant-list').innerHTML = locationIssue
      ? `<div class="empty-state"><h3>${esc(locationIssue)}</h3><p>請重新定位，或改用飯店／景點查看地標附近的店家。</p><button type="button" class="secondary-button" data-jump="reference-select">改用飯店／景點</button></div>`
      : nearbyNowMode
        ? nowRestaurantResults(displayed)
        : displayed.length
          ? located.map(restaurantCard).join('') +
            (unlocated.length
              ? '<div class="unlocated-heading"><h4>距離未確認的備選</h4><p class="small-note">以下店家或參考位置缺少可靠座標，不計入已確認的附近範圍。</p></div>' +
                unlocated.map(restaurantCard).join('')
              : '')
          : '<div class="empty-state"><h3>這個條件沒有找到餐廳</h3><p>試著改成所有區域，或調整飲食分類與營業查核條件。</p><div class="empty-actions"><button type="button" class="secondary-button" data-recover="clear-nearby">清除關鍵字</button><button type="button" class="secondary-button" data-recover="reset-nearby">重設搜尋與篩選</button><button type="button" class="secondary-button" data-recover="radius">改為不限距離</button><button type="button" class="secondary-button" data-recover="favorites">顯示未收藏的店家</button></div></div>';
    const returned =
      nearbyNowMode &&
      !gps &&
      returnedRestaurantId &&
      !displayed.some((r) => r.id === returnedRestaurantId) &&
      D.restaurants.find((r) => r.id === returnedRestaurantId && C.canRecommend(r));
    if (returned)
      $('restaurant-list').innerHTML =
        `<section id="returned-nearby"><h3>上次查看的店家</h3><p class="small-note">請更新位置確認距離；這間未計入地標附近結果。</p>${restaurantCard({ ...returned, distance: null })}</section>` +
        $('restaurant-list').innerHTML;
    for (const id of openGroups) if ($(id)) $(id).open = true;
    $('reference-select').value = gps ? 'gps' : referenceId;
    window.TravelUX?.updated({
      view,
      items: displayed,
      reference: gps ? '你的定位' : place(referenceId)?.name,
      radius: $('nearby-radius').value,
      plannedDate: $('nearby-date').value,
      plannedTime: $('nearby-time').value,
      nowMode: nearbyNowMode,
      locationIssue,
    });
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
          if (window.TravelUX?.navigateTarget) window.TravelUX.navigateTarget(card.id);
          else card.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      .bindPopup(popup(p, kind), {
        maxWidth: Math.min(300, Math.max(160, (window.innerWidth || 1024) - 110)),
        maxHeight: 240,
        autoPanPadding: [12, 12],
      })
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
    $('map-food-control').hidden = view !== 'daily';
    if (window.TravelUX?.shouldLoadMap && !window.TravelUX.shouldLoadMap(view)) return;
    if (view === 'nearby' && gps && nearbyLocationIssue) {
      layer?.clearLayers();
      markers.clear();
      $('map').hidden = true;
      $('map-message').hidden = false;
      $('map-message').textContent = nearbyLocationIssue + '；請更新定位或改用飯店／景點。';
      $('map-external').hidden = true;
      $('map-heading').textContent = '定位待更新';
      return;
    }
    $('map').hidden = false;
    $('map-external').hidden = false;
    if ($('map-message').textContent.endsWith('請更新定位或改用飯店／景點。'))
      $('map-message').hidden = true;
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
      const primaryIds = new Set(
        (D.mealPlans?.find((plan) => plan.date === currentDay().date)?.meals || []).map(
          (meal) => meal.restaurantIds[0],
        ),
      );
      const mapFood = $('map-all-restaurants').checked
        ? displayed
        : displayed.filter((r) => primaryIds.has(r.id) || r.id === selectedMapRestaurant);
      mapFood.filter(C.hasCoordinates).forEach((p) => bounds.push([p.lat, p.lng]));
      mapFood.forEach((p) =>
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
      map.invalidateSize({ pan: false, animate: false });
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
      : '<div class="empty-state"><h3>這個幣別條件沒有資料</h3><p>切換「全部銀行／授權櫃檯」查看其他據點；沒有資料不代表拒收這個幣別。</p><button type="button" class="secondary-button" data-recover="exchange">顯示全部據點</button></div>';
    $('exchange-legal-sources').innerHTML = D.exchangeLegalNotes
      .flatMap((n) => n.sourceUrls)
      .filter((u, i, a) => a.indexOf(u) === i)
      .map((u, i) => link(u, `法規／換匯參考 ${i + 1}`))
      .join('');
    window.TravelUX?.updated({ view, items: displayed, day: currentDay() });
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
    window.TravelUX?.beforeView(next);
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
    window.TravelUX?.afterView(view);
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
    leaveNearbyNow();
    selectedMapRestaurant = null;
    $('nearby-date').value = currentDay().date;
    mealContext = null;
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
    window.TravelUX?.dateChanged(currentDay().date);
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
        gpsTimestamp = Number.isFinite(p.timestamp) ? p.timestamp : Date.now();
        nearbyLocationIssue =
          C.distanceKm(gps, { lat: 16.02, lng: 108.2 }) > 150
            ? '你目前不在峴港／會安附近'
            : gpsAccuracy > 1000
              ? '定位精度不足，請重新定位'
              : '';
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
        nearbyLocationIssue = '';
        exchangeUseGps = exchangeManualMode ? exchangeUseGps : false;
        exchangeFollowGpsRequest = false;
        locationError =
          ({ 1: '未允許定位', 2: '暫時無法取得位置', 3: '定位逾時' }[e.code] || '定位失敗') +
          '；未取得目前位置，下方僅為地標附近預覽。可重新定位或改用飯店／景點。';
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
  $('phrase-dialog').addEventListener('close', () =>
    $('enlarge-phrase').focus({ preventScroll: true }),
  );
  $('copy-phrase').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(phrases.vi);
      toast('越南文已複製');
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
  $('day-time').addEventListener('change', () => {
    flushActiveSearch({ fitMap: false });
    renderDailyFood();
    renderMap();
  });
  for (const id of ['nearby-date', 'nearby-time', 'nearby-radius']) {
    $(id).addEventListener('change', () => {
      if (id !== 'nearby-radius') leaveNearbyNow();
      cancelNearbySearch();
      if (!nearbySearchComposing) nearbyQuery = $('search-input').value;
      renderNearby();
      renderMap();
    });
  }
  function leaveNearbyNow() {
    nearbyNowMode = false;
    $('nearby-search').open = true;
  }
  function prepareNearbyNow() {
    returnedRestaurantId = null;
    cancelSearchTimers();
    const now = C.vietnamNow();
    nearbyNowMode = true;
    nowSearchTimestamp = Date.now();
    nearbyQuery = '';
    nearbySearchComposing = false;
    $('search-input').value = '';
    $('nearby-date').value = now.date;
    $('nearby-time').value = now.time;
    $('nearby-radius').value = '3';
    $('nearby-sort').value = 'distance';
    $('diet-filter').value = 'vegan';
    $('area-filter').value = 'all';
    $('grab-filter').value = 'all';
    $('operating-filter').value = 'available';
    mealContext = null;
    window.TravelUX?.clearFavoritesFilter();
    $('nearby-filters').open = false;
    $('nearby-search').open = false;
    $('restored-query-note').hidden = true;
  }
  function findNearbyNow() {
    if (locating) return;
    prepareNearbyNow();
    window.TravelUX?.showTarget('restaurant-list');
    if (view !== 'nearby') changeView('nearby');
    render();
    locate('nearby');
  }
  $('eat-now').addEventListener('click', findNearbyNow);
  $('refresh-now-search').addEventListener('click', findNearbyNow);
  $('choose-landmark').addEventListener('click', () => {
    $('nearby-filters').open = true;
    window.TravelUX?.navigateTarget('reference-select');
  });
  $('map-all-restaurants').addEventListener('change', () => renderMap());
  $('next-meal-shortcut').addEventListener('click', () => {
    const target = $('daily-meal-' + $('next-meal-shortcut').dataset.mealTarget);
    const disclosure = target?.querySelector('details');
    if (disclosure) disclosure.open = true;
    if (target) window.TravelUX?.navigateTarget(target.id);
  });
  window.addEventListener('focus', updateLocationControls);
  window.setInterval?.(updateLocationControls, 60000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) updateLocationControls();
  });
  $('nearby-now').addEventListener('click', () => {
    const now = C.vietnamNow();
    $('nearby-date').value = now.date;
    $('nearby-time').value = now.time;
    $('nearby-time').dispatchEvent(new Event('change', { bubbles: true }));
  });
  function resetNearbyExtras() {
    leaveNearbyNow();
    $('nearby-search').open = true;
    $('nearby-date').value = currentDay().date;
    $('nearby-time').value = '';
    $('nearby-radius').value = 'all';
    $('grab-filter').value = 'all';
    mealContext = null;
    $('meal-search-note').hidden = true;
  }
  function searchMeal(index) {
    leaveNearbyNow();
    const meal = D.mealPlans?.find((p) => p.date === currentDay().date)?.meals[index];
    if (!meal || !place(meal.anchorId)) return;
    cancelSearchTimers();
    cancelLocation();
    gps = null;
    gpsAccuracy = null;
    exchangeUseGps = false;
    exchangeManualMode = true;
    locationError = '';
    referenceId = meal.anchorId;
    nearbyQuery = '';
    nearbySearchComposing = false;
    $('search-input').value = '';
    $('nearby-date').value = currentDay().date;
    $('nearby-time').value = meal.time;
    $('nearby-radius').value = '5';
    $('diet-filter').value = meal.searchWarning ? 'all' : 'vegan';
    $('area-filter').value = meal.searchWarning ? 'banahills' : 'all';
    $('operating-filter').value = 'available';
    $('grab-filter').value = 'all';
    window.TravelUX?.clearFavoritesFilter();
    mealContext = {
      date: currentDay().date,
      time: meal.time,
      anchorId: meal.anchorId,
      message:
        meal.searchWarning ||
        `${meal.label} · 以${place(meal.anchorId).name}為參考，預計 ${meal.time} 用餐；距離是直線估計，請預留交通及點餐時間。`,
    };
    fillReference();
    changeView('nearby');
    window.TravelUX?.showTarget('restaurant-list');
    $('nearby-search-summary').scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.TravelUX?.focusTarget($('nearby-search-summary'));
  }
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
    window.TravelUX?.clearFavoritesFilter();
    $('search-input').value = nearbyQuery;
    $('area-filter').value = 'all';
    $('diet-filter').value = 'all';
    $('operating-filter').value = 'available';
    resetNearbyExtras();
    changeView('nearby');
    $('search-input').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  $('export-mymaps').addEventListener('click', () => {
    let url, anchor;
    try {
      const csv = C.restaurantsCsv(D.restaurants);
      const now = new Date();
      const date = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
      ].join('-');
      url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `峴港與會安素食店家_${date}.csv`;
      document.body.append(anchor);
      anchor.click();
      toast(`已匯出 ${D.restaurants.length} 筆店家。匯入定位選 Location，標題選 Name。`);
    } catch {
      toast('匯出失敗，請重新整理後再試一次。');
    } finally {
      anchor?.remove();
      if (url) setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
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
      nearbyLocationIssue = '';
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
  ['area-filter', 'diet-filter', 'operating-filter', 'grab-filter'].forEach((id) =>
    $(id).addEventListener('change', () => {
      if (id === 'diet-filter' && $('diet-filter').value !== 'vegan') leaveNearbyNow();
      cancelNearbySearch();
      if (!nearbySearchComposing) nearbyQuery = $('search-input').value;
      renderNearby();
      renderMap();
    }),
  );
  $('quick-grab').addEventListener('click', () => {
    const filter = $('grab-filter');
    filter.value = filter.value === 'official-link' ? 'all' : 'official-link';
    filter.dispatchEvent(new Event('change', { bubbles: true }));
  });
  $('quick-vegan').addEventListener('click', () => {
    leaveNearbyNow();
    cancelNearbySearch();
    if (!nearbySearchComposing) nearbyQuery = $('search-input').value;
    const diet = $('diet-filter');
    if (diet.value === 'vegan') diet.value = previousDiet;
    else {
      previousDiet = diet.value;
      diet.value = 'vegan';
    }
    renderNearby();
    renderMap();
  });
  $('map-reset').addEventListener('click', () => {
    if (!flushActiveSearch()) renderMap();
  });
  function showMealRestaurant(id, mealIndex) {
    const r = D.restaurants.find((record) => record.id === id);
    if (!r || !C.canRecommend(r)) return;
    const meal = D.mealPlans.find((plan) => plan.date === currentDay().date)?.meals[mealIndex];
    cancelSearchTimers();
    resetNearbyExtras();
    nearbyQuery = r.name;
    nearbySearchComposing = false;
    $('search-input').value = nearbyQuery;
    $('area-filter').value = 'all';
    $('diet-filter').value = 'all';
    $('operating-filter').value = 'available';
    if (meal) $('nearby-time').value = meal.time;
    window.TravelUX?.clearFavoritesFilter();
    changeView('nearby');
    window.TravelUX?.showTarget('restaurant-list');
    requestAnimationFrame(() => {
      const card = $('card-nearby-' + id);
      window.TravelUX?.focusTarget(card);
      card?.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
  }
  document.addEventListener('click', async (e) => {
    const expand = e.target.closest('[data-expand-nearby]');
    if (expand) {
      $('nearby-radius').value = expand.dataset.expandNearby;
      $('nearby-radius').dispatchEvent(new Event('change', { bubbles: true }));
      window.TravelUX?.navigateTarget('restaurant-list');
      return;
    }
    const copy = e.target.closest('[data-copy-grab]');
    if (copy) {
      const r = D.restaurants.find((item) => item.id === copy.dataset.copyGrab);
      if (!r || !C.canRecommend(r)) return;
      try {
        await navigator.clipboard.writeText(r.grabInfo?.searchName || r.name);
        toast('Grab 搜尋名稱已複製；請在 App 核對分店地址。');
      } catch {
        toast('無法自動複製，請長按上方 Grab 搜尋名稱選取。');
      }
      return;
    }
    const localMeal = e.target.closest('[data-meal-restaurant]');
    if (localMeal) {
      showMealRestaurant(
        localMeal.dataset.mealRestaurant,
        Number(localMeal.dataset.mealSourceIndex),
      );
      return;
    }
    const advice = e.target.closest('[data-meal-advice]');
    if (advice) {
      const text = $('meal-advice-' + advice.dataset.mealAdvice);
      text.hidden = !text.hidden;
      advice.setAttribute('aria-expanded', String(!text.hidden));
      return;
    }
    const meal = e.target.closest('[data-meal-index]');
    if (meal) {
      searchMeal(Number(meal.dataset.mealIndex));
      return;
    }
    const jump = e.target.closest('[data-jump]');
    if (jump) {
      if (window.TravelUX?.navigateTarget) {
        window.TravelUX.navigateTarget(jump.dataset.jump);
        return;
      }
      flushActiveSearch();
      window.TravelUX?.showTarget(jump.dataset.jump);
      const target = $(jump.dataset.jump);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.TravelUX?.focusTarget(target);
      return;
    }
    const nav = e.target.closest('[data-view]');
    if (nav) {
      changeView(nav.dataset.view);
      if (!window.TravelUX) window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const b = e.target.closest('[data-map-id]');
    if (b) {
      window.TravelUX?.requestMap();
      renderMap(false);
      const mapId = b.dataset.mapId;
      flushActiveSearch({ fitMap: false });
      if (view === 'daily' && !markers.has(mapId) && displayed.some((r) => r.id === mapId)) {
        selectedMapRestaurant = mapId;
        renderMap(false);
      }
      let m = markers.get(mapId);
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
        window.TravelUX?.mapFromCard(b.closest?.('article')?.id);
        m = markers.get(mapId) || m;
        map.invalidateSize({ pan: false, animate: false });
        $('map-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
        map.setView(m.getLatLng(), 16, { animate: false });
        m.openPopup();
        window.TravelUX?.focusTarget($('map-heading'));
      }
    }
  });
  function network() {
    const online = navigator.onLine;
    if (online && $('map-message').textContent.startsWith('目前離線'))
      $('map-message').hidden = true;
    $('network-status').textContent = window.TravelUX?.hasUpdate()
      ? online
        ? '新版已備妥 · 點此更新'
        : '目前離線 · 新版已備妥'
      : online
        ? offlineReady
          ? '離線可讀'
          : '離線準備中'
        : '目前離線';
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
  $('nearby-date').value = currentDay().date;
  $('nearby-radius').value = 'all';
  fillReference();
  network();
  render();
  window.TravelUX?.start({
    changeView,
    setDay,
    refresh: render,
    refreshRestaurants: () => {
      if (view === 'daily') renderDailyFood();
      if (view === 'nearby') renderNearby();
      renderMap(false);
    },
    toast,
    flush: flushActiveSearch,
    resetNearbyExtras,
    prepareNearbyNow,
    refreshMap: renderMap,
    restoreReadingTarget: (target) => {
      returnedRestaurantId =
        typeof target === 'string' && target.startsWith('card-nearby-')
          ? target.slice('card-nearby-'.length)
          : null;
    },
    snapshot: () => ({
      nearbyNowMode,
      nowSearchTimestamp,
      dayTime: $('day-time').value,
      nearbyDate: $('nearby-date').value,
      nearbyTime: $('nearby-time').value,
      nearbyRadius: $('nearby-radius').value,
      mealContext,
      dayIndex,
      dayAnchor,
      dayRadius,
      dayQuery: $('day-search').value,
      nearbyQuery: $('search-input').value,
      referenceId,
      exchangeAnchor,
      exchangeCurrency,
      area: $('area-filter').value,
      diet: $('diet-filter').value,
      operating: $('operating-filter').value,
      grab: $('grab-filter').value,
      sort: $('nearby-sort').value,
    }),
    restore: (state) => {
      if (Number.isInteger(state.dayIndex) && D.days[state.dayIndex]) setDay(state.dayIndex);
      nearbyNowMode = state.nearbyNowMode === true;
      nowSearchTimestamp = Number.isFinite(state.nowSearchTimestamp)
        ? state.nowSearchTimestamp
        : null;
      $('nearby-search').open = !nearbyNowMode;
      if (state.dayAnchor === 'route' || currentDay().stops.some((s) => s.id === state.dayAnchor))
        dayAnchor = state.dayAnchor;
      if ([6, 10, 15].includes(state.dayRadius)) dayRadius = state.dayRadius;
      if (typeof state.dayQuery === 'string') dayQuery = state.dayQuery;
      if (typeof state.nearbyQuery === 'string') nearbyQuery = state.nearbyQuery;
      if (D.places.some((p) => p.id === state.referenceId)) referenceId = state.referenceId;
      if (state.exchangeAnchor === 'route' || D.places.some((p) => p.id === state.exchangeAnchor))
        exchangeAnchor = state.exchangeAnchor;
      if (['all', 'USD', 'TWD', 'unknown'].includes(state.exchangeCurrency))
        exchangeCurrency = state.exchangeCurrency;
      if (typeof state.dayTime === 'string') $('day-time').value = state.dayTime;
      if (typeof state.nearbyDate === 'string') $('nearby-date').value = state.nearbyDate;
      if (typeof state.nearbyTime === 'string') $('nearby-time').value = state.nearbyTime;
      if (['all', '1', '3', '5', '10'].includes(state.nearbyRadius))
        $('nearby-radius').value = state.nearbyRadius;
      if (
        state.mealContext &&
        typeof state.mealContext.message === 'string' &&
        D.places.some((p) => p.id === state.mealContext.anchorId)
      )
        mealContext = state.mealContext;
      $('day-search').value = dayQuery;
      $('search-input').value = nearbyQuery;
      const fields = {
        'area-filter': state.area,
        'diet-filter': state.diet,
        'operating-filter': state.operating,
        'grab-filter': state.grab,
        'nearby-sort': state.sort,
      };
      for (const [id, value] of Object.entries(fields))
        if (Array.from($(id).options).some((o) => o.value === value)) $(id).value = value;
      fillReference();
      render();
    },
  });
  if (
    'serviceWorker' in navigator &&
    location.protocol !== 'file:' &&
    navigator.serviceWorker.controller
  )
    navigator.serviceWorker.addEventListener('controllerchange', () =>
      window.TravelUX
        ? window.TravelUX.updateReady()
        : toast('新版已下載，請重新整理以載入最新行程與店家。'),
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
