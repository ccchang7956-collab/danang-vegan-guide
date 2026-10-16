# 餐廳菜單與價位查核（2026-10-16）

此檔與同名 JSON 只補充菜單研究，未修改既有店家飲食分類。涵蓋既有 46 個 id，11 店有原始來源支持的品項／產品分類，共 62 筆，其中 10 店的 58 筆有明列 VND 價格。未取得資料的店不代表沒有菜單，也不代表停業。checkedDate 為本輪讀取日期，並非餐廳宣布的菜單生效日。

## 有可抄錄價格的原始來源

| id | 原始來源 | 適用性與限制 |
| --- | --- | --- |
| dn-kurumi | https://kurumi.vn/en/menu?branch=danang | 官網峴港選項，與 17/22 Mỹ Đa Đông 12 對應。官方標示 100% plant-based。 |
| hoian-kurumi | https://kurumi.vn/en/locations/hoian/menu | 頁首會安地址 187 Lý Thường Kiệt。Tofu Benedict 為 120,000；峴港 110,000。酪梨吐司為 70,000；峴港 65,000。不可相互套用。 |
| dn-chickpea | https://chickpeaeatery.com/wp-content/uploads/Online-Chickpea-DA-NANG-MENU.pdf.pdf | 官網目前 Da nang menu 連結。PDF p.2–7 可讀文字標價。天貝法國麵包 50K、廣南麵 80K。 |
| hoian-chickpea | https://chickpeaeatery.com/wp-content/uploads/2024/03/2024-Chickpea-Menu.pdf | 官網目前 HOI AN menu 連結；檔案標題為 2024 printed menu，不能描述為 2026 新版。天貝法國麵包 45K。 |
| moms-kitchen | https://chickpeaeatery.com/wp-content/uploads/2023/06/MOMS-KITCHEN-BY-CHICKPEA-EATERY.pdf | 官網目前 mom’s kitchen menu 連結；路徑 2023/06，未見新版日期。刈包 40K、炸春捲米線 50K、天貝法國麵包 35K。 |
| hoian-nourish | https://nourisheatery.com/menu/ | 每道獨立 Vegan／Vegetarian 標籤。只採 Vegan 標籤；部分餐點可加牛肉，不含於標準 Vegan 版本。 |
| hoian-peanuts | https://peanuts-restaurant.com/en/menu | 官網圖像菜單，目視查看 English_5.jpg 與 English_6.jpg。只收明示 Vegan 菜名；未把全店視為純素。 |

Chickpea 官方品牌頁 https://chickpeaeatery.com/ 有四個分店地址與三份分店 PDF 連結，並明示全體餐點為植物性。ALT 沒有獨立明確菜單，本輪留空。PDF 截圖工具部分回傳 internal error；價格由原始 PDF 文字層核對，沒有以模糊 OCR 推測。

Peanuts 圖像原始網址：

- https://peanuts-restaurant.com/images/English_5.jpg
- https://peanuts-restaurant.com/images/English_6.jpg

菜名中明示的 Vegan 項目足以支持選餐研究；其既有分類為 ovo 素食，仍須確認隨附美乃滋等醬料無蛋奶。未將未標示 Vegan 的一般春捲、沙拉或豆腐球麵包加入。

## 有官方介紹但缺少可核對價位

- PlantLab：https://plantlabfood.com/ 明示 100% vegan，Menu 區只有腰果起司、椰奶優格、生食蛋糕與 shrub soda 等產品分類與描述，沒有主餐名或售價。JSON 保留四個分類、priceVnd:null，沒有假裝是完整點餐菜單。
- Roots：https://rootsplantbasedcafe.com/ 官方純素介紹與峴港 266 Trần Bạch Đằng 地址可讀。網頁原始碼中 Danang View Menu 綁定 menu-danang-1.webp、menu-danang-2.webp、menu-danang-4.webp。已查看第一張，實際是純果昔碗照片，沒有文字價格；不把圖像 alt 當正式菜名。舊 https://rootsplantbasedcafe.com/menu-vn/ 本輪回傳 404。未套用 Saigon 菜單。
- iVegan：https://ivegansupershop.com/ 搜尋索引可見全植物性介紹，但直接頁面／menu 路徑無可讀菜單。本輪未查到明確適用峴港或會安分店的當前原始價目表，兩店空白。
- Om Vegan：官方 https://www.facebook.com/giontamesay 本輪無法讀取。社群鏡像 https://www.findglocal.com/VN/Da-Nang/1139577916230406/Om-Vegan---V%E1%BB%81-%C4%91%C3%A2y-%C4%83n-chay 可見 2026-09-17 自助餐 60K、另加火鍋 40K／人的貼文，以及 9/20–9/30 活動。當前價位不明，不轉成固定 items；同名 Quy Nhơn 的 https://omveganbistro.vn/ 與本店無關，已排除。
- 峴港 Lê Hội：第三方 https://hellodanang.vn/topAZ/quan-chay-o-son-tra 指向 https://www.facebook.com/61562888946022，地址 89 Phạm Tu 符合，但 Facebook 本輪無法讀取，未推定正式菜名、價格或與會安店共用菜單。
- 會安 Lê Hội：可見第三方用餐評論價格，沒有取得當前官方菜單；不使用評論價格作牌價。

