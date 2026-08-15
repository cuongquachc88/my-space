// Lets the vault key survive a page reload (F5) within the same browser tab
// — without ever exposing raw key bytes to JS. The CryptoKey stays
// non-extractable end-to-end: it travels through IndexedDB as an opaque
// object (structured clone preserves `extractable: false`; no API can pull
// raw bytes back out of it), keyed by a random id that lives only in
// sessionStorage. sessionStorage is cleared by the browser itself when the
// tab closes, so closing the tab still forces a fresh unlock — only an
// in-tab reload is bypassed.

export interface KeyStorage {
  put(id: string, key: CryptoKey): Promise<void>
  get(id: string): Promise<CryptoKey | undefined>
  delete(id: string): Promise<void>
  clear(): Promise<void>
}

const DB_NAME = 'myspace-keystore'
const STORE_NAME = 'keys'
const SESSION_ID_KEY = 'myspace_session_key_id'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export class IndexedDbKeyStorage implements KeyStorage {
  private async run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await openDb()
    try {
      return await new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode)
        const req = fn(tx.objectStore(STORE_NAME))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
    } finally {
      db.close()
    }
  }

  async put(id: string, key: CryptoKey): Promise<void> {
    await this.run('readwrite', store => store.put(key, id))
  }
  get(id: string): Promise<CryptoKey | undefined> {
    return this.run('readonly', store => store.get(id))
  }
  async delete(id: string): Promise<void> {
    await this.run('readwrite', store => store.delete(id))
  }
  async clear(): Promise<void> {
    await this.run('readwrite', store => store.clear())
  }
}

let storage: KeyStorage = new IndexedDbKeyStorage()

/** Test-only: swap in an in-memory KeyStorage so unit tests don't depend on browser IndexedDB/CryptoKey structured-clone support. */
export function _setKeyStorage(s: KeyStorage): void { storage = s }

export async function persistKeyForReload(key: CryptoKey): Promise<void> {
  const id = crypto.randomUUID()
  await storage.put(id, key)
  sessionStorage.setItem(SESSION_ID_KEY, id)
}

export async function tryResumeKeyFromReload(): Promise<CryptoKey | null> {
  const id = sessionStorage.getItem(SESSION_ID_KEY)
  if (!id) {
    // No live session marker in this tab (fresh tab, or the previous tab
    // closed/crashed) — drop any orphaned entry so keys never linger
    // beyond the tab lifetime they were meant for.
    await storage.clear()
    return null
  }
  const key = await storage.get(id)
  if (!key) {
    sessionStorage.removeItem(SESSION_ID_KEY)
    return null
  }
  return key
}

/** Synchronous on the sessionStorage marker (what resume checks) — the IndexedDB delete is fire-and-forget cleanup. */
export function clearPersistedKey(): void {
  const id = sessionStorage.getItem(SESSION_ID_KEY)
  sessionStorage.removeItem(SESSION_ID_KEY)
  if (id) void storage.delete(id)
}
