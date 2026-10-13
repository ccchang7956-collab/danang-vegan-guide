const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const env={window:{}};vm.runInNewContext(fs.readFileSync('assets/data.js','utf8'),env);const D=env.window.TRAVEL_DATA;
class Element{
 constructor(id=''){this.id=id;this.hidden=false;this.textContent='';this.value='';this.listeners={};this.classList={add(){},remove(){},toggle(){}};this._html='';this.appended=[];}
 set innerHTML(s){this._html=s;if(this.id==='day-anchor')this.value='route';}
 get innerHTML(){return this._html;}
 addEventListener(t,cb){this.listeners[t]=cb;}
 append(p){this.appended.push(p);}
 setAttribute(){}removeAttribute(){}scrollIntoView(){}querySelector(){return new Element();}showModal(){this.hidden=false;}close(){this.hidden=true;}
}
function harness(options={}){
 const ids=[...fs.readFileSync('index.html','utf8').matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 const elements=new Map(ids.map(id=>[id,new Element(id)]));elements.get('area-filter').value='all';elements.get('diet-filter').value='all';
 const docListeners={},nav=['daily','nearby','exchange','phrase'].map(view=>{const el=new Element();el.dataset={view};return el;});
 const document={body:new Element(),getElementById:id=>elements.get(id),querySelectorAll:()=>nav,createElement:()=>new Element(),addEventListener:(t,cb)=>docListeners[t]=cb};
 const mapMarkers=[],fits=[];
 const mapStub={setView(){return this;},invalidateSize(){},fitBounds(bounds){fits.push(bounds);}};
 const layerStub={addTo(){return this;},clearLayers(){mapMarkers.length=0;}};
 const leaflet=options.withMap?{
  map:()=>mapStub,layerGroup:()=>layerStub,divIcon:icon=>icon,
  tileLayer:()=>({addTo(){return this;},on(){return this;}}),
  circleMarker:()=>({bindTooltip(){return this;},addTo(){return this;}}),circle:()=>({addTo(){return this;}}),
  marker:(coords,opts)=>({bindPopup(box){this.popup=box;return this;},addTo(){mapMarkers.push({name:opts.title,popup:this.popup});return this;}})
 }:undefined;
 const context={window:{TRAVEL_DATA:options.data||D,TravelCore:require('../assets/core.js'),addEventListener(){},scrollTo(){},isSecureContext:true},document,navigator:{onLine:true,...options.navigator},location:{protocol:'file:'},URL,requestAnimationFrame:cb=>cb(),setTimeout:()=>1,clearTimeout(){},console};
 if(leaflet){context.L=leaflet;context.window.L=leaflet;}
 vm.runInNewContext(fs.readFileSync('assets/app.js','utf8'),context);
 return {elements,mapMarkers,fits,clickView:v=>docListeners.click({target:{closest:selector=>selector==='[data-view]'?nav.find(n=>n.dataset.view===v):null}})};
}
test('daily and nearby restaurant cards do not share hidden card IDs',()=>{
 const h=harness();const daily=h.elements.get('day-restaurant-list').innerHTML;h.clickView('nearby');const nearby=h.elements.get('restaurant-list').innerHTML;
 const a=new Set([...daily.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]));const b=[...nearby.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);assert.ok(a.size>0&&b.length>0);assert.ok(b.every(id=>!a.has(id)),'map popup could resolve hidden card');
});
test('full catalogue filtering and empty state are usable without map library',()=>{
 const h=harness();h.clickView('nearby');assert.equal(h.elements.get('result-count').textContent,D.restaurants.filter(r=>!['permanently-closed','temporarily-closed'].includes(r.operatingStatus)).length+' 間');h.elements.get('diet-filter').value='vegan';h.elements.get('diet-filter').listeners.change();assert.ok(!h.elements.get('restaurant-list').innerHTML.includes('素食店・確認蛋奶'));
 h.elements.get('search-input').value='zzzzz不存在';h.elements.get('search-input').listeners.input();assert.equal(h.elements.get('result-count').textContent,'0 間');assert.match(h.elements.get('restaurant-list').innerHTML,/沒有找到餐廳/);assert.match(h.elements.get('map').innerHTML,/互動地圖未載入/);
});
test('five day buttons update plans and preserve cross-city reminder',()=>{
 const h=harness();h.elements.get('day-tabs').listeners.click({target:{closest:()=>({dataset:{day:'2'}})}});assert.match(h.elements.get('day-notes').innerHTML,/不同城市/);assert.match(h.elements.get('itinerary-list').innerHTML,/美山聖地/);
});
test('Ba Na backup remains visible without pretending it has a precise nearby pin',()=>{
 const data=structuredClone(D);const mountain=data.restaurants.find(r=>r.id==='bana-ngoc-chi');mountain.lat=null;mountain.lng=null;const h=harness({data});h.elements.get('day-tabs').listeners.click({target:{closest:()=>({dataset:{day:'1'}})}});h.elements.get('day-anchor').value='bana';h.elements.get('day-anchor').listeners.change();const list=h.elements.get('day-restaurant-list').innerHTML;assert.match(list,/Ngọc Chi/);assert.match(list,/尚無查證座標/);
});

