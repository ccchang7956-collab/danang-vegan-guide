# Browser Review Fixes — 2026-10-14

## Changes

- Added pinned Playwright and Prettier development dependencies and `test`, `test:browser`, `format`, and `format:check` scripts. Formatting covers project-owned JavaScript and CSS while excluding generated `assets/data.js` and vendored files.
- Added a local test server with root and subdirectory mounts. Test-only endpoints change the served worker version, and the server stamps the served HTML shell with the same version so offline reloads can verify the actual cached shell contents.
- Configured isolated headless Chrome contexts. The runner uses `PLAYWRIGHT_CHROME_EXECUTABLE` when supplied, the installed macOS Chrome when present, and the Chrome channel otherwise. `PLAYWRIGHT_TEST_PORT` controls the server and browser URL together.
- Added real DOM coverage for date keyboard focus across GPS callbacks, a pending Nearby location applied on the first Exchange visit, manual landmark cancellation, 150 ms search debounce, IME composition, clear and cross-page search behavior, map-card selection during a pending search, and mobile navigation/card actions at 393 × 852.
- Added real service-worker and CacheStorage coverage for first install under `/trip/`, offline reload, worker update from `browser-v1` to `browser-v2`, cached shell version changes, and `/other/` scope cache preservation.
- Mobile runs save Daily, Nearby, Exchange, Phrase, Nearby card, and expanded Phrase dialog screenshots under ignored `test-results/` for visual review.

## Verification

- `node --check` passed for the Playwright configuration, Prettier configuration, browser server, helpers, and both browser spec files.
- Prettier check passed for the owned package/configuration and browser test files.
- The initial in-sandbox browser run could not bind the local test server (`listen EPERM` on `127.0.0.1:4173`). Browser execution was delegated to the root integrator, which completed the final run outside the sandbox as recorded below.

## Root integration result

- Root executed the final `npm run test:browser`: **12 passed, 0 failed**, including the real worker update and isolated scope cache tests.
- Root also intercepted app.js only in a temporary isolated browser run to serve the pre-fix source: both date-focus and first-Exchange pending-GPS regressions failed for their expected original reasons. The test file was restored byte-for-byte afterward; no legacy interception remains in the project.
- The clock is installed in UI `beforeEach` before navigation and vendor scripts. Tests pause it afterward, following the official `install → navigate → pauseAt` pattern. This avoids mixing Leaflet's captured native animation frame function with later fake timers.
- The pending-search map regression verifies final zoom 16, selected marker in map bounds, correct popup, settled autoPan and popup content within the map. The decorative popup border can touch an edge, so it is not used as the visibility contract.
- Root inspected the six mobile screenshots, including settled page-top Exchange/Phrase captures, a scrolled restaurant card, and the enlarged phrase dialog.
- Root's final `npm run format:check`, 14-file syntax check, and `git diff --check` passed.
- GPS and tile responses are test-controlled. Safari, physical iPhone, and physical GPS were not tested.

The suite uses a real Chrome browser and service worker. It intercepts only geolocation callbacks and OpenStreetMap tile requests; application rendering, worker lifecycle, and CacheStorage remain real.
