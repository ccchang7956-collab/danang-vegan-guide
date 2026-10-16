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
hours_conflicts={r['id']:r for r in json.loads((root/'research/restaurant-hours-conflicts.json').read_text())}
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
        if 'business-info' in str(r.get('hoursStatus','')) and any(year in str(r.get('hoursStatus','')) for year in ['2019','2020']):
            r['hoursStatus']='old-directory; '+r['hoursStatus']
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
        if r['id'] in hours_conflicts:
            r['reportedHours']=r.get('reportedHours',r.get('hours'));r['hours']=None
            r['hoursStatus']='google-single-day-conflict-with-reported-schedule'
            r['hoursReviewNote']=hours_conflicts[r['id']]['reason']
            r['hoursConflictSourceUrl']=r['googleMapsUrl'];r['hoursConflictCheckedDate']=o['checkedDate']
            r['googleObservedHoursSnippet']=o['hours']
            if r['id']=='an-lac-tam-2':r['hoursExceptionNote']='舊來源另提到農曆休息日；每週時段及農曆例外都請先確認。'
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
addition=json.loads((root/'research/loving-hut-danang-addition.json').read_text())
r=dict(addition['original']);r['dietCheckedDate']=r['checkedDate'];r.update(addition['audit'])
assert r['id'] not in {old['id'] for old in restaurants}, 'duplicate addition'
assert r['operatingStatus']=='unverified' and r['ratingSourceType']=='google-mirror' and not addition['observations'], 'addition must preserve limited verification'
assert r['googleReviewCount'] is None and r['hours'] is None, 'unverified count/hours'
assert r['coordinateSourceUrl'] in r['sourceUrls'] and -90<=r['lat']<=90 and -180<=r['lng']<=180
assert urlparse(r['googleMapsUrl']).hostname=='share.google', 'invalid shared link'
restaurants.append(r)
full_recheck=json.loads((root/'research/restaurant-full-recheck-2026-10-14.json').read_text())
recheck_date=full_recheck['checkedDate']
rechecks={r['id']:r for r in full_recheck['restaurants']}
assert len(rechecks)==len(restaurants) and set(rechecks)=={r['id'] for r in restaurants}, 'full recheck coverage incomplete'
for r in restaurants:
    review=rechecks[r['id']]
    assert review['checkedDate']==recheck_date and review['phone']
    assert review['hours'] or review['operatingStatus']=='permanently-closed'
    assert review['googleReviewCount']>=0 and 1<=review['googleRating']<=5
    r['priorFullReview']={k:r.get(k) for k in ['name','address','phone','hours','hoursStatus','closedWeekdays','checkedDate','operatingStatus','googleMapsUrl','googleRating','googleReviewCount','ratingSourceType','hoursReviewNote','addressIssue','lat','lng','coordinateSourceUrl']}
    r['searchAliases']=list(dict.fromkeys([r['name'],r.get('googlePlaceName') or '',*r.get('searchAliases',[])]))
    r['reportedHoursHistory']=r.get('reportedHoursHistory',[])+[{'hours':r.get('hours'),'status':r.get('hoursStatus'),'checkedDate':r.get('hoursCheckedDate',r['checkedDate']),'sourceUrls':[r.get('hoursSourceUrl',r['googleMapsUrl'])]}]
    r['reportedPhoneHistory']=r.get('reportedPhoneHistory',[])+[{'phone':r.get('phone'),'checkedDate':r.get('phoneCheckedDate',r['checkedDate']),'sourceUrls':[r.get('phoneSourceUrl',r['googleMapsUrl'])]}]
    r.update({k:v for k,v in review.items() if k not in ['id','method','lat','lng']})
    r.update(googlePlaceName=review['name'],googlePlaceAddress=review['address'],googleLinkType='place',matchConfidence='verified',ratingSourceType='google-direct',ratingSourceUrl=review['googleMapsUrl'],ratingAsOfDate=recheck_date,googleObservationDate=recheck_date,operatingEvidenceDate=recheck_date,hoursCheckedDate=recheck_date,phoneCheckedDate=recheck_date,dietCheckedDate=recheck_date,nameCheckedDate=recheck_date,addressCheckedDate=recheck_date,hoursSourceUrl=review['googleMapsUrl'],phoneSourceUrl=review['googleMapsUrl'],hoursStatus='google-weekly-schedule-reviewed',navigationHold=False)
    r['ratingNote']='2026-10-14 直接開啟對應 Google 商家頁核對；評分與評論數是查核快照，非即時更新。'
    r['operatingSourceUrls']=list(dict.fromkeys([review['googleMapsUrl']]+r.get('operatingSourceUrls',[])))
    r['sourceUrls']=list(dict.fromkeys(r['sourceUrls']+[review['googleMapsUrl']]+review['dietSourceUrls']))
    r['operatingEvidenceText']='2026-10-14 直接開啟對應 Google 商家頁，未標示歇業並列有完整每週時段；未電話聯絡，不保證旅行當日開門。'
    if r['operatingStatus']=='permanently-closed':
        r['operatingEvidenceText']='2026-10-14 Google 商家頁仍直接標示永久歇業；只保留查核記錄，不提供導航或每日推薦。'
        r['veganNotes']='歇業前的全素店家記錄；本次 Google 仍標永久歇業，請另選餐廳。'
        r['hoursStatus']='google-permanently-closed'
    if r['id']=='khai-tam-city':
        r['operatingEvidenceText']='Google 商家頁存在且每週均列 24 小時；與舊供餐時段不符，近期實際用餐證據不足，營運仍待電話確認。'
        r['hoursStatus']='google-weekly-schedule-reviewed; unverified-service-hours'
    if 'lat' in review:
        r.update(lat=review['lat'],lng=review['lng'],coordinateStatus='source-google-business-marker',coordinateSourceUrl=review['googleMapsUrl'],coordinateCheckedDate=recheck_date)
    elif r.get('coordinateSourceUrl'):
        r['coordinateCheckedDate']=r.get('googleObservationDate') if r['id']=='bana-ngoc-chi' else audit_date
    # The street/branch was rechecked; a spelling or ward change is not evidence of relocation.
    r['addressIssue']=review.get('addressReviewNote','')
    for key in ['googleObservedHoursSnippet','hoursConflictSourceUrl','hoursConflictCheckedDate','hoursExceptionNote']:
        r.pop(key,None)
    if r['id'] in ['an-lac-tam-2','hoian-an-hy','hoian-quan-chay-cua-dai','loving-hut-danang']:
        r['hoursExceptionNote']=review['hoursReviewNote']
    if r['id']=='dn-alt':r['veganNotes']='Chickpea 官方列出的全素植物製咖啡館；本次已直接核對此分店每週時段與電話。'
    if r['id']=='hoian-hoi-banh-mi':r['veganNotes']='HappyCow 全素麵包攤；本次對應 Google 商家為 Lê Hội Bánh MÌ Chay，位於 3 Nguyễn Huệ；勿套用 136 Trần Phú 分店。'
    if r['id']=='loving-hut-danang':r['risk']='Google 商家頁與每週時段已直接確認；奶精、零售包裝食品及醬料的全素條件仍需逐項詢問。'
    if r['id']=='hoian-plantlab':r['veganNotes']+=' Google 電話 +84 383 541 871；官網 Zalo／WhatsApp +84 799 409 293。'
    if r['id'] in ['dn-chickpea','dn-alt','hoian-chickpea','moms-kitchen']:
        r['brandPhone']='+84 766 731 285';r['brandPhoneSourceUrl']='https://chickpeaeatery.com/'
        r['veganNotes']+=' 卡片電話採 Google 分店號碼；Chickpea 官網品牌聯絡電話為 +84 766 731 285。'
