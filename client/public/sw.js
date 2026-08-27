const CACHE_NAME = 'cima-learn-cache-v3';
const urlsToCache = [
  '/',
  '/dashboard',
  '/courses',
  '/community',
  '/notification-settings'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  const isExternalDomain = !url.origin.includes(self.location.origin);
  const isSupabaseRequest = url.hostname.includes('supabase.co');
  const skipCache =
    isExternalDomain ||
    isSupabaseRequest ||
    url.pathname.endsWith('.pdf') ||
    url.pathname.endsWith('.zip') ||
    url.pathname.endsWith('.mp4') ||
    url.pathname.includes('/api/') ||
    url.pathname.includes('/uploads/') ||
    event.request.method !== 'GET';

  if (skipCache) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Hashed, content-addressed build assets never change for a given
  // filename, so cache-first is safe and fast for them.
  const isImmutableAsset = url.pathname.startsWith('/assets/');

  if (isImmutableAsset) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(event.request, responseToCache))
              .catch((error) => console.log('Cache put error:', error));
          }
          return response;
        });
      })
    );
    return;
  }

  // Everything else (navigations/HTML in particular) must go network-first:
  // a deploy replaces hashed asset filenames, so a cached shell can point at
  // JS that no longer exists on the server. Only fall back to cache when the
  // network is genuinely unreachable (offline).
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(event.request, responseToCache))
            .catch((error) => console.log('Cache put error:', error));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Handle push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data.text,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: event.data.tag,
    data: {
      url: event.data.url,
      type: event.data.type,
      title: event.data.title,
    },
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/favicon.ico',
      }
    ],
  };

  event.waitUntil(
    self.registration.showNotification(event.data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  if (event.action === 'view' && event.notification.data.url) {
    clients.openWindow(event.notification.data.url);
  }

  event.notification.close();
});
