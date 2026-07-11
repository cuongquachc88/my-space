import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryFS } from '@electric-sql/pglite'
import { resetDb, getDb } from '../../src/db'

beforeEach(async () => {
  await resetDb(new MemoryFS())
})

// ── Notes ──────────────────────────────────────────────────────────────────

describe('notes table', () => {
  it('inserts and retrieves a note', async () => {
    const db = await getDb()
    const result = await db.query<{ id: string; title: string; content: string }>(
      "INSERT INTO notes (title, content) VALUES ('Hello', 'World') RETURNING id, title, content"
    )
    expect(result.rows[0].title).toBe('Hello')
    expect(result.rows[0].content).toBe('World')
    expect(result.rows[0].id).toBeTruthy()
  })

  it('tags default to empty array', async () => {
    const db = await getDb()
    const res = await db.query<{ tags: string[] }>(
      "INSERT INTO notes (title, content) VALUES ('T', 'C') RETURNING tags"
    )
    expect(res.rows[0].tags).toEqual([])
  })

  it('stores and retrieves tags', async () => {
    const db = await getDb()
    const res = await db.query<{ tags: string[] }>(
      "INSERT INTO notes (title, content, tags) VALUES ('T', 'C', ARRAY['work','urgent']) RETURNING tags"
    )
    expect(res.rows[0].tags).toEqual(['work', 'urgent'])
  })

  it('lists all notes', async () => {
    const db = await getDb()
    await db.query("INSERT INTO notes (title, content) VALUES ('A', ''), ('B', '')")
    const res = await db.query<{ title: string }>('SELECT title FROM notes ORDER BY title')
    expect(res.rows.map(r => r.title)).toEqual(['A', 'B'])
  })

  it('updates a note', async () => {
    const db = await getDb()
    const { rows: [{ id }] } = await db.query<{ id: string }>(
      "INSERT INTO notes (title, content) VALUES ('Old', 'Old') RETURNING id"
    )
    await db.query("UPDATE notes SET title = 'New', content = 'New' WHERE id = $1", [id])
    const { rows: [n] } = await db.query<{ title: string; content: string }>('SELECT title, content FROM notes WHERE id = $1', [id])
    expect(n.title).toBe('New')
    expect(n.content).toBe('New')
  })

  it('deletes a note', async () => {
    const db = await getDb()
    const { rows: [{ id }] } = await db.query<{ id: string }>(
      "INSERT INTO notes (title, content) VALUES ('Del', '') RETURNING id"
    )
    await db.query('DELETE FROM notes WHERE id = $1', [id])
    const { rows } = await db.query('SELECT id FROM notes WHERE id = $1', [id])
    expect(rows).toHaveLength(0)
  })

  it('image_data defaults to []', async () => {
    const db = await getDb()
    const res = await db.query<{ image_data: string }>(
      "INSERT INTO notes (title, content) VALUES ('T', '') RETURNING image_data"
    )
    expect(res.rows[0].image_data).toBe('[]')
  })
})

// ── Secrets ────────────────────────────────────────────────────────────────

describe('secrets table', () => {
  it('inserts a secret with encrypted fields', async () => {
    const db = await getDb()
    const res = await db.query<{ id: string; label: string }>(
      "INSERT INTO secrets (label, ciphertext, iv) VALUES ('GitHub PAT', 'abc123', 'iv000') RETURNING id, label"
    )
    expect(res.rows[0].label).toBe('GitHub PAT')
    expect(res.rows[0].id).toBeTruthy()
  })

  it('url and description default to empty string', async () => {
    const db = await getDb()
    const res = await db.query<{ url: string; description: string }>(
      "INSERT INTO secrets (label, ciphertext, iv) VALUES ('L', 'c', 'i') RETURNING url, description"
    )
    expect(res.rows[0].url).toBe('')
    expect(res.rows[0].description).toBe('')
  })

  it('stores and retrieves url and description', async () => {
    const db = await getDb()
    const res = await db.query<{ url: string; description: string }>(
      "INSERT INTO secrets (label, ciphertext, iv, url, description) VALUES ('L', 'c', 'i', 'https://github.com', 'My PAT') RETURNING url, description"
    )
    expect(res.rows[0].url).toBe('https://github.com')
    expect(res.rows[0].description).toBe('My PAT')
  })

  it('deletes a secret', async () => {
    const db = await getDb()
    const { rows: [{ id }] } = await db.query<{ id: string }>(
      "INSERT INTO secrets (label, ciphertext, iv) VALUES ('X', 'c', 'i') RETURNING id"
    )
    await db.query('DELETE FROM secrets WHERE id = $1', [id])
    const { rows } = await db.query('SELECT id FROM secrets WHERE id = $1', [id])
    expect(rows).toHaveLength(0)
  })
})

