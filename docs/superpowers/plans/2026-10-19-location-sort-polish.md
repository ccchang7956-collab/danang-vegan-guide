# 定位與排序修正 Implementation Plan

> **For agentic workers:** Execute inline with test-driven-development and verification-before-completion. 使用者已授權完成修正與安排順序。

**Goal:** 修復跨頁 GPS 品質與排序語意，改善附近結果與換匯資訊呈現。

**Architecture:** `core.js` 提供共用定位品質與排序函式；`app.js` 處理列表與地圖狀態，`ux.js` 處理摘要。沿用現有資料、卡片與供餐分類。

**Tech Stack:** 原生 JavaScript、CSS、Node test、Playwright。

## Global Constraints

- GPS 僅存在記憶體；距中心 150 km、精度 1000 m 門檻不變。
- 保留手動地標、收藏、既有查詢與離線功能。
- 不新增套件，快取升 v32；只更新本機與 ZIP。

### Task 1: 共用定位有效性

**Files:** `assets/core.js`, `assets/app.js`, `index.html`, `tests/nearby-now.test.cjs`, `tests/browser/location-sort-polish.spec.cjs`。

- [x] 測試 `gpsLocationIssue({lat:16.05,lng:108.24},2500)` 回傳精度不足；台北座標回傳旅遊區外；正常定位回傳空字串；無效座標／精度不得有效。
- [x] 新增瀏覽器案例：附近取得不可靠 GPS → 換匯頁列表、摘要及地圖都顯示待更新且無圖釘；換匯直接定位亦同。手動行程與有效重新定位均可恢復。
- [x] 執行 `node --test tests/nearby-now.test.cjs` 與對應瀏覽器測試，確認缺少函式／錯誤距離造成失敗。
- [x] 實作共用 helper，換匯狀態、列表與地圖共用警告，加入「改用行程／地標」操作。
- [x] 重跑上述測試，確認通過。

### Task 2: 排序與時段分組

**Files:** `assets/core.js`, `assets/app.js`, `assets/ux.js`, `index.html`, `assets/mobile.css`, 同上測試。

- [x] 用近但時段外／遠但可用餐資料測試三種排序。測試全素優先與未知距離置後，不修改原資料。
- [x] 瀏覽器測試距離順序單調遞增、全素先於其他飲食、推薦模式顯示分組；切到距離不分時段組。
- [x] 測試舊 session 的 distance 與附近現在模式可還原推薦排序，新版明確距離排序可正常還原。
- [x] 先執行新增測試確認失敗，再實作 `sortNearbyRestaurants(records,{sort,date,time})`，改預設為 recommended，沿用 `groupNearbyRestaurants` 產生一般搜尋分組。
- [x] 重跑定向測試及 `npm test`。

### Task 3: 摘要與換匯提醒

**Files:** `assets/ux.js`, `assets/app.js`, `assets/mobile.css`, 同上瀏覽器測試。

- [x] 測試摘要日期只出現一次，清楚顯示有距離資料與位置待確認數量。
- [x] 測試換匯時段提醒不必展開來源即可閱讀，且排列於導航之前。
- [x] 先驗證新案例失敗，再修改摘要與卡片位置；檢視 320／393px 的換匯卡與分組畫面。

### Task 4: 完整驗證與交付

**Files:** `sw.js`, `README.md`, `docs/location-sort-polish-2026-10-19.md`, ZIP。

- [x] 執行 `npm test`、Chrome 與 WebKit 完整瀏覽器測試。
- [x] 執行 `npm run format:check`、`python3 scripts/supplies.py --check`、資料重建無變動、`git diff --check`。
- [x] 依 requesting-code-review 技能進行獨立唯讀 review，處理重要問題。
- [x] 升快取 v32、更新結果文件與 README、重建 ZIP 並驗證每個檔案與本機內容一致。

執行補充：獨立 review 後補齊 malformed GPS、手動換匯參考位置與 daily map 隔離測試；完整瀏覽器檢查發現首張導航遮擋，合併重複換匯提醒、精簡預設摘要並整合附近結果工具列後，兩項安全區測試與完整雙引擎測試通過。最終結果見 `docs/location-sort-polish-2026-10-19.md`。
