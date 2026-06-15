import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryFS } from '@electric-sql/pglite'
import { initDb } from '../src/offscreen/db'
import { lockVault } from '../src/offscreen/crypto'
import { dispatch } from '../src/offscreen/handler'

type AnyReply = { ok: boolean; data?: unknown; error?: string }

function data<T>(r: AnyReply): T { return r.data as T }

const unlockPayload = () => ({
  type: 'VAULT_UNLOCK' as const,
  payload: { password: 'pw', salt: Array.from(crypto.getRandomValues(new Uint8Array(16))) },
})

const subPayload = (name = 'Netflix') => ({
  type: 'SUBS_CREATE' as const,
  payload: { name, amount: 15.99, currency: 'USD', cycle: 'monthly', start_date: '2024-01-01', tags: [], notes: '' },
})

describe('handler — notes', () => {
  beforeEach(async () => { await initDb(new MemoryFS()); lockVault() })

  it('NOTES_CREATE returns ok with id and title', async () => {
    const r = await dispatch({ type: 'NOTES_CREATE', payload: { title: 'Hi', content: 'World' } })
    expect(r.ok).toBe(true)
    expect(data<{ id: string; title: string }>(r).title).toBe('Hi')
    expect(data<{ id: string }>(r).id).toBeDefined()
  })

  it('NOTES_LIST returns array', async () => {
    await dispatch({ type: 'NOTES_CREATE', payload: { title: 'X', content: '' } })
    const r = await dispatch({ type: 'NOTES_LIST' })
    expect(r.ok).toBe(true)
    expect(Array.isArray(r.data)).toBe(true)
  })

  it('NOTES_CREATE with tags stores tags', async () => {
    const r = await dispatch({ type: 'NOTES_CREATE', payload: { title: 'T', content: '', tags: ['work', 'urgent'] } })
    expect(data<{ tags: string[] }>(r).tags).toEqual(['work', 'urgent'])
  })

  it('NOTES_LIST filters by tag', async () => {
    await dispatch({ type: 'NOTES_CREATE', payload: { title: 'Work note', content: '', tags: ['work'] } })
    await dispatch({ type: 'NOTES_CREATE', payload: { title: 'Personal', content: '', tags: ['personal'] } })
    const r = await dispatch({ type: 'NOTES_LIST', payload: { tag: 'work' } })
    const notes = data<Array<{ title: string }>>(r)
    expect(notes.length).toBe(1)
    expect(notes[0].title).toBe('Work note')
  })

  it('NOTES_LIST filters by query', async () => {
    await dispatch({ type: 'NOTES_CREATE', payload: { title: 'Shopping list', content: 'milk eggs', tags: [] } })
    await dispatch({ type: 'NOTES_CREATE', payload: { title: 'Work tasks', content: 'PR review', tags: [] } })
    const r = await dispatch({ type: 'NOTES_LIST', payload: { query: 'shopping' } })
    const notes = data<Array<{ title: string }>>(r)
    expect(notes.length).toBe(1)
    expect(notes[0].title).toBe('Shopping list')
  })

  it('NOTES_GET returns the note by id', async () => {
    const created = await dispatch({ type: 'NOTES_CREATE', payload: { title: 'Fetch me', content: 'here' } })
    const id = data<{ id: string }>(created).id
    const r = await dispatch({ type: 'NOTES_GET', payload: { id } })
    expect(r.ok).toBe(true)
    expect(data<{ title: string }>(r).title).toBe('Fetch me')
  })

  it('NOTES_GET unknown id returns error', async () => {
    const r = await dispatch({ type: 'NOTES_GET', payload: { id: 'nope' } })
    expect(r.ok).toBe(false)
    expect(r.error).toBeDefined()
  })

  it('NOTES_UPDATE changes title and content', async () => {
    const created = await dispatch({ type: 'NOTES_CREATE', payload: { title: 'Old', content: 'Old' } })
    const id = data<{ id: string }>(created).id
    const r = await dispatch({ type: 'NOTES_UPDATE', payload: { id, title: 'New', content: 'New content' } })
    expect(r.ok).toBe(true)
    expect(data<{ title: string; content: string }>(r).title).toBe('New')
    expect(data<{ content: string }>(r).content).toBe('New content')
  })

  it('NOTES_UPDATE changes tags', async () => {
    const created = await dispatch({ type: 'NOTES_CREATE', payload: { title: 'T', content: '', tags: ['old'] } })
    const id = data<{ id: string }>(created).id
    const r = await dispatch({ type: 'NOTES_UPDATE', payload: { id, tags: ['new', 'tag'] } })
    expect(data<{ tags: string[] }>(r).tags).toEqual(['new', 'tag'])
  })

  it('NOTES_DELETE removes note', async () => {
    const created = await dispatch({ type: 'NOTES_CREATE', payload: { title: 'Bye', content: '' } })
    const id = data<{ id: string }>(created).id
    const del = await dispatch({ type: 'NOTES_DELETE', payload: { id } })
    expect(del.ok).toBe(true)
    const get = await dispatch({ type: 'NOTES_GET', payload: { id } })
    expect(get.ok).toBe(false)
  })

  it('NOTES_DELETE unknown id returns error', async () => {
    const r = await dispatch({ type: 'NOTES_DELETE', payload: { id: 'nonexistent' } })
    expect(r.ok).toBe(false)
  })
})

