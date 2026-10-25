const CACHE = 'rotastic-v220-interaction-restore';
const CORE = [
  './',
  './index.html',
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
        return response;
      } catch (_) {
        return caches.match('./index.html');
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const hit = await caches.match(event.request);
    if (hit) return hit;
    const response = await fetch(event.request);
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
