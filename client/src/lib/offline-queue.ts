interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  timestamp: number;
  retries: number;
}

const DB_NAME = 'semaslim-offline';
const STORE_NAME = 'offline-actions';
const MAX_RETRIES = 3;

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

export async function queueOfflineRequest(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: any
): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const request: Omit<QueuedRequest, 'id'> = {
      url,
      method,
      headers,
      body: JSON.stringify(body),
      timestamp: Date.now(),
      retries: 0,
    };
    
    await store.add(request);
    
    if ('serviceWorker' in navigator && 'sync' in (window as any).ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register('sync-data');
    }
  } catch (error) {
    console.error('Failed to queue offline request:', error);
  }
}

export async function getQueuedRequests(): Promise<QueuedRequest[]> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  } catch (error) {
    console.error('Failed to get queued requests:', error);
    return [];
  }
}

export async function processOfflineQueue(): Promise<void> {
  if (!navigator.onLine) {
    return;
  }

  try {
    const requests = await getQueuedRequests();
    
    for (const request of requests) {
      try {
        const response = await fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body,
        });

        if (response.ok) {
          await removeQueuedRequest(request.id);
        } else if (request.retries < MAX_RETRIES) {
          await updateRequestRetries(request.id, request.retries + 1);
        } else {
          await removeQueuedRequest(request.id);
          console.error('Max retries reached for request:', request);
        }
      } catch (error) {
        if (request.retries < MAX_RETRIES) {
          await updateRequestRetries(request.id, request.retries + 1);
        } else {
          await removeQueuedRequest(request.id);
        }
      }
    }
  } catch (error) {
    console.error('Failed to process offline queue:', error);
  }
}

async function removeQueuedRequest(id: string): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    await store.delete(id);
  } catch (error) {
    console.error('Failed to remove queued request:', error);
  }
}

async function updateRequestRetries(id: string, retries: number): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const data = getRequest.result;
        if (data) {
          data.retries = retries;
          const putRequest = store.put(data);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  } catch (error) {
    console.error('Failed to update request retries:', error);
  }
}

export function setupOfflineQueueSync() {
  if (typeof window === 'undefined') return;

  window.addEventListener('online', () => {
    processOfflineQueue();
  });

  if (navigator.onLine) {
    processOfflineQueue();
  }
}
