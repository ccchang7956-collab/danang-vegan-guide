# Review Fixes Implementation Plan

**Goal:** 修正定位、跨頁還原及桌面空白地圖，減少收藏重繪，讓 CI 執行瀏覽器測試。

**Architecture:** 沿用 TravelCore、app 與 UX 分工；app 管理定位阻擋與結果，UX 管理閱讀還原、偏好及收藏按鈕，CSS 控制列表地圖呈現。

**Tech Stack:** 靜態 HTML/CSS/JavaScript、Leaflet、Node test runner、Playwright。

## Global Constraints

- 保留 GPS 不落盤、同頁閱讀還原、離線與既有資料查核語意。
- 僅更新本機專案與 ZIP；不推送或部署。
- 現有乾淨工作目錄原地實作，不自動提交。

## Tasks

- [x] 在 `tests/browser/review-fixes.spec.cjs` 加入 7 項定位跨篩選、跨頁網址、桌面列表／地圖及收藏保留 DOM 的回歸測試；同頁重載沿用現有案例。
- [x] 執行 `npm run test:browser -- tests/browser/review-fixes.spec.cjs`，舊版 6 項失敗、地標恢復案例通過；失敗原因對應 review。
- [x] 修改 `assets/app.js`、`assets/ux.js`、`assets/styles.css`：共用定位阻擋、按頁還原位置、全尺寸列表隱藏地圖、局部收藏更新。
- [x] 重跑新增測試與完整 `npm test`，7 項新增與 126 項 Node 測試通過。
- [x] 更新 `.github/workflows/checks.yml`，獨立 Chrome/WebKit matrix 安裝瀏覽器並執行 `npm run test:browser`。
- [x] 升級 `sw.js` 到 v31、更新 README 與交付記錄。
- [x] Chrome 93 項、WebKit 93 項、格式及生成同步檢查通過；獨立 code review 未發現需修正的重要問題。
- [x] 同步 ZIP，核對全部封裝檔案內容與 v31 版本；驗證結果記於 `docs/review-fixes-2026-10-19.md`。
