const CACHE='morning-reef-11';
const SHELL=['./','./index.html','./style.css','./app.mjs','./engine.mjs','./species.mjs','./art.mjs','./motion.mjs','./scene.mjs','./sprite-crops.mjs','./microphone.mjs','./store.mjs','./i18n.mjs','./icon.svg','./manifest.webmanifest','./assets/reef.png','./assets/swimmers-a-v2.png','./assets/swimmers-b-v2.png','./assets/swimmers-large-v3.png','./assets/swimmers-legendary-v3.png','./assets/creatures-clean.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('morning-reef-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 event.respondWith(fetch(event.request).then(async response=>{if(response.ok){const copy=response.clone();await caches.open(CACHE).then(c=>c.put(event.request,copy)).catch(()=>{});}return response;}).catch(async()=>(await caches.match(event.request))||(event.request.mode==='navigate'?caches.match('./index.html'):Response.error())));
});
