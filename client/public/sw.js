const CACHE_NAME = 'semaslim-v1';
const RUNTIME_CACHE = 'semaslim-runtime-v1';
const DATA_CACHE = 'semaslim-data-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

const API_CACHE_URLS = [
  '/api/dashboard',
  '/api/user/profile',
  '/api/medications',
  '/api/food-entries',
  '/api/weight-logs',
  '/api/notifications/unread',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE, DATA_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return cacheNames.filter((cacheName) => !currentCaches.includes(cacheName));
    }).then((cachesToDelete) => {
      return Promise.all(cachesToDelete.map((cacheToDelete) => {
        return caches.delete(cacheToDelete);
      }));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(DATA_CACHE).then((cache) => {
        return fetch(request)
          .then((response) => {
            if (response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => {
            return cache.match(request).then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              return new Response(
                JSON.stringify({ 
                  error: 'offline', 
                  message: 'You are currently offline. Some data may be outdated.' 
                }),
                { 
                  status: 503,
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            });
          });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return caches.open(RUNTIME_CACHE).then((cache) => {
        return fetch(request).then((response) => {
          if (response.status === 200) {
            cache.put(request, response.clone());
          }
          return response;
        }).catch(() => {
          if (request.destination === 'document') {
            return cache.match('/index.html');
          }
          return new Response('Offline', { status: 503 });
        });
      });
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(DATA_CACHE).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncOfflineData());
  }
});

async function syncOfflineData() {
  const db = await openIndexedDB();
  const offlineActions = await getOfflineActions(db);
  
  for (const action of offlineActions) {
    try {
      await fetch(action.url, {
        method: action.method,
        headers: action.headers,
        body: action.body,
      });
      await removeOfflineAction(db, action.id);
    } catch (error) {
      console.error('Failed to sync action:', action, error);
    }
  }
}

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('semaslim-offline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('offline-actions')) {
        db.createObjectStore('offline-actions', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

function getOfflineActions(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['offline-actions'], 'readonly');
    const store = transaction.objectStore('offline-actions');
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function removeOfflineAction(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['offline-actions'], 'readwrite');
    const store = transaction.objectStore('offline-actions');
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
