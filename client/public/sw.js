// Self-unregistering service worker — clears all caches and removes itself
// The native Capacitor app doesn't need a service worker (assets are bundled locally)
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(names.map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
      .then(() => self.registration.unregister())
  );
});