後續已對其餘 31 店逐店以名稱、現址與 menu／official／Facebook 等字詞完成一次有界搜尋，並讀取找到的合理官方來源。未找到可核對菜單仍保留空值；不將搜尋未找到改寫成「已證實沒有」。

## 全店狀態與第二輪新增來源

46 筆均有 researchStatus、menuKind、priceAge。狀態統計：官方菜單／菜單介紹已讀 14；官方來源不可讀 14；搜尋後未找到可核對菜單 16；沿用既有永久歇業封存 2。official-menu-reviewed 僅表示讀過官方菜單或其介紹，不等於已取得可證實全素單品，例如 Ngọc Chi 市區、Son Tra Retreat、Tỉnh Quán 的 items 仍空白。

新增 9 筆品項，保留原始 53 筆：

- Rau Ơi：https://rauoieatery.com/menu/ 頁首地址 110 Tran Nhan Tong；只採四道菜名明示 Vegan 的咖哩、純素雞飯與 Pad Thai。原有分類仍為 ovo 素食。
- Phin Lounge：https://phincoffeehoian.com/location/phin-lounge-an-bang/ 本分店頁有完整價目，採四道菜名明示 Vegan 的 Plate、Hoi An、春捲與綠咖哩。https://phincoffeehoian.com/our-food/ 說明 Vegan 排除肉、海鮮、奶、蛋。
- Bảo An：https://thucduongbaoan.com.vn/sp-category/thuc-don-bao-an/thuc-don-thu-sau/ 多數品項顯示售罄，僅採 https://thucduongbaoan.com.vn/sp/com-rong-bien/ 仍顯示可加入購物車的海苔飯 35,000。另一款芝麻鹽飯只有 15,000–20,000 區間與大小選項，未取得價量配對，未填固定單價。
- Ngọc Chi 市區：https://chayngocchi.vn/thuc-don/ 分店頁有19張菜單圖，目視第2頁 https://chayngocchi.vn/wp-content/uploads/2026/01/chayngocchi-cn-hoangdieu-2.jpg 。店為奶素，沒有逐道 Vegan 證據，因此未新增品項。
- Son Tra Retreat：https://sontraretreat.vn/vi/thuc-don/ 與 https://sontraretreat.vn/wp-content/uploads/2026/04/13.png 已讀，沒有明確 Vegan 標示，不把植物菜名直接視為純素；圖示價格另加5%服務費。
- Tỉnh Quán：https://www.hocthiendanang.com/ve-am-thuc-chay-tinh-quan 同址自有介紹可讀，但菜名不足以核對蛋奶蜂蜜與售價，未新增品項。
- 巴拿山 Ngọc Chi：園區官方 https://sunworld.vn/banahills/an-choi/nha-hang-chay-ngoc-chi 與 https://sunworld.vn/vi/banahills/an-choi/ba-na-hills-co-nha-hang-chay-khong-28928 有完全植物性敘述與約70,000起價；沒有逐道可核對價目，不把起價賦予任何單品。

### 逐店搜尋辨識條件與結果

下表保留搜尋時用來辨識本店的名稱與現址（查詢使用名稱縮寫、地址核心字及 menu／official／Facebook 等組合，不是宣稱每列文字為單一逐字查詢）。第一輪15店已查；其餘31店第二輪逐家補查。兩家封存店也有搜尋，但不恢復舊菜單。

