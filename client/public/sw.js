const CACHE_NAME = 'cima-learn-cache-v2';
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
  // Skip caching for large files (PDFs, videos, etc.) and API requests
  const url = new URL(event.request.url);
  
  // Skip caching for:
  // 1. External domains (Supabase, APIs, CDNs)
  // 2. Large files
  // 3. API endpoints
  // 4. Non-GET requests
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
    // Pass through without caching
    event.respondWith(fetch(event.request));
    return;
  }

  // Only cache same-origin GET requests
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }

        return fetch(event.request).then((response) => {
          // Only cache successful GET requests for small resources
          if (event.request.method === 'GET' && response.ok) {
            // Clone the response before caching to avoid "already used" errors
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(event.request, responseToCache))
              .catch((error) => console.log('Cache put error:', error));
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