// ── Subscriptions ──────────────────────────────────────────────────────────

describe('subscriptions table', () => {
  it('inserts a subscription', async () => {
    const db = await getDb()
    const res = await db.query<{ id: string; name: string; amount: string }>(
      "INSERT INTO subscriptions (name, amount, start_date) VALUES ('Netflix', 15.99, '2024-01-01') RETURNING id, name, amount"
    )
    expect(res.rows[0].name).toBe('Netflix')
    expect(parseFloat(res.rows[0].amount)).toBeCloseTo(15.99)
  })

  it('active defaults to true', async () => {
    const db = await getDb()
    const res = await db.query<{ active: boolean }>(
      "INSERT INTO subscriptions (name, amount, start_date) VALUES ('S', 9.99, '2024-01-01') RETURNING active"
    )
    expect(res.rows[0].active).toBe(true)
  })

  it('currency defaults to USD', async () => {
    const db = await getDb()
    const res = await db.query<{ currency: string }>(
      "INSERT INTO subscriptions (name, amount, start_date) VALUES ('S', 9.99, '2024-01-01') RETURNING currency"
    )
    expect(res.rows[0].currency).toBe('USD')
  })

  it('updates subscription active status', async () => {
    const db = await getDb()
    const { rows: [{ id }] } = await db.query<{ id: string }>(
      "INSERT INTO subscriptions (name, amount, start_date) VALUES ('S', 9.99, '2024-01-01') RETURNING id"
    )
    await db.query('UPDATE subscriptions SET active = false WHERE id = $1', [id])
    const { rows: [s] } = await db.query<{ active: boolean }>('SELECT active FROM subscriptions WHERE id = $1', [id])
    expect(s.active).toBe(false)
  })
})

// ── Bills ──────────────────────────────────────────────────────────────────

describe('bills table', () => {
  it('inserts a bill', async () => {
    const db = await getDb()
    await db.query<{ sub_id: string }>(
      "INSERT INTO subscriptions (id, name, amount, start_date) VALUES ('sub-1', 'Netflix', 15.99, '2024-01-01')"
    )
    await db.query(
      "INSERT INTO bills (sub_id, year, month, amount, currency) VALUES ('sub-1', 2024, 1, 15.99, 'USD')"
    )
    const res = await db.query<{ amount: string }>('SELECT amount FROM bills WHERE sub_id = $1 AND year = 2024 AND month = 1', ['sub-1'])
    expect(parseFloat(res.rows[0].amount)).toBeCloseTo(15.99)
  })

  it('upserts a bill (ON CONFLICT UPDATE)', async () => {
    const db = await getDb()
    await db.query("INSERT INTO subscriptions (id, name, amount, start_date) VALUES ('sub-2', 'S', 9, '2024-01-01')")
    await db.query("INSERT INTO bills (sub_id, year, month, amount) VALUES ('sub-2', 2024, 6, 9.00)")
    await db.query(`
      INSERT INTO bills (sub_id, year, month, amount) VALUES ('sub-2', 2024, 6, 12.00)
      ON CONFLICT (sub_id, year, month) DO UPDATE SET amount = EXCLUDED.amount
    `)
    const res = await db.query<{ amount: string }>('SELECT amount FROM bills WHERE sub_id = $1 AND year = 2024 AND month = 6', ['sub-2'])
    expect(parseFloat(res.rows[0].amount)).toBeCloseTo(12.00)
  })

  it('primary key prevents duplicate inserts', async () => {
    const db = await getDb()
    await db.query("INSERT INTO subscriptions (id, name, amount, start_date) VALUES ('sub-3', 'S', 9, '2024-01-01')")
    await db.query("INSERT INTO bills (sub_id, year, month, amount) VALUES ('sub-3', 2024, 3, 9.00)")
    await expect(
      db.query("INSERT INTO bills (sub_id, year, month, amount) VALUES ('sub-3', 2024, 3, 10.00)")
    ).rejects.toThrow()
  })
})

