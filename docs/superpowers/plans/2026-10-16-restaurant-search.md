# Restaurant Search Implementation Plan

**Goal:** 完成已批准的五項餐廳搜尋改善。
**Architecture:** core.js 負責純函式搜尋、時段及距離；Python 生成已驗證的每週資料；app.js / ux.js 接現有控制項。
**Tech Stack:** 原生 JavaScript、Python、Leaflet、Node test、Playwright。

## Global Constraints

純靜態，無新執行相依；不新增未經證實的料理；不宣稱即時營業；GPS 不持久化；更新 sw 版本與 ZIP。

## Tasks

- [x] 新增核心測試：中文區域、全素語意、料理別名、時段跨日/午休/臨近打烊/衝突、半徑及無座標。先確認失敗。
- [x] core.js 新增 restaurantHours、vietnamNow、搜尋語意與 radius 參數；研究檔新增結構化時段警示；scripts/restaurant_metadata.py 嚴格解析每週表並驗證閉店日，接入 build-data.py。
- [x] index.html 加日期/時間/附近半徑、現在按鈕。app.js 將狀態接入卡片、排序及三餐入口。ux.js 同步摘要、可移除條件、重設、零結果解法；更新還原涵蓋所有新條件。
- [x] 新增瀏覽器整合測試：中文搜尋、時段警示、半徑、重設、三餐入口及 320px 不溢出。執行 npm test / npm run test:browser / npm run format:check，檢查失敗並修正。
- [x] 更新 README、交付報告、離線版本及部署 ZIP；檢查差異與資料可重建。
