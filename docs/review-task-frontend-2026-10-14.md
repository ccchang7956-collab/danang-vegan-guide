# Frontend Review Fixes — 2026-10-14

## Changes

- GPS progress, success, and error status now stay synchronized across Nearby and Exchange. The first Exchange visit can inherit an in-progress Nearby request; manual date or landmark choices cancel that request, and an explicitly selected manual Exchange route remains selected after a later Nearby locate.
- Day tab buttons are created once and keep their DOM identity. Renders update their active class and `aria-pressed` state in place.
- Daily and Nearby search use a 150 ms debounce. IME composition does not schedule result updates; clear and search-all use current text immediately. Filters, anchors, radius changes, navigation, quick jumps, and map actions cancel or flush pending work so results cannot remain stale or repaint a hidden page.
- Daily renders no longer overwrite the search input value, preserving composing text during independent updates such as GPS completion.
- Expanded `restaurantCard` and `exchangeCard` templates and formatted the four owned JavaScript files with Prettier. `assets/core.js` and `tests/core.test.cjs` received formatting only.

## Red/green evidence

- Before the implementation, `node --test --test-name-pattern='pending nearby GPS|day tab nodes' tests/ui.test.cjs` failed: a pending Nearby request did not select GPS on the first Exchange visit, and day tab children were replaced/absent in the harness.
- Before same-view search flushing, `node --test --test-name-pattern='quick jump flushes|map reset flushes|map card actions' tests/ui.test.cjs` failed: quick jump and map reset left the old results visible after the input had changed.
- Before the map focus fix, `node --test --test-name-pattern='focused map card' tests/ui.test.cjs` failed: the deferred `fitBounds` ran after `setView(..., 16)` and overrode the selected card view.
- After the fixes, both focused groups pass. Regression coverage also verifies date/anchor cancellation, explicit manual Exchange mode, day node identity, debounced latest input, clear and search-all, IME composition, filter/radius/anchor flush, page switches, map actions, and GPS completion during Daily composition.
- Map-card search flushes now render the updated markers without scheduling an auto-fit; a controlled-frame regression verifies the selected zoom and center survive the frame while its marker popup opens.

## Verification

- `node --test tests/ui.test.cjs tests/core.test.cjs` — 63 passed, 0 failed.
- `node --check assets/app.js && node --check assets/core.js && node --check tests/ui.test.cjs && node --check tests/core.test.cjs` — passed.
- `./node_modules/.bin/prettier --check assets/app.js assets/core.js tests/ui.test.cjs tests/core.test.cjs` — passed.
- `git diff --check -- assets/app.js assets/core.js tests/ui.test.cjs tests/core.test.cjs docs/review-task-frontend-2026-10-14.md` — passed.

The real-browser suite is being run by the browser tooling task; root will report its result during integration review.
