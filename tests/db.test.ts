import { describe, it, expect, beforeEach } from 'vitest'
import {
  initDb,
  createNote, listNotes, getNote, updateNote, deleteNote,
  createSecretRow, listSecretMeta, getSecretRow, updateSecretRow, deleteSecretRow,
  exportAllRows, importRows
} from '../src/offscreen/db'

describe('db - notes', () => {
  beforeEach(async () => {
    await initDb()
  })

  it('createNote returns a note with id', async () => {
    const note = await createNote('Test title', 'Test content')
    expect(note.id).toBeDefined()
    expect(note.title).toBe('Test title')
    expect(note.content).toBe('Test content')
    expect(note.created_at).toBeDefined()
  })

  it('listNotes returns created notes', async () => {
    await createNote('A', '')
    await createNote('B', '')
    const notes = await listNotes()
    expect(notes.length).toBeGreaterThanOrEqual(2)
  })

  it('updateNote changes title and content', async () => {
    const note = await createNote('Old', 'Old content')
    const updated = await updateNote(note.id, { title: 'New', content: 'New content' })
    expect(updated.title).toBe('New')
    expect(updated.content).toBe('New content')
  })

  it('deleteNote removes the note', async () => {
    const note = await createNote('To delete', '')
    await deleteNote(note.id)
    await expect(getNote(note.id)).rejects.toThrow('not found')
  })

  it('listNotes filters by search query', async () => {
    await createNote('Shopping list', 'Milk eggs bread')
    await createNote('Work tasks', 'Write PR description')
    const results = await listNotes('shopping')
    expect(results.length).toBe(1)
    expect(results[0].title).toBe('Shopping list')
  })
})

describe('db - secrets', () => {
  beforeEach(async () => {
    await initDb()
  })

  it('createSecretRow and listSecretMeta', async () => {
    const s = await createSecretRow('API_KEY', 'ciphertext123', 'iv123')
    expect(s.id).toBeDefined()
    expect(s.label).toBe('API_KEY')
    const list = await listSecretMeta()
    expect(list.length).toBe(1)
    expect(list[0].label).toBe('API_KEY')
    expect((list[0] as Record<string, unknown>).ciphertext).toBeUndefined()
  })

  it('getSecretRow returns full row', async () => {
    const s = await createSecretRow('TOKEN', 'cipher', 'iv')
    const row = await getSecretRow(s.id)
    expect(row.ciphertext).toBe('cipher')
    expect(row.iv).toBe('iv')
  })

  it('updateSecretRow changes label', async () => {
    const s = await createSecretRow('OLD', 'c', 'v')
    const updated = await updateSecretRow(s.id, { label: 'NEW' })
    expect(updated.label).toBe('NEW')
  })

  it('deleteSecretRow removes secret', async () => {
    const s = await createSecretRow('DEL', 'c', 'v')
    await deleteSecretRow(s.id)
    await expect(getSecretRow(s.id)).rejects.toThrow('not found')
  })

  it('listSecretMeta filters by label', async () => {
    await createSecretRow('GITHUB_TOKEN', 'c1', 'v1')
    await createSecretRow('AWS_KEY', 'c2', 'v2')
    const results = await listSecretMeta('github')
    expect(results.length).toBe(1)
    expect(results[0].label).toBe('GITHUB_TOKEN')
  })
})

describe('db - exportAllRows / importRows', () => {
  beforeEach(async () => {
    await initDb()
  })

  it('exportAllRows returns notes and secrets', async () => {
    await createNote('Note A', 'content')
    await createSecretRow('SECRET_A', 'cipher', 'iv')
    const exported = await exportAllRows()
    expect(exported.notes.length).toBe(1)
    expect(exported.secrets.length).toBe(1)
  })

  it('importRows inserts new notes and secrets', async () => {
    const result = await importRows(
      [{ id: 'n1', title: 'Imported', content: 'body', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' }],
      [{ id: 's1', label: 'KEY', ciphertext: 'c', iv: 'v', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' }]
    )
    expect(result.notesUpdated).toBe(1)
    expect(result.secretsAdded).toBe(1)
  })

  it('importRows skips older records (last-write-wins)', async () => {
    await createNote('Existing', 'content')
    const all = await exportAllRows()
    const existing = all.notes[0]
    // Try to import same note with older timestamp — should be skipped
    const olderNote = { ...existing, title: 'Stale', updated_at: '2000-01-01T00:00:00Z' }
    await importRows([olderNote], [])
    const note = await getNote(existing.id)
    expect(note.title).toBe('Existing')
  })
})
