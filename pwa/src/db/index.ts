import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js'
import { getSqlJsConfig } from './wasmLoader'

export interface QueryResult<T> { rows: T[] }
export interface Db {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<T>>
}

const IDB_NAME = 'my-space-pwa-sqlite'
const IDB_STORE = 'db'
const IDB_KEY = 'main'

// SQLite has no native array or boolean type. These columns are stored as
// JSON text / 0-1 integers respectively; the query wrapper below converts
// them transparently so call sites can keep passing/reading JS arrays and
// booleans exactly as they did against PGlite.
const JSON_ARRAY_COLUMNS = new Set(['tags'])
const BOOLEAN_COLUMNS = new Set(['active', 'done'])

let sqlModulePromise: Promise<SqlJsStatic> | null = null
function loadSqlModule(): Promise<SqlJsStatic> {
  if (!sqlModulePromise) sqlModulePromise = initSqlJs(getSqlJsConfig())
  return sqlModulePromise
}

function idbOpen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) req.result.createObjectStore(IDB_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbLoad(): Promise<Uint8Array | undefined> {
  const idb = await idbOpen()
  try {
    return await new Promise((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, 'readonly')
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  } finally {
    idb.close()
  }
}

async function idbSave(bytes: Uint8Array): Promise<void> {
  const idb = await idbOpen()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).put(bytes, IDB_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    idb.close()
  }
}

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS notes (
    id          TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
    title       TEXT NOT NULL,
    content     TEXT NOT NULL DEFAULT '',
    tags        TEXT NOT NULL DEFAULT '[]',
    image_data  TEXT NOT NULL DEFAULT '[]',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT (now()),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT (now())
  );
  CREATE TABLE IF NOT EXISTS secrets (
    id          TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
    label       TEXT NOT NULL,
    ciphertext  TEXT NOT NULL,
    iv          TEXT NOT NULL,
    tags        TEXT NOT NULL DEFAULT '[]',
    url         TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT (now()),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT (now())
  );
  CREATE TABLE IF NOT EXISTS subscriptions (
    id          TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
    name        TEXT NOT NULL,
    amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
    currency    TEXT NOT NULL DEFAULT 'USD',
    cycle       TEXT NOT NULL DEFAULT 'monthly',
    start_date  TEXT NOT NULL,
    tags        TEXT NOT NULL DEFAULT '[]',
    notes       TEXT NOT NULL DEFAULT '',
    active      BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT (now()),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT (now())
  );
  CREATE TABLE IF NOT EXISTS bills (
    sub_id     TEXT NOT NULL,
    year       INTEGER NOT NULL,
    month      INTEGER NOT NULL,
    amount     NUMERIC(10,2) NOT NULL,
    currency   TEXT NOT NULL DEFAULT 'USD',
    notes      TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT (now()),
    PRIMARY KEY (sub_id, year, month)
  );
  CREATE TABLE IF NOT EXISTS todo_lists (
    id         TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
    name       TEXT NOT NULL,
    color      TEXT NOT NULL DEFAULT '#818cf8',
    icon       TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT (now())
  );
  CREATE TABLE IF NOT EXISTS todo_tasks (
    id         TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
    list_id    TEXT NOT NULL REFERENCES todo_lists(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    note       TEXT NOT NULL DEFAULT '',
    priority   TEXT NOT NULL DEFAULT 'medium',
    due_date   TEXT,
    recurrence TEXT NOT NULL DEFAULT 'none',
    done       BOOLEAN NOT NULL DEFAULT false,
    tags       TEXT NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT (now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT (now())
  );
  CREATE TABLE IF NOT EXISTS map_stacks (
    id         TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
    name       TEXT NOT NULL,
    color      TEXT NOT NULL DEFAULT '#34d399',
    icon       TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT (now())
  );
  CREATE TABLE IF NOT EXISTS map_pins (
    id          TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
    stack_id    TEXT NOT NULL REFERENCES map_stacks(id) ON DELETE CASCADE,
    label       TEXT NOT NULL,
    lat         DOUBLE PRECISION NOT NULL,
    lng         DOUBLE PRECISION NOT NULL,
    url         TEXT NOT NULL DEFAULT '',
    note        TEXT NOT NULL DEFAULT '',
    priority    TEXT NOT NULL DEFAULT 'none',
    category    TEXT NOT NULL DEFAULT '',
    rating      INTEGER NOT NULL DEFAULT 0,
    review_note TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT (now())
  );
`

function registerFunctions(instance: Database): void {
  instance.create_function('gen_random_uuid', () => crypto.randomUUID())
  instance.create_function('now', () => new Date().toISOString())
}

function initInstance(instance: Database): void {
  registerFunctions(instance)
  instance.run('PRAGMA foreign_keys = ON;') // per-connection setting — must be re-applied on every load, not just on first create
  instance.run(SCHEMA_SQL)
}

// Postgres uses $1,$2,...; SQLite's equivalent numbered-parameter syntax is
// ?1,?2,..., which binds positionally the same way — so query text written
// against the old PGlite API keeps working unchanged.
function toSqliteSql(sql: string): string {
  return sql.replace(/\$(\d+)/g, '?$1')
}

function toBindValue(p: unknown): string | number | Uint8Array | null {
  if (p === undefined || p === null) return null
  if (typeof p === 'boolean') return p ? 1 : 0
  if (p instanceof Date) return p.toISOString()
  if (Array.isArray(p)) return JSON.stringify(p)
  if (p instanceof Uint8Array) return p
  return p as string | number
}

function mapRow<T>(row: Record<string, unknown>): T {
  for (const key of Object.keys(row)) {
    if (JSON_ARRAY_COLUMNS.has(key) && typeof row[key] === 'string') {
      try { row[key] = JSON.parse(row[key] as string) } catch { /* leave as raw text */ }
    } else if (BOOLEAN_COLUMNS.has(key)) {
      row[key] = row[key] === 1
    }
  }
  return row as T
}

const isWriteStatement = (sql: string) => !/^\s*select/i.test(sql)

function wrap(instance: Database, persist: boolean): Db {
  return {
    async query<T>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
      const stmt = instance.prepare(toSqliteSql(sql))
      let rows: T[]
      try {
        if (params.length) stmt.bind(params.map(toBindValue))
        rows = []
        while (stmt.step()) rows.push(mapRow<T>(stmt.getAsObject()))
      } finally {
        stmt.free()
      }
      if (persist && isWriteStatement(sql)) await idbSave(instance.export())
      return { rows }
    },
  }
}

let dbInstance: Database | null = null
let dbWrapper: Db | null = null
let loadPromise: Promise<Db> | null = null

async function load(): Promise<Db> {
  const SQL = await loadSqlModule()
  const existing = await idbLoad()

  if (existing) {
    dbInstance = new SQL.Database(existing)
    initInstance(dbInstance)
    dbWrapper = wrap(dbInstance, true)
    return dbWrapper
  }

  dbInstance = new SQL.Database()
  initInstance(dbInstance)
  dbWrapper = wrap(dbInstance, true)

  // Fresh db with nothing persisted yet — check for data from the old
  // PGlite-based version of this app (code-split: only downloads PGlite if
  // a legacy database is actually found).
  const { hasLegacyPgliteData, migrateFromPglite } = await import('./legacyMigration')
  if (await hasLegacyPgliteData()) {
    try {
      await migrateFromPglite(dbWrapper)
    } catch (err) {
      console.error('[db] legacy PGlite migration failed:', err)
    }
  }

  return dbWrapper
}

export async function getDb(): Promise<Db> {
  if (dbWrapper) return dbWrapper
  if (!loadPromise) loadPromise = load()
  return loadPromise
}

/** Test-only: forces a fresh, non-persisted in-memory database (equivalent of PGlite's MemoryFS). */
export async function resetDb(): Promise<Db> {
  dbInstance?.close()
  dbInstance = null
  dbWrapper = null
  loadPromise = null
  const SQL = await loadSqlModule()
  dbInstance = new SQL.Database()
  initInstance(dbInstance)
  dbWrapper = wrap(dbInstance, false) // test mode: never touches IndexedDB
  loadPromise = Promise.resolve(dbWrapper)
  return dbWrapper
}
