const CACHE = 'rotastic-v204-platform-fix';
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
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(hit => hit || fetch(event.request).then(response => {
      if (response && (response.status === 200 || response.type === 'opaque')) {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
      }
      return response;
    }))
  );
});

self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { body: event.data ? event.data.text() : 'New ROTASTIC notification' };
  }

  const title = data.title || 'ROTASTIC';
  const url = typeof data.url === 'string' && data.url ? data.url : './';
  const options = {
    body: data.body || data.message || 'You have a new ROTASTIC notification.',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    tag: data.tag || data.type || 'rotastic-notification',
    renotify: true,
    data: Object.assign({}, data.data || {}, data, {
      url,
      rotasticNotification: true
    })
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = event.notification && event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : './?rotasticNotification=1';

  event.waitUntil((async () => {
    const targetUrl = new URL(target, self.registration.scope).href;
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });

    for (const client of windows) {
      if ('navigate' in client) {
        try { await client.navigate(targetUrl); } catch (_) {}
      }
      try { client.postMessage({ type: 'ROTASTIC_NOTIFICATION_OPEN', url: targetUrl }); } catch (_) {}
      if ('focus' in client) return client.focus();
    }

    if (clients.openWindow) return clients.openWindow(targetUrl);
  })());
});
