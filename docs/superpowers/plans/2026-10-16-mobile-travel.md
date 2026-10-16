# Mobile Travel Implementation Plan

**Goal:** 改善手機找餐廳的效率，加入當日時段、可信菜單、三餐首選與備援並部署。
**Architecture:** 保持 core 純函式、Python 生成資料、app 負責呈現、ux 負責導航焦點與偏好。新增獨立 mobile.css 集中手機改版，保留現有 CSS 基礎。
**Tech Stack:** 原生 HTML/CSS/JavaScript、Python、Leaflet、Playwright。

## Tasks

- [ ] 查核正式 GitHub Pages、官方菜單與手機操作痛點（菜單研究與唯讀 UI 審查平行）。
- [ ] 核心新增 restaurantDayHours(p,date)；先寫當日表、午休、休息日、跨午夜與衝突的測試並確認失敗，再實作。
- [ ] 接入 restaurant-menus-2026-10-16.json，驗證 id 覆蓋、來源、正整數 VND 價格、全素證據；菜單查核與營業查核日期分開。
- [ ] 重排手機搜尋與卡片、原生 details 更多條件、精簡評分、所選日期時段、菜單預覽；新增三餐角色與站內看店入口。先寫整合測試再改版。
- [ ] 統一結果跳轉及鍵盤收合、地圖回列表與卡片、切頁焦點、觸控區與安全區。測試 320/393/430px、橫向、文字放大及鍵盤情境。
- [ ] Chrome 全回歸；如可安裝 WebKit，新增 WebKit 手機煙霧測試；獨立程式審查、手機截圖檢視。
- [ ] 更新 README、交付紀錄、離線版本及 ZIP；commit/push 既有 Pages 分支，正式網站核對版本、載入及離線更新；記錄實體 iPhone 尚需裝置驗收。
