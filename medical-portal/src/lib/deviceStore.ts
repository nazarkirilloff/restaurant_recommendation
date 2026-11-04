// Opt-in, on-device storage of the last opened file (IndexedDB), encrypted
// with the user's passphrase (see vault.ts). Only sealed records are ever
// written; anything else found under the key — e.g. a plaintext copy from an
// earlier version — is deleted on sight. Every call fails soft: if storage is
// blocked (private window, cleared data) callers get null/false.
//
// Why encrypt: on file:// Chromium gives every local page one shared storage
// origin, and a shared host (e.g. *.github.io) does the same, so other pages
// can read this database. They now only see ciphertext.

import { isSealed, type SealedFile } from "./vault";

const DB_NAME = "medical-portal";
const STORE = "files";
const KEY = "last";
const PREF_KEY = "medical-portal:remember";

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

export async function saveSealed(sealed: SealedFile): Promise<boolean> {
  try {
    await run("readwrite", (s) => s.put(sealed, KEY));
    return true;
  } catch {
    return false;
  }
}

/**
 * The stored sealed record, if any. A record that isn't a valid sealed file
 * (plaintext from an older version, or junk written by another page) is
 * deleted and reported as absent.
 */
export async function loadSealed(): Promise<SealedFile | null> {
  try {
    const v = await run<unknown>("readonly", (s) => s.get(KEY));
    if (v === undefined) return null;
    if (isSealed(v)) return v;
    await forgetFile();
    return null;
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
