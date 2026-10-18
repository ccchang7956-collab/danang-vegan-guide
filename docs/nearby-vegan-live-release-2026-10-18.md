# 附近全素正式發布與升級驗證

日期：2026-10-18。正式網址：https://ccchang7956-collab.github.io/danang-vegan-guide/ 。

## 發布過程與修正

1. 發布前確認正式站為 v27，遠端 main 與本機基準 `f72075b` 相同，並以隔離 Chrome 保存真實來源版本、runtime、scope、快取與測試收藏證據。見 `releases/v27-v29-source-proof.json`。
2. 以 `b66480f` 發布附近全素 v29；GitHub Project checks 與 Pages 均成功。全新 WebKit 的正式站資產、快取與離線驗證通過。
3. v27 → v29 的 Chrome 升級檢查抓到快取完整性失敗：cache 名稱為 v29，但 `index.html` 的 SHA256 仍等於 v27 的 `f72075b`。未將此失敗宣稱為升級通過。完整雜湊見 `releases/v27-v29-cache-failure.json`。
4. 根因以真正可快取的 HTTP 回應重現：service worker 安裝使用預設請求時，會沿用尚未過期的瀏覽器 HTTP 快取。v30 安裝改用 canonical URL 的 `Request({cache: 'reload'})`，重新下載並更新 HTTP 快取，再完成離線快取與啟用。這個選項的行為見 [MDN Request.cache](https://developer.mozilla.org/en-US/docs/Web/API/Request/cache)。
5. 新增 Node 與真實瀏覽器回歸；舊程式下測試確實取得 browser-v1 HTML，修正後取得 browser-v2。Chrome 與 WebKit 各三項離線／升級測試通過。Node 全部 126 項、格式、生成同步與 diff 檢查通過。
6. 以 `3b43da9` 發布 v30。保留最初從 v27 升級而出現舊首頁的隔離 Chrome profile，再於 v29 尚在線時取得真實 v29 → v30 證據，供同一份舊狀態的修復驗證；不是重新建立全新 profile 冒充舊版升級。見 `releases/v29-v30-source-proof.json`。

## 正式站驗證

應用發布提交：`3b43da9`。GitHub [Project checks](https://github.com/ccchang7956-collab/danang-vegan-guide/actions/runs/39133794287) 與 [Pages 部署](https://github.com/ccchang7956-collab/danang-vegan-guide/actions/runs/39133794315) 均成功。

| 正式站檢查 | 結果 |
| --- | --- |
| `npm run verify:live -- verify --from v29 --to v30` | 通過；沿用最初 v27 的瀏覽器狀態，確認修復、測試收藏保留與離線重開 |
| `npm run verify:live -- webkit --to v30` | 通過；全新 WebKit 正式站與離線流程 |

兩者均確認 active runtime／controller／scope、唯一 v30 應用 cache 與八項網路及快取資產 SHA256；搜尋、分店菜單、新分頁附近首頁、受控定位＋越南時間＋3 km、離線點餐卡均通過。測試收藏不涉及使用者日常瀏覽器資料。

實際結果與資產雜湊另記於 `releases/v30-live-verification.json`。v27 → v29 的失敗保留於紀錄；最終成功驗證為同一瀏覽器沿革的 v29 → v30 修復，不改寫為 v27 → v29 成功。

## 手機操作確認

以下仍需真實手機操作，不以桌機 WebKit 或受控座標代替：

- [ ] 連線開正式站；若看到新版提示，按重新載入。
- [ ] 點「找我附近的全素」並允許定位；人在台灣時顯示不在峴港／會安附近為正常結果。
- [ ] 人在台灣可改選飯店／景點，開 Google Maps 或 Grab，再返回網站確認原店家。
- [ ] 等頁首顯示「離線可讀」後，開飛航模式重新載入，確認店家、行程與點餐卡可讀；外部地圖與 Grab 仍需網路。

未取得使用者實機回報前，上述項目保持待確認。越南現地 GPS、戶外弱網與實際 App 交接無法由自動化驗證保證。