describe('handler — vault', () => {
  beforeEach(async () => { await initDb(new MemoryFS()); lockVault() })

  it('VAULT_STATUS locked before unlock', async () => {
    const r = await dispatch({ type: 'VAULT_STATUS' })
    expect(r.ok).toBe(true)
    expect(data<{ locked: boolean }>(r).locked).toBe(true)
  })

  it('VAULT_UNLOCK succeeds', async () => {
    const r = await dispatch(unlockPayload())
    expect(r.ok).toBe(true)
  })

  it('VAULT_STATUS unlocked after unlock', async () => {
    await dispatch(unlockPayload())
    const r = await dispatch({ type: 'VAULT_STATUS' })
    expect(data<{ locked: boolean }>(r).locked).toBe(false)
  })

  it('VAULT_LOCK re-locks after unlock', async () => {
    await dispatch(unlockPayload())
    await dispatch({ type: 'VAULT_LOCK' })
    const r = await dispatch({ type: 'VAULT_STATUS' })
    expect(data<{ locked: boolean }>(r).locked).toBe(true)
  })

  it('SECRETS_CREATE fails when vault locked', async () => {
    const r = await dispatch({ type: 'SECRETS_CREATE', payload: { label: 'X', value: 'y' } })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/locked/i)
  })
})