test('GPS denial keeps a visible reference-location fallback',()=>{
 const h=harness({navigator:{geolocation:{getCurrentPosition:(ok,fail)=>fail({code:1})}}});h.elements.get('locate-btn').listeners.click();assert.match(h.elements.get('location-status').textContent,/未允許定位/);assert.equal(h.elements.get('locate-btn').disabled,false);assert.equal(h.elements.get('result-count').textContent,D.restaurants.filter(r=>!['permanently-closed','temporarily-closed'].includes(r.operatingStatus)).length+' 間');
});
test('GPS success orders from actual user position rather than selected hotel',()=>{
 const h=harness({navigator:{geolocation:{getCurrentPosition:ok=>ok({coords:{latitude:16.0486741,longitude:108.2477863,accuracy:20}})}}});h.elements.get('locate-btn').listeners.click();assert.match(h.elements.get('location-status').textContent,/GPS 精度約 20/);assert.match(h.elements.get('restaurant-list').innerHTML.slice(0,500),/Roots Plant-Based Cafe/);assert.equal(h.elements.get('reference-select').value,'gps');
});
test('known Thursday and Friday closure is prominent in daily recommendations',()=>{
 const h=harness();h.elements.get('day-tabs').listeners.click({target:{closest:()=>({dataset:{day:'1'}})}});const list=h.elements.get('day-restaurant-list').innerHTML;assert.match(list,/此日來源列為休息日/);assert.ok(list.indexOf('KURUMI Hoi An')<list.indexOf('The Seeds Plant-Based'));
});
test('late GPS success cannot give hidden nearby cards daily IDs',()=>{
 let resolve;const h=harness({navigator:{geolocation:{getCurrentPosition:ok=>resolve=ok}}});h.elements.get('locate-btn').listeners.click();h.clickView('daily');resolve({coords:{latitude:16.0486741,longitude:108.2477863,accuracy:20}});const daily=h.elements.get('day-restaurant-list').innerHTML;const nearby=h.elements.get('restaurant-list').innerHTML;const a=new Set([...daily.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]));assert.ok([...nearby.matchAll(/\sid="([^"]+)"/g)].every(m=>!a.has(m[1])));
});
test('late GPS denial does not re-render hidden nearby cards under daily view',()=>{
 let reject;const h=harness({navigator:{geolocation:{getCurrentPosition:(ok,fail)=>reject=fail}}});h.elements.get('locate-btn').listeners.click();h.clickView('daily');const before=h.elements.get('restaurant-list').innerHTML;reject({code:1});assert.ok(h.elements.get('restaurant-list').innerHTML===before,'hidden nearby list was unexpectedly re-rendered');
});
test('closed restaurants never appear in daily recommendations but are readable in archive',()=>{
 const data=structuredClone(D);const r=data.restaurants.find(r=>r.id==='dn-roots');r.operatingStatus='permanently-closed';r.googleMapsUrl='https://www.google.com/maps?cid=123';r.googleLinkType='place';
 const h=harness({data});assert.ok(!h.elements.get('day-restaurant-list').innerHTML.includes('card-daily-dn-roots'));
 h.clickView('nearby');const filter=h.elements.get('operating-filter');assert.ok(filter,'operation archive filter exists');filter.value='closed';filter.listeners.change();
 assert.match(h.elements.get('restaurant-list').innerHTML,/永久歇業/);assert.ok(!h.elements.get('restaurant-list').innerHTML.includes('開始導航'));
});
test('closed restaurant map popups link to business details instead of old-address navigation',()=>{
 for(const status of ['permanently-closed','temporarily-closed']){
  const data=structuredClone(D),r=data.restaurants.find(r=>r.id==='dn-roots');
  Object.assign(r,{operatingStatus:status,googleMapsUrl:'https://www.google.com/maps?cid=123',googleLinkType:'place'});
  const h=harness({data,withMap:true});h.clickView('nearby');
  h.elements.get('operating-filter').value='closed';h.elements.get('operating-filter').listeners.change();
  const popup=h.mapMarkers.find(m=>m.name===r.name)?.popup;assert.ok(popup,'closed archive retains historical marker');
  const links=popup.appended.filter(el=>el.href);assert.equal(links.length,1);
  assert.equal(links[0].href,r.googleMapsUrl);assert.match(links[0].textContent,/Google 商家/);
  assert.ok(!links[0].textContent.includes('導航'));
 }
});
test('old-address navigation is held and Google mirror score never appears as live Google rating',()=>{
 const data=structuredClone(D);const r=data.restaurants.find(r=>r.id==='dn-roots');Object.assign(r,{navigationHold:true,operatingStatus:'unverified',googleMapsUrl:'https://www.google.com/maps?cid=123',googleLinkType:'place',googleRating:4.7,googleReviewCount:3983,ratingSourceType:'google-mirror',ratingSourceUrl:'https://example.org/mirror',checkedDate:'2026-10-13',addressIssue:'原址有搬遷衝突，請先確認'});
 const h=harness({data});h.clickView('nearby');const cards=h.elements.get('restaurant-list').innerHTML;const card=cards.match(/<article[^>]*id="card-nearby-dn-roots"[\s\S]*?<\/article>/)?.[0];assert.ok(card);
 assert.match(card,/轉載/);assert.match(card,/maps\?cid=123/);assert.ok(!card.includes('開始導航'));assert.match(card,/原址有搬遷衝突/);
});

