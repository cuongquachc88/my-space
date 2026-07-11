import { PGlite, IdbFs, MemoryFS } from '@electric-sql/pglite'

let db: PGlite | null = null

// For unit tests — pass a MemoryFS instance to avoid IndexedDB
export async function resetDb(fs: MemoryFS): Promise<PGlite> {
  db = null
  const fresh = new PGlite({ fs })
  await runSchema(fresh)
  db = fresh
  return db
}

export async function getDb(): Promise<PGlite> {
  if (db) return db
  db = new PGlite({ fs: new IdbFs('my-space-pwa-db') })
  await runSchema(db)
  return db
}

async function runSchema(instance: PGlite): Promise<void> {
  await instance.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      title       TEXT NOT NULL,
      content     TEXT NOT NULL DEFAULT '',
      tags        TEXT[] NOT NULL DEFAULT '{}',
      image_data  TEXT NOT NULL DEFAULT '[]',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS secrets (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      label       TEXT NOT NULL,
      ciphertext  TEXT NOT NULL,
      iv          TEXT NOT NULL,
      tags        TEXT[] NOT NULL DEFAULT '{}',
      url         TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS subscriptions (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      name        TEXT NOT NULL,
      amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
      currency    TEXT NOT NULL DEFAULT 'USD',
      cycle       TEXT NOT NULL DEFAULT 'monthly',
      start_date  TEXT NOT NULL,
      tags        TEXT[] NOT NULL DEFAULT '{}',
      notes       TEXT NOT NULL DEFAULT '',
      active      BOOLEAN NOT NULL DEFAULT true,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS bills (
      sub_id     TEXT NOT NULL,
      year       INTEGER NOT NULL,
      month      INTEGER NOT NULL,
      amount     NUMERIC(10,2) NOT NULL,
      currency   TEXT NOT NULL DEFAULT 'USD',
      notes      TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (sub_id, year, month)
    );
    CREATE TABLE IF NOT EXISTS todo_lists (
      id         TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      name       TEXT NOT NULL,
      color      TEXT NOT NULL DEFAULT '#818cf8',
      icon       TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS todo_tasks (
      id         TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      list_id    TEXT NOT NULL REFERENCES todo_lists(id) ON DELETE CASCADE,
      title      TEXT NOT NULL,
      note       TEXT NOT NULL DEFAULT '',
      priority   TEXT NOT NULL DEFAULT 'medium',
      due_date   TEXT,
      recurrence TEXT NOT NULL DEFAULT 'none',
      done       BOOLEAN NOT NULL DEFAULT false,
      tags       TEXT[] NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    ALTER TABLE todo_tasks ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
    CREATE TABLE IF NOT EXISTS map_stacks (
      id         TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      name       TEXT NOT NULL,
      color      TEXT NOT NULL DEFAULT '#34d399',
      icon       TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS map_pins (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
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
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    -- Idempotent migrations for upgraded installs
    ALTER TABLE secrets       ADD COLUMN IF NOT EXISTS url         TEXT NOT NULL DEFAULT '';
    ALTER TABLE secrets       ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
    ALTER TABLE notes         ADD COLUMN IF NOT EXISTS image_data  TEXT NOT NULL DEFAULT '[]';
    ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS active      BOOLEAN NOT NULL DEFAULT true;
  `)
}