// ── Todo Lists & Tasks ─────────────────────────────────────────────────────

describe('todo_lists and todo_tasks', () => {
  it('inserts a list', async () => {
    const db = await getDb()
    const res = await db.query<{ id: string; name: string }>(
      "INSERT INTO todo_lists (name) VALUES ('Shopping') RETURNING id, name"
    )
    expect(res.rows[0].name).toBe('Shopping')
    expect(res.rows[0].id).toBeTruthy()
  })

  it('inserts tasks into a list', async () => {
    const db = await getDb()
    const { rows: [{ id: listId }] } = await db.query<{ id: string }>(
      "INSERT INTO todo_lists (name) VALUES ('Work') RETURNING id"
    )
    await db.query(
      'INSERT INTO todo_tasks (list_id, title, priority) VALUES ($1, $2, $3)',
      [listId, 'Write tests', 'high']
    )
    const res = await db.query<{ title: string; priority: string }>(
      'SELECT title, priority FROM todo_tasks WHERE list_id = $1', [listId]
    )
    expect(res.rows[0].title).toBe('Write tests')
    expect(res.rows[0].priority).toBe('high')
  })

  it('done defaults to false', async () => {
    const db = await getDb()
    const { rows: [{ id: listId }] } = await db.query<{ id: string }>(
      "INSERT INTO todo_lists (name) VALUES ('L') RETURNING id"
    )
    const res = await db.query<{ done: boolean }>(
      'INSERT INTO todo_tasks (list_id, title) VALUES ($1, $2) RETURNING done',
      [listId, 'Task']
    )
    expect(res.rows[0].done).toBe(false)
  })

  it('recurrence defaults to none', async () => {
    const db = await getDb()
    const { rows: [{ id: listId }] } = await db.query<{ id: string }>(
      "INSERT INTO todo_lists (name) VALUES ('L') RETURNING id"
    )
    const res = await db.query<{ recurrence: string }>(
      'INSERT INTO todo_tasks (list_id, title) VALUES ($1, $2) RETURNING recurrence',
      [listId, 'Task']
    )
    expect(res.rows[0].recurrence).toBe('none')
  })

  it('cascade deletes tasks when list is deleted', async () => {
    const db = await getDb()
    const { rows: [{ id: listId }] } = await db.query<{ id: string }>(
      "INSERT INTO todo_lists (name) VALUES ('L') RETURNING id"
    )
    await db.query('INSERT INTO todo_tasks (list_id, title) VALUES ($1, $2)', [listId, 'Task'])
    await db.query('DELETE FROM todo_lists WHERE id = $1', [listId])
    const res = await db.query('SELECT id FROM todo_tasks WHERE list_id = $1', [listId])
    expect(res.rows).toHaveLength(0)
  })

  it('toggles task done', async () => {
    const db = await getDb()
    const { rows: [{ id: listId }] } = await db.query<{ id: string }>(
      "INSERT INTO todo_lists (name) VALUES ('L') RETURNING id"
    )
    const { rows: [{ id: taskId }] } = await db.query<{ id: string }>(
      'INSERT INTO todo_tasks (list_id, title) VALUES ($1, $2) RETURNING id',
      [listId, 'Task']
    )
    await db.query('UPDATE todo_tasks SET done = true WHERE id = $1', [taskId])
    const res = await db.query<{ done: boolean }>('SELECT done FROM todo_tasks WHERE id = $1', [taskId])
    expect(res.rows[0].done).toBe(true)
  })
})

// ── Map Stacks & Pins ──────────────────────────────────────────────────────

