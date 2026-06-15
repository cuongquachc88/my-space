import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryFS } from '@electric-sql/pglite'
import {
  initDb,
  createNote, listNotes, getNote, updateNote, deleteNote, listNoteTags,
  createSecretRow, listSecretMeta, getSecretRow, updateSecretRow, deleteSecretRow, listSecretTags,
  exportAllRows, importRows,
  createSubscription, listSubscriptions, getSubscription, updateSubscription, deleteSubscription
} from '../src/offscreen/db'

describe('db - notes', () => {
  beforeEach(async () => {
    await initDb(new MemoryFS())
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

  it('createNote stores tags', async () => {
    const note = await createNote('Tagged note', 'content', ['work', 'urgent'])
    expect(note.tags).toEqual(['work', 'urgent'])
  })

  it('listNotes filters by tag', async () => {
    await createNote('Note A', '', ['work'])
    await createNote('Note B', '', ['personal'])
    await createNote('Note C', '', ['work', 'personal'])
    const workNotes = await listNotes(undefined, 'work')
    expect(workNotes.length).toBe(2)
    expect(workNotes.every(n => n.tags.includes('work'))).toBe(true)
  })

  it('listNotes filters by both query and tag', async () => {
    await createNote('Alpha work', '', ['work'])
    await createNote('Alpha personal', '', ['personal'])
    await createNote('Beta work', '', ['work'])
    const results = await listNotes('alpha', 'work')
    expect(results.length).toBe(1)
    expect(results[0].title).toBe('Alpha work')
  })

  it('updateNote updates tags', async () => {
    const note = await createNote('Note', 'content', ['old'])
    const updated = await updateNote(note.id, { tags: ['new', 'updated'] })
    expect(updated.tags).toEqual(['new', 'updated'])
  })

  it('listNoteTags returns distinct tags across all notes', async () => {
    await createNote('A', '', ['alpha', 'beta'])
    await createNote('B', '', ['beta', 'gamma'])
    const tags = await listNoteTags()
    expect(tags).toContain('alpha')
    expect(tags).toContain('beta')
    expect(tags).toContain('gamma')
    expect(tags.filter(t => t === 'beta').length).toBe(1)
  })

  it('listNoteTags returns empty when no tags exist', async () => {
    await createNote('No tags', 'content')
    const tags = await listNoteTags()
    expect(tags).toEqual([])
  })
})

describe('db - secrets', () => {
  beforeEach(async () => {
    await initDb(new MemoryFS())
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

  it('createSecretRow stores tags', async () => {
    const s = await createSecretRow('API_KEY', 'cipher', 'iv', ['infra', 'prod'])
    expect(s.tags).toEqual(['infra', 'prod'])
  })

  it('listSecretMeta filters by tag', async () => {
    await createSecretRow('INFRA_KEY', 'c1', 'v1', ['infra'])
    await createSecretRow('APP_KEY', 'c2', 'v2', ['app'])
    await createSecretRow('SHARED_KEY', 'c3', 'v3', ['infra', 'app'])
    const infraSecrets = await listSecretMeta(undefined, 'infra')
    expect(infraSecrets.length).toBe(2)
    expect(infraSecrets.every(s => s.tags.includes('infra'))).toBe(true)
  })

  it('updateSecretRow updates tags', async () => {
    const s = await createSecretRow('KEY', 'c', 'v', ['old'])
    const updated = await updateSecretRow(s.id, { tags: ['new', 'tag'] })
    expect(updated.tags).toEqual(['new', 'tag'])
  })

  it('listSecretTags returns distinct tags across all secrets', async () => {
    await createSecretRow('K1', 'c', 'v', ['alpha', 'beta'])
    await createSecretRow('K2', 'c', 'v', ['beta', 'gamma'])
    const tags = await listSecretTags()
    expect(tags).toContain('alpha')
    expect(tags).toContain('beta')
    expect(tags).toContain('gamma')
    expect(tags.filter(t => t === 'beta').length).toBe(1)
  })

  it('listSecretTags returns empty when no tags exist', async () => {
    await createSecretRow('KEY', 'c', 'v')
    const tags = await listSecretTags()
    expect(tags).toEqual([])
  })
})

describe('db - exportAllRows / importRows', () => {
  beforeEach(async () => {
    await initDb(new MemoryFS())
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
      [{ id: 'n1', title: 'Imported', content: 'body', tags: [], created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' }],
      [{ id: 's1', label: 'KEY', ciphertext: 'c', iv: 'v', tags: [], created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' }]
    )
    expect(result.notesUpdated).toBe(1)
    expect(result.secretsAdded).toBe(1)
  })

  it('importRows preserves tags on insert', async () => {
    await importRows(
      [{ id: 'n2', title: 'Tagged import', content: '', tags: ['work', 'sync'], created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' }],
      []
    )
    const note = await getNote('n2')
    expect(note.tags).toEqual(['work', 'sync'])
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

describe('db - subscriptions', () => {
  beforeEach(async () => {
    await initDb(new MemoryFS())
  })

  it('createSubscription returns a subscription with id', async () => {
    const s = await createSubscription({
      name: 'Netflix', amount: 15.99, currency: 'USD',
      cycle: 'monthly', start_date: '2024-01-01', tags: [], notes: ''
    })
    expect(s.id).toBeDefined()
    expect(s.name).toBe('Netflix')
    expect(Number(s.amount)).toBe(15.99)
    expect(s.cycle).toBe('monthly')
  })

  it('listSubscriptions returns created subscriptions', async () => {
    await createSubscription({ name: 'Spotify', amount: 9.99, currency: 'USD', cycle: 'monthly', start_date: '2024-01-01', tags: [], notes: '' })
    await createSubscription({ name: 'AWS', amount: 50, currency: 'USD', cycle: 'monthly', start_date: '2024-01-01', tags: [], notes: '' })
    const list = await listSubscriptions()
    expect(list.length).toBeGreaterThanOrEqual(2)
  })

  it('listSubscriptions filters by tag', async () => {
    await createSubscription({ name: 'Netflix', amount: 15.99, currency: 'USD', cycle: 'monthly', start_date: '2024-01-01', tags: ['entertainment'], notes: '' })
    await createSubscription({ name: 'AWS', amount: 50, currency: 'USD', cycle: 'monthly', start_date: '2024-01-01', tags: ['infra'], notes: '' })
    const result = await listSubscriptions(undefined, 'entertainment')
    expect(result.length).toBe(1)
    expect(result[0].name).toBe('Netflix')
  })

  it('updateSubscription changes fields', async () => {
    const s = await createSubscription({ name: 'Old', amount: 5, currency: 'USD', cycle: 'monthly', start_date: '2024-01-01', tags: [], notes: '' })
    const updated = await updateSubscription(s.id, { name: 'New', amount: 10 })
    expect(updated.name).toBe('New')
    expect(Number(updated.amount)).toBe(10)
  })

  it('deleteSubscription removes the subscription', async () => {
    const s = await createSubscription({ name: 'ToDelete', amount: 1, currency: 'USD', cycle: 'monthly', start_date: '2024-01-01', tags: [], notes: '' })
    await deleteSubscription(s.id)
    await expect(getSubscription(s.id)).rejects.toThrow('not found')
  })
})
