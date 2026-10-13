"""Rebuild browser data from research; no network requests or coordinates guessed."""
import json
from datetime import date
from pathlib import Path
from urllib.parse import urlparse
root=Path(__file__).resolve().parent.parent
audit_date='2026-10-13'
audits={}
for filename in ['google-audit-city.json','google-audit-beach.json','google-audit-hoian.json']:
    for audit in json.loads((root/'research'/filename).read_text()):
        assert audit['id'] not in audits, 'duplicate audit '+audit['id']
        assert audit['checkedDate']==audit_date, 'unexpected audit date'
        assert audit['googleLinkType'] in ['place','search']
        url=urlparse(audit['googleMapsUrl'])
        assert url.scheme=='https' and url.hostname in ['www.google.com','google.com','maps.google.com','maps.app.goo.gl','goo.gl','g.co'], 'invalid Google link'
        assert audit['operatingStatus'] in ['operating-evidence','unverified','permanently-closed','temporarily-closed']
        if audit['googleRating'] is not None:
            assert 1<=audit['googleRating']<=5 and isinstance(audit['googleReviewCount'],int) and audit['googleReviewCount']>=0
            assert audit['ratingSourceType'] in ['google-direct','google-indexed','google-mirror'] and audit['ratingSourceUrl']
        else:assert audit['googleReviewCount'] is None
        for u in audit['operatingSourceUrls']+[audit['ratingSourceUrl']] if audit['ratingSourceUrl'] else audit['operatingSourceUrls']:
            assert urlparse(u).scheme=='https'
        audits[audit['id']]=audit
direct={}
for observation in json.loads((root/'research/google-direct-observations.json').read_text()):
    id=observation['id']
    assert id in audits and id not in direct
    assert observation['checkedDate']==audit_date and 1<=observation['rating']<=5
    assert isinstance(observation['count'],int) and observation['count']>=0
    u=observation.get('url') or observation['requestedUrl']
    assert urlparse(u).scheme=='https' and urlparse(u).hostname in ['www.google.com','google.com','maps.app.goo.gl','goo.gl']
    a=audits[id]
    a.update(googleMapsUrl=u,googleLinkType='place',matchConfidence='verified',googleRating=observation['rating'],googleReviewCount=observation['count'],ratingSourceType='google-direct',ratingSourceUrl=u,ratingAsOfDate=audit_date,googlePlaceAddress=observation['address'],googleObservationDate=audit_date,navigationHold=False)
    a['ratingNote']='直接開啟 Google Maps 商家頁核對評分、評論數及地址；數字是查核日快照，非即時更新。'
    a['priorOperatingEvidenceText']=a['operatingEvidenceText']
    a['operatingSourceUrls']=list(dict.fromkeys([u]+a['operatingSourceUrls']))
    a['operatingEvidenceDate']=audit_date
    if observation.get('closed'):
        a['operatingStatus']='permanently-closed' if observation['closed']=='永久歇業' else 'temporarily-closed'
        a['operatingEvidenceText']='Google 商家頁直接標示「'+observation['closed']+'」；保留查核記錄，移出每日推薦並停用導航。'
    else:
        a['operatingStatus']='operating-evidence'
        a['operatingEvidenceText']='直接開啟 Google 商家頁：列有營業時段，未標示永久歇業／暫停營業。這是商家資料查核，未向店家電話確認，也不保證旅行當日開門。'
    if id=='khai-tam-city':
        a['operatingStatus']='unverified'
        a['operatingEvidenceText']='Google 商家頁存在且列 24 小時；近期實際用餐紀錄不足，時段可信度待確認，建議先電話詢問。'
    if id in ['dn-daibinh','hoian-an-hy']:
        a['suggestedAddress']=observation['address']+(', Đà Nẵng' if id.startswith('dn-') else ', Hội An, Đà Nẵng')
        a['addressIssue']='Google 商家頁現列此址，已更新地址與來源圖釘；舊地址保留於研究記錄。'
    if id=='hoian-ivegan':
        a['priorAddressIssue']=a.get('addressIssue')
        a['addressIssue']='直接核對 Google 商家頁為 672 Hai Bà Trưng，與原研究地址一致；同名其他地址不套用此分店。'
    if id=='hoian-quan-chay-cua-dai':a['googlePlaceName']='An Phuoc Vegetarian'
    direct[id]=observation
