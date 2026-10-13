# 峴港・全素隨行

2026/10/21–10/25 的峴港與會安旅行指南。依使用者提供的行程截圖製作，飲食條件為全素、五辛可接受。

## 開始使用

- **每日行程**：切換五天，查看景點、住宿與餐廳地圖。餐廳參考位置可切換整天或單一景點。
- **附近素食**：點「使用我的位置」，允許定位後依直線距離排序。也可改選飯店／景點當參考位置，搜尋店名與地址，篩選區域或全素店。
- **換匯所**：切換旅行日期或使用 GPS，查看附近銀行與已公告授權櫃檯，依 USD／TWD 官方幣別資料篩選，並以 Google Maps 導航。地圖只替可核對座標的點放圖釘；其他官方地址仍可開導航，不虛構距離。
- **全素點餐卡**：越南文、英文與繁體中文，可放大給店員看或複製。
- 餐廳卡片可直接 Google Maps 導航、查看地圖、打電話及展開來源。

目前保留 **45 家餐廳查核記錄**；2026-10-13 已逐一開啟對應 **Google Maps 商家頁**核對評分、評論數與地址。每家均有 Google 商家／評價連結及直接查核快照。**42 家 Google 未標歇業、1 家營業待確認、2 家永久歇業**；可選列表預設 43 家，歇業店只留在查核記錄，不進每日推薦，也不提供舊址導航。43 筆記錄有來源圖釘，其中 2 筆屬歇業舊址；其餘沒有可靠座標的店保留地址，不虛構距離。

