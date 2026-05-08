const CACHE_NAME = 'cima-learn-cache-v1';
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
  event.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }

        return fetch(event.request).then((response) => {
          // Only cache successful GET requests
          if (event.request.method === 'GET' && response.ok) {
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(event.request, response.clone()));
          }
          return response;
        });
      })
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
