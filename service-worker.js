const VERSION = 'mpe-v1';
const CORE = ['./', 'index.html', 'manifest.json', 'assets/icons/icon.svg', 'assets/icons/icon-192.png',
  'assets/icons/icon-512.png', 'assets/icons/icon-maskable-512.png', 'assets/icons/apple-touch-icon.png',
  'assets/audio/audio-manifest.json', 'assets/audio/audio-manifest.en-US.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!sameOrigin && !isFont) return;
  if (req.mode === 'navigate') { // network first, fall back to cached app shell
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(VERSION).then(ch => ch.put('index.html', c)); return r; })
      .catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) { const c = r.clone(); caches.open(VERSION).then(ch => ch.put(req, c)); } return r; }).catch(() => hit);
    return hit || net; // cache first, refresh in background
  }));
});
