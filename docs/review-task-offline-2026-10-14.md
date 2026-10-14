# Offline Worker Fixes

## Changes

- Bumped the app-shell cache version to `v12`.
- Reworked `tests/offline.test.cjs` around injectable CacheStorage, Cache, and fetch fakes. The tests capture lifecycle event promises and assert operation order.
- Added coverage for failed and successful installation, scoped cache cleanup and claim ordering, cache hits and misses, network failures, opportunistic write failures, query navigation, request filtering, and map tile exclusion.
- Fixed the worker so a successful network response remains usable when the optional `cache.put` fails.
- Expanded `sw.js`, the offline tests, and `assets/styles.css` for readability. The CSS changes add whitespace and indentation only.

## RED / GREEN Evidence

- **RED:** The initial expanded suite reported 3 passing and 7 failing tests. Six failures expected the required `v12` cache name while the worker still declared `v11`. The remaining failure reproduced the defect: a rejected cache write caused a successful network response to become a status-0 error response.
- **GREEN:** After the version bump and cache-write handling change, `node --test tests/offline.test.cjs` passed all 10 tests.
- `node --check sw.js` passed.
- `node --check tests/offline.test.cjs` passed.
- `node_modules/.bin/prettier --check sw.js assets/styles.css tests/offline.test.cjs --config prettier.config.cjs` passed.
- `assets/styles.css` exactly matches `Prettier.format(git show HEAD:assets/styles.css)` with the shared config, confirming the CSS formatting introduced no content changes.
- `git diff --check -- sw.js tests/offline.test.cjs assets/styles.css` passed.

## Self-Review and Limits

Request handling remains limited to same-origin `GET` requests inside the registered scope and exact app-shell URLs, with root and `index.html` navigations mapped to the cached index. External and unknown same-origin tile paths are ignored. Activation deletes only prior caches for the current scope and waits for deletion before claiming clients.

The worker tests run in Node with realistic fakes; they do not replace the separate real-browser lifecycle checks.
