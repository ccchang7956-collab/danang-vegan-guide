# 換匯頁更新執行計畫

**Goal:** 更新可追溯的換匯推薦資料，修正定位、距離與地圖狀態問題。

**Architecture:** 沿用研究 JSON → Python 生成 data.js → app.js 渲染的資料流；清單維持 6 個據點。將幣別與距離挑選抽到 core.js 以直接驗證，不更動餐廳資料。

**Tech Stack:** 原生 JavaScript、Python、Leaflet 1.9.4、Node test。

## 工作清單

- [x] 閱讀現有資料與頁面、確認工作區、執行 50 項既有測試。
- [x] 補 UI／core／資料測試，先驗證 GPS 切回路線、日期覆蓋 GPS、單點距離文字、幣別未知語意與地圖篩選失敗。
- [x] 更新 research/exchange-points.json 的日期、推薦說明、官方／台灣推薦來源、個別地址查證日期；執行 python3 scripts/build-data.py。
- [x] 修正 assets/core.js 與 assets/app.js 的換匯選取、GPS 選單、距離標籤、來源呈現、圖例、篩選後視野。
- [x] 修改 index.html／assets/styles.css 的換匯說明、篩選提示、快速跳列表與手機布局；更新 sw.js 到 v11。
- [x] 執行 node --test tests/*.test.cjs、語法檢查、生成資料一致性檢查；交獨立 reviewer 檢查 diff，修正重要問題。
- [x] 更新 README 與 docs/exchange-review-2026-10-14.md；重建 danang-vegan-github-pages.zip，核對 ZIP 內容與工作區檔案完全相同。

## 驗收

只使用研究中的官方證據；未電話或現場確認不可宣稱即時營業／最佳匯率／每家分行都收台幣。定位只存在記憶體。測試確認選单、標籤、數值、圖釘與導航所指資料一致；列出無法實際瀏覽器／裝置驗證的限制。