from restaurant_metadata import enrich_restaurants
enrich_restaurants(restaurants, json.loads((root/'research/restaurant-search-metadata.json').read_text()))
menu_research=json.loads((root/'research/restaurant-menus-2026-10-16.json').read_text())
menus={m['id']:m for m in menu_research['restaurants']}
assert len(menus)==len(restaurants) and set(menus)=={r['id'] for r in restaurants}, 'menu coverage mismatch'
for r in restaurants:
    menu=menus[r['id']]
    assert menu['checkedDate']==menu_research['checkedDate']
    assert all(urlparse(u).scheme=='https' for u in menu['sourceUrls'])
    assert not menu['menuUrl'] or urlparse(menu['menuUrl']).scheme=='https'
    for item in menu['items']:
        assert item['name'] and item['veganEvidence'] and menu['sourceUrls'], 'menu evidence missing'
        assert item['priceVnd'] is None or (isinstance(item['priceVnd'],int) and item['priceVnd']>0), 'invalid menu price'
    r['menuInfo']=menu
raw['menuCheckedDate']=menu_research['checkedDate']
raw['restaurantFullRecheckDate']=recheck_date
raw['restaurants']=restaurants;raw['checkedDate']=addition['checkedDate'];raw['restaurantGoogleCheckedDate']=audit_date
raw['checkedDate']=max(raw['checkedDate'],recheck_date);raw['restaurantGoogleCheckedDate']=recheck_date
raw['restaurantAdditionCheckedDate']=addition['checkedDate']
meal_days=json.loads((root/'research/review-meal-coverage.json').read_text())['days']
assert [d['date'] for d in meal_days]==[d['date'] for d in raw['days']], 'meal dates mismatch'
by_id={r['id']:r for r in restaurants}
for d in meal_days:
    for meal in d['meals']:
        assert meal['anchorId'] in {p['id'] for p in raw['places']}
        assert __import__('re').fullmatch(r'([01]\d|2[0-3]):[0-5]\d', meal['time'])
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
    'sharedBusinessLinks':sum(r['googleLinkType']=='shared-business' for r in restaurants),
    'googleSearchLinks':sum(r['googleLinkType']=='search' for r in restaurants),
    'googleDirectRatings':sum(r['ratingSourceType']=='google-direct' for r in restaurants),
    'googleRatings':sum(r['googleRating'] is not None for r in restaurants),
    'recentEvidence':sum(r['operatingStatus']=='operating-evidence' for r in restaurants),
    'unverified':sum(r['operatingStatus']=='unverified' for r in restaurants),
    'closed':sum(r['operatingStatus'] in ['permanently-closed','temporarily-closed'] for r in restaurants),
    'heldNavigation':sum(bool(r.get('navigationHold')) for r in restaurants)
}
(root/'assets/data.js').write_text('/* Updated on '+raw['checkedDate']+'. Sources and uncertainty preserved per venue. */\nwindow.TRAVEL_DATA = '+json.dumps(raw,ensure_ascii=False,indent=2)+';\n')
print(f"Built {len(raw['days'])} days, {len(restaurants)} restaurants, {len(raw['exchangePoints'])} exchange points, {sum(r['lat'] is not None for r in restaurants)} restaurant map pins")
