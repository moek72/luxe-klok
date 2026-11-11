const CACHE='luxe-klok-portable-v2.0.2';
const ASSETS=["./", "./index.html", "./styles.css", "./app.js", "./sound.js", "./experience.js", "./music.js", "./manifest.json", "./icon.svg", "./icon-192.png", "./icon-512.png", "./fonts/outfit.ttf", "./fonts/orbitron.ttf", "./fonts/cormorantgaramond.ttf", "./fonts/sharetechmono.ttf"];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('luxe-klok-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
 if(e.request.mode==='navigate'){
  e.respondWith(fetch(e.request).catch(()=>caches.match('./index.html')));return;
 }
 e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(cached=>cached||fetch(e.request)));
});