assert set(direct)==set(audits), 'direct Google observation coverage incomplete'
reviews={}
for review in json.loads((root/'research/restaurant-review-corrections.json').read_text()):
    id=review['id']
    assert id in audits and id not in reviews, 'invalid or duplicate review '+id
    assert review['hoursStatus']=='google-weekly-schedule-reviewed'
    assert review['hoursCheckedDate']==audit_date and review['phoneCheckedDate']==audit_date
    assert isinstance(review['hours'],str) and review['hours']
    assert isinstance(review['closedWeekdays'],list) and all(isinstance(d,int) and 0<=d<=6 for d in review['closedWeekdays'])
    for field in ['hoursSourceUrl','phoneSourceUrl']:
        u=urlparse(review[field])
        assert u.scheme=='https' and u.hostname in ['www.google.com','google.com','maps.google.com','maps.app.goo.gl','goo.gl','g.co'], 'invalid review source '+id
    reviews[id]=review
raw=json.loads((root/'research/itinerary.json').read_text())
exchange=json.loads((root/'research/exchange-points.json').read_text())
raw['exchangePoints']=exchange['points']
raw['exchangeLegalNotes']=exchange['legalNotes']
raw['exchangeCheckedDate']=exchange['checkedDate']
coords_path=root/'research/places-coordinates.json'
if coords_path.exists():
    coords=json.loads(coords_path.read_text())
    if isinstance(coords,dict): coords=coords.get('places',list(coords.values()))
    for p in raw['places']:
        found=next((c for c in coords if c.get('id')==p['id']),None)
        if found and isinstance(found.get('lat'),(int,float)):
            p.update(lat=found['lat'],lng=found['lng'],coordinateStatus=found.get('status','source-map-marker'),coordinateSourceUrl=found.get('sourceUrl'))
        else:p['coordinateStatus']='approximate-area-marker' if p['lat'] is not None else 'unverified'
else:
    for p in raw['places']:p['coordinateStatus']='approximate-area-marker' if p['lat'] is not None else 'unverified'
restaurants=[]
for filename in ['danang-city.json','danang-beach.json','hoian-outskirts.json']:
    rows=json.loads((root/'research'/filename).read_text())
    if isinstance(rows,dict):rows=rows['restaurants']
    for r in rows:
        r=dict(r);r['originalArea']=r['area']
        if filename=='danang-city.json':r['area']='sontra' if any(s in r['area'] for s in ['山茶','安海','壽光']) else 'danang-city'
        elif filename=='danang-beach.json':r['area']='sontra' if 'An Hai' in r['area'] else 'danang-beach'
        else:r['area']='banahills' if any(s in str(r['area']).lower() for s in ['ba na','bana','巴拿']) else 'hoian'
        r['diet']={'vegetarian-vegan-options':'vegetarian','vegan-options':'mixed','vegetarian-needs-confirmation':'uncertain','mixed-vegan-options':'mixed','vegan-claim-needs-confirmation':'uncertain','vegetarian-high-risk':'uncertain'}.get(r['diet'],r['diet'])
        if r['id']=='khai-tam-city':
            r['diet']='uncertain';r['risk']='最新可取得用餐記錄較舊，2026 是否營業未確認；出發前先詢問。'
        if 'banahills'==r['area']:
            r['veganNotes']=r['veganNotes'].replace('無法确认就吃預備外帶。','無法確認時請詢問可現做的純植物食材；入園前先聯絡確認全素方案。')
            r['diet']='uncertain';r['risk']='有旅客回報標示 vegan 仍出現奶製品或魚露；全素用餐需店家逐项確認。'
        if any(word in str(r.get('hoursStatus','')).lower() for word in ['conflict','unreliable','incomplete','old-directory','confirm closing']):
            r['reportedHours']=r['hours'];r['hours']=None
        if r['id']=='hoian-seeds':r['closedWeekdays']=[4,5]
        assert r['id'] in audits, 'missing restaurant audit '+r['id']
        audit=audits[r['id']]
        r['dietCheckedDate']=r['checkedDate']
        r.update(audit)
        if audit.get('suggestedAddress') and audit['suggestedAddress']!=r['address']:
            r['previousAddress']=r['address'];r['address']=audit['suggestedAddress']
            r['historicalCoordinates']={'lat':r['lat'],'lng':r['lng'],'sourceUrl':r.get('coordinateSourceUrl')}
            r['lat']=None;r['lng']=None;r['coordinateStatus']='new-address-no-verified-pin'
        if r.get('navigationHold'):
            r['underlyingOperatingStatus']=r['operatingStatus']
            if r['operatingStatus'] not in ['permanently-closed','temporarily-closed']:r['operatingStatus']='unverified'
            r['historicalCoordinates']={'lat':r['lat'],'lng':r['lng'],'sourceUrl':r.get('coordinateSourceUrl')}
            r['lat']=None;r['lng']=None;r['coordinateStatus']='withheld-address-conflict'
        if r['operatingStatus']=='operating-evidence':
            evidence_date=r.get('operatingEvidenceDate')
            age=(date.fromisoformat(audit_date)-date.fromisoformat(evidence_date)).days if evidence_date else None
            assert age is None or age>=0, 'future evidence '+r['id']
            if age is None or age>120:
                r['operatingStatus']='unverified'
                r['operatingEvidenceText']+=' 尚無可核對的近 120 日明確日期證據，列為待確認。'
        o=direct[r['id']]
        if isinstance(o.get('lat'),(int,float)) and isinstance(o.get('lng'),(int,float)) and not r.get('navigationHold'):
            r.update(lat=o['lat'],lng=o['lng'],coordinateStatus='source-google-business-marker',coordinateSourceUrl=r['googleMapsUrl'])
        if r['id']=='bana-ngoc-chi':r['address']=o['address']
        if r['id']=='hoian-quan-chay-cua-dai':r['name']='An Phuoc Vegetarian（333 Cửa Đại）'
        if r['id']=='khai-tam-city':r['risk']='Google 仍列有商家，但近期實際用餐紀錄與營業時段可信度不足；前往前先詢問。'
        if r['id'] in reviews:
            review=reviews[r['id']]
            r['reportedHoursHistory']=[{'hours':r.get('reportedHours',r.get('hours')),'status':r.get('hoursStatus'),'checkedDate':r.get('dietCheckedDate'),'sourceUrls':r.get('sourceUrls',[])}]
            if r.get('phone') and r['phone']!=review['phone']:
                r['reportedPhoneHistory']=[{'phone':r['phone'],'sourceUrls':r.get('sourceUrls',[]),'checkedDate':r.get('dietCheckedDate')}]
            if r['id']=='moms-kitchen':
                r['brandPhone']=r['phone'];r['brandPhoneSourceUrl']='https://chickpeaeatery.com/'
            r.update({k:v for k,v in review.items() if k!='id'})
            r['sourceUrls']=list(dict.fromkeys(r.get('sourceUrls',[])+[review['hoursSourceUrl'],review['phoneSourceUrl']]))
            if r['id']=='dn-lehoi':r['veganNotes']='HappyCow 全純素法國麵包攤；Google 每週時段已核對，週日 14:30 才開門。'
            if r['id']=='hoian-ivegan':r['veganNotes']='全素連鎖；碗餐、豆腐炒蛋、漢堡與植物奶。Google 每週時段已核對為每日 08:30–18:30。'
        restaurants.append(r)
