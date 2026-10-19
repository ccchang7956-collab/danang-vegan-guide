# 峴港・全素隨行

2026/10/21–10/25 的峴港與會安旅行指南。依使用者提供的行程截圖製作，飲食條件為全素、五辛可接受。

## 定位、排序與手機呈現修正（本機 v32）

換匯與附近餐廳共用定位品質檢查，精度不足、旅遊區外或無效定位時一致要求更新，列表與地圖不顯示誤導距離；可重新定位或改用行程／地標。手動換匯地標與每日行程地圖保留各自的參考位置。

排序新增明確的「供餐時段優先」預設，距離／全素優先依所選條件排列，舊版查詢會遷移保留原有語意。一般供餐優先搜尋新增時段分組，摘要區分有距離資料與位置待確認並消除重複日期。換匯服務時間放在導航前，結果工具列整合，手機首張導航通過額外底部安全區驗證。

驗證：130 項 Node、109 項 Chrome、109 項 WebKit 測試通過；格式、資料生成同步與 ZIP 逐檔一致性檢查通過。快取 v32，本機與 ZIP 已同步，尚未提交、推送或部署。詳見[修正與驗證紀錄](docs/location-sort-polish-2026-10-19.md)。

## Review 修正與優化（本機 v31）

定位精度不足或不在峴港／會安附近時，列表、結果摘要與地圖一致要求更新定位；修改時間或飲食篩選也不能繞過限制。指定不同頁面的網址從頁首開始，同頁重載仍還原閱讀位置。桌面與手機的列表模式均收起地圖，點地圖後才初始化。

收藏改為局部更新按鈕與數量，保留展開的店家詳情及既有行程、地圖；只看收藏時取消收藏仍會更新結果。CI 新增獨立 Chrome 與 WebKit 瀏覽器測試。快取版本 v31；本機修改尚未推送或部署，正式站發布紀錄仍見下方 v30。

驗證：126 項 Node、93 項 Chrome、93 項 WebKit 測試通過；包含新增 7 項回歸案例。格式、資料重建同步與 ZIP 內容一致性檢查通過。詳見 [本輪修正與驗證記錄](docs/review-fixes-2026-10-19.md)。

## 附近全素首頁（正式 v30）

手機新開首頁以「附近全素」開始。點「找我附近的全素」會取得定位，套用全素、越南現在日期／時間、3 km 範圍，清除先前關鍵字、Grab、收藏與區域限制。首次需允許瀏覽器定位；未取得位置時明示為飯店／景點附近預覽。

先呈現最多三間依牌告時段可用餐的候選，再展開其餘候選、即將結束／需確認、其他時段與無座標備選；沒有結果可擴大範圍，飲食條件不自動放寬。定位低精度或在旅遊區外時，列表與地圖都提示重新定位或改選地標。搜尋／收藏／Grab 可展開；底部依附近、行程、點餐卡、補給、換匯排列。