| id | 搜尋辨識名稱／現址 | 最終狀態 |
| --- | --- | --- |
| om-vegan | Om Vegan - Về đây ăn chay；338/42 Hoàng Diệu, Hải Châu, Đà Nẵng | official-source-unreadable |
| ngoc-chi-city | Nhà Hàng Chay Ngọc Chi - Vegetarian Restaurant Michelin guide 2025；202 Hoàng Diệu, Hải Châu, Đà Nẵng | official-menu-reviewed |
| tiem-chay-xua | Tiệm Chay Xưa；373 Phan Châu Trinh, Hòa Cường, Đà Nẵng | official-source-unreadable |
| ans-vegetarian | ANs - Vegetarian Cuisine；169F Trưng Nữ Vương, Hòa Cường, Đà Nẵng | official-source-unreadable |
| an-lac-tam-2 | Quán Chay An Lạc Tâm Đà Nẵng - Vegetarian Restaurant；41 Lê Quý Đôn, Hòa Cường, Đà Nẵng | official-source-unreadable |
| khai-tam-city | Quán Chay Khai Tâm；352 Phan Châu Trinh, Hòa Cường, Đà Nẵng | no-verifiable-menu-found |
| shala-vegan-house | Shala Vegan House；87/16 Nguyễn Du, Hải Châu, Đà Nẵng | no-verifiable-menu-found |
| au-lac | Cơm Chay Âu Lạc；113/14 Nguyễn Du, Hải Châu, Đà Nẵng | no-verifiable-menu-found |
| dieu-hoa-city | Quan Chay Dieu Hoa - Vegan restaurant in Danang；87/4, Nguyen Du Street, Hai Chau, Hải Châu, Đà Nẵng | official-source-unreadable |
| phuc-an-city | Nhà hàng chay Phúc An - PhucAn Vegetarian；547 Nguyễn Tất Thành, Thanh Khê, Đà Nẵng | official-source-unreadable |
| bao-an | Thực Dưỡng Bảo An；56 Hoàng Bích Sơn, An Hải, Đà Nẵng | official-menu-reviewed |
| tinh-quan | Quán Chay Tỉnh Quán - Ẩm Thực Chay Đà Nẵng (Vegan restaurant in Da Nang)；11 Trần Nhật Duật, Sơn Trà, Đà Nẵng | official-menu-reviewed |
| son-tra-retreat | Son Tra Retreat；11 Lê Văn Lương, Sơn Trà, Đà Nẵng | official-menu-reviewed |
| moms-kitchen | Mom Kitchen by Chickpea Eatery Da Nang；73-12 Trương Định, Sơn Trà, Đà Nẵng | official-menu-reviewed |
| dn-roots | Roots Plant-Based Cafe - healthy vegan restaurant；266 Trần Bạch Đằng, Bắc Mỹ Phú, Ngũ Hành Sơn, Đà Nẵng | no-verifiable-menu-found |
| dn-chickpea | Chickpea Eatery - Vegan Restaurant & Cooking Class Da Nang；69 Nguyễn Duy Hiệu, An Hải, Đà Nẵng | official-menu-reviewed |
| dn-alt | ALT Plant-Based Vegan Café & Cooking Class by Chickpea Eatery；90 Bà Huyện Thanh Quan, Ngũ Hành Sơn, Đà Nẵng | no-verifiable-menu-found |
| dn-kurumi | KURUMI - Healthy Vegan Food & Desserts；17/22 Mỹ Đa Đông 12, Ngũ Hành Sơn, Đà Nẵng | official-menu-reviewed |
| dn-ivegan | IVEGAN SUPERSHOP；Lô 31 An Thượng 4, Ngũ Hành Sơn, Đà Nẵng | official-source-unreadable |
| dn-loving | Loving Vegan；61 Lê Quang Đạo, Ngũ Hành Sơn, Đà Nẵng | official-source-unreadable |
| dn-khong | KHONG Vegan Kitchen；81 Phan Tôn, Ngũ Hành Sơn, Đà Nẵng | official-source-unreadable |
| dn-lehoi | Bánh Mì Chay Lê Hội - Vegan Bread；89 Phạm Tu, An Hải, Đà Nẵng | official-source-unreadable |
| dn-anmocnhien | AN MỘC NHIÊN VEGAN Nhà hàng thuần chay；18 Trần Bạch Đằng, An Hải, Đà Nẵng | no-verifiable-menu-found |
| dn-hanhphuc | Chay Hạnh Phúc - Vegan Food；178 Hoài Thanh, Ngũ Hành Sơn, Đà Nẵng | no-verifiable-menu-found |
| dn-everyday | Everyday Vegan Food & Coffee Da Nang；45 Hoàng Kế Viêm, Ngũ Hành Sơn, Đà Nẵng | archived-closed |
| dn-xinh | Quán chay xinh；Đối diện 30, An Thượng 8, Ngũ Hành Sơn, Đà Nẵng | no-verifiable-menu-found |
| dn-daibinh | Chay Đại Bình；126 Châu Thị Vĩnh Tế, Ngũ Hành Sơn, Đà Nẵng | no-verifiable-menu-found |
| dn-duyen | Duyên Vegan & Coffee；63 Đặng Vũ Hỷ, An Hải, Đà Nẵng | no-verifiable-menu-found |
| hoian-chickpea | Chickpea Eatery - Vegan Restaurant & Cooking Class Hoi An；86 Phan Châu Trinh, Hội An, Đà Nẵng | official-menu-reviewed |
| hoian-v-vegan | V Vegan；108 Nguyễn Thái Học, Old Town, Hội An, Đà Nẵng | official-source-unreadable |
| hoian-kurumi | KURUMI；187 Lý Thường Kiệt, Hội An, Đà Nẵng | official-menu-reviewed |
| hoian-ivegan | Ivegan Supershop Hoi An - Healthy Plant-based Cafe；672 Đ. Hai Bà Trưng, Hội An, Đà Nẵng | official-source-unreadable |
| hoian-seeds | The Seeds Plant-Based Foods & Desserts/Tiệm Chay；124/2 Đ. Trần Cao Vân, Hội An, Đà Nẵng | no-verifiable-menu-found |
| hoian-emma | Quán Thuần Chay Emma - Emma's Vegan Garden - Restaurant & Cafe；36 Lê Quý Đôn, Hội An, Đà Nẵng | archived-closed |
| hoian-an-hy | An Hy Vegetarian Restaurant；59 Phan Châu Trinh, Old Town, Hội An, Đà Nẵng | no-verifiable-menu-found |
| hoian-minh-hien | Minh Hien Vegetarian Restaurant；26/16 Thái Phiên, Hội An, Đà Nẵng | official-source-unreadable |
| hoian-peanuts | Peanuts - Vegan Vietnamese Food；122 Trần Nhân Tông, Hội An Đông, Đà Nẵng | official-menu-reviewed |
| hoian-rau-oi | Rau Ơi Eatery - Vegan Food and Cooking Classes；110 Trần Nhân Tông, Hội An Đông, Đà Nẵng | official-menu-reviewed |
| hoian-quan-chay-cua-dai | An Phuoc Vegetarian；333 Cửa Đại, Hội An Đông, Đà Nẵng | no-verifiable-menu-found |
| hoian-plantlab | PlantLab Restaurant；Tổ dân cư, số 4, tổ dân phố Thanh Đông, Hội An Đông, Đà Nẵng | official-menu-reviewed |
| hoian-phin-lounge | Phin Lounge；An Bang Beach, Hội An Tây, Đà Nẵng | official-menu-reviewed |
| hoian-fisherman | The Fisherman Garden Vegan Restaurant & Cafe；An Bang Beach, Hội An Tây, Đà Nẵng | official-source-unreadable |
| hoian-hoi-banh-mi | Lê Hội Bánh MÌ Chay (Le Hoi Vegan Banh Mi)；3 Nguyễn Huệ, Hội An, Đà Nẵng | no-verifiable-menu-found |
| bana-ngoc-chi | NGOC CHI VEGAN RESTAURANTS - BÀ NÀ HILLS；Bà Nà Hills, Ba Na, Da Nang | no-verifiable-menu-found |
| hoian-nourish | nourish eatery. / Café & Restaurant；220a Nguyễn Duy Hiệu, Hội An Đông, Đà Nẵng | official-menu-reviewed |
| loving-hut-danang | Loving Hut Da Nang；380 Đ. Lê Văn Hiến, Ngũ Hành Sơn, Đà Nẵng | no-verifiable-menu-found |

官方來源確實嘗試讀取的網址已列各 JSON sourceUrls；若無可辨識官方來源則保留空陣列。第三方搜尋結果用於找到官方入口或辨識地址，不把搜尋頁、評價總價或評論菜名當原始菜單。Facebook 失敗包含快取錯誤、登入頁或暫時封鎖；ANs 官網首頁逾時、/menu/ 亦不可讀。日期為 dated-menu 的兩份 Chickpea 舊PDF代表已辨識檔案年份，不代表價格仍有效；其餘可用價格來源均為 undated-menu。
