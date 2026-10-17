/* Presentation and personal preferences. Precise location is never persisted. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const D = window.TRAVEL_DATA;
  if (!D) return;
  const key = 'danang-ux-v1';
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(key) || '{}') || {};
  } catch {
    /* Storage is optional. */
  }
  const favorites = new Set(
    Array.isArray(saved.favorites)
      ? saved.favorites.filter((id) => D.restaurants.some((r) => r.id === id))
      : [],
  );
  const shopping = new Set(
    Array.isArray(saved.shopping) ? saved.shopping.filter((id) => typeof id === 'string') : [],
  );
  const modes = {
    nearby: saved.modes?.nearby === 'map' ? 'map' : 'list',
    exchange: saved.modes?.exchange === 'map' ? 'map' : 'list',
  };
  let api,
    currentView = 'daily',
    currentDate = D.days[0].date,
    restoring = false,
    sameView = false;
  let updateAvailable = false;
  let onlyFavorites = saved.onlyFavorites === true,
    returnCard = null,
    imageTrigger = null,
    productName = '';
  const scrollPositions = {};
  const focusMemory = {};
  function persist() {
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          favorites: [...favorites],
          shopping: [...shopping],
          modes,
          onlyFavorites,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }
  function focusTarget(target) {
    if (!target) return;
    if (!target.matches('a[href],button,input,select,textarea,[tabindex]'))
      target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }
  function button(text, attributes, handler) {
    const el = document.createElement('button');
    el.type = 'button';
    el.textContent = text;
    el.className = 'secondary-button';
    for (const [name, value] of Object.entries(attributes)) el.setAttribute(name, value);
    el.addEventListener('click', handler);
    return el;
  }
  function setMode(mode) {
    if (!['nearby', 'exchange'].includes(currentView)) return;
    modes[currentView] = mode;
    const section = $('view-' + currentView);
    section.dataset.displayMode = mode;
    section
      .querySelectorAll('[data-display]')
      .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.display === mode)));
    persist();
    if (mode === 'map') window.dispatchEvent(new Event('resize'));
  }
  function showTarget(id) {
    if (!['nearby', 'exchange'].includes(currentView)) return;
    setMode(id === 'map-panel' ? 'map' : 'list');
  }
  function navigateTarget(id) {
    api.flush();
    const active = document.activeElement;
    if (active?.matches('input,textarea,select')) active.blur();
    showTarget(id);
    const targetId =
      id === 'restaurant-list'
        ? 'nearby-results-heading'
        : id === 'day-restaurant-list'
          ? 'daily-food-heading'
          : id === 'map-panel'
            ? 'map-heading'
            : id;
    const target = $(targetId);
    requestAnimationFrame(() => {
      focusTarget(target);
      target?.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
  }
  function decorateCards(view) {
    const list = $(view === 'daily' ? 'day-restaurant-list' : 'restaurant-list');
    if (!list) return;
    list.querySelectorAll('.restaurant-card').forEach((card) => {
      const id = card.id.replace('card-' + view + '-', '');
      if (card.querySelector('[data-favorite]')) return;
      const favorite = button(
        favorites.has(id) ? '♥ 已收藏' : '♡ 收藏',
        {
          'data-favorite': id,
          'aria-pressed': String(favorites.has(id)),
          'aria-label': `${favorites.has(id) ? '取消收藏' : '收藏'} ${D.restaurants.find((r) => r.id === id)?.name || ''}`,
        },
        () => {
          const adding = !favorites.has(id);
          adding ? favorites.add(id) : favorites.delete(id);
          const stored = persist();
          api.toast(
            stored
              ? adding
                ? '已收藏餐廳'
                : '已取消收藏'
              : '已記錄於本次瀏覽；瀏覽器無法儲存偏好。',
          );
          api.refresh();
          const replacement = $(card.id)?.querySelector('[data-favorite]');
          if (replacement) replacement.focus({ preventScroll: true });
          else {
            const summary = $(view === 'daily' ? 'day-search-summary' : 'nearby-search-summary');
            focusTarget(summary);
            summary.scrollIntoView({ block: 'nearest' });
          }
        },
      );
      card.querySelector('.card-actions')?.append(favorite);
    });
  }
  function filters() {
    const container = $('active-filters');
    container.replaceChildren();
    const labels = {
      'area-filter': '區域',
      'diet-filter': '飲食',
      'operating-filter': '營業查核',
      'grab-filter': 'Grab',
      'search-input': '搜尋',
      'nearby-radius': '直線範圍',
      'nearby-time': '用餐時間',
      'nearby-date': '用餐日期',
    };
    for (const id of Object.keys(labels)) {
      const control = $(id),
        value = control.value;
      const inactive =
        id === 'search-input' || id === 'nearby-time'
          ? !value.trim()
          : id === 'nearby-date'
            ? value === currentDate
            : value === (id === 'operating-filter' ? 'available' : 'all');
      if (inactive) continue;
      const text = ['search-input', 'nearby-date', 'nearby-time'].includes(id)
        ? value
        : control.selectedOptions[0]?.textContent;
      container.append(
        button(
          `${labels[id]}：${text} ×`,
          { 'data-remove-filter': id, 'aria-label': `移除${labels[id]}條件：${text}` },
          () => {
            control.value = ['search-input', 'nearby-time'].includes(id)
              ? ''
              : id === 'nearby-date'
                ? currentDate
                : id === 'operating-filter'
                  ? 'available'
                  : 'all';
            control.dispatchEvent(
              new Event(id === 'search-input' ? 'input' : 'change', { bubbles: true }),
            );
            api.flush();
            focusTarget($('nearby-search-summary'));
          },
        ),
      );
    }
    const extraCount =
      ['area-filter', 'diet-filter', 'grab-filter'].filter((id) => $(id).value !== 'all').length +
      Number($('operating-filter').value !== 'available') +
      Number(!!$('nearby-time').value) +
      Number($('nearby-date').value !== currentDate);
    $('more-filter-count').textContent = extraCount ? `（${extraCount} 項）` : '';
  }
  function updated(state) {
    const count = state.items.length;
    if (state.view === 'daily') {
      const anchor =
        state.dayAnchor === 'route'
          ? '整天行程'
          : D.places.find((p) => p.id === state.dayAnchor)?.name;
      const dailyTime = $('day-time').value;
      $('day-search-summary').textContent =
        `找到 ${count} 間 · ${state.day.shortDate} · ${anchor} ${state.dayRadius} km 範圍（含無座標備選）${dailyTime ? ` · ${dailyTime} 依牌告時段排序` : ''}`;
      decorateCards('daily');
    }
    if (state.view === 'nearby') {
      const unknown = state.items.filter((r) => r.distance === null).length;
      $('nearby-search-summary').textContent =
        `找到 ${count} 間 · 距離以${state.reference || '所選地標'}為準 · ${$('nearby-sort').selectedOptions[0]?.textContent || '距離優先'}，營業待確認排後${onlyFavorites ? ' · 只看收藏' : ''}${state.radius && state.radius !== 'all' ? ` · ${state.radius} km 內 ${count - unknown} 間` : ''}${unknown ? ` · 另含距離未確認 ${unknown} 間` : ''}${state.plannedTime ? ` · ${state.plannedDate} ${state.plannedTime} 依牌告時段優先` : ''}`;
      $('favorites-only').setAttribute('aria-pressed', String(onlyFavorites));
      $('favorites-only').textContent = `♥ 只看收藏（${favorites.size}）`;
      document
        .querySelector('[data-recover="radius"]')
        ?.toggleAttribute('hidden', state.radius === 'all');
      filters();
      decorateCards('nearby');
      document
        .querySelector('[data-recover="favorites"]')
        ?.toggleAttribute('hidden', !onlyFavorites);
    }
    if (state.view === 'exchange') {
      $('exchange-search-summary').textContent =
        `找到 ${count} 個據點 · ${$('exchange-currency').selectedOptions[0]?.textContent || '全部幣別'} · 分行受理請先確認`;
    }
  }
  function routeHash() {
    return '#' + currentView + '?day=' + currentDate;
  }
  function writeRoute(replace = false) {
    if (restoring) return;
    if (location.hash === routeHash()) return;
    history[replace ? 'replaceState' : 'pushState'](null, '', routeHash());
  }
  function beforeView(next) {
    scrollPositions[currentView] = window.scrollY;
    const remembered = $(focusMemory[currentView]);
    const box = remembered?.getBoundingClientRect();
    if (box && (box.bottom <= 0 || box.top >= innerHeight)) {
      const visibleCard = [
        ...document.querySelectorAll('#view-' + currentView + ' .restaurant-card'),
      ].find((card) => {
        const r = card.getBoundingClientRect();
        return r.top < innerHeight && r.bottom > 0;
      });
      if (visibleCard) focusMemory[currentView] = visibleCard.id;
    }
    sameView = next === currentView;
    if (next !== currentView) {
      returnCard = null;
      if ($('return-to-card')) $('return-to-card').hidden = true;
    }
    currentView = next;
  }
  function afterView(view) {
    currentView = view;
    if (modes[view]) setMode(modes[view]);
    writeRoute();
    $('map-list-return').hidden = !['daily', 'nearby', 'exchange'].includes(view);
    const target = (!sameView && $(focusMemory[view])) || $('view-' + view).querySelector('h2');
    requestAnimationFrame(() => {
      focusTarget(target);
      window.scrollTo({ top: sameView ? 0 : scrollPositions[view] || 0, behavior: 'instant' });
    });
  }
  function dateChanged(date) {
    currentDate = date;
    writeRoute();
  }
  function readRoute() {
    const match = location.hash.match(
      /^#(daily|nearby|exchange|supplies|phrase)(?:\?day=(\d{4}-\d{2}-\d{2}))?$/,
    );
    if (!match) return false;
    const index = D.days.findIndex((d) => d.date === match[2]);
    restoring = true;
    if (index >= 0 && currentDate !== match[2]) api.setDay(index);
    api.changeView(match[1]);
    restoring = false;
    writeRoute(true);
    return true;
  }
  function resetNearby() {
    $('search-input').value = '';
    api.resetNearbyExtras();
    for (const id of ['area-filter', 'diet-filter', 'operating-filter', 'grab-filter'])
      $(id).value = id === 'operating-filter' ? 'available' : 'all';
    onlyFavorites = false;
    persist();
    $('search-input').dispatchEvent(new Event('input', { bubbles: true }));
    api.flush();
    api.refresh();
  }
  function recover(action) {
    if (action === 'reset-nearby') resetNearby();
    if (action === 'clear-nearby') {
      $('search-input').value = '';
      $('search-input').dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (action === 'clear-daily') $('clear-day-search').click();
    if (action === 'expand-daily') {
      $('day-radius').value = '15';
      $('day-radius').dispatchEvent(new Event('change'));
    }
    if (action === 'radius') {
      $('nearby-radius').value = 'all';
      $('nearby-radius').dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (action === 'search-all') $('search-all').click();
    if (action === 'exchange') {
      $('exchange-currency').value = 'all';
      $('exchange-currency').dispatchEvent(new Event('change'));
    }
    if (action === 'favorites') {
      onlyFavorites = false;
      persist();
      api.refresh();
    }
    const target = $(
      currentView === 'daily'
        ? 'day-search-summary'
        : currentView === 'nearby'
          ? 'nearby-search-summary'
          : 'exchange-search-summary',
    );
    navigateTarget(target?.id || 'restaurant-list');
  }
  async function copy(text, success) {
    try {
      await navigator.clipboard.writeText(text);
      api.toast(success);
    } catch {
      api.toast('無法自動複製，請長按文字選取。');
    }
  }
  function supplies() {
    document.querySelectorAll('.supply-card[id]').forEach((card) => {
      if (!card.querySelector('.supply-photo')) return;
      const id = card.id;
      const terms = card.querySelector('.supply-vietnamese')?.textContent || '';
      const fullText = card.textContent;
      const details = document.createElement('details');
      details.className = 'supply-details';
      const summary = document.createElement('summary');
      summary.textContent = '成分與選購提醒';
      details.append(summary);
      card
        .querySelectorAll('.supply-ingredients, .note, .supply-availability')
        .forEach((p) => details.append(p));
      card.querySelector('.card-actions')?.before(details);
      const use = document.createElement('p');
      use.className = 'supply-use';
      use.textContent = /需要熱水|需準備碗與熱水/.test(fullText) ? '♨ 需熱水沖泡' : '✓ 可直接食用';
      card.querySelector('.supply-vietnamese')?.after(use);
      const label = document.createElement('label');
      label.className = 'shopping-check';
      const check = document.createElement('input');
      check.type = 'checkbox';
      check.dataset.shopping = id;
      check.checked = shopping.has(id);
      const text = document.createElement('span');
      text.textContent = '已買到';
      label.append(check, text);
      card.append(label);
      check.addEventListener('change', () => {
        check.checked ? shopping.add(id) : shopping.delete(id);
        card.classList.toggle('is-bought', check.checked);
        api.toast(
          persist()
            ? check.checked
              ? '已標記買到'
              : '已取消已買標記'
            : '已記錄於本次瀏覽；瀏覽器無法儲存偏好。',
        );
      });
      card.classList.toggle('is-bought', check.checked);
      card
        .querySelector('.card-actions')
        ?.prepend(button('複製越南文品名', {}, () => copy(terms, '越南文品名已複製')));
      const link = card.querySelector('.supply-photo a');
      if (link) {
        link.removeAttribute('target');
        link.setAttribute('aria-label', '放大' + card.querySelector('h4').textContent + '包裝圖片');
        link.addEventListener('click', (event) => {
          event.preventDefault();
          imageTrigger = link;
          productName = terms;
          $('product-image').src = link.getAttribute('href');
          $('product-image').alt = link.querySelector('img').alt;
          $('product-caption').textContent = terms + ' · 包裝參考，請核對現場品項';
          $('product-dialog').showModal();
        });
      }
    });
    $('close-product').addEventListener('click', () => $('product-dialog').close());
    $('product-dialog').addEventListener('close', () =>
      imageTrigger?.focus({ preventScroll: true }),
    );
    $('copy-product').addEventListener('click', () => copy(productName, '越南文品名已複製'));
  }
  function start(callbacks) {
    api = callbacks;
    $('reset-nearby').addEventListener('click', resetNearby);
    $('nearby-sort').addEventListener('change', () => {
      api.flush();
      api.refresh();
    });
    $('favorites-only').addEventListener('click', () => {
      api.flush();
      onlyFavorites = !onlyFavorites;
      persist();
      api.refresh();
    });
    document.addEventListener('click', (event) => {
      const control = event.target.closest('[data-display]');
      if (control) {
        api.flush();
        setMode(control.dataset.display);
        const target =
          control.dataset.display === 'map'
            ? $('map-panel')
            : $(
                currentView === 'daily'
                  ? 'day-restaurant-list'
                  : currentView === 'nearby'
                    ? 'restaurant-list'
                    : 'exchange-list',
              );
        navigateTarget(target.id);
      }
      const recovery = event.target.closest('[data-recover]');
      if (recovery) {
        recover(recovery.dataset.recover);
      }
    });
    for (const id of ['day-search', 'search-input']) {
      const input = $(id);
      input.insertAdjacentHTML(
        'afterend',
        '<span class="input-help">輸入即搜尋 · 按搜尋鍵查看結果</span>',
      );
      input.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' || event.isComposing) return;
        event.preventDefault();
        api.flush();
        input.blur();
        const target = $(id === 'day-search' ? 'day-restaurant-list' : 'restaurant-list');
        showTarget(target.id);
        navigateTarget(target.id);
        const count = $(id === 'day-search' ? 'day-food-count' : 'result-count').textContent;
        api.toast('搜尋結果：' + count);
      });
    }
    const returnButton = button('← 回到剛才的店家', { id: 'return-to-card' }, () => {
      if (!returnCard) return;
      navigateTarget(
        $(returnCard)
          ? returnCard
          : currentView === 'daily'
            ? 'day-restaurant-list'
            : currentView === 'nearby'
              ? 'restaurant-list'
              : 'exchange-list',
      );
      returnButton.hidden = true;
    });
    returnButton.hidden = true;
    $('map-panel').prepend(returnButton);
    $('map-list-return').addEventListener('click', () => {
      navigateTarget(
        returnCard && $(returnCard)
          ? returnCard
          : currentView === 'daily'
            ? 'day-restaurant-list'
            : currentView === 'nearby'
              ? 'restaurant-list'
              : 'exchange-list',
      );
      $('return-to-card').hidden = true;
    });
    document.addEventListener('focusin', (event) => {
      const section = event.target.closest('.view');
      if (section) {
        const card = event.target.closest('.restaurant-card');
        const id = card?.id || event.target.id;
        if (id) focusMemory[section.id.replace('view-', '')] = id;
      }
      updateKeyboard();
    });
    function updateKeyboard() {
      const editing = document.activeElement?.matches('input:not([type="checkbox"]),textarea');
      const reduced = window.visualViewport && window.visualViewport.height < innerHeight * 0.78;
      document.body.classList.toggle('keyboard-open', !!editing && !!reduced);
    }
    document.addEventListener('focusout', () => requestAnimationFrame(updateKeyboard));
    window.visualViewport?.addEventListener('resize', updateKeyboard);
    const nav = document.querySelector('.bottom-nav');
    if (window.ResizeObserver && nav)
      new ResizeObserver(() => {
        document.documentElement.style.setProperty(
          '--nav-height',
          nav.getBoundingClientRect().height + 'px',
        );
      }).observe(nav);
    $('reload-update').addEventListener('click', () => {
      try {
        sessionStorage.setItem('danang-search-restore', JSON.stringify(api.snapshot()));
      } catch {
        /* Reload still works. */
      }
      location.reload();
    });
    $('dismiss-update').addEventListener('click', () => {
      $('update-banner').hidden = true;
      $('network-status').textContent = '新版已備妥 · 點此更新';
    });
    $('network-status').setAttribute('tabindex', '0');
    $('network-status').setAttribute('role', 'button');
    const showOfflineInfo = () => {
      if (updateAvailable) {
        $('update-banner').hidden = false;
        focusTarget($('update-banner'));
        return;
      }
      api.toast('行程、店家與點餐卡可離線閱讀；地圖及導航需網路。可用瀏覽器分享選單加入主畫面。');
    };
    $('network-status').addEventListener('click', showOfflineInfo);
    $('network-status').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        showOfflineInfo();
      }
    });
    window.addEventListener('popstate', readRoute);
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    supplies();
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const todayIndex = D.days.findIndex((d) => d.date === today);
    if (todayIndex >= 0) {
      $('today-button').hidden = false;
      $('today-button').addEventListener('click', () => api.setDay(todayIndex));
    }
    if (!readRoute()) {
      restoring = true;
      if (todayIndex >= 0) api.setDay(todayIndex);
      restoring = false;
      writeRoute(true);
    }
    try {
      const restore = JSON.parse(sessionStorage.getItem('danang-search-restore') || 'null');
      if (restore && typeof restore === 'object') {
        api.restore(restore);
        sessionStorage.removeItem('danang-search-restore');
      }
    } catch {
      /* Invalid or unavailable session storage is harmless. */
    }
    api.refresh();
    for (const view of ['nearby', 'exchange']) $('view-' + view).dataset.displayMode = modes[view];
  }
  window.TravelUX = {
    start,
    updated,
    beforeView,
    afterView,
    dateChanged,
    showTarget,
    navigateTarget,
    focusTarget,
    includeRestaurant: (id) => !onlyFavorites || favorites.has(id),
    hasUpdate: () => updateAvailable,
    clearFavoritesFilter: () => {
      onlyFavorites = false;
      persist();
    },
    updateReady: () => {
      updateAvailable = true;
      $('network-status').textContent = '新版已備妥 · 點此更新';
      $('update-banner').hidden = false;
    },
    mapFromCard: (id) => {
      returnCard = id;
      showTarget('map-panel');
      $('return-to-card').hidden = !id;
    },
  };
})();
