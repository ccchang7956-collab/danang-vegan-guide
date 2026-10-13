# 峴港全素旅行網頁 Implementation Plan

> **For agentic workers:** Use executing-plans to implement this plan task-by-task. Research is delegated to three independent agents; application work is integrated in this session. Steps use checkbox syntax for tracking.

**Goal:** Deliver a mobile static travel companion with five day maps, a broad researched vegan restaurant database and nearby GPS search.

**Architecture:** Buildless HTML, CSS, local JS and Leaflet 1.9.4. Data is curated JSON exposed by data.js; pure geographic/filter/navigation utilities are separately testable. GPS stays in memory and service worker caches only local assets.

**Tech Stack:** Browser JavaScript, Leaflet 1.9.4, Node built-in test runner, Python static HTTP server.

## Global Constraints

- Full vegan, alliums accepted; distinguish vegan, vegetarian options, mixed options and uncertainty.
- Relative paths work on GitHub Pages repository subdirectories.
- No mandatory API key, backend, npm install or build.
- Minimum body text 16px; primary touch targets 44px; iPhone safe area; zoom allowed.
- Distances are straight-line estimates; missing coordinates never become zero or valid nearest results.
- Sources and checked date on restaurant cards; hours never imply live opening status.
- No third-party tile prefetching or persistent GPS.
- User approved design and written specification. Git init is denied by workspace permissions; do not attempt escalation.

### Task 1: Geographic and filtering contract

**Files:** tests/core.test.cjs, assets/core.js
**Interfaces:** TravelCore.distanceKm(origin,place):number|null; selectRestaurants(records,{origin,area,diet,query}): decorated records; mapsUrl(place): HTTPS navigation URL; hasCoordinates(place):boolean.

- [ ] Write Node assertions for null coordinates, known one degree distance, vegan filtering, case/accent insensitive search, unknown-last ordering and address-safe Maps URL.
- [ ] Run `node --test tests/core.test.cjs`; verify failing missing contract.
- [ ] Implement UMD utility returning the contracts above, using haversine (6371 km), Unicode normalization, stable filtering, encoded address destination.
- [ ] Run same command and require all tests to pass.

### Task 2: Curated data and complete mobile interface

**Files:** index.html, assets/styles.css, assets/app.js, assets/data.js, assets/vendor/leaflet.js, assets/vendor/leaflet.css, assets/vendor/LICENSE, research/*.json
**Interfaces:** window.TRAVEL_DATA = {checkedDate,places,days,restaurants}; IDs unique; days reference place IDs.

- [ ] Review three research outputs, reconcile duplicate venues and recent relocations. Use verified coords where possible, explicit approximate markers for area POIs.
- [ ] Encode the five days and original flight/hotel notes exactly from design. Keep Oct23 Dragon Bridge as conflicting optional activity.
- [ ] Build semantic sections and buttons for days, nearby GPS/filter/search, map/list selection, visible distance references, restaurant source expansion and three-language full-screen ordering card.
- [ ] Style cream/forest, readable cards, date strip, responsive map/list, safe area bottom dock and keyboard focus.
- [ ] Vendor Leaflet pinned 1.9.4 with license. Draw numbered attractions, hotel icons, green vegan markers and amber conditional markers. Fit daily attractions, use nearby radius based on all day stops; offer Google Maps fallback.
- [ ] Handle permission-denied, unavailable and timeout GPS with reference location picker. Render zero-results and tile/library failures. Do not label restaurants currently open.
- [ ] Run syntax checks and data validation: each source is HTTPS, IDs unique, every daily place exists, every coordinate valid and sourced, classified records have notes.

### Task 3: Offline delivery and UX verification

**Files:** sw.js, manifest.webmanifest, assets/icon.svg, README.md, tests/data.test.cjs

- [ ] Add relative-scope local asset cache; do not cache cross-origin tiles. Explain first-load offline limitation in UI.
- [ ] Add PWA manifest/icons and add-to-home-screen instructions, deployment steps Settings → Pages → Deploy from branch → root.
- [ ] Serve with `python3 -m http.server 8080`, check HTTP readiness, open local browser for live QA.
- [ ] Verify day switching, nearby filters/search, map selection, GPS failure fallback, card enlargement, touch targets and no horizontal overflow at mobile widths. Verify standalone URLs at a repository subdirectory.
- [ ] Run `node --test tests/*.test.cjs` and JS syntax checks; record verification limits in README if browser/device capability missing.
- [ ] Return local entry link and deployment steps, with actual restaurant count and source limitations. No external publish without specified repository.
