const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const target = path.join(__dirname, '../assets/core.js');
const C = fs.existsSync(target) ? require(target) : {};
test('unknown coordinates cannot masquerade as nearest', () => {
  assert.equal(typeof C.hasCoordinates, 'function');
  assert.equal(C.hasCoordinates({lat:null,lng:null}), false);
  assert.equal(C.hasCoordinates({lat:16,lng:108}), true);
  assert.equal(C.distanceKm({lat:16,lng:108},{lat:null,lng:null}), null);
});
test('haversine returns physically meaningful distances', () => {
  assert.equal(typeof C.distanceKm,'function');
  assert.ok(Math.abs(C.distanceKm({lat:0,lng:0},{lat:1,lng:0})-111.195)<0.01);
  assert.equal(C.distanceKm({lat:16,lng:108},{lat:16,lng:108}),0);
});
const records=[{id:'far',name:'Café Chay',area:'danang',diet:'vegan',lat:16.1,lng:108},{id:'unknown',name:'No marker',area:'danang',diet:'vegan',lat:null,lng:null},{id:'near',name:'Chay Egg',area:'danang',diet:'vegetarian',lat:16.01,lng:108}];
test('nearest order puts unknown last without mutating source', () => {
  assert.equal(typeof C.selectRestaurants,'function');
  assert.deepEqual(C.selectRestaurants(records,{origin:{lat:16,lng:108}}).map(p=>p.id),['near','far','unknown']);
  assert.equal(records[0].distance,undefined);
});
test('strict vegan and accent-insensitive search keep dietary boundaries', () => {
  assert.equal(typeof C.selectRestaurants,'function');
  assert.deepEqual(C.selectRestaurants(records,{diet:'vegan',query:'cafe',area:'danang'}).map(p=>p.id),['far']);
  assert.deepEqual(C.selectRestaurants(records,{area:'hoian'}),[]);
});
test('navigation uses encoded name and address, not approximate map pin', () => {
  assert.equal(typeof C.mapsUrl,'function');
  const u=new URL(C.mapsUrl({name:'A & B',address:'86/5 Phan Châu Trinh, Hội An',lat:16,lng:108}));
  assert.equal(u.hostname,'www.google.com');
  assert.equal(u.searchParams.get('api'),'1');
  assert.equal(u.searchParams.get('destination'),'A & B, 86/5 Phan Châu Trinh, Hội An');
});
test('closed records stay in archive while uncertain nearer places rank behind recent evidence',()=>{
 const rows=[{id:'closed',lat:16,lng:108,operatingStatus:'permanently-closed'},{id:'unknown',lat:16.001,lng:108,operatingStatus:'unverified'},{id:'recent',lat:16.02,lng:108,operatingStatus:'operating-evidence'},{id:'paused',lat:16.002,lng:108,operatingStatus:'temporarily-closed'}];
 assert.deepEqual(C.selectRestaurants(rows,{origin:{lat:16,lng:108},operating:'available'}).map(r=>r.id),['recent','unknown']);
 assert.deepEqual(C.selectRestaurants(rows,{operating:'closed'}).map(r=>r.id),['closed','paused']);
});
test('unsafe old address and closed venues cannot become daily recommendations',()=>{
 assert.equal(typeof C.canRecommend,'function');
 assert.equal(C.canRecommend({operatingStatus:'permanently-closed'}),false);
 assert.equal(C.canRecommend({operatingStatus:'temporarily-closed'}),false);
 assert.equal(C.canRecommend({operatingStatus:'unverified',navigationHold:true}),false);
 assert.equal(C.canRecommend({operatingStatus:'unverified'}),true);
});
test('verified Google place ID pins navigation to the matched branch',()=>{const r={name:'店名',address:'會安分店',googleMapsUrl:'https://www.google.com/maps/search/?api=1&query=x&query_place_id=ChIJverifiedBranch',matchConfidence:'verified'};const u=new URL(C.mapsUrl(r));assert.equal(u.searchParams.get('destination_place_id'),'ChIJverifiedBranch');});
test('unverified or malformed source links keep name and address routing',()=>{
 const base={name:'店名',address:'會安分店',lat:16,lng:108,matchConfidence:'verified'};
 for(const googleMapsUrl of ['not a URL','https://www.google.com.evil.test/maps/search/?query_place_id=wrong','https://evil.test/?next=https://www.google.com/maps/&query_place_id=wrong','https://www.google.com/other?query_place_id=wrong']){
  const u=new URL(C.mapsUrl({...base,googleMapsUrl}));assert.equal(u.searchParams.get('destination_place_id'),null);assert.equal(u.searchParams.get('destination'),'店名, 會安分店');
 }
 const u=new URL(C.mapsUrl({...base,matchConfidence:'ambiguous',googleMapsUrl:'https://www.google.com/maps/search/?query_place_id=wrong'}));assert.equal(u.searchParams.get('destination_place_id'),null);
});

test('restaurant search matches multiple accent-insensitive words across fields',()=>{
 const r={name:'Loving Hut Biển Tình Thương',address:'380 Lê Văn Hiến',veganNotes:'越式湯麵',searchAliases:['愛家'],diet:'uncertain'};
 assert.equal(typeof C.matchesRestaurant,'function');assert.equal(C.matchesRestaurant(r,'loving 380'),true);assert.equal(C.matchesRestaurant(r,'bien tinh'),true);assert.equal(C.matchesRestaurant(r,'愛家 湯麵'),true);assert.equal(C.matchesRestaurant(r,'loving 999'),false);
 assert.deepEqual(C.selectRestaurants([r],{query:'le van hien 380'}).map(x=>x.name),[r.name]);
});
