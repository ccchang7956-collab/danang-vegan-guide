# Google 我的地圖匯出設計

使用者已同意：在「附近素食」頁匯出全部店家，下載單一 CSV，不受目前搜尋、区域、飲食或營業篩選影響。

## 使用流程

新增「匯出 Google 我的地圖」按鈕，旁邊說明「匯出全部店家，包含待確認與歇業記錄」。按下後，以當下 `window.TRAVEL_DATA.restaurants` 產生 `峴港與會安素食店家_YYYY-MM-DD.csv`，日期取使用者本地日期。成功訊息顯示匯出筆數。

顯示匯入提示：定位只選 Location，標題選 Name。統一使用店名、地址與 Vietnam 自動定位；Latitude、Longitude 保存既有座標供核對。Google 自動定位可能與既有座標不同，需檢查圖釘。全部記錄保留，不捏造缺少的座標或營業時間。

## 資料與格式

沿用整合版的 21 欄英文欄名與順序：Name, Latitude, Longitude, Location, Address, Area, Diet, DietNotes, OperatingStatus, ConfirmedHours, ReportedHours, HoursNotes, Phone, GoogleMaps, AddressNotes, CheckedDate, OperatingNotes, CoordinateStatus, CoordinateSource, Sources, ID。

UTF-8 不含 BOM，標題列不加引號；資料欄以 CSV 引號跳脫逗號、換行與雙引號，列分隔使用 CRLF。中文和越南文保持原文。永久歇業、暫停營業、位置待確認與營運待確認在 Name 前標記。已核對與其他來源回報時間分欄，缺值留空。固定 ID 沿用店家 id，供 My Maps 重新匯入比對。

CheckedDate 使用資料查核日期 checkedDate，缺值留空；營運證據日期 operatingEvidenceDate 另在 OperatingNotes 以「營運證據日期」標示，不混用兩種日期。

## 實作範圍

`assets/core.js` 增加純函式 `restaurantsCsv(records)`，負責資料轉換與序列化；`assets/app.js` 使用 Blob、Object URL 與下載連結產生瀏覽器下載，完成後釋放 Object URL，失敗顯示可讀提示。`index.html` 使用既有 quick-actions 與按鈕樣式。`sw.js` 更新快取版本；README 補上使用與資料更新說明。網站只需載入新資料，不須預先產生靜態匯出檔案；離線會匯出已載入的資料，無法取得未載入的新資料。

## 驗證

先以測試證明新功能缺失，再驗證全部記錄、空座標、固定 ID、資料更新、原文與 CSV 跳脫、歇業標示、缺漏時間。真實瀏覽器下載確認篩選不影響匯出、修改資料後下載更新內容、單一下載與手機可見性。執行 Node、瀏覽器、格式與差異檢查。Google 我的地圖實際匯入與發布網站不在此次本機實作驗證範圍。
