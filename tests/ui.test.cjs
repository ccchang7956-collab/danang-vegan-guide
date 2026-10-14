const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm');
const env = { window: {} };
vm.runInNewContext(fs.readFileSync('assets/data.js', 'utf8'), env);
const D = env.window.TRAVEL_DATA;
class Element {
  constructor(id = '', tagName = 'div') {
    this.id = id;
    this.tagName = tagName;
    this.hidden = false;
    this.textContent = '';
    this.value = '';
    this.listeners = {};
    this.children = [];
    this.dataset = {};
    this.attributes = {};
    this._classes = new Set();
    this.classList = {
      add: (...names) => names.forEach((name) => this._classes.add(name)),
      remove: (...names) => names.forEach((name) => this._classes.delete(name)),
      toggle: (name, force) => {
        const enabled = force ?? !this._classes.has(name);
        enabled ? this._classes.add(name) : this._classes.delete(name);
        return enabled;
      },
      contains: (name) => this._classes.has(name),
    };
    this._html = '';
    this.innerHTMLWrites = 0;
    this.appended = [];
  }
  set className(value) {
    this._classes = new Set(String(value).split(/\s+/).filter(Boolean));
  }
  get className() {
    return [...this._classes].join(' ');
  }
  set innerHTML(s) {
    this.innerHTMLWrites++;
    this._html = s;
    if (this.id === 'day-anchor') this.value = 'route';
  }
  get innerHTML() {
    return this._html;
  }
  addEventListener(t, cb) {
    this.listeners[t] = cb;
  }
  append(...items) {
    for (const item of items) {
      this.appended.push(item);
      this.children.push(item);
    }
  }
  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }
  getAttribute(name) {
    return this.attributes[name] ?? null;
  }
  removeAttribute(name) {
    delete this.attributes[name];
  }
  scrollIntoView() {}
  querySelector() {
    return new Element();
  }
  showModal() {
    this.hidden = false;
  }
  close() {
    this.hidden = true;
  }
}
function harness(options = {}) {
  const ids = [...fs.readFileSync('index.html', 'utf8').matchAll(/\bid="([^"]+)"/g)].map(
    (m) => m[1],
  );
  const elements = new Map(ids.map((id) => [id, new Element(id)]));
  elements.get('area-filter').value = 'all';
  elements.get('diet-filter').value = 'all';
  const windowListeners = {},
    docListeners = {},
    nav = ['daily', 'nearby', 'exchange', 'phrase'].map((view) => {
      const el = new Element();
      el.dataset = { view };
      return el;
    });
  const document = {
    body: new Element(),
    getElementById: (id) => elements.get(id),
    querySelectorAll: () => nav,
    createElement: (tagName) => new Element('', tagName),
    addEventListener: (t, cb) => (docListeners[t] = cb),
  };
  const mapMarkers = [],
    fits = [],
    mapOperations = [],
    openedMarkers = [];
  const mapStub = {
    setView(center, zoom) {
      mapOperations.push({ type: 'setView', center, zoom });
      return this;
    },
    invalidateSize() {},
    fitBounds(bounds) {
      fits.push(bounds);
      mapOperations.push({ type: 'fitBounds', bounds });
    },
  };
  const layerStub = {
    addTo() {
      return this;
    },
    clearLayers() {
      mapMarkers.length = 0;
    },
  };
  const leaflet = options.withMap
    ? {
        map: () => mapStub,
        layerGroup: () => layerStub,
        divIcon: (icon) => icon,
        tileLayer: () => ({
          addTo() {
            return this;
          },
          on() {
            return this;
          },
        }),
        circleMarker: () => ({
          bindTooltip() {
            return this;
          },
          addTo() {
            return this;
          },
        }),
        circle: () => ({
          addTo() {
            return this;
          },
        }),
        marker: (coords, opts) => ({
          bindPopup(box) {
            this.popup = box;
            return this;
          },
          addTo() {
            mapMarkers.push({ name: opts.title, popup: this.popup });
            return this;
          },
          getLatLng() {
            return coords;
          },
          openPopup() {
            openedMarkers.push(opts.title);
          },
        }),
      }
    : undefined;
  let currentTime = 0,
    nextTimerId = 0;
  const timers = new Map(),
    animationFrames = [];
  const setTimer = (callback, delay) => {
    const id = ++nextTimerId;
    timers.set(id, { callback, due: currentTime + Number(delay || 0) });
    return id;
  };
  const clearTimer = (id) => timers.delete(id);
  const advanceTime = (ms) => {
    const target = currentTime + ms;
    while (true) {
      const next = [...timers.entries()]
        .filter(([, timer]) => timer.due <= target)
        .sort((a, b) => a[1].due - b[1].due || a[0] - b[0])[0];
      if (!next) break;
      timers.delete(next[0]);
      currentTime = next[1].due;
      next[1].callback();
    }
    currentTime = target;
  };
  const advanceFrame = () => {
    const pendingFrames = animationFrames.splice(0);
    pendingFrames.forEach((callback) => callback());
  };
  const context = {
    window: {
      TRAVEL_DATA: options.data || D,
      TravelCore: require('../assets/core.js'),
      addEventListener: (type, cb) => (windowListeners[type] = cb),
      scrollTo() {},
      isSecureContext: true,
    },
    document,
    navigator: { onLine: true, ...options.navigator },
    location: { protocol: 'file:' },
    URL,
    requestAnimationFrame: (cb) => {
      if (options.deferAnimationFrames) animationFrames.push(cb);
      else cb();
    },
    setTimeout: setTimer,
    clearTimeout: clearTimer,
    console,
  };
  if (leaflet) {
    context.L = leaflet;
    context.window.L = leaflet;
  }
  vm.runInNewContext(fs.readFileSync('assets/app.js', 'utf8'), context);
  return {
    elements,
    mapMarkers,
    fits,
    mapOperations,
    openedMarkers,
    windowListeners,
    navigator: context.navigator,
    advanceTime,
    advanceFrame,
    clickView: (v) =>
      docListeners.click({
        target: {
          closest: (selector) =>
            selector === '[data-view]' ? nav.find((n) => n.dataset.view === v) : null,
        },
      }),
    clickDocument: (target) => docListeners.click({ target }),
  };
}
test('daily and nearby restaurant cards do not share hidden card IDs', () => {
  const h = harness();
  const daily = h.elements.get('day-restaurant-list').innerHTML;
  h.clickView('nearby');
  const nearby = h.elements.get('restaurant-list').innerHTML;
  const a = new Set([...daily.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const b = [...nearby.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(a.size > 0 && b.length > 0);
  assert.ok(
    b.every((id) => !a.has(id)),
    'map popup could resolve hidden card',
  );
});
test('full catalogue filtering and empty state are usable without map library', () => {
  const h = harness();
  h.clickView('nearby');
  assert.equal(
    h.elements.get('result-count').textContent,
    D.restaurants.filter(
      (r) => !['permanently-closed', 'temporarily-closed'].includes(r.operatingStatus),
    ).length + ' 間',
  );
  h.elements.get('diet-filter').value = 'vegan';
  h.elements.get('diet-filter').listeners.change();
  assert.ok(!h.elements.get('restaurant-list').innerHTML.includes('素食店・確認蛋奶'));
  h.elements.get('search-input').value = 'zzzzz不存在';
  h.elements.get('search-input').listeners.input();
  h.advanceTime(150);
  assert.equal(h.elements.get('result-count').textContent, '0 間');
  assert.match(h.elements.get('restaurant-list').innerHTML, /沒有找到餐廳/);
  assert.match(h.elements.get('map').innerHTML, /互動地圖未載入/);
});
test('five day buttons update plans and preserve cross-city reminder', () => {
  const h = harness();
  h.elements
    .get('day-tabs')
    .listeners.click({ target: { closest: () => ({ dataset: { day: '2' } }) } });
  assert.match(h.elements.get('day-notes').innerHTML, /不同城市/);
  assert.match(h.elements.get('itinerary-list').innerHTML, /美山聖地/);
});
test('Ba Na backup remains visible without pretending it has a precise nearby pin', () => {
  const data = structuredClone(D);
  const mountain = data.restaurants.find((r) => r.id === 'bana-ngoc-chi');
  mountain.lat = null;
  mountain.lng = null;
  const h = harness({ data });
  h.elements
    .get('day-tabs')
    .listeners.click({ target: { closest: () => ({ dataset: { day: '1' } }) } });
  h.elements.get('day-anchor').value = 'bana';
  h.elements.get('day-anchor').listeners.change();
  const list = h.elements.get('day-restaurant-list').innerHTML;
  assert.match(list, /Ngọc Chi/);
  assert.match(list, /尚無查證座標/);
});

test('GPS denial keeps a visible reference-location fallback', () => {
  const h = harness({
    navigator: { geolocation: { getCurrentPosition: (ok, fail) => fail({ code: 1 }) } },
  });
  h.elements.get('locate-btn').listeners.click();
  assert.match(h.elements.get('location-status').textContent, /未允許定位/);
  assert.equal(h.elements.get('locate-btn').disabled, false);
  assert.equal(
    h.elements.get('result-count').textContent,
    D.restaurants.filter(
      (r) => !['permanently-closed', 'temporarily-closed'].includes(r.operatingStatus),
    ).length + ' 間',
  );
});
test('GPS success orders from actual user position rather than selected hotel', () => {
  const h = harness({
    navigator: {
      geolocation: {
        getCurrentPosition: (ok) =>
          ok({ coords: { latitude: 16.0486741, longitude: 108.2477863, accuracy: 20 } }),
      },
    },
  });
  h.elements.get('locate-btn').listeners.click();
  assert.match(h.elements.get('location-status').textContent, /GPS 精度約 20/);
  assert.match(h.elements.get('restaurant-list').innerHTML.slice(0, 500), /Roots Plant-Based Cafe/);
  assert.equal(h.elements.get('reference-select').value, 'gps');
});
test('a pending nearby GPS request is inherited by the first exchange visit', () => {
  let resolve;
  const h = harness({ navigator: { geolocation: { getCurrentPosition: (ok) => (resolve = ok) } } });
  h.elements.get('locate-btn').listeners.click();
  h.clickView('exchange');
  assert.equal(h.elements.get('exchange-locate-btn').disabled, true);
  resolve({ coords: { latitude: 16.04, longitude: 108.24, accuracy: 12 } });
  assert.equal(h.elements.get('exchange-anchor').value, 'gps');
  assert.match(h.elements.get('exchange-list').innerHTML, /距你的定位/);
  assert.match(h.elements.get('location-status').textContent, /GPS 精度約 12/);
  assert.match(h.elements.get('exchange-location-status').textContent, /GPS 精度約 12/);
  assert.equal(h.elements.get('locate-btn').disabled, false);
  assert.equal(h.elements.get('exchange-locate-btn').disabled, false);
});
test('GPS completion during daily IME composition preserves text until compositionend', () => {
  let resolve;
  const h = harness({ navigator: { geolocation: { getCurrentPosition: (ok) => (resolve = ok) } } });
  h.clickView('nearby');
  h.elements.get('locate-btn').listeners.click();
  h.clickView('daily');
  const search = h.elements.get('day-search');
  search.listeners.compositionstart();
  search.value = 'zzzz不存在';
  search.listeners.input();
  resolve({ coords: { latitude: 16.04, longitude: 108.24, accuracy: 12 } });
  assert.equal(search.value, 'zzzz不存在');
  assert.doesNotMatch(h.elements.get('day-restaurant-list').innerHTML, /搜尋：zzzz不存在/);
  search.listeners.compositionend();
  h.advanceTime(150);
  assert.equal(h.elements.get('day-food-count').textContent, '0 間');
});
test('a manual exchange landmark cancels an in-flight nearby GPS request', () => {
  let resolve;
  const h = harness({ navigator: { geolocation: { getCurrentPosition: (ok) => (resolve = ok) } } });
  h.elements.get('locate-btn').listeners.click();
  h.clickView('exchange');
  h.elements.get('exchange-anchor').value = 'cathedral';
  h.elements.get('exchange-anchor').listeners.change();
  resolve({ coords: { latitude: 16.04, longitude: 108.24, accuracy: 12 } });
  assert.equal(h.elements.get('exchange-anchor').value, 'cathedral');
  assert.doesNotMatch(h.elements.get('exchange-location-status').textContent, /GPS 精度/);
  assert.equal(h.elements.get('locate-btn').disabled, false);
  assert.equal(h.elements.get('exchange-locate-btn').disabled, false);
});
test('a date change cancels an in-flight nearby GPS request before exchange can inherit it', () => {
  let resolve;
  const h = harness({ navigator: { geolocation: { getCurrentPosition: (ok) => (resolve = ok) } } });
  h.elements.get('locate-btn').listeners.click();
  h.clickView('exchange');
  h.elements.get('exchange-day').value = '1';
  h.elements.get('exchange-day').listeners.change();
  resolve({ coords: { latitude: 16.04, longitude: 108.24, accuracy: 12 } });
  assert.equal(h.elements.get('exchange-day').value, '1');
  assert.equal(h.elements.get('exchange-anchor').value, 'route');
  assert.equal(h.elements.get('reference-select').value, D.days[1].hotel);
  assert.doesNotMatch(h.elements.get('exchange-location-status').textContent, /GPS 精度/);
});
test('an explicit exchange route remains selected after a later nearby GPS request', () => {
  let resolve;
  const h = harness({ navigator: { geolocation: { getCurrentPosition: (ok) => (resolve = ok) } } });
  h.clickView('exchange');
  h.elements.get('exchange-anchor').value = 'route';
  h.elements.get('exchange-anchor').listeners.change();
  h.clickView('nearby');
  h.elements.get('locate-btn').listeners.click();
  resolve({ coords: { latitude: 16.04, longitude: 108.24, accuracy: 12 } });
  h.clickView('exchange');
  assert.equal(h.elements.get('exchange-anchor').value, 'route');
  assert.doesNotMatch(h.elements.get('exchange-location-status').textContent, /GPS 精度/);
});
test('day tab nodes keep their identity while date and GPS updates change their state', () => {
  let resolve;
  const h = harness({ navigator: { geolocation: { getCurrentPosition: (ok) => (resolve = ok) } } });
  const tabs = h.elements.get('day-tabs');
  const buttons = [...tabs.children];
  assert.equal(buttons.length, D.days.length);
  tabs.listeners.click({ target: { closest: () => buttons[1] } });
  assert.equal(tabs.children[1], buttons[1]);
  assert.equal(buttons[1].getAttribute('aria-pressed'), 'true');
  assert.equal(buttons[0].classList.contains('active'), false);
  h.elements.get('locate-btn').listeners.click();
  resolve({ coords: { latitude: 16.04, longitude: 108.24, accuracy: 12 } });
  assert.deepEqual([...tabs.children], buttons);
});
test('known Thursday and Friday closure is prominent in daily recommendations', () => {
  const h = harness();
  h.elements
    .get('day-tabs')
    .listeners.click({ target: { closest: () => ({ dataset: { day: '1' } }) } });
  const list = h.elements.get('day-restaurant-list').innerHTML;
  assert.match(list, /此日來源列為休息日/);
  assert.ok(list.indexOf('KURUMI Hoi An') < list.indexOf('The Seeds Plant-Based'));
});
test('late GPS success cannot give hidden nearby cards daily IDs', () => {
  let resolve;
  const h = harness({ navigator: { geolocation: { getCurrentPosition: (ok) => (resolve = ok) } } });
  h.elements.get('locate-btn').listeners.click();
  h.clickView('daily');
  resolve({ coords: { latitude: 16.0486741, longitude: 108.2477863, accuracy: 20 } });
  const daily = h.elements.get('day-restaurant-list').innerHTML;
  const nearby = h.elements.get('restaurant-list').innerHTML;
  const a = new Set([...daily.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  assert.ok([...nearby.matchAll(/\sid="([^"]+)"/g)].every((m) => !a.has(m[1])));
});
test('late GPS denial does not re-render hidden nearby cards under daily view', () => {
  let reject;
  const h = harness({
    navigator: { geolocation: { getCurrentPosition: (ok, fail) => (reject = fail) } },
  });
  h.elements.get('locate-btn').listeners.click();
  h.clickView('daily');
  const before = h.elements.get('restaurant-list').innerHTML;
  reject({ code: 1 });
  assert.ok(
    h.elements.get('restaurant-list').innerHTML === before,
    'hidden nearby list was unexpectedly re-rendered',
  );
});
test('closed restaurants never appear in daily recommendations but are readable in archive', () => {
  const data = structuredClone(D);
  const r = data.restaurants.find((r) => r.id === 'dn-roots');
  r.operatingStatus = 'permanently-closed';
  r.googleMapsUrl = 'https://www.google.com/maps?cid=123';
  r.googleLinkType = 'place';
  const h = harness({ data });
  assert.ok(!h.elements.get('day-restaurant-list').innerHTML.includes('card-daily-dn-roots'));
  h.clickView('nearby');
  const filter = h.elements.get('operating-filter');
  assert.ok(filter, 'operation archive filter exists');
  filter.value = 'closed';
  filter.listeners.change();
  assert.match(h.elements.get('restaurant-list').innerHTML, /永久歇業/);
  assert.ok(!h.elements.get('restaurant-list').innerHTML.includes('開始導航'));
});
test('closed restaurant map popups link to business details instead of old-address navigation', () => {
  for (const status of ['permanently-closed', 'temporarily-closed']) {
    const data = structuredClone(D),
      r = data.restaurants.find((r) => r.id === 'dn-roots');
    Object.assign(r, {
      operatingStatus: status,
      googleMapsUrl: 'https://www.google.com/maps?cid=123',
      googleLinkType: 'place',
    });
    const h = harness({ data, withMap: true });
    h.clickView('nearby');
    h.elements.get('operating-filter').value = 'closed';
    h.elements.get('operating-filter').listeners.change();
    const popup = h.mapMarkers.find((m) => m.name === r.name)?.popup;
    assert.ok(popup, 'closed archive retains historical marker');
    const links = popup.appended.filter((el) => el.href);
    assert.equal(links.length, 1);
    assert.equal(links[0].href, r.googleMapsUrl);
    assert.match(links[0].textContent, /Google 商家/);
    assert.ok(!links[0].textContent.includes('導航'));
  }
});
test('old-address navigation is held and Google mirror score never appears as live Google rating', () => {
  const data = structuredClone(D);
  const r = data.restaurants.find((r) => r.id === 'dn-roots');
  Object.assign(r, {
    navigationHold: true,
    operatingStatus: 'unverified',
    googleMapsUrl: 'https://www.google.com/maps?cid=123',
    googleLinkType: 'place',
    googleRating: 4.7,
    googleReviewCount: 3983,
    ratingSourceType: 'google-mirror',
    ratingSourceUrl: 'https://example.org/mirror',
    checkedDate: '2026-10-13',
    addressIssue: '原址有搬遷衝突，請先確認',
  });
  const h = harness({ data });
  h.clickView('nearby');
  const cards = h.elements.get('restaurant-list').innerHTML;
  const card = cards.match(/<article[^>]*id="card-nearby-dn-roots"[\s\S]*?<\/article>/)?.[0];
  assert.ok(card);
  assert.match(card, /轉載/);
  assert.match(card, /maps\?cid=123/);
  assert.ok(!card.includes('開始導航'));
  assert.match(card, /原址有搬遷衝突/);
});

test('date change through exchange resets daily anchor and nearby reference', () => {
  const h = harness();
  h.elements.get('day-anchor').value = 'lesands';
  h.elements.get('day-anchor').listeners.change();
  h.clickView('exchange');
  h.elements.get('exchange-day').value = '1';
  h.elements.get('exchange-day').listeners.change();
  h.clickView('daily');
  assert.equal(h.elements.get('day-anchor').value, 'route');
  h.clickView('nearby');
  assert.equal(h.elements.get('reference-select').value, 'sonhotel');
});
test('daily date change resets exchange anchor', () => {
  const h = harness();
  h.clickView('exchange');
  h.elements.get('exchange-anchor').value = 'lesands';
  h.elements.get('exchange-anchor').listeners.change();
  h.clickView('daily');
  h.elements
    .get('day-tabs')
    .listeners.click({ target: { closest: () => ({ dataset: { day: '1' } }) } });
  h.clickView('exchange');
  assert.equal(h.elements.get('exchange-anchor').value, 'route');
});
test('date change cancels a queued daily search without a late render', () => {
  const h = harness(),
    search = h.elements.get('day-search'),
    list = h.elements.get('day-restaurant-list');
  search.value = 'zzzz不存在';
  search.listeners.input();
  const initial = list.innerHTML;
  assert.ok(!initial.includes('搜尋：zzzz不存在'));
  h.elements
    .get('day-tabs')
    .listeners.click({ target: { closest: () => h.elements.get('day-tabs').children[1] } });
  assert.equal(search.value, '');
  const afterDateChange = list.innerHTML,
    writes = list.innerHTMLWrites;
  h.advanceTime(200);
  assert.equal(list.innerHTML, afterDateChange);
  assert.equal(list.innerHTMLWrites, writes);
});
test('manual reference selection wins over a pending GPS response', () => {
  let resolve;
  const h = harness({ navigator: { geolocation: { getCurrentPosition: (ok) => (resolve = ok) } } });
  h.elements.get('locate-btn').listeners.click();
  h.elements.get('reference-select').value = 'oldtown';
  h.elements.get('reference-select').listeners.change();
  resolve({ coords: { latitude: 16.04, longitude: 108.24, accuracy: 10 } });
  assert.equal(h.elements.get('reference-select').value, 'oldtown');
  assert.equal(h.elements.get('locate-btn').disabled, false);
  assert.ok(!h.elements.get('location-status').textContent.includes('GPS 精度'));
});
test('exchange GPS label resets after choosing a manual nearby reference', () => {
  const h = harness({
    navigator: {
      geolocation: {
        getCurrentPosition: (ok) =>
          ok({ coords: { latitude: 16.04, longitude: 108.24, accuracy: 10 } }),
      },
    },
  });
  h.elements.get('exchange-locate-btn').listeners.click();
  assert.match(h.elements.get('exchange-list').innerHTML, /距你的定位/);
  h.clickView('nearby');
  h.elements.get('reference-select').value = 'oldtown';
  h.elements.get('reference-select').listeners.change();
  h.clickView('exchange');
  assert.ok(!h.elements.get('exchange-list').innerHTML.includes('距你的定位'));
  assert.match(h.elements.get('exchange-location-status').textContent, /當天行程/);
});
test('exchange map popup exposes verified status and card access', () => {
  const h = harness({ withMap: true });
  h.clickView('exchange');
  const p = D.exchangePoints.find((r) => r.lat !== null),
    box = h.mapMarkers.find((m) => m.name === p.name).popup;
  assert.ok(box.appended.some((el) => el.textContent.includes(p.statusLabel)));
  assert.ok(box.appended.some((el) => el.textContent === '查看換匯點資訊'));
});

test('exchange single-landmark cards describe their actual distance origin', () => {
  const h = harness();
  h.clickView('exchange');
  h.elements.get('exchange-anchor').value = 'cathedral';
  h.elements.get('exchange-anchor').listeners.change();
  assert.ok(
    h.elements
      .get('exchange-list')
      .innerHTML.includes('距' + D.places.find((p) => p.id === 'cathedral').name),
  );
  assert.doesNotMatch(h.elements.get('exchange-list').innerHTML, /距行程最近/);
});
test('exchange GPS mode is selected explicitly and can switch back to the route', () => {
  const h = harness({
    navigator: {
      geolocation: {
        getCurrentPosition: (ok) =>
          ok({ coords: { latitude: 16.04, longitude: 108.24, accuracy: 10 } }),
      },
    },
  });
  h.elements.get('exchange-locate-btn').listeners.click();
  assert.equal(h.elements.get('exchange-anchor').value, 'gps');
  h.elements.get('exchange-anchor').value = 'route';
  h.elements.get('exchange-anchor').listeners.change();
  assert.doesNotMatch(h.elements.get('exchange-location-status').textContent, /GPS 精度/);
  h.elements.get('exchange-anchor').value = 'gps';
  h.elements.get('exchange-anchor').listeners.change();
  assert.match(h.elements.get('exchange-location-status').textContent, /GPS 精度/);
});
test('a chosen travel day wins over GPS before the first exchange visit', () => {
  const h = harness({
    navigator: {
      geolocation: {
        getCurrentPosition: (ok) =>
          ok({ coords: { latitude: 16.04, longitude: 108.24, accuracy: 10 } }),
      },
    },
  });
  h.elements.get('locate-btn').listeners.click();
  h.clickView('daily');
  h.elements
    .get('day-tabs')
    .listeners.click({ target: { closest: () => ({ dataset: { day: '1' } }) } });
  h.clickView('exchange');
  assert.equal(h.elements.get('exchange-anchor').value, 'route');
  assert.doesNotMatch(h.elements.get('exchange-location-status').textContent, /GPS 精度/);
});
test('GPS failure after changing travel days falls back to the new hotel', () => {
  let calls = 0;
  const h = harness({
    navigator: {
      geolocation: {
        getCurrentPosition: (ok, fail) =>
          ++calls === 1
            ? ok({ coords: { latitude: 16.04, longitude: 108.24, accuracy: 10 } })
            : fail({ code: 1 }),
      },
    },
  });
  h.elements.get('locate-btn').listeners.click();
  h.clickView('exchange');
  h.elements.get('exchange-day').value = '1';
  h.elements.get('exchange-day').listeners.change();
  h.elements.get('exchange-locate-btn').listeners.click();
  h.clickView('nearby');
  assert.equal(h.elements.get('reference-select').value, D.days[1].hotel);
});
test('exchange filters keep cards and map pins in sync and explain unlisted currencies', () => {
  const h = harness({ withMap: true });
  h.clickView('exchange');
  const before = h.fits.length;
  h.elements.get('exchange-currency').value = 'TWD';
  h.elements.get('exchange-currency').listeners.change();
  const expected = D.exchangePoints.filter((p) => p.currencies.includes('TWD'));
  assert.equal(h.elements.get('exchange-result-count').textContent, expected.length + ' 個');
  for (const p of D.exchangePoints)
    assert.equal(
      h.elements.get('exchange-list').innerHTML.includes('card-exchange-' + p.id),
      p.currencies.includes('TWD'),
    );
  assert.ok(
    h.mapMarkers.every(
      (m) => !D.exchangePoints.some((p) => p.name === m.name && !p.currencies.includes('TWD')),
    ),
  );
  assert.ok(h.fits.length > before, 'filtered map should refit');
  assert.match(h.elements.get('exchange-filter-note')?.textContent || '', /銀行層級/);
  h.elements.get('exchange-currency').value = 'unknown';
  h.elements.get('exchange-currency').listeners.change();
  assert.match(h.elements.get('exchange-list').innerHTML, /AEON/);
  assert.doesNotMatch(h.elements.get('exchange-list').innerHTML, /card-exchange-bidv/);
});
test('exchange map legends explain route landmarks and hotels', () => {
  const h = harness({ withMap: true });
  h.clickView('exchange');
  assert.equal(h.elements.get('legend-attraction').hidden, false);
  assert.equal(h.elements.get('legend-hotel').hidden, false);
  assert.equal(h.elements.get('legend-vegan').hidden, true);
});
test('an exchange point with coordinates is not blamed for an unlocated reference', () => {
  const data = structuredClone(D);
  data.places.find((p) => p.id === 'cathedral').lat = null;
  data.places.find((p) => p.id === 'cathedral').lng = null;
  const h = harness({ data });
  h.clickView('exchange');
  h.elements.get('exchange-anchor').value = 'cathedral';
  h.elements.get('exchange-anchor').listeners.change();
  const p = data.exchangePoints.find((p) => p.lat !== null),
    card = h.elements
      .get('exchange-list')
      .innerHTML.match(
        new RegExp('<article[^>]*id="card-exchange-' + p.id + '"[\\s\\S]*?<\\/article>'),
      )[0];
  assert.match(card, /參考位置沒有可靠座標/);
  assert.doesNotMatch(card, /尚無可靠座標，不參與距離排序/);
});
test('exchange cards show Taiwanese recommendation evidence without promising branch acceptance', () => {
  const h = harness();
  h.clickView('exchange');
  const list = h.elements.get('exchange-list').innerHTML;
  assert.match(list, /台灣旅遊業者推薦/);
  assert.match(list, /www.outo.co/);
  assert.match(list, /分行當日/);
  assert.match(list, /地址查核 2026-10-12/);
});

test('quick vegan action clears stale search and closed archive filters', () => {
  const h = harness();
  h.clickView('nearby');
  h.elements.get('search-input').value = 'zzzz';
  h.elements.get('operating-filter').value = 'closed';
  assert.ok(h.elements.get('quick-vegan'), 'quick vegan control');
  h.elements.get('quick-vegan').listeners.click();
  assert.equal(h.elements.get('search-input').value, '');
  assert.equal(h.elements.get('operating-filter').value, 'available');
  assert.equal(h.elements.get('diet-filter').value, 'vegan');
  assert.ok(!h.elements.get('restaurant-list').innerHTML.includes('素食店・確認蛋奶'));
});
test('choosing a daily anchor fits its nearby restaurants rather than whole cross-city route', () => {
  const h = harness({ withMap: true });
  h.elements
    .get('day-tabs')
    .listeners.click({ target: { closest: () => ({ dataset: { day: '1' } }) } });
  h.elements.get('day-anchor').value = 'bana';
  h.elements.get('day-anchor').listeners.change();
  const bounds = h.fits.at(-1);
  assert.ok(
    bounds.every((p) => p[1] < 108.1),
    'Hoi An must not dominate Ba Na focused map',
  );
});
test('nearby region filter fits visible restaurants', () => {
  const h = harness({ withMap: true });
  h.clickView('nearby');
  const before = h.fits.length;
  h.elements.get('area-filter').value = 'hoian';
  h.elements.get('area-filter').listeners.change();
  assert.ok(h.fits.length > before);
  assert.ok(
    h.fits.at(-1).every((p) => p[0] < 15.95),
    'Da Nang reference must not dominate Hoi An filtered map',
  );
});

test('daily meal plan follows date and exposes the Ba Na contingency', () => {
  const h = harness();
  assert.match(h.elements.get('meal-plan').innerHTML, /抵達後/);
  h.elements
    .get('day-tabs')
    .listeners.click({ target: { closest: () => ({ dataset: { day: '1' } }) } });
  const plan = h.elements.get('meal-plan').innerHTML;
  assert.match(plan, /禁止攜帶外食/);
  assert.match(plan, /縮短遊園/);
  assert.match(plan, /Chickpea/);
  assert.doesNotMatch(plan, /Emma/);
});

test('restoring network clears the old offline map notice', () => {
  const h = harness({ navigator: { onLine: false } });
  assert.equal(h.elements.get('map-message').hidden, false);
  h.navigator.onLine = true;
  h.windowListeners.online();
  assert.equal(h.elements.get('map-message').hidden, true);
});

function rangeFixture() {
  const data = structuredClone(D),
    o = data.places.find((p) => p.id === data.days[0].stops[0].id);
  const base = data.restaurants.find(
    (r) => r.diet === 'vegan' && r.operatingStatus === 'operating-evidence',
  );
  data.restaurants = [
    ...data.restaurants,
    { ...base, id: 'radius-8', name: '八公里測試店', lat: o.lat + 8 / 111.195, lng: o.lng },
    { ...base, id: 'radius-12', name: '十二公里測試店', lat: o.lat + 12 / 111.195, lng: o.lng },
  ];
  return { data, o };
}
test('daily radius defaults to 10 km and switches between 6 and 15 km', () => {
  const { data, o } = rangeFixture(),
    h = harness({ data });
  assert.ok(h.elements.has('day-radius'), 'daily radius control missing');
  h.elements.get('day-anchor').value = o.id;
  h.elements.get('day-anchor').listeners.change();
  assert.match(h.elements.get('day-restaurant-list').innerHTML, /八公里測試店/);
  assert.doesNotMatch(h.elements.get('day-restaurant-list').innerHTML, /十二公里測試店/);
  h.elements.get('day-radius').value = '6';
  h.elements.get('day-radius').listeners.change();
  assert.doesNotMatch(h.elements.get('day-restaurant-list').innerHTML, /八公里測試店/);
  h.elements.get('day-radius').value = '15';
  h.elements.get('day-radius').listeners.change();
  assert.match(h.elements.get('day-restaurant-list').innerHTML, /十二公里測試店/);
  assert.match(h.elements.get('day-restaurant-list').innerHTML, /15 km/);
});
test('daily search filters cards and map pins with a useful empty state', () => {
  const h = harness({ withMap: true });
  assert.ok(h.elements.has('day-search'), 'daily search missing');
  h.elements.get('day-search').value = 'kurumi';
  h.elements.get('day-search').listeners.input();
  h.advanceTime(150);
  assert.match(h.elements.get('day-restaurant-list').innerHTML, /KURUMI/);
  assert.ok(h.mapMarkers.filter((m) => m.name.includes('Roots')).length === 0);
  h.elements.get('day-search').value = 'zzzz不存在';
  h.elements.get('day-search').listeners.input();
  h.advanceTime(150);
  assert.equal(h.elements.get('day-food-count').textContent, '0 間');
  assert.match(h.elements.get('day-restaurant-list').innerHTML, /搜尋全清單/);
  h.elements.get('clear-day-search').listeners.click();
  assert.ok(!h.elements.get('day-food-count').textContent.startsWith('0 '));
});
test('daily search waits 150 ms for the latest input and clear cancels its pending paint', () => {
  const h = harness(),
    search = h.elements.get('day-search'),
    initial = h.elements.get('day-restaurant-list').innerHTML;
  search.value = 'kurumi';
  search.listeners.input();
  h.advanceTime(149);
  assert.equal(h.elements.get('day-restaurant-list').innerHTML, initial);
  search.value = 'zzzz不存在';
  search.listeners.input();
  h.advanceTime(149);
  assert.equal(h.elements.get('day-restaurant-list').innerHTML, initial);
  h.advanceTime(1);
  assert.equal(h.elements.get('day-food-count').textContent, '0 間');
  assert.match(h.elements.get('day-restaurant-list').innerHTML, /搜尋全清單/);
  h.elements.get('clear-day-search').listeners.click();
  const cleared = h.elements.get('day-restaurant-list').innerHTML;
  assert.ok(!h.elements.get('day-food-count').textContent.startsWith('0 '));
  h.advanceTime(500);
  assert.equal(h.elements.get('day-restaurant-list').innerHTML, cleared);
});
test('clearing nearby search applies immediately and cancels its previous timer', () => {
  const h = harness();
  h.clickView('nearby');
  const search = h.elements.get('search-input'),
    list = h.elements.get('restaurant-list');
  const initial = list.innerHTML;
  search.value = 'kurumi';
  search.listeners.input();
  assert.equal(list.innerHTML, initial);
  search.value = '';
  search.listeners.input();
  const cleared = list.innerHTML,
    writes = list.innerHTMLWrites;
  assert.equal(
    h.elements.get('result-count').textContent,
    D.restaurants.filter(
      (r) => !['permanently-closed', 'temporarily-closed'].includes(r.operatingStatus),
    ).length + ' 間',
  );
  h.advanceTime(500);
  assert.equal(list.innerHTML, cleared);
  assert.equal(list.innerHTMLWrites, writes);
});
test('nearby search does not paint during Chinese IME composition', () => {
  const h = harness();
  h.clickView('nearby');
  const initial = h.elements.get('restaurant-list').innerHTML,
    count = h.elements.get('result-count').textContent,
    search = h.elements.get('search-input');
  search.listeners.compositionstart?.();
  search.value = 'zzzz不存在';
  search.listeners.input();
  h.advanceTime(500);
  assert.equal(h.elements.get('restaurant-list').innerHTML, initial);
  assert.equal(h.elements.get('result-count').textContent, count);
  search.listeners.compositionend?.();
  h.advanceTime(149);
  assert.equal(h.elements.get('result-count').textContent, count);
  h.advanceTime(1);
  assert.equal(h.elements.get('result-count').textContent, '0 間');
});
test('filter changes apply the newest queued nearby query and suppress its old timer', () => {
  const h = harness();
  h.clickView('nearby');
  const search = h.elements.get('search-input'),
    list = h.elements.get('restaurant-list'),
    initial = list.innerHTML,
    writes = list.innerHTMLWrites;
  search.value = 'kurumi';
  search.listeners.input();
  assert.equal(list.innerHTML, initial);
  assert.equal(list.innerHTMLWrites, writes);
  h.advanceTime(149);
  assert.equal(list.innerHTML, initial);
  h.elements.get('area-filter').value = 'hoian';
  h.elements.get('area-filter').listeners.change();
  const filtered = list.innerHTML;
  assert.match(filtered, /KURUMI/);
  assert.ok(!filtered.includes('Roots Plant-Based Cafe'));
  const filteredWrites = list.innerHTMLWrites;
  h.advanceTime(150);
  assert.equal(list.innerHTML, filtered);
  assert.equal(list.innerHTMLWrites, filteredWrites);
});
test('switching pages cancels a nearby timer without repainting the hidden list', () => {
  const h = harness();
  h.clickView('nearby');
  const list = h.elements.get('restaurant-list'),
    initial = list.innerHTML,
    writes = list.innerHTMLWrites,
    search = h.elements.get('search-input');
  search.value = 'zzzz不存在';
  search.listeners.input();
  assert.equal(list.innerHTML, initial);
  assert.equal(list.innerHTMLWrites, writes);
  h.clickView('daily');
  h.advanceTime(200);
  assert.equal(list.innerHTML, initial);
  assert.equal(list.innerHTMLWrites, writes);
  h.clickView('nearby');
  assert.equal(h.elements.get('result-count').textContent, '0 間');
});
test('quick jump flushes the current search before scrolling within the page', () => {
  const h = harness();
  h.clickView('nearby');
  const search = h.elements.get('search-input'),
    list = h.elements.get('restaurant-list'),
    initial = list.innerHTML;
  search.value = 'zzzz不存在';
  search.listeners.input();
  assert.equal(list.innerHTML, initial);
  h.clickDocument({
    closest: (selector) => (selector === '[data-jump]' ? { dataset: { jump: 'map-panel' } } : null),
  });
  assert.equal(h.elements.get('result-count').textContent, '0 間');
  assert.match(list.innerHTML, /沒有找到餐廳/);
  const writes = list.innerHTMLWrites;
  h.advanceTime(200);
  assert.equal(list.innerHTMLWrites, writes);
});
test('map reset flushes the current daily search before redrawing the map', () => {
  const h = harness(),
    search = h.elements.get('day-search'),
    list = h.elements.get('day-restaurant-list'),
    initial = list.innerHTML;
  search.value = 'zzzz不存在';
  search.listeners.input();
  assert.equal(list.innerHTML, initial);
  h.elements.get('map-reset').listeners.click();
  assert.equal(h.elements.get('day-food-count').textContent, '0 間');
  assert.match(list.innerHTML, /搜尋全清單/);
  const writes = list.innerHTMLWrites;
  h.advanceTime(200);
  assert.equal(list.innerHTMLWrites, writes);
});
test('map card actions flush a queued search and explain when the item is filtered out', () => {
  const h = harness({ withMap: true });
  h.clickView('nearby');
  const list = h.elements.get('restaurant-list'),
    initial = list.innerHTML,
    writes = list.innerHTMLWrites,
    search = h.elements.get('search-input');
  search.value = 'zzzz不存在';
  search.listeners.input();
  assert.equal(list.innerHTML, initial);
  assert.equal(list.innerHTMLWrites, writes);
  const markerId = D.restaurants.find(
    (r) => r.lat !== null && r.lng !== null && !r.navigationHold,
  ).id;
  h.clickDocument({
    closest: (selector) => (selector === '[data-map-id]' ? { dataset: { mapId: markerId } } : null),
  });
  assert.equal(h.elements.get('result-count').textContent, '0 間');
  assert.match(h.elements.get('toast').textContent, /目前結果中/);
  const updatedWrites = list.innerHTMLWrites;
  h.advanceTime(200);
  assert.equal(list.innerHTMLWrites, updatedWrites);
});
test('a focused map card stays centered after the deferred map frame', () => {
  const h = harness({ withMap: true, deferAnimationFrames: true });
  h.advanceFrame();
  h.clickView('nearby');
  h.advanceFrame();
  h.mapOperations.length = 0;

  const target = D.restaurants.find((restaurant) => restaurant.id === 'dn-kurumi');
  const search = h.elements.get('search-input');
  search.value = 'kurumi';
  search.listeners.input();
  h.clickDocument({
    closest: (selector) =>
      selector === '[data-map-id]' ? { dataset: { mapId: target.id } } : null,
  });

  assert.match(h.elements.get('restaurant-list').innerHTML, new RegExp(`card-nearby-${target.id}`));
  const focus = h.mapOperations.filter((operation) => operation.type === 'setView').pop();
  assert.equal(focus.zoom, 16);
  assert.equal(focus.center[0], target.lat);
  assert.equal(focus.center[1], target.lng);
  assert.deepEqual(h.openedMarkers, [target.name]);

  h.advanceFrame();
  assert.equal(
    h.mapOperations.filter((operation) => operation.type === 'fitBounds').length,
    0,
    'the delayed auto-fit must not override a selected card focus',
  );
  assert.equal(h.mapOperations[h.mapOperations.length - 1], focus);
});
test('daily anchor and radius changes apply the current queued query and cancel its timer', () => {
  const h = harness(),
    search = h.elements.get('day-search'),
    list = h.elements.get('day-restaurant-list'),
    initial = list.innerHTML,
    writes = list.innerHTMLWrites;
  search.value = 'zzzz不存在';
  search.listeners.input();
  assert.equal(list.innerHTML, initial);
  assert.equal(list.innerHTMLWrites, writes);
  h.elements.get('day-anchor').value = D.days[0].stops[0].id;
  h.elements.get('day-anchor').listeners.change();
  assert.equal(h.elements.get('day-food-count').textContent, '0 間');
  const filtered = list.innerHTML,
    filteredWrites = list.innerHTMLWrites;
  h.advanceTime(200);
  assert.equal(list.innerHTML, filtered);
  assert.equal(list.innerHTMLWrites, filteredWrites);
  search.value = 'kurumi';
  search.listeners.input();
  assert.equal(list.innerHTML, filtered);
  h.elements.get('day-radius').value = '6';
  h.elements.get('day-radius').listeners.change();
  assert.match(list.innerHTML, /KURUMI/);
  const narrowed = list.innerHTML,
    narrowedWrites = list.innerHTMLWrites;
  h.advanceTime(200);
  assert.equal(list.innerHTML, narrowed);
  assert.equal(list.innerHTMLWrites, narrowedWrites);
});
test('clear and search-all work while IME composition is active', () => {
  const h = harness(),
    search = h.elements.get('day-search');
  const initial = h.elements.get('day-restaurant-list').innerHTML;
  search.listeners.compositionstart?.();
  search.value = 'zzzz不存在';
  search.listeners.input();
  h.advanceTime(300);
  assert.equal(h.elements.get('day-restaurant-list').innerHTML, initial);
  h.elements.get('clear-day-search').listeners.click();
  assert.equal(search.value, '');
  assert.ok(!h.elements.get('day-food-count').textContent.startsWith('0 '));
  search.listeners.compositionstart?.();
  search.value = 'loving hut';
  search.listeners.input();
  h.elements.get('search-all').listeners.click();
  assert.equal(h.elements.get('search-input').value, 'loving hut');
  assert.match(h.elements.get('restaurant-list').innerHTML, /Loving Hut/);
  const results = h.elements.get('restaurant-list').innerHTML;
  h.advanceTime(500);
  assert.equal(h.elements.get('restaurant-list').innerHTML, results);
});
test('daily full-catalogue search clears stale filters and day changes clear daily query', () => {
  const h = harness();
  assert.ok(h.elements.has('search-all'), 'search all missing');
  h.elements.get('day-search').value = 'loving hut';
  h.elements.get('day-search').listeners.input();
  h.elements.get('area-filter').value = 'hoian';
  h.elements.get('diet-filter').value = 'vegan';
  h.elements.get('operating-filter').value = 'closed';
  h.elements.get('search-all').listeners.click();
  assert.equal(h.elements.get('search-input').value, 'loving hut');
  assert.equal(h.elements.get('area-filter').value, 'all');
  assert.equal(h.elements.get('diet-filter').value, 'all');
  assert.equal(h.elements.get('operating-filter').value, 'available');
  assert.match(h.elements.get('restaurant-list').innerHTML, /Loving Hut/);
  h.advanceTime(500);
  h.clickView('daily');
  h.elements
    .get('day-tabs')
    .listeners.click({ target: { closest: () => ({ dataset: { day: '1' } }) } });
  assert.equal(h.elements.get('day-search').value, '');
});
