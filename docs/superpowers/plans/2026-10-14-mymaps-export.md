# My Maps Export Implementation Plan

**Goal:** 從網站下載全部餐廳的單一 Google My Maps CSV。

**Architecture:** `restaurantsCsv(records)` 在 TravelCore 產生內容；附近素食頁按鈕在點擊當下讀取全部 TRAVEL_DATA.restaurants 並下載 Blob。格式沿用已交付整合版。

**Tech Stack:** Vanilla JavaScript、Node test、Playwright；不增加依賴。

## Global Constraints

- UTF-8 無 BOM，英文標題列不加引號。
- 全部店家，不受篩選影響；保留 ID、來源、素食與營業不確定性。
- 定位選 Location，標題選 Name；日期檔名，單一 CSV。
- 本地下載，不上傳資料；維持既有離線功能。

## Task 1: CSV serializer

- [x] Create `tests/mymaps.test.cjs`, require TravelCore and load current data. Parse CSV independently to compare each record with source. Include quoted text, commas, embedded line breaks, empty coordinates, uncertain hours, and post-load record edits.
- [x] Run `node --test tests/mymaps.test.cjs`, expect missing `restaurantsCsv` failure.
- [x] Add `restaurantsCsv(records)` to `assets/core.js` and its returned API. Use the 21 columns in the spec, map categorical labels, retain source values and quote each data field with doubled interior quotes. Return `headers.join(',') + '\r\n' + rows.join('\r\n') + '\r\n'`.
- [x] Run the targeted test; expect all pass.

## Task 2: Download UI and lifecycle

- [x] Add `tests/browser/export.spec.cjs` using existing helpers, with service workers blocked. Open nearby page, apply a vegan filter, update one restaurant and append a record to TRAVEL_DATA, then wait for one download from export click. Confirm updated values, original closed records and final added record are in the file.
- [x] Run `npm run test:browser -- tests/browser/export.spec.cjs`, expect export button missing.
- [x] Add export button and import instructions after nearby filters in `index.html`, use existing secondary-button and small-note styles.
- [x] Add click listener in `assets/app.js`, create `new Blob([C.restaurantsCsv(D.restaurants)], {type: 'text/csv;charset=utf-8'})`, create Object URL, click a temporary download anchor named with local YYYY-MM-DD, remove it and revoke the URL after download begins. Use the existing toast for success and failure.
- [x] Bump worker version in `sw.js`. Update README with full-export, Location/Name choices and reimport matching ID instructions.
- [x] Run Node and browser suites, formatter, syntax and diff checks. Review browser screenshot at 393 × 852.
- [x] Request read-only code review, resolve material findings, rerun affected checks.

## Delivery

Report button location, how data updates flow into export and validation results. Leave external deployment to the existing project publishing workflow.
