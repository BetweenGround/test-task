import { useEffect, useState } from 'react';

const DB_NAME = 'logistiq_offline';
const DB_VERSION = 1;
const QUEUE_STORE = 'pending_requests';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function queueOfflineRequest(data) {
  const db = await openDB();
  const tx = db.transaction(QUEUE_STORE, 'readwrite');
  tx.objectStore(QUEUE_STORE).add({ ...data, queued_at: new Date().toISOString() });
  return new Promise((res) => { tx.oncomplete = res; });
}

export async function getPendingQueue() {
  const db = await openDB();
  const tx = db.transaction(QUEUE_STORE, 'readonly');
  const all = tx.objectStore(QUEUE_STORE).getAll();
  return new Promise((res) => { all.onsuccess = () => res(all.result); });
}

export async function clearQueueItem(id) {
  const db = await openDB();
  const tx = db.transaction(QUEUE_STORE, 'readwrite');
  tx.objectStore(QUEUE_STORE).delete(id);
  return new Promise((res) => { tx.oncomplete = res; });
}

export function useOfflineSync(syncFn) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const onOnline = async () => {
      setIsOnline(true);
      // Flush queue when back online
      const queue = await getPendingQueue();
      for (const item of queue) {
        try {
          await syncFn(item);
          await clearQueueItem(item.id);
        } catch (e) {
          console.error('Sync failed for item', item.id, e);
        }
      }
      setPendingCount(0);
    };
    const onOffline = () => setIsOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    getPendingQueue().then((q) => setPendingCount(q.length));

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [syncFn]);

  return { isOnline, pendingCount };
}