test('date change through exchange resets daily anchor and nearby reference',()=>{
 const h=harness();h.elements.get('day-anchor').value='lesands';h.elements.get('day-anchor').listeners.change();h.clickView('exchange');h.elements.get('exchange-day').value='1';h.elements.get('exchange-day').listeners.change();h.clickView('daily');assert.equal(h.elements.get('day-anchor').value,'route');h.clickView('nearby');assert.equal(h.elements.get('reference-select').value,'sonhotel');
});
test('daily date change resets exchange anchor',()=>{
 const h=harness();h.clickView('exchange');h.elements.get('exchange-anchor').value='lesands';h.elements.get('exchange-anchor').listeners.change();h.clickView('daily');h.elements.get('day-tabs').listeners.click({target:{closest:()=>({dataset:{day:'1'}})}});h.clickView('exchange');assert.equal(h.elements.get('exchange-anchor').value,'route');
});
test('manual reference selection wins over a pending GPS response',()=>{
 let resolve;const h=harness({navigator:{geolocation:{getCurrentPosition:ok=>resolve=ok}}});h.elements.get('locate-btn').listeners.click();h.elements.get('reference-select').value='oldtown';h.elements.get('reference-select').listeners.change();resolve({coords:{latitude:16.04,longitude:108.24,accuracy:10}});assert.equal(h.elements.get('reference-select').value,'oldtown');assert.equal(h.elements.get('locate-btn').disabled,false);assert.ok(!h.elements.get('location-status').textContent.includes('GPS 精度'));
});
test('exchange GPS label resets after choosing a manual nearby reference',()=>{
 const h=harness({navigator:{geolocation:{getCurrentPosition:ok=>ok({coords:{latitude:16.04,longitude:108.24,accuracy:10}})}}});h.elements.get('exchange-locate-btn').listeners.click();assert.match(h.elements.get('exchange-list').innerHTML,/距你的定位/);h.clickView('nearby');h.elements.get('reference-select').value='oldtown';h.elements.get('reference-select').listeners.change();h.clickView('exchange');assert.ok(!h.elements.get('exchange-list').innerHTML.includes('距你的定位'));assert.match(h.elements.get('exchange-location-status').textContent,/當天行程/);
});
test('exchange map popup exposes verified status and card access',()=>{
 const h=harness({withMap:true});h.clickView('exchange');const p=D.exchangePoints.find(r=>r.lat!==null),box=h.mapMarkers.find(m=>m.name===p.name).popup;assert.ok(box.appended.some(el=>el.textContent.includes(p.statusLabel)));assert.ok(box.appended.some(el=>el.textContent==='查看換匯點資訊'));
});

test('quick vegan action clears stale search and closed archive filters',()=>{
 const h=harness();h.clickView('nearby');h.elements.get('search-input').value='zzzz';h.elements.get('operating-filter').value='closed';assert.ok(h.elements.get('quick-vegan'),'quick vegan control');h.elements.get('quick-vegan').listeners.click();assert.equal(h.elements.get('search-input').value,'');assert.equal(h.elements.get('operating-filter').value,'available');assert.equal(h.elements.get('diet-filter').value,'vegan');assert.ok(!h.elements.get('restaurant-list').innerHTML.includes('素食店・確認蛋奶'));
});
test('choosing a daily anchor fits its nearby restaurants rather than whole cross-city route',()=>{
 const h=harness({withMap:true});h.elements.get('day-tabs').listeners.click({target:{closest:()=>({dataset:{day:'1'}})}});h.elements.get('day-anchor').value='bana';h.elements.get('day-anchor').listeners.change();const bounds=h.fits.at(-1);assert.ok(bounds.every(p=>p[1]<108.1),'Hoi An must not dominate Ba Na focused map');
});
test('nearby region filter fits visible restaurants',()=>{
 const h=harness({withMap:true});h.clickView('nearby');const before=h.fits.length;h.elements.get('area-filter').value='hoian';h.elements.get('area-filter').listeners.change();assert.ok(h.fits.length>before);assert.ok(h.fits.at(-1).every(p=>p[0]<15.95),'Da Nang reference must not dominate Hoi An filtered map');
});

test('daily meal plan follows date and exposes the Ba Na contingency',()=>{
 const h=harness();assert.match(h.elements.get('meal-plan').innerHTML,/抵達後/);
 h.elements.get('day-tabs').listeners.click({target:{closest:()=>({dataset:{day:'1'}})}});
 const plan=h.elements.get('meal-plan').innerHTML;assert.match(plan,/禁止攜帶外食/);assert.match(plan,/縮短遊園/);assert.match(plan,/Chickpea/);assert.doesNotMatch(plan,/Emma/);
});