assert len({r['id'] for r in restaurants})==len(restaurants),'duplicate restaurant IDs'
assert set(audits)=={r['id'] for r in restaurants}, 'audit has unmatched restaurant ids'
raw['restaurants']=restaurants;raw['checkedDate']=audit_date;raw['restaurantGoogleCheckedDate']=audit_date
meal_days=json.loads((root/'research/review-meal-coverage.json').read_text())['days']
assert [d['date'] for d in meal_days]==[d['date'] for d in raw['days']], 'meal dates mismatch'
by_id={r['id']:r for r in restaurants}
for d in meal_days:
    ids={id for meal in d['meals'] for id in meal['restaurantIds']}
    assert len(ids)>=2, 'need independent meal backups'
    for id in ids:
        r=by_id[id]
        assert r['diet']=='vegan' and r['operatingStatus']=='operating-evidence' and not r.get('navigationHold'), 'unsafe meal reference '+id
        assert date.fromisoformat(d['date']).isoweekday()%7 not in r.get('closedWeekdays',[]), 'closed meal reference '+id
raw['mealPlans']=meal_days

raw['restaurantAuditSummary']={
    'records':len(restaurants),
    'exactGoogleLinks':sum(r['googleLinkType']=='place' for r in restaurants),
    'googleSearchLinks':sum(r['googleLinkType']=='search' for r in restaurants),
    'googleDirectRatings':sum(r['ratingSourceType']=='google-direct' for r in restaurants),
    'googleRatings':sum(r['googleRating'] is not None for r in restaurants),
    'recentEvidence':sum(r['operatingStatus']=='operating-evidence' for r in restaurants),
    'unverified':sum(r['operatingStatus']=='unverified' for r in restaurants),
    'closed':sum(r['operatingStatus'] in ['permanently-closed','temporarily-closed'] for r in restaurants),
    'heldNavigation':sum(bool(r.get('navigationHold')) for r in restaurants)
}
(root/'assets/data.js').write_text('/* Curated on '+audit_date+'. Sources and uncertainty preserved per venue. */\nwindow.TRAVEL_DATA = '+json.dumps(raw,ensure_ascii=False,indent=2)+';\n')
print(f"Built {len(raw['days'])} days, {len(restaurants)} restaurants, {len(raw['exchangePoints'])} exchange points, {sum(r['lat'] is not None for r in restaurants)} restaurant map pins")
