# Google 餐廳查核 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement task-by-task.

**Goal:** 45 家餐廳逐店 Google 連結／評分／營業查核，避免推薦已歇業或導向有問題舊址。

**Architecture:** 三個地區獨立研究檔按 id 疊加至既有 build-data.py。core.js 集中處理營業篩選與排序，app.js 沿用卡片新增證據與 Google 入口。

**Tech Stack:** 原生 JavaScript、Leaflet、Python JSON 建置、Node test。

## Global Constraints

- 沿用奶油白深綠手機介面與四個底部入口。
- 未核實數字留空；Google 轉載明確標示，不能稱即時。
- 永久／暫停歇業不進每日推薦；待確認排後。
- 有問題旧址不提供導航或圖釘；保留證據與 Google 查詢。
- 查核日 2026-10-13；120 天內 dated evidence 才列近期營業跡象。

## Tasks

- [x] 三位研究代理分別建立 research/google-audit-city.json、google-audit-beach.json、google-audit-hoian.json，每個現有 id 都有查核結果與不確定性。
- [x] 在 tests/core.test.cjs 驗證閉店記錄篩選及近期證據優先，先觀察失敗，再實作 core.js canRecommend/operationRank 及 selectRestaurants operating 選项。
- [x] tests/ui.test.cjs 以可控資料覆蓋驗證歇業／舊址導航停用及轉載標示，再實作 app.js/index.html/styles.css。
- [x] build-data.py 合併 audit，檢查 id、URL、評分範圍與日期；缺乏近期證據保留待確認。導航停用時保存舊座標並不發布圖釘。
- [x] 逐項檢視代理結果，特別是搬遷、同名、永久歇業與非 Google 評分混淆，交叉核對重要來源。
- [x] 重建資料、執行既有與新增測試、更新 README/快取，重建 ZIP 並核對根目錄 index.html 與新增研究檔。

不提交 Git 或發布網站；使用者要求交付可上傳 GitHub Pages 的完整檔案包。


2026-10-13 完成直接 Google 商家頁觀察覆蓋 45 家；直接觀察疊加於地區交叉研究之上。Google 未標歇業僅表示商家頁查核快照，不冒充電話或實際到訪確認。2 家永久歇業移出推薦，1 家仍待確認。保留交叉研究與直接觀察原稿。
