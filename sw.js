/* Versioned app shell. Bump VERSION whenever any bundled file changes. */
const VERSION='v6';
const PREFIX='danang-vegan:'+new URL(self.registration.scope).pathname+':';
const CACHE=PREFIX+VERSION;
const LOCAL=['./','./index.html','./assets/styles.css','./assets/core.js','./assets/data.js','./assets/app.js','./assets/vendor/leaflet.js','./assets/vendor/leaflet.css','./assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png','./manifest.webmanifest'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(LOCAL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url),scope=new URL(self.registration.scope);
 if(event.request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
 const allowed=new Set(LOCAL.map(p=>new URL(p,scope).href));
 const appDocument=event.request.mode==='navigate'&&(url.pathname===scope.pathname||url.pathname===new URL('./index.html',scope).pathname);
 if(!allowed.has(url.href)&&!appDocument)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const key=appDocument?new URL('./index.html',scope).href:event.request;
  const cached=await cache.match(key);
  if(cached)return cached;
  try{const response=await fetch(event.request);if(response.ok&&allowed.has(url.href))await cache.put(key,response.clone());return response;}
  catch{return Response.error();}
 })());
});
