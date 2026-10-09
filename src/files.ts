// Uploaded images live in IndexedDB (too large for localStorage); falls back to memory.
const mem = new Map<string, Blob>();
let dbp: Promise<IDBDatabase | null> | null = null;

function db(): Promise<IDBDatabase | null> {
  if (dbp) return dbp;
  dbp = new Promise((resolve) => {
    try {
      const req = indexedDB.open('abc-demo-files', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('files');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbp;
}

export async function putFile(key: string, blob: Blob): Promise<void> {
  mem.set(key, blob);
  const d = await db();
  if (!d) return;
  await new Promise<void>((res) => {
    try {
      const tx = d.transaction('files', 'readwrite');
      tx.objectStore('files').put(blob, key);
      tx.oncomplete = () => res();
      tx.onerror = () => res();
    } catch {
      res();
    }
  });
}

export async function getFile(key: string): Promise<Blob | null> {
  if (mem.has(key)) return mem.get(key)!;
  const d = await db();
  if (!d) return null;
  return new Promise((res) => {
    try {
      const req = d.transaction('files').objectStore('files').get(key);
      req.onsuccess = () => res((req.result as Blob) ?? null);
      req.onerror = () => res(null);
    } catch {
      res(null);
    }
  });
}

export async function deleteFile(key: string): Promise<void> {
  mem.delete(key);
  const d = await db();
  if (!d) return;
  try {
    d.transaction('files', 'readwrite').objectStore('files').delete(key);
  } catch {
    /* ignore */
  }
}

export async function clearFiles(): Promise<void> {
  mem.clear();
  const d = await db();
  if (!d) return;
  try {
    d.transaction('files', 'readwrite').objectStore('files').clear();
  } catch {
    /* ignore */
  }
}
