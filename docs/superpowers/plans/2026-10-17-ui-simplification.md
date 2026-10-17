# UI 資訊分層 Implementation Plan

> Execute inline using executing-plans; user approved design and implementation in this workspace.

**Goal:** 降低首屏密度、縮短店家比較路徑，保留全部功能和重要警告。
**Architecture:** index.html 調整閱讀順序；app.js 共用卡片與 Grab 切換；ux.js 管理呈現與收藏；現有 CSS 中整理相關規則。
**Tech Stack:** 靜態 HTML/CSS/JavaScript、Node test、Playwright Chrome/WebKit。

## Constraints
- 有 Grab 僅官方入口，條件交集，不將待確認解讀為沒有。
- 保留歇業、地址、飲食風險以及導航限制。
- 不提交或推送；在目前工作區交付。

## Tasks
- [x] 新增 tests/browser/simplification.spec.cjs：390px 預設餐廳卡在 760px 內、Grab 快捷切換與進階選項同步、收藏交集與重設、每日搜尋可展開、重要警告可見。執行 `npm run test:browser -- simplification`，確認預期失敗。
- [x] index.html 整併附近搜尋：搜尋／位置／距離、全素／Grab／收藏快捷、更多條件、結果工具。保留現有 ID，通用 Grab 說明移入更多條件。app.js 以 `grab-filter.dispatchEvent(new Event('change'))` 重用篩選；renderNearby 同步 aria-pressed。
- [x] app.js 卡片保留導航／官方 Grab／收藏；Google、電話、地圖與完整來源整合進 restaurant-details。來源與 Grab 使用一致的次層展開。ux.js 收藏加入主動作列，保留焦點還原。
- [x] index.html 每日路線前移；搜尋條件放入 daily-filters details，摘要保留在外。地圖維持單一實體和現有入口；將地圖排列在行程與搜尋後。更新 browser helper 與互動測試，讓測試先展開工具再操作。
- [x] 調整 styles.css/mobile.css 受影響規則：簡短頁首、緊湊搜尋結果列、統一卡片 disclosure；檢視換匯、補給與點餐既有收合，補足層級，保留必要警告。
- [x] 執行 `npm test`、`npm run test:browser`、WebKit 適用測試與 `npm run format:check`；擷取 320/390/768/1440px 頁面，檢查溢位、觸控與鍵盤。修正所有本次回歸。
- [x] 更新 sw.js 快取版本、README、改善報告與 ZIP；檢查 diff 和 ZIP 一致性後交付。
