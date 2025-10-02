let deferredPrompt: any = null;

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });
        
        console.log('Service Worker registered successfully:', registration.scope);

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                showUpdateNotification();
              }
            });
          }
        });

        if (registration.waiting) {
          showUpdateNotification();
        }
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    });
  }
}

function showUpdateNotification() {
  if (confirm('A new version of SemaSlim is available. Would you like to update now?')) {
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      }
    });
  }
}

export function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallButton();
  });

  window.addEventListener('appinstalled', () => {
    console.log('PWA installed successfully');
    deferredPrompt = null;
    hideInstallButton();
  });
}

function showInstallButton() {
  const event = new CustomEvent('pwa-install-available');
  window.dispatchEvent(event);
}

function hideInstallButton() {
  const event = new CustomEvent('pwa-install-complete');
  window.dispatchEvent(event);
}

export async function promptInstall() {
  if (!deferredPrompt) {
    return false;
  }

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  
  console.log(`User ${outcome === 'accepted' ? 'accepted' : 'dismissed'} the install prompt`);
  deferredPrompt = null;
  
  return outcome === 'accepted';
}

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

export function checkOnlineStatus(): boolean {
  return navigator.onLine;
}

export function setupOnlineStatusListeners(
  onOnline: () => void,
  onOffline: () => void
) {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}

export async function subscribeToWebPush(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications are not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        import.meta.env.VITE_VAPID_PUBLIC_KEY || ''
      ),
    });

    return subscription;
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function showNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification(title, {
    badge: '/icons/icon-192.svg',
    icon: '/icons/icon-192.svg',
    ...options,
  });
}

export function getConnectionSpeed(): 'slow' | 'fast' | 'unknown' {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  
  if (!connection) {
    return 'unknown';
  }

  const effectiveType = connection.effectiveType;
  
  if (effectiveType === 'slow-2g' || effectiveType === '2g') {
    return 'slow';
  }
  
  if (effectiveType === '3g' || effectiveType === '4g') {
    return 'fast';
  }
  
  return 'unknown';
}

export function preloadCriticalAssets(urls: string[]) {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_URLS',
      urls,
    });
  }
}

export async function saveOfflineAction(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: string
): Promise<void> {
  const db = await openIndexedDB();
  const transaction = db.transaction(['offline-actions'], 'readwrite');
  const store = transaction.objectStore('offline-actions');
  
  await store.add({
    url,
    method,
    headers,
    body,
    timestamp: Date.now(),
  });
}

function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('semaslim-offline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('offline-actions')) {
        db.createObjectStore('offline-actions', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}