describe('map_stacks and map_pins', () => {
  it('inserts a stack', async () => {
    const db = await getDb()
    const res = await db.query<{ id: string; name: string }>(
      "INSERT INTO map_stacks (name, color) VALUES ('Tokyo', '#34d399') RETURNING id, name"
    )
    expect(res.rows[0].name).toBe('Tokyo')
  })

  it('inserts a pin into a stack', async () => {
    const db = await getDb()
    const { rows: [{ id: stackId }] } = await db.query<{ id: string }>(
      "INSERT INTO map_stacks (name) VALUES ('S') RETURNING id"
    )
    const res = await db.query<{ label: string; lat: number; lng: number }>(
      'INSERT INTO map_pins (stack_id, label, lat, lng) VALUES ($1, $2, $3, $4) RETURNING label, lat, lng',
      [stackId, 'Shibuya', 35.6595, 139.7004]
    )
    expect(res.rows[0].label).toBe('Shibuya')
    expect(res.rows[0].lat).toBeCloseTo(35.6595, 4)
    expect(res.rows[0].lng).toBeCloseTo(139.7004, 4)
  })

  it('rating defaults to 0', async () => {
    const db = await getDb()
    const { rows: [{ id: stackId }] } = await db.query<{ id: string }>(
      "INSERT INTO map_stacks (name) VALUES ('S') RETURNING id"
    )
    const res = await db.query<{ rating: number }>(
      'INSERT INTO map_pins (stack_id, label, lat, lng) VALUES ($1, $2, 0, 0) RETURNING rating',
      [stackId, 'Pin']
    )
    expect(res.rows[0].rating).toBe(0)
  })

  it('stores rich pin fields (category, review_note, url)', async () => {
    const db = await getDb()
    const { rows: [{ id: stackId }] } = await db.query<{ id: string }>(
      "INSERT INTO map_stacks (name) VALUES ('S') RETURNING id"
    )
    const res = await db.query<{ category: string; review_note: string; url: string }>(
      'INSERT INTO map_pins (stack_id, label, lat, lng, category, review_note, url, rating) VALUES ($1, $2, 0, 0, $3, $4, $5, 5) RETURNING category, review_note, url',
      [stackId, 'Ramen shop', 'food', 'Amazing ramen!', 'https://example.com']
    )
    expect(res.rows[0].category).toBe('food')
    expect(res.rows[0].review_note).toBe('Amazing ramen!')
    expect(res.rows[0].url).toBe('https://example.com')
  })

  it('cascade deletes pins when stack is deleted', async () => {
    const db = await getDb()
    const { rows: [{ id: stackId }] } = await db.query<{ id: string }>(
      "INSERT INTO map_stacks (name) VALUES ('S') RETURNING id"
    )
    await db.query('INSERT INTO map_pins (stack_id, label, lat, lng) VALUES ($1, $2, 0, 0)', [stackId, 'Pin'])
    await db.query('DELETE FROM map_stacks WHERE id = $1', [stackId])
    const res = await db.query('SELECT id FROM map_pins WHERE stack_id = $1', [stackId])
    expect(res.rows).toHaveLength(0)
  })
})

// ── Export / Import round-trip ─────────────────────────────────────────────