明確日期連結、既有搜尋與返回店家仍優先；GPS 不落盤，重載時必要可顯示「上次查看的店家」並提示更新位置確認距離。地圖按需載入。已發布至[正式網站](https://ccchang7956-collab.github.io/danang-vegan-guide/)，目前快取 v30，並修正更新時沿用舊 HTTP 快取的問題。正式站 Chrome 舊版升級、收藏保留、離線與全新 WebKit 驗證均通過；GPS 為受控模擬，實體手機與外部 App 交接仍待確認。見[正式發布紀錄](docs/nearby-vegan-live-release-2026-10-18.md)與[功能交付記錄](docs/nearby-vegan-delivery-2026-10-18.md)。下方 v28 以前保留當時開發紀錄。

## GrabFood 店家參與查核更新（本機 v28）

承接 2026-10-17 對 46 家素食店的逐店盤查，2026-10-18 補查新線索後的 GrabFood 上架證據：3 家有店家官網提供的分店入口、10 家有回報或搜尋索引線索、2 家僅舊資料、29 家待確認、2 家有歇業記錄。Tiệm Chay Xưa 與峴港 Bánh Mì Chay Lê Hội 新增 GrabFood 官方列表索引；Duyên Vegan & Coffee 有列明地址與 GrabFood 的店家介紹；Chay Hạnh Phúc 雖出現在 Grab 列表索引，但索引沒有地址；店家近期遷址，新址上架仍待確認。完整來源、各店查核日與限制見[逐店報告](research/restaurant-grab-2026-10-17.md)。網站離線快取更新為 v28。

## 手機現地操作新版（本機 v27）

依 2026-10-18 手機 review 完成操作優化：一般重載保存查詢與店家閱讀位置，網址指定日期優先；全素偏好與收藏保留，GPS 不落盤。定位顯示取得時間，超過五分鐘提示更新。「現在找吃的」帶入越南日期／時間與全素條件，仍依牌告推估供餐。

找餐廳與換匯頁將次要規劃條件收合，主要導航提前；390×844 手機預設首筆導航：餐廳約 691px、換匯約 683px，另驗證增加 34px 底部佔位仍可操作。每日新增住宿導航與用餐捷徑，三餐可個別展開；每日地圖先顯示行程與用餐首選，可切換其他餐廳。首次地圖返回與工具列跳轉已修正。

補給提供未買／已買、熱水／直接吃篩選及精簡商品卡；點餐卡提供原句分行，橫向完整說明可在畫面內閱讀。離線說明與外部連結提示改為可關閉面板。底部名稱統一，Grab 標籤改為「Grab 入口」，不代表即時接單。

驗證：123 項 Node、69 項 Chrome、31 項 WebKit 手機與離線測試通過；另有格式、生成同步與差異檢查。WebKit 不等於實體 iPhone，現地 GPS 與 App 交接仍需手機確認。

快取版本 v27；本機與 ZIP 更新，尚未推送或部署。詳見 [交付記錄](docs/mobile-travel-polish-2026-10-18.md) 與 [原始 review](docs/mobile-ui-ux-review-2026-10-18.md)。

## UI／UX 資訊分層新版（本機 v26）

每日頁先看行程路線，使用「用餐安排／找餐廳／查看地圖」捷徑；餐廳搜尋工具按需展開。找餐廳頁整併搜尋、位置與結果，新增「有 Grab」快捷，與全素、收藏和其他條件交集篩選。

店家卡直接保留飲食、時段、地址及重要警告，導航、官方 Grab 與收藏放在主要動作列；電話、Google、地圖與查核來源集中於「店家詳情」。換匯與補給也整理說明層級，點餐彈窗關閉時還原焦點。

390px 手機預設第一張餐廳卡從約 972px 提前至 618px；抽查同一卡片由約 637px 縮為 452px。快取 v26 與交付 ZIP 同步。本輪修改尚未 commit／push；詳見 [UI 優化交付記錄](docs/ui-simplification-2026-10-17.md)。

## Grab 外送查核（v25 加入）

46 家店都已加入 Grab 資訊：**3 家有官方分店入口、7 家有回報或索引線索、2 家僅舊資料、32 家待確認、2 家歇業記錄**。查核日為 2026-10-17；查核日期與證據日期分開顯示，沒有即時接單保證。

有官方 Grab 分店入口的店家會顯示綠色「有 Grab」標籤。每日與附近搜尋可直接輸入 `Grab`、`有 Grab`、`GrabFood`，也能組合如 `會安有grab全素`；此關鍵字只選官方入口店家。其他回報線索可用進階 Grab 篩選查看。

在「附近素食」展開更多條件，使用「Grab 外送查核」篩選。卡片可開啟官方入口，或在「店家詳情」展開「Grab 外送查核與搜尋」複製名稱，再到 Grab 核對分店地址。可從任何收件地點叫餐，不限定飯店。沒有足夠證據的標示待確認，不寫成沒有 Grab。

官方入口為 KURUMI 峴港、KURUMI 會安及 Peanuts；Peanuts 手機連結在桌機可能導向下載頁。Grab 商家頁本次有存取限制，未登入 App、未設定地址、未下單。配送範圍、價格與接單以 App 為準。

[完整逐店查核與來源](research/restaurant-grab-2026-10-17.md) · [交付與驗證記錄](docs/grab-improvements-2026-10-17.md)。Grab 功能已以 `40d1cb6` 推送；本輪 UI 優化的狀態見上方 v26 說明。

## 手機與搜尋新版（v23）

正式網址：<https://ccchang7956-collab.github.io/danang-vegan-guide/>。舊版使用者看到「新版資料已備妥」可按重新載入；收藏保留。下方歷史驗證紀錄中的「尚未推送」描述當時狀態。

手機搜尋已集中常用條件、收合更多篩選；卡片直接顯示所選日期時段與菜單參考，三餐明示首選與備援。11 店有官方支持的品項／分類、10 店有標價；舊版 PDF、不同分店與無法確認的資料分開標示。

v23 支援不加空白的中文組合搜尋，例如「會安全素早餐」；超市商品與門市由同一份 JSON 生成，修正 Handy 成分與 AEON 商品數說明。

驗證：119 項 Node、44 項 Chrome、14 項 WebKit 手機與離線測試全部通過；另有正式站升級檢查腳本。WebKit 不是實體 iPhone，現地 GPS 與真實鍵盤仍需裝置確認。詳見 [手機改版交付](docs/mobile-travel-improvements-2026-10-16.md) 與 [菜單查核](research/restaurant-menus-2026-10-16.md)。

## 開始使用

- **每日行程**：切換五天，查看景點、住宿與餐廳地圖。展開「搜尋這天的餐廳」，參考位置可切換整天或單一景點；直線範圍預設 10 km，可切換 6／10／15 km。每日搜尋框可搜尋店名、地址與料理，清除搜尋或把關鍵字帶到「搜尋全清單」。搜尋支援多個關鍵字，忽略越南文聲調與大小寫。「今天怎麼吃」可展開三餐與不同業者的備援，附 Google 商家按鈕。
- **附近素食**：點「使用定位」，允許定位後依直線距離排序。也可改選飯店／景點當參考位置，搜尋店名與地址，篩選區域或全素店。「只看全素」會保留關鍵字、區域與營業查核條件；「重設搜尋與篩選」可恢復全部可選店家。手機預設列表，可切換地圖並返回原卡片；結果區上方持續顯示結果數，支援可移除條件、距離／全素優先排序與本機收藏。營業查核位於「更多篩選」。目前可選 24 家全素店。
- **換匯所**：切換旅行日期或使用 GPS，查看附近銀行與已公告授權櫃檯，依 USD／TWD 官方幣別資料篩選，並以 Google Maps 導航。頁首提供可展開的換匯用途指引與列表／地圖切換；GPS 模式會出現在參考位置選單，可切回行程路線或單一地標。地圖只替可核對座標的點放圖釘；其他官方地址仍可開導航，不虛構距離。
- **超市補給**：11 款泡麵與零食，附越南文名稱、品牌全素／成分判讀標示、成分與選購提醒、商品參考連結；提供 LOTTE、AEON、WinMart 官方據點與越南文包裝速查。商品文字與11 款包裝圖片可離線；可點圖片在站內放大、複製越南文品名，並勾選「已買到」，外部來源與導航需連線；未確認峴港分店庫存。研究資料見 `research/supermarket-supplies.json`。
- **全素點餐卡**：越南文、英文與繁體中文，進入頁面即可放大給店員看或複製越南文；英文與中文對照可展開。
- 餐廳卡片可直接導航；在「店家詳情」查看地圖、打電話及展開來源。
- **Google 我的地圖匯出**：在「附近素食」展開「資料查核與 Google 我的地圖匯出」，按「匯出 Google 我的地圖」，下載含全部店家的單一 CSV；不受搜尋與篩選影響，包含待確認與歇業記錄。更新網站資料並重新載入後，匯出內容會同步更新。匯入時定位只勾選 **Location**，地標標題選 **Name**，Google 依店名與地址定位，請核對圖釘；Latitude／Longitude 保留既有座標供參考。離線時匯出目前載入的資料。之後更新同一張地圖，可在原圖層使用「重新匯入並合併 → 更新相符的項目」，兩邊以 **ID** 比對；Google 會移除不再出現在新檔案中的舊項目。操作參考 [Google 官方說明](https://support.google.com/mymaps/answer/3024836?hl=zh-Hant)。

目前保留 **46 家餐廳查核記錄**，全部於 **2026-10-14** 逐一開啟對應 Google Maps 商家頁，重新核對完整名稱、地址、電話、評分、評論數、歇業標記與完整每週時段；飲食條件另以官網與 HappyCow 覆核。網站及 CSV 採 Google 商家全名，舊簡稱保留供搜尋。巴拿山店已改為 **NGOC CHI VEGAN RESTAURANTS - BÀ NÀ HILLS**，店家電話為 **+84 337 085 088**，不再把園區熱線當成店家電話。完整逐店結果與落差見 [餐廳全面覆核報告](docs/restaurant-full-recheck-2026-10-14.md)，可重建的逐店資料在 `research/restaurant-full-recheck-2026-10-14.json`。

**43 家 Google 未標歇業、1 家營運待確認、2 家永久歇業**；預設可選列表 44 家，24 家分類為全素。全部 46 家均為直接 Google 評分快照；Loving Hut 已核對為 4.3／178 則、每日 06:00–19:30，但奶精與零售品的全素條件仍待確認。44 筆有來源圖釘，其中 2 筆屬歇業舊址；新覆核替換 7 筆店家的 Google 圖釘資料，巴拿山與 Seeds 圖釘亦再次確認；其餘沿用前次來源座標，未重新擷取。歇業店不進每日推薦，也不提供舊址導航。Loving Hut 與 61 Lê Quang Đạo 的 Loving Vegan 分開記錄。

本次確認 [Everyday Vegan（45 Hoàng Kế Viêm）](https://www.google.com/maps?cid=15189593579518914999) 與 [Emma’s Vegan Garden（36 Lê Quý Đôn）](https://www.google.com/maps?cid=12600194686517776988) 在 Google 標為永久歇業。Đại Bình 改用 126 Châu Thị Vĩnh Tế、An Hy 改用 59 Phan Châu Trinh、KURUMI 會安改用 187 Lý Thường Kiệt、iVegan 會安核對為 672 Hai Bà Trưng。ANs 的 169F Trưng Nữ Vương 商家仍列有營業時段，沒有誤套另一地址分店的歇業訊息。Khai Tâm 雖有 Google 商家頁，但牌告 24 小時及近期實際用餐資料不足，仍列待確認。

「Google 未標歇業」表示查核日商家頁存在且列有營業時段，**未向店家電話確認**；不代表旅行當日一定開門。評分、評論數會變動，出發前按商家連結查看最新評論、營業時段及臨時公告。

換匯頁維持 **6 個銀行／授權櫃檯地址**，研究更新為 **2026-10-14**：BIDV 峴港、BIDV Sông Hàn、BIDV Hội An、Vietcombank 峴港、Vietcombank Hội An，以及 AEON MALL Thanh Khê 公告的 VietinBank 授權櫃檯。卡片新增用途說明：台灣 Outo 推薦峴港市區的 Vietcombank（沒有指定分行）；AEON 適合購物順路換匯；帶台幣者可先聯絡 BIDV。BIDV 官方匯率頁註明 TWD 牌價適用現鈔交易，Vietcombank 有 USD 現鈔買入資料；這些是銀行層級資訊，不保證分行當日受理。AEON 公告正文稱有 14 種外幣但未逐一列出，TWD、USD 均維持待確認。商場營業時間與櫃檯服務時間分開說明。個別地址與幣別查證日期保留於卡片，不將整體研究更新冒充所有地址重新查證。只有 BIDV 峴港與 AEON 有可追溯地圖圖釘，其餘提供地址導航並排於距離列表後方。

本頁以越南國家銀行法規與官方公告作收錄依據：非銀行兌換代理須經授權並完成登記；「機場櫃位」或「金店」本身不代表已確認合法。峴港機場官方有列外幣兌換服務與 USD，但未公開櫃位營運商的現行授權資料，且官方清單沒有 TWD，因此不放入「已確認授權」清單。兌換前確認收鈔幣別、面額、當日匯率與費用，認明授權銀行標示並索取收據。

## 放到 GitHub Pages

發布網站沒有建置步驟、API 金鑰或 npm 執行時相依套件。專案的 npm 套件只供開發時格式化與瀏覽器測試使用，不必上傳 `node_modules/`。

1. 解壓縮 `danang-vegan-github-pages.zip`，將檔案放到你的 GitHub repository 根目錄；讓 `index.html` 在根目錄，不要再包一層資料夾。
2. 保留 `assets/` 完整資料夾、`sw.js`、`manifest.webmanifest`、`.nojekyll`。
3. 在 repository 的 **Settings → Pages → Build and deployment**，選 **Deploy from a branch**，分支選存放檔案的分支（通常 `main`），資料夾選 **/(root)**，按 Save。
4. 等 GitHub 顯示發布網址，通常是 `https://你的帳號.github.io/你的repo名稱/`。
5. 用手機 Safari 開啟該 HTTPS 網址。桌面本機檔案預覽可看頁面，但正式定位與離線快取請用 HTTPS 或 localhost。

步驟依 [GitHub Pages 官方文件](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。目前發布版本見本文件頁首；下方保留歷史驗證紀錄。已有網站可用新版檔案覆蓋 repository 中的對應檔案。

## 餐廳搜尋優化（2026-10-16）

- 中文區域與條件搜尋：例如「會安 全素 kurumi」「會安全素早餐」「美溪」；「全素／純素」按飲食分類篩選。英文 vegan 保留店名搜尋，避免漏掉名稱含 vegan、但全素條件待確認的店。
- 料理同義詞僅擴充既有資料支持的詞，例如「法國麵包／越式三明治／banh mi」，未重新查核菜單，不推測河粉等未確認料理。
- 搜尋「早餐／午餐／晚餐」依所選日期的 08:30／12:00／18:00 牌告時段比對，不保證供應特定餐點。
- 每日頁可填預計用餐時間；附近頁可選日期、時間，或填入越南現在時間。卡片區分牌告時段內、30 分鐘內結束、時段外（含午休）、休息日及待確認；輸入時間後，已知座標內依時段狀態再按所選排序。不是即時營業資訊，最後點餐與實際供餐需店家確認。
- 附近直線範圍可選 1／3／5／10 km／不限，預設不限。缺少可靠座標的備選另列，結果摘要分開計數；零筆時可直接改為不限距離。
- 每餐附「查看這餐附近的全素店」，帶入對應日期、時間、地標、全素及 5 km。巴拿山午餐另用「查園內供餐（需確認）」，只查巴拿山，保留風險與下山退路。
- 時段衝突與農曆例外直接顯示。結構化警示在 `research/restaurant-search-metadata.json`，每週表由 `scripts/restaurant_metadata.py` 從既有覆核時段生成；查核日期仍是 2026-10-14。
- 新條件支援摘要、移除、重設及按新版提示重載時的還原。離線版本 v21。

## 操作與個人偏好

搜尋支援輸入即更新；按鍵盤搜尋鍵可直接查看結果並顯示 toast。零筆結果提供清除、擴大範圍或重設操作。餐廳卡片優先呈現飲食條件、距離、參考時段與導航，店家特有風險維持直接可見，其他說明可展開。每日整天行程的距離會標明最近的景點／住宿。

切換底部功能會保留各頁閱讀位置；再次點目前入口會回頂端。網址 hash 記錄頁別與旅行日期，可分享指定一天或使用瀏覽器返回。旅行期間首次開啟以越南日期預選當日，網址指定日期優先。

收藏、採買勾選與列表／地圖偏好儲存在此瀏覽器；不需帳號、不跨裝置同步。瀏覽器不允許儲存時，本次瀏覽仍可操作。GPS 保持僅存於記憶體，不會寫入本機偏好或網址。

## iPhone 使用與離線

以 Safari 開啟發布網址，可從分享選單加入主畫面。出發前先連網開啟，等頁面完整載入，瀏覽五天與餐廳列表，再關網路確認文字能開啟。首頁附主畫面 PNG 圖示與網頁 manifest。

服務工作執行緒只快取本站文字資料、樣式、程式與圖示；**不下載離線地圖圖磚**。因此行程、餐廳地址和點餐卡可離線，底圖、Google Maps 導航、電話／來源等需適當連線或服務。GPS 不保存在網站資料庫或本機儲存，只在瀏覽器記憶體計算距離；重整後需再次定位。瀏覽器可能清理快取，出發前與飛航模式下都建議實際確認。

離線採分版本的快取優先，避免弱網時文字頁面一直等待。**每次修改任何網站檔案，均須更新 `sw.js` 的 VERSION**（本包為 v31），與其餘檔案一起上傳。首次開啟舊站時會在背景下載新版；看到新版橫幅後可按「重新載入」，保留每日／附近／換匯的非 GPS 條件；稍後更新可從頁首狀態再次開啟提示。頁首「離線功能已啟用」表示已有 active worker，不能代替飛航模式實測或保證瀏覽器不會清理快取。

## 旅行資料注意

- 距離為直線估計，不是步行或車程；山區、河道、橋樑與園區尤其不能只看公里數。
- 景點與部分飯店點位為來源地圖代表點，山茶半島以靈應寺、會安古城以日本橋、市區採買以韓市場代表。竹籃船未指定船家，錦清椰林點位不代表預約碼頭。
- 原表 10/23 同時安排會安燈籠節 19:00 與峴港龍橋 21:00，已提示跨城衝突，保留龍橋備選；10/24 的龍橋安排仍在。
- 巴拿山 Ngọc Chi 與市中心 Ngọc Chi 不同分店。山上店有蛋奶／魚露爭議；出發前先聯絡園區確認足量全素正餐與供餐時間。官方有外食禁令，不能把自帶餐當退路。無法確認時，縮短遊園並預先安排下山交通，再在市區用餐；市區店不是山頂步行可達的備援。
- 美山與五行山附近尚未找到足夠可靠的專門全素點位，可安排會安或美溪用餐。
- Roots、Kurumi、Chickpea、Chay Hạnh Phúc 等有近期搬遷／地址變更，使用研究時較新的來源。
- The Seeds 來源列週四、週五休，10/22、10/23 每日列表加註並降低排序優先度。
- 44 家未標歇業的店均已展開完整每週時段。Phúc An 週日、週一休，Hạnh Phúc 週一休，Seeds 週四、週五休；Lê Hội 峴港週日 14:30 才開。Rau Ơi 官網與 Google 時段衝突、Peanuts 週二與 An Mộc Nhiên 週日的休息日落差，以及農曆例外均保留逐店註記。Khai Tâm 的 Google 24 小時不視為全天有餐。
- 本次參考時段取自直接展開的 Google 每週表；舊時段保留於歷史欄位，來源落差另附註。不把單日片段推成每週表，也不提供「目前營業中」假即時狀態。
- 所有餐點包括全素店仍可出示點餐卡：排除蛋奶蜂蜜、魚露蠔油與動物高湯。

## 來源與更新

餐廳卡片附逐店來源。最新全面覆核在 `research/restaurant-full-recheck-2026-10-14.json`，生成時覆蓋舊查核資料但保留歷史。新店 Loving Hut 原研究在 `research/loving-hut-danang-addition.json`。完整研究原稿在 `research/danang-city.json`、`research/danang-beach.json`、`research/hoian-outskirts.json`，Google 交叉研究在 `research/google-audit-*.json`、直接商家頁觀察在 `research/google-direct-observations.json`，座標來源在 `research/places-coordinates.json`，每週時段／電話覆核在 `research/restaurant-review-corrections.json`，時段衝突在 `research/restaurant-hours-conflicts.json`，每日用餐備援在 `research/review-meal-coverage.json`，行程在 `research/itinerary.json`；換匯據點與法律／幣別證據在 `research/exchange-points.json`，2026-10-14 再查證紀錄在 `research/exchange-recheck-2026-10-14.md`。店家官網優先，另交叉參考 HappyCow、Google Maps 連結、具名導航目錄等；舊來源與爭議保留註記。

換匯主要來源：[越南國家銀行 2026 年外幣兌換代理規則](https://congbao.chinhphu.vn/van-ban/van-ban-hop-nhat-so-79-vbhn-nhnn-469935/66805.htm)、[BIDV 外幣現鈔服務](https://bidv.com.vn/vn/ca-nhan/san-pham-dich-vu/ngoai-hoi-va-thi-truong-von/mua-ban-ngoai-te/)、[BIDV 2025 年分行地址](https://bidv.com.vn/wps/wcm/connect/a8d511f6-3b0b-4ac9-b7f1-8e17ac08bf7e/BIDV_BCTN_2025_%282.1%29_VIE_interactive_15mb.pdf?CACHEID=ROOTWORKSPACE-a8d511f6-3b0b-4ac9-b7f1-8e17ac08bf7e-pS-Z7xM&MOD=AJPERES)、[Vietcombank 匯率牌價](https://www.vietcombank.com.vn/vi-VN/KHCN/Cong-cu-Tien-ich/Ty-gia-ngoai-te)、[AEON MALL VietinBank 授權櫃檯公告](https://danangthanhkhe.aeonmall-vietnam.com/en/news/dich-vu-doi-ngoai-te-uy-nhiem-vietinbank-da-co-mat-tai-aeon-mall-da-nang-thanh-khe.html)、[峴港機場外幣服務說明](https://danangairport.vn/facility-detail-page/brand-detail?bid=137)。

主要官方入口：[Chickpea](https://chickpeaeatery.com/)、[ROOTS](https://rootsplantbasedcafe.com/)、[KURUMI](https://kurumi.vn/en)、[iVegan](https://ivegansupershop.com/)、[Sun World 巴拿山](https://sunworld.vn/vi/banahills/an-choi/ba-na-hills-co-nha-hang-chay-khong-28928)。

編輯研究檔案後，在完整專案執行：

```sh
python3 scripts/build-data.py
node --test tests/*.test.cjs
```

## 開發驗證與格式化

Node.js 20 以上可執行測試。Playwright 和 Prettier 是固定版本的開發工具，網站本身仍可直接以靜態檔案發布。

```sh
npm ci
npm test
npm run test:browser
npm run format:check
```

瀏覽器測試使用獨立的無頭 Google Chrome，啟動與關閉自己的本機測試伺服器，不共用平常使用的 Chrome 設定或分頁。電腦需已安裝 Chrome；其他安裝位置可用 `PLAYWRIGHT_CHROME_EXECUTABLE` 指定執行檔。Chrome 設定依 [Playwright 官方瀏覽器文件](https://playwright.dev/docs/browsers)。測試的 GPS 回覆由測試控制，圖磚以本機測試圖片代替，離線與 service worker 則使用真正的瀏覽器機制。

超市資料以 `research/supermarket-supplies.json` 為唯一編輯來源；執行 `python3 scripts/build-data.py` 同步商品與門市 HTML。`python3 scripts/supplies.py --check` 只檢查是否同步，不寫入檔案。GitHub Actions 在 push／PR 自動檢查 Node 測試、格式及生成結果，通過後分別執行完整 Chrome 與 WebKit 瀏覽器測試，失敗時保存 trace 與截圖七天。

正式站更新需先保存真實舊版證據，再部署新版；不能在新版上線後補做舊版準備：

```sh
# v22 還在線上時
npm run verify:live -- prepare --from v22 --to v23
# v23 部署後
npm run verify:live -- verify --from v22 --to v23
npm run verify:live -- webkit --to v23
```

腳本核對 active worker、scope、實際版本快取與網路／快取檔案 SHA256，並確認收藏保留、搜尋及離線重載。成功的升級驗證會消耗舊版證據；下一次更新須重新準備對應版本。

`npm run format` 可格式化自有 JavaScript、CSS 與測試；不改寫生成的 `assets/data.js`、第三方 Leaflet、研究資料或文件。`node_modules/`、`test-results/`、`playwright-report/` 不放進部署 ZIP。

地圖採用 [Leaflet](https://github.com/Leaflet/Leaflet) 1.9.4（研究時約 45.7k stars），保留 BSD-2-Clause 授權 `assets/vendor/LICENSE`。亦參考 [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js)；本案採適合少量手機點位的 Leaflet。底圖為 OpenStreetMap，保留其 attribution，遵循 [圖磚使用政策](https://operations.osmfoundation.org/policies/tiles/)。

## 驗證紀錄

2026-10-16 餐廳搜尋優化：**97 項 Node 測試、32 項 Chrome 測試全部通過**；格式、語法、差異與資料重建一致性檢查通過。320／393px 手機畫面已檢視。離線版本 v21，ZIP 已同步；尚未推送或部署。詳見 [搜尋優化交付紀錄](docs/restaurant-search-improvements-2026-10-16.md)。

2026-10-15 UI／UX 優化完成：**88 項 Node 測試、27 項真實 Chrome 測試全部通過**，格式、JavaScript 語法與 diff 檢查通過。涵蓋搜尋摘要、保留條件的全素篩選、手機列表／地圖、收藏採買、圖片放大、閱讀位置與返回、更新條件還原、320／393px 手機畫面、既有離線與 CSV 功能。離線版本 v20，新 UX 模組已納入快取。詳見 [UI／UX 優化交付紀錄](docs/ui-ux-improvements-2026-10-15.md)。尚未推送或部署。

2026-10-14 餐廳全面覆核後，87 項 Node 資料與既有功能測試通過；46 家名稱、電話、地址、評分、時段與新覆核檔一致，CSV 已重新生成。這一輪沒有執行真實瀏覽器功能測試；Google 商家核對使用實際 Chrome 頁面。詳見 [餐廳全面覆核報告](docs/restaurant-full-recheck-2026-10-14.md)。

2026-10-14 最後一輪修正由 Luna max 子代理實作、主代理獨立驗證：**84 項 Node 測試與 12 項真實 Chrome 測試全部通過**，格式、14 個檔案的 JavaScript 語法與 `git diff --check` 通過。修正定位跨頁、日期鍵盤焦點、搜尋排程／中文組字與快取寫入失敗；新增真實離線安裝、子目錄重載、新版快取及 scope 隔離測試。393 × 852 手機尺寸四入口、餐廳地圖操作與放大點餐卡已實測並檢查畫面。詳見 [最後修正與優化報告](docs/review-fixes-2026-10-14.md)。

以下保留早前的研究與驗證紀錄：

- 61 項 Node 測試：距離、排序、搜尋、分類、資料一致性、日期切換、GPS 成功／拒絕、地圖未載入備援、跨分頁卡片選取、巴拿山無座標備案、休息日與服務工作執行緒的子目錄／跨來源行為；新增 Google 覆蓋、歇業封存、地址衝突、狀態排序與歇業彈窗禁止導航。
- Chrome 本機成功載入互動地圖、每日行程、餐廳與點餐卡；2026-10-14 再以 Chrome 393 × 852 手機模擬畫面確認新版頁首、全素篩選、快速跳轉與餐廳卡片，並實測 DevTools 離線模式下重新載入行程與用餐備援。此輪新增每日半徑邊界、多關鍵字搜尋、全清單跳轉及 Loving Hut 資料測試；現在預設可選 44 家、全素篩選 24 家，完整查核記錄 46 家。
- 換匯覆核新增 11 項測試：幣別篩選與圖釘同步、篩選地圖視野、最近行程距離、無座標、GPS／手動模式、日期與 GPS 優先順序、定位失敗後的新日期備援、來源與資料生成一致性。完整 61 項通過，JavaScript 語法與 git diff --check 通過。換匯新增控制項沿用手機版樣式與至少 44 px 操作區；Chrome 正被使用者同步操作，自動化在動作前阻擋，未完成更新版實際瀏覽器或手機視覺驗證。
- 尚未在實體 iPhone 17 Pro、越南實際 GPS 或正式 GitHub Pages 網址實測。正式定位需裝置允許；距離演算法與成功／拒絕的頁面處理已用測試驗證。
- 完整修正與剩餘旅行風險見 [本次 review 報告](docs/review-2026-10-14.md)。

換匯頁問題、修正與驗證範圍見 [換匯 review 報告](docs/exchange-review-2026-10-14.md)。本次更新本機專案與 ZIP，尚未推送或部署 GitHub Pages。
