# Review Optimizations Plan

- [x] 先補連續中文搜尋測試，保留菜名與嚴格飲食條件，再實作已知詞切分。
- [x] 正式站驗證加入明確 from/to、來源證據、實際 cache/scope、檔案雜湊與失敗測試。
- [x] 修正超市資料；單一 JSON 生成商品/門市 HTML，加入資料校驗、escaping、fixture/漂移測試，接入 build-data.py。
- [x] 新增手機整合案例，完整 Chrome 回歸與 WebKit 搜尋/離線測試。
- [x] 獨立審查、記錄改動與驗證，更新 README、離線版本、ZIP。
- [ ] 準備正式 v22 證據、提交/推送/部署；以新驗證腳本確認 v23、收藏與離線。
