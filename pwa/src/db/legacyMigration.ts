// One-time import of data from the old PGlite-based database (pre-SQLite-WASM
// migration) into the new sql.js database. This file is dynamically imported
// only when a legacy PGlite IndexedDB database is detected, so fresh installs
// never download PGlite (~16.7MB) at all.
import type { Db } from './index'

const LEGACY_IDB_NAME = 'my-space-pwa-db'

// FK-safe order: parents before children.
const TABLES = ['notes', 'secrets', 'subscriptions', 'bills', 'todo_lists', 'todo_tasks', 'map_stacks', 'map_pins']

export async function hasLegacyPgliteData(): Promise<boolean> {
  if (!('databases' in indexedDB)) return false // feature not supported — skip migration, fall back to a fresh db
  try {
    const dbs = await indexedDB.databases()
    return dbs.some(d => d.name === LEGACY_IDB_NAME)
  } catch {
    return false
  }
}

export async function migrateFromPglite(sink: Db): Promise<void> {
  const { PGlite, IdbFs } = await import('@electric-sql/pglite')
  const legacy = new PGlite({ fs: new IdbFs(LEGACY_IDB_NAME) })
  try {
    for (const table of TABLES) {
      const { rows } = await legacy.query<Record<string, unknown>>(`SELECT * FROM ${table}`)
      for (const row of rows) {
        const cols = Object.keys(row)
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(',')
        await sink.query(
          `INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
          cols.map(c => row[c]),
        )
      }
    }
  } finally {
    await legacy.close()
  }
}
