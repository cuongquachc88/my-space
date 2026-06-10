import { PGlite } from '@electric-sql/pglite'
import type { Note } from '../shared/messages'

let db: PGlite | null = null

export async function initDb(): Promise<void> {
  db = new PGlite()
  await db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      title       TEXT NOT NULL,
      content     TEXT NOT NULL DEFAULT '',
      tags        TEXT[] NOT NULL DEFAULT '{}',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS secrets (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      label       TEXT NOT NULL,
      ciphertext  TEXT NOT NULL,
      iv          TEXT NOT NULL,
      tags        TEXT[] NOT NULL DEFAULT '{}',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS subscriptions (
      id           TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      name         TEXT NOT NULL,
      amount       NUMERIC(10,2) NOT NULL DEFAULT 0,
      currency     TEXT NOT NULL DEFAULT 'USD',
      cycle        TEXT NOT NULL DEFAULT 'monthly',
      start_date   TEXT NOT NULL,
      tags         TEXT[] NOT NULL DEFAULT '{}',
      notes        TEXT NOT NULL DEFAULT '',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    -- Migrate: add tags column if upgrading from schema without it
    ALTER TABLE notes    ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
    ALTER TABLE secrets  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
  `)
}

function getDb(): PGlite {
  if (!db) throw new Error('DB not initialised')
  return db
}

export async function listNotes(query?: string, tag?: string): Promise<Note[]> {
  const d = getDb()
  const conditions: string[] = []
  const values: unknown[] = []
  let i = 1
  if (query) { conditions.push(`(title ILIKE $${i} OR content ILIKE $${i})`); values.push(`%${query}%`); i++ }
  if (tag)   { conditions.push(`$${i} = ANY(tags)`); values.push(tag); i++ }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const res = await d.query<Note>(`SELECT * FROM notes ${where} ORDER BY updated_at DESC`, values)
  return res.rows
}

export async function getNote(id: string): Promise<Note> {
  const res = await getDb().query<Note>(`SELECT * FROM notes WHERE id = $1`, [id])
  if (!res.rows[0]) throw new Error(`Note ${id} not found`)
  return res.rows[0]
}

export async function createNote(title: string, content: string, tags: string[] = []): Promise<Note> {
  const res = await getDb().query<Note>(
    `INSERT INTO notes (title, content, tags) VALUES ($1, $2, $3) RETURNING *`,
    [title, content, tags]
  )
  return res.rows[0]
}

export async function updateNote(
  id: string,
  fields: { title?: string; content?: string; tags?: string[] }
): Promise<Note> {
  if (fields.title === undefined && fields.content === undefined && fields.tags === undefined) {
    throw new Error('No fields to update')
  }
  const sets: string[] = []
  const values: unknown[] = []
  let i = 1
  if (fields.title   !== undefined) { sets.push(`title = $${i++}`);   values.push(fields.title) }
  if (fields.content !== undefined) { sets.push(`content = $${i++}`); values.push(fields.content) }
  if (fields.tags    !== undefined) { sets.push(`tags = $${i++}`);    values.push(fields.tags) }
  sets.push(`updated_at = now()`)
  values.push(id)
  const res = await getDb().query<Note>(
    `UPDATE notes SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  )
  if (!res.rows[0]) throw new Error(`Note ${id} not found`)
  return res.rows[0]
}

export async function deleteNote(id: string): Promise<void> {
  await getDb().query(`DELETE FROM notes WHERE id = $1`, [id])
}

export async function listNoteTags(): Promise<string[]> {
  const res = await getDb().query<{ tag: string }>(`SELECT DISTINCT unnest(tags) AS tag FROM notes ORDER BY tag`)
  return res.rows.map(r => r.tag)
}

// --- Secrets ---
export interface SecretRow {
  id: string; label: string; ciphertext: string; iv: string
  tags: string[]; created_at: string; updated_at: string
}

export async function listSecretMeta(query?: string, tag?: string): Promise<Array<{ id: string; label: string; tags: string[]; updated_at: string }>> {
  const d = getDb()
  const conditions: string[] = []
  const values: unknown[] = []
  let i = 1
  if (query) { conditions.push(`label ILIKE $${i}`); values.push(`%${query}%`); i++ }
  if (tag)   { conditions.push(`$${i} = ANY(tags)`); values.push(tag); i++ }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const res = await d.query<{ id: string; label: string; tags: string[]; updated_at: string }>(
    `SELECT id, label, tags, updated_at FROM secrets ${where} ORDER BY updated_at DESC`,
    values
  )
  return res.rows
}

export async function getSecretRow(id: string): Promise<SecretRow> {
  const res = await getDb().query<SecretRow>(`SELECT * FROM secrets WHERE id = $1`, [id])
  if (!res.rows[0]) throw new Error(`Secret ${id} not found`)
  return res.rows[0]
}

export async function createSecretRow(label: string, ciphertext: string, iv: string, tags: string[] = []): Promise<{ id: string; label: string; tags: string[] }> {
  const res = await getDb().query<{ id: string; label: string; tags: string[] }>(
    `INSERT INTO secrets (label, ciphertext, iv, tags) VALUES ($1, $2, $3, $4) RETURNING id, label, tags`,
    [label, ciphertext, iv, tags]
  )
  return res.rows[0]
}

export async function updateSecretRow(
  id: string,
  fields: { label?: string; ciphertext?: string; iv?: string; tags?: string[] }
): Promise<{ id: string; label: string; tags: string[] }> {
  if (!Object.keys(fields).length) throw new Error('No fields to update')
  const sets: string[] = []
  const values: unknown[] = []
  let i = 1
  if (fields.label      !== undefined) { sets.push(`label = $${i++}`);      values.push(fields.label) }
  if (fields.ciphertext !== undefined) { sets.push(`ciphertext = $${i++}`); values.push(fields.ciphertext) }
  if (fields.iv         !== undefined) { sets.push(`iv = $${i++}`);         values.push(fields.iv) }
  if (fields.tags       !== undefined) { sets.push(`tags = $${i++}`);       values.push(fields.tags) }
  sets.push(`updated_at = now()`)
  values.push(id)
  const res = await getDb().query<{ id: string; label: string; tags: string[] }>(
    `UPDATE secrets SET ${sets.join(', ')} WHERE id = $${i} RETURNING id, label, tags`,
    values
  )
  if (!res.rows[0]) throw new Error(`Secret ${id} not found`)
  return res.rows[0]
}

export async function deleteSecretRow(id: string): Promise<void> {
  await getDb().query(`DELETE FROM secrets WHERE id = $1`, [id])
}

export async function listSecretTags(): Promise<string[]> {
  const res = await getDb().query<{ tag: string }>(`SELECT DISTINCT unnest(tags) AS tag FROM secrets ORDER BY tag`)
  return res.rows.map(r => r.tag)
}

export async function exportAllRows(): Promise<{ notes: Note[]; secrets: SecretRow[] }> {
  const notes = await listNotes()
  const res = await getDb().query<SecretRow>(`SELECT * FROM secrets`)
  return { notes, secrets: res.rows }
}

export async function importRows(
  notes: Note[],
  secrets: SecretRow[]
): Promise<{ notesUpdated: number; secretsAdded: number }> {
  let notesUpdated = 0
  let secretsAdded = 0
  const d = getDb()
  for (const n of notes) {
    const existing = await d.query<Note>(`SELECT updated_at FROM notes WHERE id = $1`, [n.id])
    if (!existing.rows[0]) {
      await d.query(
        `INSERT INTO notes (id, title, content, tags, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6)`,
        [n.id, n.title, n.content, n.tags ?? [], n.created_at, n.updated_at]
      )
      notesUpdated++
    } else if (new Date(n.updated_at) > new Date(existing.rows[0].updated_at)) {
      await d.query(
        `UPDATE notes SET title=$1, content=$2, tags=$3, updated_at=$4 WHERE id=$5`,
        [n.title, n.content, n.tags ?? [], n.updated_at, n.id]
      )
      notesUpdated++
    }
  }
  for (const s of secrets) {
    const existing = await d.query<SecretRow>(`SELECT updated_at FROM secrets WHERE id = $1`, [s.id])
    if (!existing.rows[0]) {
      await d.query(
        `INSERT INTO secrets (id, label, ciphertext, iv, tags, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [s.id, s.label, s.ciphertext, s.iv, s.tags ?? [], s.created_at, s.updated_at]
      )
      secretsAdded++
    } else if (new Date(s.updated_at) > new Date(existing.rows[0].updated_at)) {
      await d.query(
        `UPDATE secrets SET label=$1, ciphertext=$2, iv=$3, tags=$4, updated_at=$5 WHERE id=$6`,
        [s.label, s.ciphertext, s.iv, s.tags ?? [], s.updated_at, s.id]
      )
      secretsAdded++
    }
  }
  return { notesUpdated, secretsAdded }
}

// --- Subscriptions ---
export interface Subscription {
  id: string
  name: string
  amount: string  // NUMERIC comes back as string from PGlite
  currency: string
  cycle: string
  start_date: string
  tags: string[]
  notes: string
  created_at: string
  updated_at: string
}

export interface CreateSubscriptionInput {
  name: string
  amount: number
  currency: string
  cycle: string
  start_date: string
  tags: string[]
  notes: string
}

export async function createSubscription(input: CreateSubscriptionInput): Promise<Subscription> {
  const res = await getDb().query<Subscription>(
    `INSERT INTO subscriptions (name, amount, currency, cycle, start_date, tags, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [input.name, input.amount, input.currency, input.cycle, input.start_date, input.tags, input.notes]
  )
  return res.rows[0]
}

export async function listSubscriptions(query?: string, tag?: string): Promise<Subscription[]> {
  const d = getDb()
  const conditions: string[] = []
  const values: unknown[] = []
  let i = 1
  if (query) { conditions.push(`name ILIKE $${i}`); values.push(`%${query}%`); i++ }
  if (tag)   { conditions.push(`$${i} = ANY(tags)`); values.push(tag); i++ }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const res = await d.query<Subscription>(
    `SELECT * FROM subscriptions ${where} ORDER BY name ASC`,
    values
  )
  return res.rows
}

export async function getSubscription(id: string): Promise<Subscription> {
  const res = await getDb().query<Subscription>(`SELECT * FROM subscriptions WHERE id = $1`, [id])
  if (!res.rows[0]) throw new Error(`Subscription ${id} not found`)
  return res.rows[0]
}

export async function updateSubscription(
  id: string,
  fields: Partial<Omit<CreateSubscriptionInput, 'start_date'> & { start_date: string }>
): Promise<Subscription> {
  if (!Object.keys(fields).length) throw new Error('No fields to update')
  const sets: string[] = []
  const values: unknown[] = []
  let i = 1
  const updatable = ['name', 'amount', 'currency', 'cycle', 'start_date', 'tags', 'notes'] as const
  for (const key of updatable) {
    if (fields[key] !== undefined) { sets.push(`${key} = $${i++}`); values.push(fields[key]) }
  }
  sets.push(`updated_at = now()`)
  values.push(id)
  const res = await getDb().query<Subscription>(
    `UPDATE subscriptions SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  )
  if (!res.rows[0]) throw new Error(`Subscription ${id} not found`)
  return res.rows[0]
}

export async function deleteSubscription(id: string): Promise<void> {
  await getDb().query(`DELETE FROM subscriptions WHERE id = $1`, [id])
}
