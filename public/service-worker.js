// ═══════════════════════════════════════════════════════════════
// SERVICE WORKER — Push Notifications + Background Sync
// UptimeOps Emergency Alert System
// ═══════════════════════════════════════════════════════════════

const CACHE_NAME = 'uptimeops-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/pricing',
  '/emergency',
];

// ── Install ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// ── Activate ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// ── Fetch ──
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and API calls
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/functions/v1/')) return;
  if (event.request.url.includes('supabase.co')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          // Cache static assets
          if (event.request.destination === 'image' || 
              event.request.destination === 'font' ||
              event.request.url.includes('/assets/')) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline fallback for navigation
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
    })
  );
});

// ── Push Notifications ──
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'New incident update',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.tag || 'uptimeops-alert',
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
    data: {
      url: data.url || '/',
      incident_id: data.incident_id,
      type: data.type,
    },
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || 'UptimeOps Alert',
      options
    )
  );
});

// ── Notification Click ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notificationData = event.notification.data;
  const urlToOpen = notificationData?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing tab if open
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new tab
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// ── Background Sync (for offline actions) ──
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-incident-updates') {
    event.waitUntil(syncIncidentUpdates());
  }
});

async function syncIncidentUpdates() {
  // Re-play queued actions when back online
  try {
    const db = await openDB();
    const tx = db.transaction('pending-actions', 'readonly');
    const store = tx.objectStore('pending-actions');
    const actions = await store.getAll();

    for (const action of actions) {
      try {
        await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: JSON.stringify(action.body),
        });
        // Remove on success
        const deleteTx = db.transaction('pending-actions', 'readwrite');
        await deleteTx.objectStore('pending-actions').delete(action.id);
      } catch (err) {
        console.error('[SW] Sync failed for action:', action.id, err);
      }
    }
  } catch (err) {
    console.error('[SW] Background sync failed:', err);
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('UptimeOps', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending-actions')) {
        db.createObjectStore('pending-actions', { keyPath: 'id' });
      }
    };
  });
}
