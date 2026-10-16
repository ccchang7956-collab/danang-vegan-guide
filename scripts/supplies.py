"""Render the supermarket research into explicitly managed HTML regions."""
import argparse
import html
import json
from pathlib import Path
import re
import sys
from urllib.parse import quote_plus, urlparse

ROOT = Path(__file__).resolve().parent.parent
CATEGORIES = {'noodles': '熱水就能吃的備案', 'snacks': '直接吃的隨身零食'}


def text(value):
    return html.escape(str(value), quote=True)


def require(condition, message):
    if not condition:
        raise ValueError(message)


def https(value):
    require(isinstance(value, str), 'URL must be a string')
    u = urlparse(value)
    require(u.scheme == 'https' and bool(u.hostname) and not u.username and not u.password
            and not any(ord(c) < 32 or c.isspace() for c in value), 'invalid HTTPS URL: ' + value)
    return value


def validate(data, asset_root):
    ids = set()
    html_ids = {'supply-' + region + suffix for region in (*CATEGORIES, 'stores', 'labels')
                for suffix in ('', '-heading')}
    for kind in ('products', 'stores'):
        require(isinstance(data.get(kind), list) and data[kind], 'missing ' + kind)
        for row in data[kind]:
            id_ = row.get('id')
            require(isinstance(id_, str) and re.fullmatch(r'[a-z][a-z0-9]*(?:-[a-z0-9]+)*', id_), 'invalid id')
            require(id_ not in ids, 'duplicate id: ' + id_)
            ids.add(id_)
            html_id = 'supply-' + ('store-' if kind == 'stores' else '') + id_
            require(html_id not in html_ids, 'duplicate HTML id: ' + html_id)
            html_ids.add(html_id)
            fields = ['name', 'note', 'source']
            if kind == 'products':
                fields += ['vi', 'status', 'ingredients', 'availability', 'imageCaption', 'sourceLabel']
            for field in fields:
                require(isinstance(row.get(field), str) and row[field].strip(), 'missing ' + field + ': ' + id_)
            https(row['source'])
            if kind == 'stores':
                require(row.get('address') is None or isinstance(row['address'], str), 'invalid address')
                continue
            require(row.get('category') in CATEGORIES, 'invalid category: ' + id_)
            require(row.get('confidence') in ('vegan', 'conditional'), 'invalid diet confidence: ' + id_)
            for field in ('reference', 'imageSourceUrl'):
                if row.get(field):
                    https(row[field])
            image_path = row.get('imagePath', '')
            require(isinstance(image_path, str) and re.fullmatch(r'assets/products/[a-z0-9][a-z0-9-]*\.(?:webp|png|jpg|jpeg)', image_path), 'invalid image path: ' + id_)
            image = (asset_root / image_path).resolve()
            require(image.is_relative_to((asset_root / 'assets/products').resolve()) and image.is_file(), 'missing image: ' + id_)
            for dimension in ('imageWidth', 'imageHeight'):
                require(type(row.get(dimension)) is int and 0 < row[dimension] <= 10000, 'invalid image dimensions: ' + id_)
    for row in data.get('excludedCandidates', []):
        https(row['source'])


def link(url, label):
    return f'<a href="{text(url)}" target="_blank" rel="noopener noreferrer">{text(label)} ↗<span class="sr-only">（開新分頁）</span></a>'


def product_card(p):
    name, image = text(p['name']), text(p['imagePath'])
    links = link(p['source'], p['sourceLabel'])
    if p.get('reference'):
        links += link(p['reference'], '另一個商品參考')
    return f'''<article class="supply-card" id="supply-{text(p['id'])}">
 <figure class="supply-photo"><a href="{image}" target="_blank" rel="noopener noreferrer" aria-label="放大{name}包裝圖片（開新分頁）"><img src="{image}" alt="{name}的包裝參考" width="{p['imageWidth']}" height="{p['imageHeight']}" decoding="async"></a><figcaption>{text(p['imageCaption'])}</figcaption></figure>
 <span class="diet-badge {text(p['confidence'])}">{text(p['status'])}</span>
 <h4>{name}</h4><p class="supply-vietnamese" lang="vi">{text(p['vi'])}</p>
 <p class="supply-ingredients">{text(p['ingredients'])}</p><p class="note">{text(p['note'])}</p>
 <p class="small-note supply-availability">{text(p['availability'])}</p>
 <div class="card-actions">{links}</div>
 </article>'''


def store_card(s):
    address = f'<p class="supply-vietnamese">{text(s["address"])}</p>' if s.get('address') else ''
    links = ''
    if s.get('address'):
        url = 'https://www.google.com/maps/search/?api=1&query=' + quote_plus(s['name'] + ', ' + s['address'])
        links += link(url, '地址導航')
    links += link(s['source'], '官方據點')
    return f'<article class="supply-card" id="supply-store-{text(s["id"])}"><h4>{text(s["name"])}</h4>{address}<p>{text(s["note"])}</p><div class="card-actions">{links}</div></article>'


def sections(data):
    result = {}
    for category, title in CATEGORIES.items():
        products = [p for p in data['products'] if p['category'] == category]
        result[category] = f'<section id="supply-{category}" class="supply-section" aria-labelledby="supply-{category}-heading"><div class="section-heading"><h3 id="supply-{category}-heading">{title}</h3><span class="count-badge">{len(products)} 款</span></div><div class="supply-grid">' + ''.join(map(product_card, products)) + '</div></section>'
    result['stores'] = '<section id="supply-stores" class="supply-section" aria-labelledby="supply-stores-heading"><div class="section-heading"><h3 id="supply-stores-heading">在峴港，去哪裡找？</h3></div><div class="supply-grid">' + ''.join(map(store_card, data['stores'])) + '</div></section>'
    return result


def render_supplies(data_path=ROOT / 'research/supermarket-supplies.json', html_path=ROOT / 'index.html', asset_root=ROOT, check=False):
    data = json.loads(Path(data_path).read_text(encoding='utf-8'))
    validate(data, Path(asset_root))
    original = Path(html_path).read_text(encoding='utf-8')
    rendered = original
    view_start = original.index('<section id="view-supplies"')
    view_end = original.index('<section id="supply-labels"', view_start)
    for region, markup in sections(data).items():
        start = f'<!-- generated:supplies-{region}:start -->'
        end = f'<!-- generated:supplies-{region}:end -->'
        require(original.count(start) == original.count(end) == 1, 'missing or duplicate generated markers: ' + region)
        require(view_start < original.index(start) < original.index(end) < view_end, 'generated markers outside supplies view')
        before, rest = rendered.split(start)
        _, after = rest.split(end)
        rendered = before + start + '\n      ' + markup + '\n      ' + end + after
    if check:
        require(rendered == original, 'supplies HTML is stale; run python3 scripts/supplies.py')
    elif rendered != original:
        Path(html_path).write_text(rendered, encoding='utf-8')
    return rendered != original


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data', type=Path, default=ROOT / 'research/supermarket-supplies.json')
    parser.add_argument('--html', type=Path, default=ROOT / 'index.html')
    parser.add_argument('--asset-root', type=Path, default=ROOT)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    try:
        render_supplies(args.data, args.html, args.asset_root, args.check)
    except (ValueError, KeyError, TypeError, OSError) as error:
        print(str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
