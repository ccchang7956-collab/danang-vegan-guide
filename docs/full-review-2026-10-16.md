# 全專案 Review — 2026-10-16

受審版本：`f5e435a1d403e02fe46890cf2d856e87f1716632`，正式站離線版本 v22。

這輪為檢視與驗證，沒有修改程式、研究資料或正式站；僅新增本報告。三位獨立審查分別負責功能邏輯、資料/來源、離線/生成/匯出，主審負責回歸與正式站核對。

## 結果

未在受測流程與抽查資料中發現 P1（阻斷核心使用）或已確認的重大飲食分類/分店錯誤。確認一項 P2 驗證缺口、兩項 P3 資料問題。這不代表所有店家旅行當日的營業或庫存都已確認。

### P2 — 正式站驗證腳本沒有核對來源/目標版本

位置：`scripts/verify-live.cjs:27–49`，輸出位於 `:41` 與 `:71`。

- prepare 只等待「有 active worker」，沒有核對 worker 是否 v20，卻固定輸出已準備 v20。
- verify 只檢查更新提示、mobile.css、店家及菜單行為，沒有斷言目標快取是 v22 或內容對應本次提交。
- 影響：未來重跑可能把另一版本的成功載入/離線當作指定版本升級驗證成功；這是測試可信度問題，不是已證實的網站更新故障。
- 建議：傳入明確來源/目標版本；在 activated 後核對作用域、快取鍵及關鍵檔案雜湊；以乾淨或指定快照設定測試來源狀態。輸出實際測得版本。
- 本輪補充核對：在隔離 Chrome 等 worker 完成 activated 後，正式站有 `danang-vegan:/danang-vegan-guide/:v22` 快取；sw.js、app.js、core.js、ux.js、data.js、mobile.css 的 SHA-256 均與受審工作區相同。因此目前正式站確實為受審版本。

### P3 — Handy 杯麵的成分摘要多寫了來源未列的乾燥豆腐

位置：`research/supermarket-supplies.json:12` 與 `index.html:101`。

- 網站聲稱配方含乾燥豆腐。
- [Acecook 官方商品頁](https://acecookvietnam.vn/product/mi-ly-handy-hao-hao/) 的素食綜合菇口味成分列出豆蛋白、乾燥蔬菜與菇粉，沒有列乾燥豆腐。
- 影響：成分摘要不精確。官方 `thuần chay`（全素）標示仍有依據，沒有因此推翻全素分類。
- 建議：刪除「乾燥豆腐」，或補充能支持該敘述的相同口味/規格包裝證據。HTML 與研究檔要同步。

### P3 — AEON 研究備註仍寫六款商品

位置：`research/supermarket-supplies.json:210`。

- 該研究檔已有 11 款商品，備註仍寫「上列六款」。目前網站的 AEON 卡片已使用不帶數量的泛稱，問題只在研究資料尚未同步。
- 影響：維護者依研究檔更新時可能重新帶回過期文字。
- 建議：改為「上述商品」，並補研究資料與頁面呈現的一致性檢查。

## 可選優化

1. **中文關鍵字切分** — `assets/core.js:43` 目前按空白切分。用 2026-10-23、可選店家條件重現：「會安全素早餐」0 筆，「會安 全素 早餐」4 筆。符合目前規格，屬搜尋體驗改善；可加入已知區域/飲食/餐別詞切分或顯示搜尋建議，不自動放寬全素條件。
2. **超市內容單一來源** — 商品研究 JSON 與 index.html 有重複文字，這次已出現資料漂移。可由研究檔生成產品卡，並檢查圖片路徑、商品數與來源欄位。
3. **持續整合** — 將 Node、格式、資料可重建、SW 資源存在與 ZIP 一致性檢查自動化；避免只依賴手動發布驗證。手機/離線整合測試可作發布前檢查。
4. **實體 iPhone 驗收** — 現有 WebKit 可涵蓋引擎行為，但不能替代真實鍵盤動畫、主畫面模式、現地 GPS 與跨 Google Maps 返回。

## 驗證紀錄

- `npm test`：99/99 通過。
- `npm run test:browser`：42/42 Chrome 通過。
- `PLAYWRIGHT_TEST_BROWSER=webkit ... mobile.spec.cjs offline.spec.cjs`：12/12 通過。
- 格式與 git diff 檢查通過；測試未修改產品碼。
- 將生成腳本/研究檔複製至 /tmp 重建，data.js 與受審版本 byte-identical。
- ZIP 內每個現有檔案與工作區一致；SW 全部預快取資源存在；第三方執行資源已隨站打包。
- 既有 CSV 與目前匯出函式只差 LF/CRLF，正規化後內容一致。
- 正式站快取及六個關鍵程式/資料檔案實際核對一致。

## 資料覆核範圍

內部檢查包含 46 筆餐廳/菜單 id、62 筆品項/分類、58 筆價格、週時段、休息日、行程日期、角色、來源與生成關係。

外部獨立抽查原始來源：

- KURUMI [峴港](https://kurumi.vn/en/menu?branch=danang) 與 [會安](https://kurumi.vn/en/locations/hoian/menu)：全部 16 筆價格、地址、分店差異相符。
- Chickpea 峴港/會安 PDF：核對分店與抽樣價格；[Mom Kitchen PDF](https://chickpeaeatery.com/wp-content/uploads/2023/06/MOMS-KITCHEN-BY-CHICKPEA-EATERY.pdf) 七筆價格相符。2023/2024 菜單年代已有保留。
- [Nourish](https://nourisheatery.com/menu/) 八筆 Vegan 標示/價格、[Phin An Bang](https://phincoffeehoian.com/location/phin-lounge-an-bang/) 四筆、[Peanuts 第五頁](https://peanuts-restaurant.com/images/English_5.jpg)/[第六頁](https://peanuts-restaurant.com/images/English_6.jpg) 四筆、[Rau Ơi](https://rauoieatery.com/menu/) 選定品項均相符。
- [PlantLab](https://plantlabfood.com/) 全素/時段/分類、[龍橋官方時刻](https://danangfantasticity.com/en/countdown-event/the-dragon-show)、[會安印象秀](https://hoianmemoriesland.com/en/performance-schedule) 沒有查到與既有安排矛盾的已確認資料。
- [AEON 授權換匯櫃檯](https://danangthanhkhe.aeonmall-vietnam.com/en/news/dich-vu-doi-ngoai-te-uy-nhiem-vietinbank-da-co-mat-tai-aeon-mall-da-nang-thanh-khe.html)、BIDV 官方幣別/現鈔說明、Choice L 官方零售成分與既有標示相符。

限制：沒有重新逐一開啟全部 46 家 Google Maps、致電店家/銀行、確認現場庫存或旅行當日開門。Bảo An 原始菜單及 Vietcombank 匯率來源本輪未能載入；10/23 燈籠活動未取得具日期的原始公告。這些列為未覆核，不能當作資料正確性的新增保證。

## 建議處理順序

先補正式站版本驗證斷言，再修兩個文字/研究資料錯誤，接著改善中文搜尋與超市單一來源。這輪沒有查到必須立即停止使用網站的問題。

## 後續處理

本報告列出的版本驗證、Handy 成分與 AEON 數量問題已於 v23 修正；中文連續搜尋及超市單一資料來源一併完成。改動與本機驗證見 [v23 優化紀錄](review-optimizations-2026-10-16.md)。以上審查內容保留當時狀態。
