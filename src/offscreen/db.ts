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
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS secrets (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      label       TEXT NOT NULL,
      ciphertext  TEXT NOT NULL,
      iv          TEXT NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)
}

function getDb(): PGlite {
  if (!db) throw new Error('DB not initialised')
  return db
}

export async function listNotes(query?: string): Promise<Note[]> {
  const d = getDb()
  if (query) {
    const res = await d.query<Note>(
      `SELECT * FROM notes WHERE title ILIKE $1 OR content ILIKE $1 ORDER BY updated_at DESC`,
      [`%${query}%`]
    )
    return res.rows
  }
  const res = await d.query<Note>(`SELECT * FROM notes ORDER BY updated_at DESC`)
  return res.rows
}

export async function getNote(id: string): Promise<Note> {
  const res = await getDb().query<Note>(`SELECT * FROM notes WHERE id = $1`, [id])
  if (!res.rows[0]) throw new Error(`Note ${id} not found`)
  return res.rows[0]
}

export async function createNote(title: string, content: string): Promise<Note> {
  const res = await getDb().query<Note>(
    `INSERT INTO notes (title, content) VALUES ($1, $2) RETURNING *`,
    [title, content]
  )
  return res.rows[0]
}

export async function updateNote(
  id: string,
  fields: { title?: string; content?: string }
): Promise<Note> {
  const sets: string[] = []
  const values: unknown[] = []
  let i = 1
  if (fields.title !== undefined) { sets.push(`title = $${i++}`); values.push(fields.title) }
  if (fields.content !== undefined) { sets.push(`content = $${i++}`); values.push(fields.content) }
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

// --- Secrets ---
export interface SecretRow {
  id: string; label: string; ciphertext: string; iv: string
  created_at: string; updated_at: string
}

export async function listSecretMeta(query?: string): Promise<Array<{ id: string; label: string; updated_at: string }>> {
  const d = getDb()
  if (query) {
    const res = await d.query<{ id: string; label: string; updated_at: string }>(
      `SELECT id, label, updated_at FROM secrets WHERE label ILIKE $1 ORDER BY updated_at DESC`,
      [`%${query}%`]
    )
    return res.rows
  }
  const res = await d.query<{ id: string; label: string; updated_at: string }>(
    `SELECT id, label, updated_at FROM secrets ORDER BY updated_at DESC`
  )
  return res.rows
}

export async function getSecretRow(id: string): Promise<SecretRow> {
  const res = await getDb().query<SecretRow>(`SELECT * FROM secrets WHERE id = $1`, [id])
  if (!res.rows[0]) throw new Error(`Secret ${id} not found`)
  return res.rows[0]
}

export async function createSecretRow(label: string, ciphertext: string, iv: string): Promise<{ id: string; label: string }> {
  const res = await getDb().query<{ id: string; label: string }>(
    `INSERT INTO secrets (label, ciphertext, iv) VALUES ($1, $2, $3) RETURNING id, label`,
    [label, ciphertext, iv]
  )
  return res.rows[0]
}

export async function updateSecretRow(
  id: string,
  fields: { label?: string; ciphertext?: string; iv?: string }
): Promise<{ id: string; label: string }> {
  const sets: string[] = []
  const values: unknown[] = []
  let i = 1
  if (fields.label !== undefined) { sets.push(`label = $${i++}`); values.push(fields.label) }
  if (fields.ciphertext !== undefined) { sets.push(`ciphertext = $${i++}`); values.push(fields.ciphertext) }
  if (fields.iv !== undefined) { sets.push(`iv = $${i++}`); values.push(fields.iv) }
  sets.push(`updated_at = now()`)
  values.push(id)
  const res = await getDb().query<{ id: string; label: string }>(
    `UPDATE secrets SET ${sets.join(', ')} WHERE id = $${i} RETURNING id, label`,
    values
  )
  if (!res.rows[0]) throw new Error(`Secret ${id} not found`)
  return res.rows[0]
}

export async function deleteSecretRow(id: string): Promise<void> {
  await getDb().query(`DELETE FROM secrets WHERE id = $1`, [id])
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
        `INSERT INTO notes (id, title, content, created_at, updated_at) VALUES ($1,$2,$3,$4,$5)`,
        [n.id, n.title, n.content, n.created_at, n.updated_at]
      )
      notesUpdated++
    } else if (n.updated_at > existing.rows[0].updated_at) {
      await d.query(
        `UPDATE notes SET title=$1, content=$2, updated_at=$3 WHERE id=$4`,
        [n.title, n.content, n.updated_at, n.id]
      )
      notesUpdated++
    }
  }
  for (const s of secrets) {
    const existing = await d.query<SecretRow>(`SELECT updated_at FROM secrets WHERE id = $1`, [s.id])
    if (!existing.rows[0]) {
      await d.query(
        `INSERT INTO secrets (id, label, ciphertext, iv, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6)`,
        [s.id, s.label, s.ciphertext, s.iv, s.created_at, s.updated_at]
      )
      secretsAdded++
    } else if (s.updated_at > existing.rows[0].updated_at) {
      await d.query(
        `UPDATE secrets SET label=$1, ciphertext=$2, iv=$3, updated_at=$4 WHERE id=$5`,
        [s.label, s.ciphertext, s.iv, s.updated_at, s.id]
      )
    }
  }
  return { notesUpdated, secretsAdded }
}
