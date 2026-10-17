"""Render the checked Grab research as a reviewable per-branch report."""
import json
from collections import Counter
from pathlib import Path

root = Path(__file__).resolve().parent.parent
data = json.loads((root / 'research/restaurant-grab-2026-10-17.json').read_text())
labels = {
    'official-link': '有官方 Grab 入口',
    'reported': '有回報或索引線索，需 App 確認',
    'historical': '僅舊資料，需再確認',
    'unverified': 'Grab 待確認',
    'closed': '歇業記錄，停止推薦',
}
rows = data['restaurants']
counts = Counter(row['status'] for row in rows)
parts = [
    '# 素食店家 Grab 查核（2026-10-17）', '',
    f"完整覆蓋專案 {len(rows)} 家：{counts['official-link']} 家有官網提供的分店入口、{counts['reported']} 家有回報或索引線索、{counts['historical']} 家僅舊資料、{counts['unverified']} 家待確認、{counts['closed']} 家為既有歇業記錄。這些狀態不是即時接單承諾。", '',
    '## 使用方式', '',
    '附近素食 → 展開「用餐時間、區域與更多條件」→「Grab 外送查核」。每張卡片顯示狀態；展開「Grab 外送查核與搜尋」可複製店名、核對地址及閱讀來源。有官方入口者可按「開啟 Grab 分店」。不限制飯店地址。', '',
    '## 查核方法與限制', '', data['method'], '',
    *['- ' + note for note in data['limitations']],
    '- official-link 僅表示官網提供入口，未驗證商家目前接單。',
    '- reported 包含平台新聞、明確回報與已標註限制的索引線索，不代表已核實現況。historical 不列入「有 Grab 入口或回報線索」篩選。',
    '- 待確認記錄中的來源可能是分店辨識或排除證據，不是 Grab 上架證明。',
    '- 證據日期保留來源日期或相對描述，不從搜尋抓取日反推。', '',
    '## 官方入口', '',
]
for row in rows:
    if row['status'] == 'official-link':
        parts += [f"- **{row['searchName']} · {row['branchAddress']}**：[官網]({row['sourceUrls'][0]}) · [店家提供的 Grab 入口]({row['url']})。{row['note']}"]
parts += ['', '## 全部店家查核表', '',
          '| 店家／搜尋名稱 | 分店地址 | Grab 結果 | 證據日期 |',
          '| --- | --- | --- | --- |']
for row in rows:
    parts += [f"| {row['searchName']} | {row['branchAddress']} | {labels[row['status']]} | {row['evidenceDate'] or '未標示／未核實'} |"]
parts += ['', '## 逐店依據與待確認原因', '']
for row in rows:
    parts += [f"### {row['searchName']}（{row['id']}）", '',
              labels[row['status']] + '。' + row['note'], '',
              f"查核日：{row['checkedDate']}；證據日期：{row['evidenceDate'] or '未標示／未核實'}；證據類型：`{row['evidenceType']}`。", '']
    if row['sourceUrls']:
        parts += ['來源：' + '、'.join(f'[來源 {i + 1}]({url})' for i, url in enumerate(row['sourceUrls'])) + '。', '']
parts += [
    '## 排除與未採信的資料', '',
    '- 馬來西亞 Grab 任意店名搜尋頁不是越南分店上架證據；沒有拿搜尋 URL 當商家直達。',
    '- 叫 Grab 車、Grab-and-go、一般外送標籤與 ShopeeFood 上架均不足以證明 GrabFood。',
    '- 泛列多家外送服務但缺分店依據、或把 KURUMI 描述為山上店等矛盾整理文，未單獨採信。',
    '- Minh Hien 2 的 Grab 評論不可套用到專案 26/16 Thái Phiên 分店。',
    '- 峴港 iVegan 舊新聞不套用會安；市區 Ngọc Chi 不套用巴拿山；會安 Chickpea 回報不套用其他品牌分店。',
    '- Rau Ơi 活動轉載顯示 Danang，未作分店證據；只保留相符地址的舊 HappyCow 回報。', '',
    '機器可讀資料：[restaurant-grab-2026-10-17.json](restaurant-grab-2026-10-17.json)。',
]
(root / 'research/restaurant-grab-2026-10-17.md').write_text('\n'.join(parts) + '\n')
