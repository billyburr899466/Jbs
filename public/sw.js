const CACHE = 'jbs-app-v2.2.0';
const APP_ASSETS = ['/','/manifest.webmanifest','/icon.svg','/customer-upgrade.css','/customer-upgrade.js','/customer-core.js','/deck-visual.js','/paint-visual.js','/builders.css'];
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(APP_ASSETS)));});
self.addEventListener('activate',event=>event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('jbs-app-')&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()])));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==location.origin||url.pathname.startsWith('/api/'))return;
 const appFile=APP_ASSETS.includes(url.pathname)||url.pathname.startsWith('/legacy-static/');
 if(request.mode!=='navigate'&&!appFile)return;
 event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}return response;}).catch(async()=>{const cached=await caches.match(request);if(cached)return cached;if(request.mode==='navigate'){const home=await caches.match('/');if(home)return home;}return new Response('Connection unavailable',{status:503});}));
});
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data?.json() || {}; } catch { data = {}; }
  event.waitUntil(self.registration.showNotification(data.title || "JB's Universal Renovations", {
    body: data.body || 'You have a new update.',
    icon: data.icon || '/icon.svg',
    badge: data.badge || '/icon.svg',
    tag: data.tag || `jbs-update-${Date.now()}`,
    data: { url: data.url || '/' },
    vibrate: [180, 90, 180],
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const destination = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
    const appWindow = windows.find(client => new URL(client.url).origin === self.location.origin);
    if (appWindow) { appWindow.navigate(destination); return appWindow.focus(); }
    return self.clients.openWindow(destination);
  }));
});

