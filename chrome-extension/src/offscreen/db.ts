import { PGlite, IdbFs, MemoryFS } from '@electric-sql/pglite'
import type { Note } from '../shared/messages'

// image_data is a JSON array of base64 data URLs


let db: PGlite | null = null

export async function initDb(fs?: IdbFs | MemoryFS): Promise<void> {
  db = new PGlite({ fs: fs ?? new IdbFs('my-space-db') })
  await db.exec(`
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
      active       BOOLEAN NOT NULL DEFAULT true,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
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
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
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
    -- Migrations for older schemas
    ALTER TABLE notes          ADD COLUMN IF NOT EXISTS tags       TEXT[] NOT NULL DEFAULT '{}';
    ALTER TABLE secrets        ADD COLUMN IF NOT EXISTS tags       TEXT[] NOT NULL DEFAULT '{}';
    ALTER TABLE notes          ADD COLUMN IF NOT EXISTS image_data TEXT   NOT NULL DEFAULT '[]';
    ALTER TABLE subscriptions  ADD COLUMN IF NOT EXISTS active     BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE todo_lists     ADD COLUMN IF NOT EXISTS icon        TEXT    NOT NULL DEFAULT '';
    ALTER TABLE map_stacks     ADD COLUMN IF NOT EXISTS icon        TEXT    NOT NULL DEFAULT '';
    ALTER TABLE map_pins       ADD COLUMN IF NOT EXISTS priority    TEXT    NOT NULL DEFAULT 'none';
    ALTER TABLE map_pins       ADD COLUMN IF NOT EXISTS category    TEXT    NOT NULL DEFAULT '';
    ALTER TABLE map_pins       ADD COLUMN IF NOT EXISTS rating      INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE map_pins       ADD COLUMN IF NOT EXISTS review_note TEXT    NOT NULL DEFAULT '';
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

export async function createNote(title: string, content: string, tags: string[] = [], image_data = '[]'): Promise<Note> {
  const res = await getDb().query<Note>(
    `INSERT INTO notes (title, content, tags, image_data) VALUES ($1, $2, $3, $4) RETURNING *`,
    [title, content, tags, image_data]
  )
  return res.rows[0]
}

export async function updateNote(
  id: string,
  fields: { title?: string; content?: string; tags?: string[]; image_data?: string }
): Promise<Note> {
  if (fields.title === undefined && fields.content === undefined && fields.tags === undefined && fields.image_data === undefined) {
    throw new Error('No fields to update')
  }
  const sets: string[] = []
  const values: unknown[] = []
  let i = 1
  if (fields.title      !== undefined) { sets.push(`title = $${i++}`);      values.push(fields.title) }
  if (fields.content    !== undefined) { sets.push(`content = $${i++}`);    values.push(fields.content) }
  if (fields.tags       !== undefined) { sets.push(`tags = $${i++}`);       values.push(fields.tags) }
  if (fields.image_data !== undefined) { sets.push(`image_data = $${i++}`); values.push(fields.image_data) }
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

export async function exportAllRows(): Promise<{ notes: Note[]; secrets: SecretRow[]; subscriptions: Subscription[]; bills: Bill[]; mapStacks: MapStack[]; mapPins: MapPin[]; todoLists: TodoList[]; todoTasks: TodoTask[] }> {
  const notes = await listNotes()
  const secrets = await getDb().query<SecretRow>(`SELECT * FROM secrets`)
  const subs = await getDb().query<Subscription>(`SELECT * FROM subscriptions`)
  const bills = await getDb().query<Bill>(`SELECT * FROM bills`)
  const mapStacks = await getDb().query<MapStack>(`SELECT * FROM map_stacks ORDER BY created_at ASC`)
  const mapPins = await getDb().query<MapPin>(`SELECT * FROM map_pins ORDER BY created_at ASC`)
  const todoLists = await getDb().query<TodoList>(`SELECT * FROM todo_lists ORDER BY created_at ASC`)
  const todoTasks = await getDb().query<TodoTask>(`SELECT * FROM todo_tasks ORDER BY created_at ASC`)
  return {
    notes, secrets: secrets.rows, subscriptions: subs.rows, bills: bills.rows,
    mapStacks: mapStacks.rows, mapPins: mapPins.rows, todoLists: todoLists.rows, todoTasks: todoTasks.rows,
  }
}

export async function importRows(
  notes: Note[],
  secrets: SecretRow[],
  subscriptions: Subscription[] = [],
  bills: Bill[] = [],
  mapStacks: MapStack[] = [],
  mapPins: MapPin[] = [],
  todoLists: TodoList[] = [],
  todoTasks: TodoTask[] = []
): Promise<{ notesUpdated: number; secretsAdded: number; subsUpdated: number; billsUpdated: number; mapsUpdated: number; todosUpdated: number }> {
  let notesUpdated = 0
  let secretsAdded = 0
  let subsUpdated = 0
  let billsUpdated = 0
  let mapsUpdated = 0
  let todosUpdated = 0
  const d = getDb()
  for (const n of notes) {
    const existing = await d.query<Note>(`SELECT updated_at FROM notes WHERE id = $1`, [n.id])
    if (!existing.rows[0]) {
      await d.query(
        `INSERT INTO notes (id, title, content, tags, image_data, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [n.id, n.title, n.content, n.tags ?? [], n.image_data ?? '[]', n.created_at, n.updated_at]
      )
      notesUpdated++
    } else if (new Date(n.updated_at) > new Date(existing.rows[0].updated_at)) {
      await d.query(
        `UPDATE notes SET title=$1, content=$2, tags=$3, image_data=$4, updated_at=$5 WHERE id=$6`,
        [n.title, n.content, n.tags ?? [], n.image_data ?? '[]', n.updated_at, n.id]
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
  for (const sub of subscriptions) {
    const existing = await d.query<Subscription>(`SELECT updated_at FROM subscriptions WHERE id = $1`, [sub.id])
    if (!existing.rows[0]) {
      await d.query(
        `INSERT INTO subscriptions (id, name, amount, currency, cycle, start_date, tags, notes, active, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [sub.id, sub.name, sub.amount, sub.currency, sub.cycle, sub.start_date, sub.tags ?? [], sub.notes, sub.active ?? true, sub.created_at, sub.updated_at]
      )
      subsUpdated++
    } else if (new Date(sub.updated_at) > new Date(existing.rows[0].updated_at)) {
      await d.query(
        `UPDATE subscriptions SET name=$1, amount=$2, currency=$3, cycle=$4, start_date=$5, tags=$6, notes=$7, active=$8, updated_at=$9 WHERE id=$10`,
        [sub.name, sub.amount, sub.currency, sub.cycle, sub.start_date, sub.tags ?? [], sub.notes, sub.active ?? true, sub.updated_at, sub.id]
      )
      subsUpdated++
    }
  }
  for (const b of bills) {
    await d.query(
      `INSERT INTO bills (sub_id, year, month, amount, currency, notes, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (sub_id, year, month) DO UPDATE
         SET amount=$4, currency=$5, notes=$6, updated_at=$7
         WHERE bills.updated_at < $7`,
      [b.sub_id, b.year, b.month, b.amount, b.currency, b.notes ?? '', b.updated_at]
    )
    billsUpdated++
  }
  // Map stacks must be imported before pins (foreign key). No updated_at — first-write-wins.
  for (const st of mapStacks) {
    const r = await d.query(
      `INSERT INTO map_stacks (id, name, color, icon, created_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
      [st.id, st.name, st.color, st.icon ?? '', st.created_at]
    )
    if ((r as { rowCount?: number }).rowCount) mapsUpdated++
  }
  for (const p of mapPins) {
    const r = await d.query(
      `INSERT INTO map_pins (id, stack_id, label, lat, lng, url, note, priority, category, rating, review_note, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (id) DO NOTHING`,
      [p.id, p.stack_id, p.label, p.lat, p.lng, p.url ?? '', p.note ?? '', p.priority ?? 'none', p.category ?? '', p.rating ?? 0, p.review_note ?? '', p.created_at]
    )
    if ((r as { rowCount?: number }).rowCount) mapsUpdated++
  }
  // Todo lists before tasks (foreign key). No updated_at — first-write-wins.
  for (const tl of todoLists) {
    const r = await d.query(
      `INSERT INTO todo_lists (id, name, color, icon, created_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
      [tl.id, tl.name, tl.color, tl.icon ?? '', tl.created_at]
    )
    if ((r as { rowCount?: number }).rowCount) todosUpdated++
  }
  for (const tt of todoTasks) {
    const ex = await d.query<TodoTask>(`SELECT updated_at FROM todo_tasks WHERE id = $1`, [tt.id])
    if (!ex.rows[0]) {
      await d.query(
        `INSERT INTO todo_tasks (id, list_id, title, note, priority, due_date, recurrence, done, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [tt.id, tt.list_id, tt.title, tt.note ?? '', tt.priority, tt.due_date ?? null, tt.recurrence, tt.done ?? false, tt.created_at, tt.updated_at]
      )
      todosUpdated++
    } else if (new Date(tt.updated_at) > new Date(ex.rows[0].updated_at)) {
      await d.query(
        `UPDATE todo_tasks SET title=$1, note=$2, priority=$3, due_date=$4, recurrence=$5, done=$6, updated_at=$7 WHERE id=$8`,
        [tt.title, tt.note ?? '', tt.priority, tt.due_date ?? null, tt.recurrence, tt.done ?? false, tt.updated_at, tt.id]
      )
      todosUpdated++
    }
  }
  return { notesUpdated, secretsAdded, subsUpdated, billsUpdated, mapsUpdated, todosUpdated }
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
  active: boolean
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
  active?: boolean
}

// --- Bills ---
export interface Bill {
  sub_id: string
  year: number
  month: number    // 1-12
  amount: string   // NUMERIC comes back as string
  currency: string
  notes: string
  updated_at: string
}

export async function createSubscription(input: CreateSubscriptionInput): Promise<Subscription> {
  const res = await getDb().query<Subscription>(
    `INSERT INTO subscriptions (name, amount, currency, cycle, start_date, tags, notes, active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [input.name, input.amount, input.currency, input.cycle, input.start_date, input.tags, input.notes, input.active ?? true]
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
  fields: Partial<Omit<CreateSubscriptionInput, 'start_date'> & { start_date: string; active: boolean }>
): Promise<Subscription> {
  if (!Object.keys(fields).length) throw new Error('No fields to update')
  const sets: string[] = []
  const values: unknown[] = []
  let i = 1
  const updatable = ['name', 'amount', 'currency', 'cycle', 'start_date', 'tags', 'notes', 'active'] as const
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
  await getDb().query(`DELETE FROM bills WHERE sub_id = $1`, [id])
}

// --- Bills CRUD ---
export async function upsertBill(subId: string, year: number, month: number, amount: number, currency: string, notes = ''): Promise<Bill> {
  const res = await getDb().query<Bill>(
    `INSERT INTO bills (sub_id, year, month, amount, currency, notes, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,now())
     ON CONFLICT (sub_id, year, month) DO UPDATE
       SET amount=$4, currency=$5, notes=$6, updated_at=now()
     RETURNING *`,
    [subId, year, month, amount, currency, notes]
  )
  return res.rows[0]
}

export async function deleteBill(subId: string, year: number, month: number): Promise<void> {
  await getDb().query(`DELETE FROM bills WHERE sub_id=$1 AND year=$2 AND month=$3`, [subId, year, month])
}

export async function listBillsForMonth(year: number, month: number): Promise<Bill[]> {
  const res = await getDb().query<Bill>(
    `SELECT * FROM bills WHERE year=$1 AND month=$2 ORDER BY sub_id ASC`,
    [year, month]
  )
  return res.rows
}

export async function listBillsForSub(subId: string): Promise<Bill[]> {
  const res = await getDb().query<Bill>(
    `SELECT * FROM bills WHERE sub_id=$1 ORDER BY year DESC, month DESC`,
    [subId]
  )
  return res.rows
}

export async function getAllBills(): Promise<Bill[]> {
  const res = await getDb().query<Bill>(`SELECT * FROM bills ORDER BY year DESC, month DESC`)
  return res.rows
}

// --- Todo Lists ---
export interface TodoList {
  id: string
  name: string
  color: string
  icon: string
  created_at: string
}

export interface TodoTask {
  id: string
  list_id: string
  title: string
  note: string
  priority: 'low' | 'medium' | 'high'
  due_date: string | null
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly'
  done: boolean
  created_at: string
  updated_at: string
}

export async function listTodoLists(): Promise<TodoList[]> {
  const res = await getDb().query<TodoList>(`SELECT * FROM todo_lists ORDER BY created_at ASC`)
  return res.rows
}

export async function createTodoList(name: string, color: string, icon = ''): Promise<TodoList> {
  const res = await getDb().query<TodoList>(
    `INSERT INTO todo_lists (name, color, icon) VALUES ($1, $2, $3) RETURNING *`,
    [name, color, icon]
  )
  return res.rows[0]
}

export async function updateTodoList(id: string, fields: { name?: string; color?: string; icon?: string }): Promise<TodoList> {
  const sets: string[] = []
  const values: unknown[] = []
  let i = 1
  if (fields.name  !== undefined) { sets.push(`name = $${i++}`);  values.push(fields.name) }
  if (fields.color !== undefined) { sets.push(`color = $${i++}`); values.push(fields.color) }
  if (fields.icon  !== undefined) { sets.push(`icon = $${i++}`);  values.push(fields.icon) }
  if (!sets.length) throw new Error('No fields to update')
  values.push(id)
  const res = await getDb().query<TodoList>(
    `UPDATE todo_lists SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  )
  if (!res.rows[0]) throw new Error(`List ${id} not found`)
  return res.rows[0]
}

export async function deleteTodoList(id: string): Promise<void> {
  await getDb().query(`DELETE FROM todo_lists WHERE id = $1`, [id])
}

export async function listTodoTasks(listId: string): Promise<TodoTask[]> {
  const res = await getDb().query<TodoTask>(
    `SELECT * FROM todo_tasks WHERE list_id = $1 ORDER BY done ASC, due_date ASC NULLS LAST, priority DESC, created_at ASC`,
    [listId]
  )
  return res.rows
}

export async function createTodoTask(
  listId: string,
  title: string,
  note: string,
  priority: string,
  due_date: string | null,
  recurrence: string
): Promise<TodoTask> {
  const res = await getDb().query<TodoTask>(
    `INSERT INTO todo_tasks (list_id, title, note, priority, due_date, recurrence)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [listId, title, note, priority, due_date, recurrence]
  )
  return res.rows[0]
}

export async function updateTodoTask(
  id: string,
  fields: { title?: string; note?: string; priority?: string; due_date?: string | null; recurrence?: string; done?: boolean }
): Promise<TodoTask> {
  const sets: string[] = []
  const values: unknown[] = []
  let i = 1
  if (fields.title      !== undefined) { sets.push(`title = $${i++}`);      values.push(fields.title) }
  if (fields.note       !== undefined) { sets.push(`note = $${i++}`);       values.push(fields.note) }
  if (fields.priority   !== undefined) { sets.push(`priority = $${i++}`);   values.push(fields.priority) }
  if (fields.due_date   !== undefined) { sets.push(`due_date = $${i++}`);   values.push(fields.due_date) }
  if (fields.recurrence !== undefined) { sets.push(`recurrence = $${i++}`); values.push(fields.recurrence) }
  if (fields.done       !== undefined) { sets.push(`done = $${i++}`);       values.push(fields.done) }
  if (!sets.length) throw new Error('No fields to update')
  sets.push(`updated_at = now()`)
  values.push(id)
  const res = await getDb().query<TodoTask>(
    `UPDATE todo_tasks SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  )
  if (!res.rows[0]) throw new Error(`Task ${id} not found`)
  return res.rows[0]
}

export async function deleteTodoTask(id: string): Promise<void> {
  await getDb().query(`DELETE FROM todo_tasks WHERE id = $1`, [id])
}

// --- Map Stacks ---
export interface MapStack {
  id: string
  name: string
  color: string
  icon: string
  created_at: string
}

export interface MapPin {
  id: string
  stack_id: string
  label: string
  lat: number
  lng: number
  url: string
  note: string
  priority: 'none' | 'low' | 'medium' | 'high'
  category: string
  rating: number
  review_note: string
  created_at: string
}

export async function listMapStacks(): Promise<MapStack[]> {
  const res = await getDb().query<MapStack>(`SELECT * FROM map_stacks ORDER BY created_at DESC`)
  return res.rows
}

export async function createMapStack(name: string, color: string, icon = ''): Promise<MapStack> {
  const res = await getDb().query<MapStack>(
    `INSERT INTO map_stacks (name, color, icon) VALUES ($1, $2, $3) RETURNING *`,
    [name, color, icon]
  )
  return res.rows[0]
}

export async function updateMapStack(id: string, fields: { name?: string; color?: string; icon?: string }): Promise<MapStack> {
  const sets: string[] = []
  const values: unknown[] = []
  let i = 1
  if (fields.name  !== undefined) { sets.push(`name = $${i++}`);  values.push(fields.name) }
  if (fields.color !== undefined) { sets.push(`color = $${i++}`); values.push(fields.color) }
  if (fields.icon  !== undefined) { sets.push(`icon = $${i++}`);  values.push(fields.icon) }
  if (!sets.length) throw new Error('No fields to update')
  values.push(id)
  const res = await getDb().query<MapStack>(
    `UPDATE map_stacks SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  )
  if (!res.rows[0]) throw new Error(`Stack ${id} not found`)
  return res.rows[0]
}

export async function deleteMapStack(id: string): Promise<void> {
  await getDb().query(`DELETE FROM map_stacks WHERE id = $1`, [id])
}

// --- Map Pins ---
export async function listMapPins(stackId: string): Promise<MapPin[]> {
  const res = await getDb().query<MapPin>(
    `SELECT * FROM map_pins WHERE stack_id = $1 ORDER BY created_at DESC`,
    [stackId]
  )
  return res.rows
}

export async function createMapPin(stackId: string, label: string, lat: number, lng: number, url: string, note: string, priority = 'none', category = '', rating = 0, review_note = ''): Promise<MapPin> {
  const res = await getDb().query<MapPin>(
    `INSERT INTO map_pins (stack_id, label, lat, lng, url, note, priority, category, rating, review_note) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [stackId, label, lat, lng, url, note, priority, category, rating, review_note]
  )
  return res.rows[0]
}

export async function updateMapPin(id: string, fields: { label?: string; note?: string; priority?: string; category?: string; rating?: number; review_note?: string }): Promise<MapPin> {
  const sets: string[] = []
  const values: unknown[] = []
  let i = 1
  if (fields.label       !== undefined) { sets.push(`label = $${i++}`);       values.push(fields.label) }
  if (fields.note        !== undefined) { sets.push(`note = $${i++}`);        values.push(fields.note) }
  if (fields.priority    !== undefined) { sets.push(`priority = $${i++}`);    values.push(fields.priority) }
  if (fields.category    !== undefined) { sets.push(`category = $${i++}`);    values.push(fields.category) }
  if (fields.rating      !== undefined) { sets.push(`rating = $${i++}`);      values.push(fields.rating) }
  if (fields.review_note !== undefined) { sets.push(`review_note = $${i++}`); values.push(fields.review_note) }
  if (!sets.length) throw new Error('No fields to update')
  values.push(id)
  const res = await getDb().query<MapPin>(
    `UPDATE map_pins SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  )
  if (!res.rows[0]) throw new Error(`Pin ${id} not found`)
  return res.rows[0]
}

export async function deleteMapPin(id: string): Promise<void> {
  await getDb().query(`DELETE FROM map_pins WHERE id = $1`, [id])
}

