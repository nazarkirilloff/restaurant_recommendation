// Opt-in, on-device storage of the last opened file (IndexedDB). Nothing here
// ever leaves the browser. Every call fails soft: if storage is blocked
// (private window, file:// restrictions, cleared data) callers get null/false.

const DB_NAME = "medical-portal";
const STORE = "files";
const KEY = "last";
const PREF_KEY = "medical-portal:remember";

export interface SavedFile {
  name: string;
  savedAt: number;
  bytes: ArrayBuffer;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("no indexedDB"));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/** Whether on-device storage works here; the option is hidden when it doesn't. */
export async function storageAvailable(): Promise<boolean> {
  try {
    await run("readonly", (s) => s.count());
    return true;
  } catch {
    return false;
  }
}

export async function saveFile(name: string, bytes: ArrayBuffer): Promise<boolean> {
  try {
    const value: SavedFile = { name, savedAt: Date.now(), bytes };
    await run("readwrite", (s) => s.put(value, KEY));
    return true;
  } catch {
    return false;
  }
}

export async function loadFile(): Promise<SavedFile | null> {
  try {
    const v = await run<SavedFile | undefined>("readonly", (s) => s.get(KEY));
    return v && v.bytes ? v : null;
  } catch {
    return null;
  }
}

export async function forgetFile(): Promise<void> {
  try {
    await run("readwrite", (s) => s.delete(KEY));
  } catch {
    /* nothing stored, or storage blocked */
  }
}

/** The user's opt-in choice (default: off). */
export function rememberPreference(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) === "1";
  } catch {
    return false;
  }
}

export function setRememberPreference(on: boolean): void {
  try {
    if (on) localStorage.setItem(PREF_KEY, "1");
    else localStorage.removeItem(PREF_KEY);
  } catch {
    /* storage blocked */
  }
}
