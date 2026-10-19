# 定位與排序修正 v32 正式發布紀錄

正式網址：https://ccchang7956-collab.github.io/danang-vegan-guide/ 。發布日期：2026-10-19。

## 提交與部署

使用者已明確授權 commit、push 與部署。應用修正提交：`22e8803128eec04a8df28fac8b1787cd9e3dd9cb`（修正換匯定位與餐廳排序並優化手機操作）。遠端 `main` 在發布前與本機基準 `6f3b742` 一致；正式站實際為 v31。

GitHub Pages 採 `main` 根目錄自動發布。本次 [Pages 部署](https://github.com/ccchang7956-collab/danang-vegan-guide/actions/runs/39258645393) 與 [Project checks](https://github.com/ccchang7956-collab/danang-vegan-guide/actions/runs/39258646564) 均成功。遠端檢查包含 Node、格式、生成同步，以及獨立 Chrome／WebKit 瀏覽器工作。

## 正式站驗證

部署前，在 v31 仍在線時，執行 `npm run verify:live -- prepare --from v31 --to v32`，取得真實 active worker runtime、scope、唯一 v31 快取與測試收藏；來源證據保存於 [v31 → v32 source proof](releases/v31-v32-source-proof.json)。部署後沿用同一隔離 Chrome profile 升級，不以新 profile 冒充舊版升級。

| 檢查 | 結果 |
| --- | --- |
| Chrome v31 → v32 升級 | 通過，收藏保留、版本提示及離線重載正常 |
| 全新 WebKit v32 | 通過，搜尋、附近首頁及離線點餐卡正常 |
| Active worker／scope／cache | 與正式網址及 v32 一致 |
| 八項正式站資產 SHA256 | 與本機檔案一致，應用快取逐項比對通過 |
| 受控定位與越南時間 | 全素、3 km 查詢、GPS 不落盤通過 |

完整結果、資產雜湊與 Actions 證據見 [v32 正式站驗證 JSON](releases/v32-live-verification.json)。本機完整驗證為 130 項 Node、109 項 Chrome、109 項 WebKit；另見[修正交付記錄](location-sort-polish-2026-10-19.md)。

## 交付與限制

README、發布紀錄與 ZIP 隨紀錄提交同步，ZIP 逐檔核對本機內容。紀錄提交只更新文件與封裝，不更動已驗證的網站程式及 v32 快取版本。

實體手機、越南現地 GPS、戶外弱網與 Google Maps／Grab App 交接仍需實機確認。GPS 採受控模擬；WebKit 不等於實體 iPhone。既有店家營業資料未於本輪重新查核。
