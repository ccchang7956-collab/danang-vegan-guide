"""Strict conversion of the reviewed Chinese weekly table; unknown formats fail the build."""
import re

DAYS = {'日': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6}


def weekly_hours(text):
    if not text or '24 小時' in text:
        return None
    result = [None] * 7
    for clause in text.split('；'):
        match = re.fullmatch(r'(每日|週[週一二三四五六日至、]+)\s*(.+)', clause)
        assert match, f'Unrecognized weekly clause: {clause}'
        label, value = match.groups()
        selected = set(range(7)) if label == '每日' else set()
        if label != '每日':
            for part in label.replace('週', '').split('、'):
                if '至' in part:
                    start, end = (DAYS[c] for c in part.split('至'))
                    selected.update(range(start, end + 1)) if start <= end else selected.update(list(range(start, 7)) + list(range(end + 1)))
                else:
                    selected.add(DAYS[part])
        intervals = []
        if value != '休息':
            for span in value.split('、'):
                m = re.fullmatch(r'(\d{2}):(\d{2})–(\d{2}):(\d{2})', span)
                assert m, f'Unrecognized service span: {span}'
                h1, m1, h2, m2 = map(int, m.groups())
                assert h1 < 24 and h2 <= 24 and m1 < 60 and m2 < 60 and (h2 != 24 or m2 == 0)
                start, end = h1 * 60 + m1, h2 * 60 + m2
                if end <= start:
                    end += 1440
                intervals.append([start, end])
        for day in selected:
            assert result[day] is None, f'Duplicate weekday: {text}'
            result[day] = intervals
    assert all(day is not None for day in result), f'Incomplete weekly table: {text}'
    return result


def enrich_restaurants(restaurants, metadata):
    assert set(metadata) <= {r['id'] for r in restaurants}
    for r in restaurants:
        r['weeklyHours'] = weekly_hours(r.get('hours'))
        if r['weeklyHours']:
            assert [i for i, spans in enumerate(r['weeklyHours']) if not spans] == sorted(r['closedWeekdays']), r['id']
        r['hoursCaution'] = metadata.get(r['id'])
        caution = r['hoursCaution']
        if caution:
            assert caution['checkedDate'] == r['hoursCheckedDate'], f"Revisit hours caution after recheck: {r['id']}"
            assert caution['kind'] in ['exception', 'conflict', 'unverified'] and caution['message'] and caution['sourceUrls']
            assert caution['weekdays'] and all(isinstance(day, int) and 0 <= day <= 6 for day in caution['weekdays'])
            assert all(url.startswith('https://') for url in caution['sourceUrls'])
        # Only expand cuisine terms already present in the researched record.
        text = r['name'] + ' ' + r['veganNotes']
        synonyms = [(['Bánh Mì', 'Bánh MÌ', 'Banh My', '法國麵包'], ['法國麵包', '越式三明治', '越南麵包', 'banh mi', 'banh my']),
                    (['漢堡'], ['漢堡', 'burger']), (['披薩'], ['披薩', '比薩', 'pizza']),
                    (['咖啡', 'Café', 'Cafe'], ['咖啡', 'cafe', 'coffee'])]
        r['cuisineAliases'] = list(dict.fromkeys(alias for terms, aliases in synonyms if any(term in text for term in terms) for alias in aliases))