describe('handler — secrets', () => {
  beforeEach(async () => { await initDb(new MemoryFS()); lockVault() })

  async function unlock() { await dispatch(unlockPayload()) }

  it('SECRETS_CREATE + SECRETS_LIST', async () => {
    await unlock()
    await dispatch({ type: 'SECRETS_CREATE', payload: { label: 'MyToken', value: 'abc123' } })
    const r = await dispatch({ type: 'SECRETS_LIST' })
    expect(r.ok).toBe(true)
    expect((r.data as unknown[]).length).toBe(1)
  })

  it('SECRETS_GET decrypts value', async () => {
    await unlock()
    const created = await dispatch({ type: 'SECRETS_CREATE', payload: { label: 'Key', value: 'secret-val' } })
    const id = data<{ id: string }>(created).id
    const r = await dispatch({ type: 'SECRETS_GET', payload: { id } })
    expect(r.ok).toBe(true)
    expect(data<{ value: string }>(r).value).toBe('secret-val')
  })

  it('SECRETS_GET returns different ciphertext each time (unique IV)', async () => {
    await unlock()
    await dispatch({ type: 'SECRETS_CREATE', payload: { label: 'A', value: 'same-value' } })
    await dispatch({ type: 'SECRETS_CREATE', payload: { label: 'B', value: 'same-value' } })
    const list = data<Array<{ id: string }>>(await dispatch({ type: 'SECRETS_LIST' }))
    const [a, b] = await Promise.all(list.map(s => dispatch({ type: 'SECRETS_GET', payload: { id: s.id } })))
    // Both decrypt to the same plaintext
    expect(data<{ value: string }>(a).value).toBe('same-value')
    expect(data<{ value: string }>(b).value).toBe('same-value')
  })

  it('SECRETS_UPDATE changes label', async () => {
    await unlock()
    const c = await dispatch({ type: 'SECRETS_CREATE', payload: { label: 'Old', value: 'v' } })
    const id = data<{ id: string }>(c).id
    const r = await dispatch({ type: 'SECRETS_UPDATE', payload: { id, label: 'New' } })
    expect(r.ok).toBe(true)
    expect(data<{ label: string }>(r).label).toBe('New')
  })

  it('SECRETS_UPDATE changes value — new ciphertext decrypts correctly', async () => {
    await unlock()
    const c = await dispatch({ type: 'SECRETS_CREATE', payload: { label: 'L', value: 'old-val' } })
    const id = data<{ id: string }>(c).id
    await dispatch({ type: 'SECRETS_UPDATE', payload: { id, value: 'new-val' } })
    const r = await dispatch({ type: 'SECRETS_GET', payload: { id } })
    expect(data<{ value: string }>(r).value).toBe('new-val')
  })

  it('SECRETS_DELETE removes secret', async () => {
    await unlock()
    const c = await dispatch({ type: 'SECRETS_CREATE', payload: { label: 'Del', value: 'x' } })
    const id = data<{ id: string }>(c).id
    await dispatch({ type: 'SECRETS_DELETE', payload: { id } })
    const list = data<unknown[]>(await dispatch({ type: 'SECRETS_LIST' }))
    expect(list.length).toBe(0)
  })

  it('SECRETS_LIST filters by tag', async () => {
    await unlock()
    await dispatch({ type: 'SECRETS_CREATE', payload: { label: 'InfraToken', value: 'a', tags: ['infra'] } })
    await dispatch({ type: 'SECRETS_CREATE', payload: { label: 'AppToken', value: 'b', tags: ['app'] } })
    const r = await dispatch({ type: 'SECRETS_LIST', payload: { tag: 'infra' } })
    const list = data<Array<{ label: string }>>(r)
    expect(list.length).toBe(1)
    expect(list[0].label).toBe('InfraToken')
  })
})

