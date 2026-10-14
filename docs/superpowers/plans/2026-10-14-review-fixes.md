# Review Fixes Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development and dispatching-parallel-agents to execute the file-isolated tasks below. The user requests Luna max implementation and root verification.

**Goal:** 修正定位與焦點問題，降低搜尋重繪，改善格式，加入真實瀏覽器與離線生命週期驗證。

**Architecture:** 維持目前靜態網站與資料。前端行為、worker 測試、瀏覽器開發工具可分檔平行實作，主代理整合、審查、驗證及封裝。

**Tech Stack:** Vanilla JS/CSS, Python data generator, Node tests, Playwright headless Chrome, Prettier (development only).

## Global Constraints

- 純靜態發布；無 runtime npm 相依或 API 金鑰。
- 不改寫研究資料或 GPS 隱私行為。
- 手動日期／地標選擇優先於舊定位回覆。
- 搜尋 debounce 為 150 ms，中文組字中不重繪，所有切頁／清除／篩選操作取消舊排程。
- 格式化排除 assets/data.js 與 assets/vendor。
- 使用者已授權全部修正；主代理負責驗證，不需再次設計批准。
- 分檔工作，代理不得修改其他任務的檔案；不提交、不推送、不部署。

### Task 1: Frontend behavior and regression tests (Luna max)

**Files:** assets/app.js, assets/core.js, tests/ui.test.cjs, tests/core.test.cjs (only if needed).

- [x] 先新增 delayed GPS 測試：nearby locate → 首次 exchange → callback 成功，exchange-anchor 應為 gps；日期／地標變更仍不被 callback 覆蓋。
- [x] 先新增 150 ms 可控制計時測試：連續 input 只在最終 deadline 更新，composition 中不更新，清除／切日／切頁不允許晚到 render。
- [x] 執行 `node --test tests/ui.test.cjs`，記錄原始失敗原因。
- [x] 統一定位的等待狀態与成功處理；維持手動選擇 cancellation。
- [x] 保留日期按鈕節點；以節點更新選取狀態，harness 只補真正需要的 DOM 方法。
- [x] 實作搜尋排程與取消；未按搜尋的日期／篩選立即生效，搜尋全清單直接使用目前輸入。
- [x] 同頁地圖／列表跳轉先套用 pending 搜尋，不得永久顯示與輸入框不同的結果；測試 map-reset 和 data-jump 的此情境。
- [x] 格式化自有 JS 與 UI 測試；執行回歸、語法檢查與 self-review，報告 root。

### Task 2: Worker lifecycle tests and CSS readability (Luna max)

**Files:** sw.js, tests/offline.test.cjs, assets/styles.css.

- [x] 重整 worker harness，使快取命中／未命中、fetch 成功／失敗、cache key 列表可注入；測試真正事件 promise 與 worker 呼叫順序。
- [x] 覆蓋 install addAll rejection 時不 skipWaiting、activate 不刪其他 scope 快取、cache miss online/offline、非 GET／來源／scope。
- [x] 只在測試揭露實際缺陷時修正 worker；版本更新 v12，其他網站／地圖不快取。
- [x] 格式化 sw.js、offline 測試及自有 CSS，不改變 CSS 語意。
- [x] 執行 `node --test tests/offline.test.cjs` 與語法檢查，提供測試結果與 self-review。

### Task 3: Real browser regression suite and formatting tooling (Luna max)

**Files:** package.json, package-lock.json, .gitignore, .prettierignore, prettier config if needed, playwright.config.cjs, tests/browser/* and browser test utilities.

- [x] 加入 Playwright 與 Prettier devDependencies；scripts 提供 Node tests、browser tests、format/check。
- [x] 使用獨立 browser context 與臨時 local HTTP server，不控制使用者正在使用的 Chrome。可用系統 headless Chrome；所有 test fixtures 放在 tests，禁止 production test hooks。
- [x] 先在舊 app 上重現真實 DOM 日期焦點遺失與 GPS 時序；然後等待 Task 1 修正再驗證。
- [x] 寫真實瀏覽器測試：鍵盤切日與 GPS callback 焦點保留、GPS pending跨頁、取消舊定位、中文組字、debounce清除與切頁、手機 viewport 無水平溢位與四入口、首次安裝／子目錄離線／worker新版／scope隔離。
- [x] 透過 test server 決定新版 fixture，驗證真实 worker 與 CacheStorage，避免只 mock handler。
- [x] 執行 browser tests，回報安裝或 sandbox 障礙給 root；保留截圖可供 root 視覺檢查。不得修改 app.js/sw.js/CSS/README/ZIP。

### Task 4: Root integration, review and delivery

- [x] 逐項審查代理 diff 與測試品質；修正任何新問題並重跑對應測試。
- [x] 執行全套 Node tests、browser tests、格式檢查、JS syntax、git diff --check。
- [x] 重新生成資料，比對研究與生成檔；檢查手機截圖。
- [x] 更新 README 與 docs/review-fixes-2026-10-14.md 的結果、命令與限制。
- [x] 重建 danang-vegan-github-pages.zip，排除 node_modules/測試結果/暫存；比對所有發布與源碼檔案。
- [x] 報告修正、測試數量與實測限制；不推送或部署。
