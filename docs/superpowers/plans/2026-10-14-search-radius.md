# 每日餐廳搜尋與範圍實作計畫

**Goal:** 收錄 Loving Hut，讓每日餐廳範圍可調整及搜尋。

**Architecture:** 沿用 TravelCore 的純函式搜尋與 app.js 狀態。保留舊資料的直接 Google 覆核流程，新增獨立且標示來源種類的餐廳資料。

**Tech Stack:** HTML、CSS、JavaScript、Leaflet、Python 資料建置、Node tests。

- [x] 在 tests/core.test.cjs 寫多關鍵字／聲調搜尋測試，確認失敗後新增 matchesRestaurant 並由 selectRestaurants 共用。
- [x] 在 tests/ui.test.cjs 寫預設 10 km、6／15 km、每日搜尋與零結果、全清單跳轉及換日期清除測試；失敗後新增 index.html 的 day-radius、day-search、clear-day-search、search-all 按鈕與 app.js 控制流程。
- [x] 資料研究保存在 research/loving-hut-danang-addition.json；builder 依事實納入單筆來源，測試不同店家與資料分類、不偽造 Google 直接查核或座標。
- [x] 執行 python3 scripts/build-data.py、node --test tests/*.test.cjs，檢查手機控制項與離線版本；更新 README、ZIP 並逐檔比對。

本資料夾沒有 Git repository，交付工作區與 ZIP。使用者已要求直接處理；子代理負責研究，主代理整合、測試與交付。