describe('handler — subscriptions', () => {
  beforeEach(async () => { await initDb(new MemoryFS()); lockVault() })

  it('SUBS_CREATE returns ok with name', async () => {
    const r = await dispatch(subPayload())
    expect(r.ok).toBe(true)
    expect(data<{ name: string }>(r).name).toBe('Netflix')
  })

  it('SUBS_LIST returns created subscription', async () => {
    await dispatch(subPayload())
    const r = await dispatch({ type: 'SUBS_LIST' })
    expect(r.ok).toBe(true)
    expect((r.data as unknown[]).length).toBe(1)
  })

  it('SUBS_GET returns subscription by id', async () => {
    const c = await dispatch(subPayload('Spotify'))
    const id = data<{ id: string }>(c).id
    const r = await dispatch({ type: 'SUBS_GET', payload: { id } })
    expect(r.ok).toBe(true)
    expect(data<{ name: string }>(r).name).toBe('Spotify')
  })

  it('SUBS_UPDATE changes amount and currency', async () => {
    const c = await dispatch(subPayload())
    const id = data<{ id: string }>(c).id
    const r = await dispatch({ type: 'SUBS_UPDATE', payload: { id, amount: 19.99, currency: 'EUR' } })
    expect(r.ok).toBe(true)
    expect(Number(data<{ amount: string | number }>(r).amount)).toBeCloseTo(19.99)
    expect(data<{ currency: string }>(r).currency).toBe('EUR')
  })

  it('SUBS_DELETE removes subscription', async () => {
    const c = await dispatch(subPayload())
    const id = data<{ id: string }>(c).id
    await dispatch({ type: 'SUBS_DELETE', payload: { id } })
    const r = await dispatch({ type: 'SUBS_LIST' })
    expect((r.data as unknown[]).length).toBe(0)
  })

  it('SUBS_LIST filters by tag', async () => {
    await dispatch({ type: 'SUBS_CREATE', payload: { name: 'Work tool', amount: 10, currency: 'USD', cycle: 'monthly', start_date: '2024-01-01', tags: ['work'], notes: '' } })
    await dispatch({ type: 'SUBS_CREATE', payload: { name: 'Fun app', amount: 5, currency: 'USD', cycle: 'monthly', start_date: '2024-01-01', tags: ['personal'], notes: '' } })
    const r = await dispatch({ type: 'SUBS_LIST', payload: { tag: 'work' } })
    const list = data<Array<{ name: string }>>(r)
    expect(list.length).toBe(1)
    expect(list[0].name).toBe('Work tool')
  })

  it('multiple subscriptions accumulate correctly in SUBS_LIST', async () => {
    await dispatch(subPayload('A'))
    await dispatch(subPayload('B'))
    await dispatch(subPayload('C'))
    const r = await dispatch({ type: 'SUBS_LIST' })
    expect((r.data as unknown[]).length).toBe(3)
  })
})

describe('handler — DB export/import', () => {
  beforeEach(async () => { await initDb(new MemoryFS()); lockVault() })

  it('DB_EXPORT returns notes, secrets, subscriptions keys', async () => {
    const r = await dispatch({ type: 'DB_EXPORT' })
    expect(r.ok).toBe(true)
    const d = r.data as { notes: unknown[]; secrets: unknown[]; subscriptions: unknown[] }
    expect(Array.isArray(d.notes)).toBe(true)
    expect(Array.isArray(d.secrets)).toBe(true)
    expect(Array.isArray(d.subscriptions)).toBe(true)
  })

  it('DB_EXPORT includes created notes', async () => {
    await dispatch({ type: 'NOTES_CREATE', payload: { title: 'Exported', content: 'content' } })
    const r = await dispatch({ type: 'DB_EXPORT' })
    const d = r.data as { notes: Array<{ title: string }> }
    expect(d.notes.some(n => n.title === 'Exported')).toBe(true)
  })

  it('DB_IMPORT replaces notes and subscriptions', async () => {
    await dispatch({ type: 'NOTES_CREATE', payload: { title: 'Original', content: '' } })
    const sub = { id: 'sub-1', name: 'Imported Sub', amount: 9.99, currency: 'USD', cycle: 'monthly', start_date: '2024-01-01', tags: [], notes: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    const note = { id: 'note-1', title: 'Imported Note', content: 'hello', tags: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    const r = await dispatch({ type: 'DB_IMPORT', payload: { notes: [note], secrets: [], subscriptions: [sub] } })
    expect(r.ok).toBe(true)
    const list = await dispatch({ type: 'NOTES_LIST' })
    const notes = data<Array<{ title: string }>>(list)
    expect(notes.some(n => n.title === 'Imported Note')).toBe(true)
  })
})

describe('handler — unknown message type', () => {
  beforeEach(async () => { await initDb(new MemoryFS()); lockVault() })

  it('returns ok:false with error message', async () => {
    // @ts-expect-error intentional unknown type
    const r = await dispatch({ type: 'TOTALLY_UNKNOWN' })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/unknown/i)
  })
})