describe('export / import data copy round-trip', () => {
  it('exports all tables and re-imports into a fresh db', async () => {
    const db = await getDb()

    // Seed data across all tables
    await db.query("INSERT INTO notes (title, content, tags) VALUES ('Note A', 'content', ARRAY['tag1'])")
    await db.query("INSERT INTO secrets (label, ciphertext, iv) VALUES ('My secret', 'cipherXYZ', 'ivABC')")
    await db.query("INSERT INTO subscriptions (name, amount, start_date) VALUES ('Netflix', 15.99, '2024-01-01')")

    const { rows: [{ id: listId }] } = await db.query<{ id: string }>(
      "INSERT INTO todo_lists (name, color) VALUES ('Work', '#818cf8') RETURNING id"
    )
    await db.query('INSERT INTO todo_tasks (list_id, title, priority) VALUES ($1, $2, $3)', [listId, 'Write tests', 'high'])

    const { rows: [{ id: stackId }] } = await db.query<{ id: string }>(
      "INSERT INTO map_stacks (name) VALUES ('Tokyo') RETURNING id"
    )
    await db.query('INSERT INTO map_pins (stack_id, label, lat, lng) VALUES ($1, $2, $3, $4)', [stackId, 'Shibuya', 35.66, 139.70])

    // Export
    const [notes, secrets, subs, todoLists, tasks, stacks, pins] = await Promise.all([
      db.query('SELECT * FROM notes'),
      db.query('SELECT * FROM secrets'),
      db.query('SELECT * FROM subscriptions'),
      db.query('SELECT * FROM todo_lists'),
      db.query('SELECT * FROM todo_tasks'),
      db.query('SELECT * FROM map_stacks'),
      db.query('SELECT * FROM map_pins'),
    ])

    // Fresh database
    await resetDb(new MemoryFS())
    const db2 = await getDb()

    // Import notes
    for (const n of notes.rows as { id: string; title: string; content: string; tags: string[]; image_data: string }[]) {
      await db2.query(
        'INSERT INTO notes (id, title, content, tags, image_data) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
        [n.id, n.title, n.content, n.tags ?? [], n.image_data ?? '[]']
      )
    }

    // Import secrets
    for (const s of secrets.rows as { id: string; label: string; ciphertext: string; iv: string; tags: string[]; url: string; description: string }[]) {
      await db2.query(
        'INSERT INTO secrets (id, label, ciphertext, iv, tags, url, description) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING',
        [s.id, s.label, s.ciphertext, s.iv, s.tags ?? [], s.url ?? '', s.description ?? '']
      )
    }

    // Import todo lists then tasks (FK order)
    for (const l of todoLists.rows as { id: string; name: string; color: string; icon: string }[]) {
      await db2.query(
        'INSERT INTO todo_lists (id, name, color, icon) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING',
        [l.id, l.name, l.color, l.icon]
      )
    }
    for (const t of tasks.rows as { id: string; list_id: string; title: string; priority: string; recurrence: string; done: boolean; note: string }[]) {
      await db2.query(
        'INSERT INTO todo_tasks (id, list_id, title, priority, recurrence, done, note) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING',
        [t.id, t.list_id, t.title, t.priority, t.recurrence, t.done, t.note]
      )
    }

    // Import stacks then pins
    for (const s of stacks.rows as { id: string; name: string; color: string; icon: string }[]) {
      await db2.query(
        'INSERT INTO map_stacks (id, name, color, icon) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING',
        [s.id, s.name, s.color, s.icon]
      )
    }
    for (const p of pins.rows as { id: string; stack_id: string; label: string; lat: number; lng: number; url: string; note: string; priority: string; category: string; rating: number; review_note: string }[]) {
      await db2.query(
        'INSERT INTO map_pins (id, stack_id, label, lat, lng, url, note, priority, category, rating, review_note) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING',
        [p.id, p.stack_id, p.label, p.lat, p.lng, p.url, p.note, p.priority, p.category, p.rating, p.review_note]
      )
    }

    // Verify all data landed in the new db
    const { rows: importedNotes } = await db2.query<{ title: string }>('SELECT title FROM notes')
    expect(importedNotes[0].title).toBe('Note A')

    const { rows: importedSecrets } = await db2.query<{ label: string }>('SELECT label FROM secrets')
    expect(importedSecrets[0].label).toBe('My secret')

    const { rows: importedLists } = await db2.query<{ name: string }>('SELECT name FROM todo_lists')
    expect(importedLists[0].name).toBe('Work')

    const { rows: importedTasks } = await db2.query<{ title: string }>('SELECT title FROM todo_tasks')
    expect(importedTasks[0].title).toBe('Write tests')

    const { rows: importedPins } = await db2.query<{ label: string }>('SELECT label FROM map_pins')
    expect(importedPins[0].label).toBe('Shibuya')
  })

  it('ON CONFLICT DO NOTHING prevents duplicate import', async () => {
    const db = await getDb()
    const { rows: [{ id }] } = await db.query<{ id: string }>(
      "INSERT INTO notes (title, content) VALUES ('Unique', 'content') RETURNING id"
    )
    // Second import of same ID is silently ignored
    await db.query(
      'INSERT INTO notes (id, title, content) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
      [id, 'Duplicate', 'content2']
    )
    const { rows: [n] } = await db.query<{ title: string }>('SELECT title FROM notes WHERE id = $1', [id])
    expect(n.title).toBe('Unique') // original not overwritten
  })
})