本次確認 [Everyday Vegan（45 Hoàng Kế Viêm）](https://www.google.com/maps?cid=15189593579518914999) 與 [Emma’s Vegan Garden（36 Lê Quý Đôn）](https://www.google.com/maps?cid=12600194686517776988) 在 Google 標為永久歇業。Đại Bình 改用 126 Châu Thị Vĩnh Tế、An Hy 改用 59 Phan Châu Trinh、KURUMI 會安改用 187 Lý Thường Kiệt、iVegan 會安核對為 672 Hai Bà Trưng。ANs 的 169F Trưng Nữ Vương 商家仍列有營業時段，沒有誤套另一地址分店的歇業訊息。Khai Tâm 雖有 Google 商家頁，但牌告 24 小時及近期實際用餐資料不足，仍列待確認。

「Google 未標歇業」表示查核日商家頁存在且列有營業時段，**未向店家電話確認**；不代表旅行當日一定開門。評分、評論數會變動，出發前按商家連結查看最新評論、營業時段及臨時公告。

換匯頁收錄 **6 個銀行／授權櫃檯地址**：BIDV 峴港、BIDV Sông Hàn、BIDV Hội An、Vietcombank 峴港、Vietcombank Hội An，以及 AEON MALL Thanh Khê 公告的 VietinBank 授權櫃檯。BIDV 官方外匯服務列有 TWD、USD 現鈔；Vietcombank 官方牌價可查 USD 現鈔買入。授權櫃檯公告稱可換 14 種外幣，但未公開名單，因此該點的 TWD、USD 都標成先詢問。銀行層級的服務／牌價不保證每家分行當天有現鈔服務或庫存，請出發前聯絡分行確認。只有 BIDV 峴港分行與 AEON 商場點有可追溯地圖圖釘；其餘地址提供 Google Maps 搜尋導航，但不列入最近距離排序。

本頁以越南國家銀行法規與官方公告作收錄依據：非銀行兌換代理須經授權並完成登記；「機場櫃位」或「金店」本身不代表已確認合法。峴港機場官方有列外幣兌換服務與 USD，但未公開櫃位營運商的現行授權資料，且官方清單沒有 TWD，因此不放入「已確認授權」清單。兌換前確認收鈔幣別、面額、當日匯率與費用，認明授權銀行標示並索取收據。

## 放到 GitHub Pages

沒有建置步驟、API 金鑰或 npm 相依套件。

1. 解壓縮 `danang-vegan-github-pages.zip`，將檔案放到你的 GitHub repository 根目錄；讓 `index.html` 在根目錄，不要再包一層資料夾。
2. 保留 `assets/` 完整資料夾、`sw.js`、`manifest.webmanifest`、`.nojekyll`。
3. 在 repository 的 **Settings → Pages → Build and deployment**，選 **Deploy from a branch**，分支選存放檔案的分支（通常 `main`），資料夾選 **/(root)**，按 Save。
4. 等 GitHub 顯示發布網址，通常是 `https://你的帳號.github.io/你的repo名稱/`。
5. 用手機 Safari 開啟該 HTTPS 網址。桌面本機檔案預覽可看頁面，但正式定位與離線快取請用 HTTPS 或 localhost。

步驟依 [GitHub Pages 官方文件](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。本次僅準備可發布檔案，尚未建立 GitHub repository 或發布網站。

## iPhone 使用與離線

以 Safari 開啟發布網址，可從分享選單加入主畫面。出發前先連網開啟，等頁面完整載入，瀏覽五天與餐廳列表，再關網路確認文字能開啟。首頁附主畫面 PNG 圖示與網頁 manifest。

服務工作執行緒只快取本站文字資料、樣式、程式與圖示；**不下載離線地圖圖磚**。因此行程、餐廳地址和點餐卡可離線，底圖、Google Maps 導航、電話／來源等需適當連線或服務。GPS 不保存在網站資料庫或本機儲存，只在瀏覽器記憶體計算距離；重整後需再次定位。瀏覽器可能清理快取，出發前與飛航模式下都建議實際確認。

若更新檔案，網路優先快取會取得新版本；必要時關閉頁面後重開。修改資產集合時也請更新 `sw.js` 的 CACHE 版本。

## 旅行資料注意

- 距離為直線估計，不是步行或車程；山區、河道、橋樑與園區尤其不能只看公里數。
- 景點與部分飯店點位為來源地圖代表點，山茶半島以靈應寺、會安古城以日本橋、市區採買以韓市場代表。竹籃船未指定船家，錦清椰林點位不代表預約碼頭。
- 原表 10/23 同時安排會安燈籠節 19:00 與峴港龍橋 21:00，已提示跨城衝突，保留龍橋備選；10/24 的龍橋安排仍在。
- 巴拿山 Ngọc Chi 與市中心 Ngọc Chi 不同分店。山上店有蛋奶／魚露爭議，列待確認備案；不能只憑 vegan 標籤判斷。先聯絡餐廳／園區確認全素方案，亦不要假定園區允許外食。
- 美山與五行山附近尚未找到足夠可靠的專門全素點位，可安排會安或美溪用餐。
- Roots、Kurumi、Chickpea、Chay Hạnh Phúc 等有近期搬遷／地址變更，使用研究時較新的來源。
- The Seeds 來源列週四、週五休，10/22、10/23 每日列表加註並降低排序優先度。
- 來源時間有衝突／不完整則不顯示精確時段；不提供「目前營業中」假即時狀態。
- 所有餐點包括全素店仍可出示點餐卡：排除蛋奶蜂蜜、魚露蠔油與動物高湯。

## 來源與更新

餐廳卡片附逐店來源。完整研究原稿在 `research/danang-city.json`、`research/danang-beach.json`、`research/hoian-outskirts.json`，Google 交叉研究在 `research/google-audit-*.json`、直接商家頁觀察在 `research/google-direct-observations.json`，座標來源在 `research/places-coordinates.json`，行程在 `research/itinerary.json`；換匯據點與法律／幣別證據在 `research/exchange-points.json`。店家官網優先，另交叉參考 HappyCow、Google Maps 連結、具名導航目錄等；舊來源與爭議保留註記。

換匯主要來源：[越南國家銀行 2026 年外幣兌換代理規則](https://congbao.chinhphu.vn/van-ban/van-ban-hop-nhat-so-79-vbhn-nhnn-469935/66805.htm)、[BIDV 外幣現鈔服務](https://bidv.com.vn/vn/ca-nhan/san-pham-dich-vu/ngoai-hoi-va-thi-truong-von/mua-ban-ngoai-te/)、[BIDV 2025 年分行地址](https://bidv.com.vn/wps/wcm/connect/a8d511f6-3b0b-4ac9-b7f1-8e17ac08bf7e/BIDV_BCTN_2025_%282.1%29_VIE_interactive_15mb.pdf?CACHEID=ROOTWORKSPACE-a8d511f6-3b0b-4ac9-b7f1-8e17ac08bf7e-pS-Z7xM&MOD=AJPERES)、[Vietcombank 匯率牌價](https://www.vietcombank.com.vn/vi-VN/KHCN/Cong-cu-Tien-ich/Ty-gia-ngoai-te)、[AEON MALL VietinBank 授權櫃檯公告](https://danangthanhkhe.aeonmall-vietnam.com/en/news/dich-vu-doi-ngoai-te-uy-nhiem-vietinbank-da-co-mat-tai-aeon-mall-da-nang-thanh-khe.html)、[峴港機場外幣服務說明](https://danangairport.vn/facility-detail-page/brand-detail?bid=137)。

主要官方入口：[Chickpea](https://chickpeaeatery.com/)、[ROOTS](https://rootsplantbasedcafe.com/)、[KURUMI](https://kurumi.vn/en)、[iVegan](https://ivegansupershop.com/)、[Sun World 巴拿山](https://sunworld.vn/vi/banahills/an-choi/ba-na-hills-co-nha-hang-chay-khong-28928)。

編輯研究檔案後，在完整專案執行：

```sh
python3 scripts/build-data.py
node --test tests/*.test.cjs
```

地圖採用 [Leaflet](https://github.com/Leaflet/Leaflet) 1.9.4（研究時約 45.7k stars），保留 BSD-2-Clause 授權 `assets/vendor/LICENSE`。亦參考 [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js)；本案採適合少量手機點位的 Leaflet。底圖為 OpenStreetMap，保留其 attribution，遵循 [圖磚使用政策](https://operations.osmfoundation.org/policies/tiles/)。

## 驗證紀錄

- 27 項 Node 測試：距離、排序、搜尋、分類、資料一致性、日期切換、GPS 成功／拒絕、地圖未載入備援、跨分頁卡片選取、巴拿山無座標備案、休息日與服務工作執行緒的子目錄／跨來源行為；新增 Google 覆蓋、歇業封存、地址衝突、狀態排序與歇業彈窗禁止導航。
- Chrome 本機成功載入互動地圖、每日行程、餐廳與點餐卡；本次再用 393 × 852 手機模擬畫面檢查附近素食卡片、Google 評分與固定導覽。預设可選 43 家，完整查核記錄 45 家。
- 尚未在實體 iPhone 17 Pro、越南實際 GPS 或正式 GitHub Pages 網址實測。正式定位需裝置允許；距離演算法與成功／拒絕的頁面處理已用測試驗證。
- 新專案目錄的 Git metadata 寫入被環境權限限制，未建立本地 commit；不影響靜態檔案交付與使用者上傳。
