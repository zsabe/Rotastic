const CACHE = 'rotastic-v238-admin-center-safe';
const CORE = [
  './',
  './index.html',
  './admin-comms-ui.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/favicon-48.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function enforceOriginalDarkDesign(response) {
  if (!response || !response.ok) return response;
  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/html')) return response;
  let html = await response.text();
  const darkLock = `<style id="rotastic-original-dark-lock">
:root{--bg-base:#090d16!important;--surface-card:#0f1624!important;--border-subtle:rgba(148,163,184,.12)!important;--teal-primary:#14b8a6!important;color-scheme:dark!important}
html,body{background:#090d16!important;background-color:#090d16!important;color:#e2e8f0!important;color-scheme:dark!important}
body.antialiased{background:#090d16!important;color:#e2e8f0!important}
.clean-card{background:#0f1624!important;color:#e2e8f0!important;border-color:rgba(148,163,184,.12)!important}
</style>`;
  if (!html.includes('rotastic-original-dark-lock')) {
    html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${darkLock}</head>`) : darkLock + html;
  }
  const adminCenterScript = '<script id="rotastic-admin-center-loader" src="./admin-comms-ui.js?v=20261026-3" defer></script>';
  if (!html.includes('rotastic-admin-center-loader')) {
    html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${adminCenterScript}</body>`) : html + adminCenterScript;
  }
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(event.request, { cache: 'no-store' });
        if (response && response.ok) {
          const copy = response.clone();
          event.waitUntil(
            caches.open(CACHE)
              .then(cache => cache.put('./index.html', copy))
              .catch(() => {})
          );
        }
        return enforceOriginalDarkDesign(response);
      } catch (_) {
        return enforceOriginalDarkDesign(await caches.match('./index.html'));
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const hit = await caches.match(event.request);
    if (hit) return hit;
    const response = await fetch(event.request, { cache: 'no-store' });
    if (response && (response.status === 200 || response.type === 'opaque')) {
      const copy = response.clone();
      event.waitUntil(
        caches.open(CACHE)
          .then(cache => cache.put(event.request, copy))
          .catch(() => {})
      );
    }
    return response;
  })());
});

self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { body: 'Open ROTASTIC for a private update.' };
  }

  const title = data.title || 'ROTASTIC';
  const url = typeof data.url === 'string' && data.url ? data.url : './';
  const options = {
    body: data.body || 'Open ROTASTIC for an update.',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    tag: data.tag || data.type || 'rotastic-notification',
    renotify: true,
    requireInteraction: Boolean(data.requireInteraction),
    data: Object.assign({}, data.data || {}, {
      url,
      type: data.type || '',
      rotasticNotification: true
    })
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const rawTarget = event.notification?.data?.url || './?rotasticNotification=1';

  event.waitUntil((async () => {
    const targetUrl = new URL(rawTarget, self.registration.scope).href;
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

    for (const client of windows) {
      if (!client.url.startsWith(self.registration.scope)) continue;
      try { if ('navigate' in client) await client.navigate(targetUrl); } catch (_) {}
      try { client.postMessage({ type: 'ROTASTIC_NOTIFICATION_OPEN', url: targetUrl }); } catch (_) {}
      try { return await client.focus(); } catch (_) {}
    }

    if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
  })());
});
