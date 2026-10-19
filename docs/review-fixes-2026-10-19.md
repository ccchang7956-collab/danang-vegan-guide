# Review 修正與優化交付（本機 v31）

## 修正結果

1. 不可靠 GPS 的阻擋獨立於附近現在模式：GPS 精度超過 1000 m 或距峴港參考中心超過 150 km 時，附近列表不顯示候選，結果數與摘要顯示定位待更新，地圖清除圖釘並提示重新定位。修改時間、距離或飲食分類不會繞過檢查；手動地標與新定位均可恢復結果。
2. 明確開啟不同頁面的網址時，不套用前頁的閱讀店家、焦點與捲動距離。搜尋條件仍遵守既有日期規則；同頁重載、頁內返回與 GPS 不落盤的行為保留。
3. 手機與桌面列表模式都隱藏地圖，列表使用完整欄寬；地圖切換按鈕在桌面也可見，點擊後才初始化地圖，返回列表可收起。
4. 收藏改為同步同店卡片的按鈕、無障礙標籤與收藏數量。一般收藏不重建行程、店家卡片或地圖，保留詳情與焦點；收藏篩選啟用時仍更新附近結果與地圖，移除最後一間時將焦點移至摘要。
5. GitHub Actions 新增 Chrome／WebKit matrix，安裝各自瀏覽器並執行完整瀏覽器測試，失敗 trace／截圖保留七天。設定依 [Playwright CI 官方說明](https://playwright.dev/docs/ci-intro)，不新增網站執行時相依套件。

## 驗證證據

- 舊程式執行新增 7 項回歸案例：6 項因定位結果、跨頁捲動、桌面空白地圖與詳情收合失敗；手動地標恢復案例原本即通過。
- 修正版新增 7 項：全部通過。
- `npm test`：126 項通過，0 失敗。
- `npm run test:browser`：Chrome 93 項通過，0 失敗。
- `PLAYWRIGHT_TEST_PORT=4188 PLAYWRIGHT_TEST_BROWSER=webkit npm run test:browser -- --output=test-results/webkit`：WebKit 93 項通過，0 失敗。
- `npm run format:check`、workflow YAML 格式解析、三個改動 JavaScript 的語法檢查與 `git diff --check` 通過。
- `python3 scripts/supplies.py --check` 通過；重新執行資料生成後 `assets/data.js`、`index.html` 與原內容一致。
- 獨立唯讀 code review 未發現需修正的重要問題。
- ZIP 重新封裝完整專案，逐檔內容雜湊與本機檔案一致，排除 ZIP 本身及開發產物；快取版本 v31。

## 交付範圍

本機程式、文件、測試與 `danang-vegan-github-pages.zip` 已同步；未提交、推送或部署。GitHub Actions 的遠端執行尚未觸發，本輪已於本機分別跑完 Chrome 與 WebKit 的對應命令。

GPS 採受控模擬；WebKit 測試不等於實體 iPhone 驗證。這輪沒有重新查證店家營業或菜單資料。
