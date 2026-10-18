# 附近全素手機首頁 Implementation Plan

**Goal:** 新開首頁一鍵取得定位並依越南現在時間搜尋 3 km 內全素店，保留行程、明確路由、離線與返回店家。

**Architecture:** 沿用靜態 app／core／ux 模組。core 提供候選分組，app 管理現在附近狀態與定位，ux 管理預設路由、展開與顯示模式；不加入新套件。資料查核內容沿用目前工作目錄。

**Tech Stack:** Vanilla JavaScript、HTML、CSS、Leaflet、Node test、Playwright。

## Global Constraints

- 全素、五辛可接受；沒有結果也不自動放寬飲食要求。
- 營業僅依牌告推估，距離為直線；GPS 不寫入儲存。
- 保留現有未提交的 Grab 更新。
- 本機完成並同步交付 ZIP，發布另依既有授權。

## Task 1 — 搜尋與定位

- [x] 先加入候選分組與瀏覽器主流程測試，確認缺少功能而失敗。
- [x] `assets/core.js` 加入 `groupNearbyRestaurants(records, date, time)`，回傳 ready／confirm／other／unlocated，主要組須有座標、可導航、營運依據且在時段內。
- [x] `assets/app.js` 加入現在模式、3 km 預設、單一任務定位；處理等待、拒絕、逾時、低精度及地區外。保留重試與選地標。
- [x] 執行 `node --test tests/nearby-now.test.cjs` 及 `npm run test:browser -- tests/browser/nearby-now.spec.cjs`。

## Task 2 — 首頁與卡片

- [x] `index.html` 將主動作提前，搜尋與快捷收進可展開區；範圍控制保留前層。底部依附近、行程、點餐卡、補給、換匯排序。
- [x] `assets/app.js` 現在模式先顯示三間，其他候選、需確認、其他時段與無座標分開呈現；零結果保留全素並提供擴大範圍。
- [x] `assets/mobile.css` 加入手機任務介面及卡片樣式，保留必要警告、觸控大小與安全區。

## Task 3 — 狀態、路由與地圖

- [x] `assets/ux.js` 無明確路由時預設附近；明確路由與 session 返回優先。現在模式納入 snapshot，但不保存 GPS。
- [x] 定位或用餐時間過舊提供更新，不在返回時無聲重排。
- [x] 地圖列表模式不初始化；切地圖、行程地圖出現或從卡片開地圖才載入。
- [x] `manifest.webmanifest` 啟動網址沿用根目錄，使 session 返回與新進站都走同一規則。

## Task 4 — 檢查與交付

- [x] 舊測試明確進入原本要檢查的行程／規劃頁，新增測試專門檢查無路由首頁。
- [x] 執行 Node、Chrome、WebKit 手機／離線相關檢查與格式、語法及 diff 檢查，處理實際失敗。
- [x] 檢視 320／393／430 px、大字體及導航安全區，記錄模擬與實體裝置的限制。
- [x] sw.js 更新 v29，README 記錄行為，重建既有部署 ZIP。

完成紀錄：見 `docs/nearby-vegan-delivery-2026-10-18.md`。本次未建立提交或執行發布。
