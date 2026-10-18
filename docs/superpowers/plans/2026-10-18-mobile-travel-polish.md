# Mobile Travel Polish Implementation Plan

**Goal:** 落實手機 UI／UX review 的修正與現地操作改善。

**Architecture:** 沿用 app.js 的 snapshot／restore 與 ux.js 的偏好、導覽機制。HTML 提供語意控制項，mobile.css 補充響應樣式，不增加執行相依套件。

**Tech Stack:** 原生 JavaScript、CSS、Leaflet、Playwright、Node。

## Constraints

- 飲食、營業、地址與巴拿山警告直接可見；不將牌告時間稱為即時營業。
- GPS 座標僅記憶體使用，URL 日期優先於舊 session。
- 商品生成區維持由原 JSON 生成，採買控制與佈局在 ux.js 實作。
- 按本計畫在目前工作區逐項完成；使用者已核准實作，不另要求確認，不部署。

## Tasks

- [x] 1. 在 `tests/browser/travel-polish.spec.cjs` 加重載恢復與首次地圖返回回歸測試。執行指定測試確認修正前失敗。
- [x] 2. 修改 `assets/ux.js` 保存非 GPS snapshot 與閱讀目標；初始化返回按鈕、地圖工具列對齊。重跑回歸測試。
- [x] 3. 在同一測試檔加入現在用餐、日期摘要、GPS 新鮮度、首筆導航與地圖餐廳切換驗收；確認缺少功能的失敗。
- [x] 4. 調整 `index.html`、`assets/app.js`、`assets/ux.js`、`assets/mobile.css`：精簡控制、提前導航、定位來源、用餐／住宿捷徑、地圖選擇與篩選完成入口。
- [x] 5. 加入補給篩選、點餐切換與離線對話框驗收，實作相應控制與響應版面。維持原越南文限制與完整說明。
- [x] 6. 執行新測試與既有 Node／瀏覽器測試；必要時調整因控制收合而改變的測試操作。格式、生成同步及差異檢查。
- [x] 7. 實看 320／390／430／852px 畫面，記錄首筆導航位置；更新 worker、README、ZIP 與交付記錄。確認檔案後交付。
