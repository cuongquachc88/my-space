import { describe, it, expect, beforeEach } from 'vitest'
import { initDb } from '../src/offscreen/db'
import { lockVault } from '../src/offscreen/crypto'
import { dispatch } from '../src/offscreen/handler'

describe('handler', () => {
  beforeEach(async () => {
    await initDb()
    lockVault()
  })

  it('NOTES_CREATE returns ok + note', async () => {
    const reply = await dispatch({ type: 'NOTES_CREATE', payload: { title: 'Hi', content: 'World' } })
    expect(reply.ok).toBe(true)
    expect((reply as { data?: { title?: string } }).data?.title).toBe('Hi')
  })

  it('NOTES_LIST returns ok + array', async () => {
    await dispatch({ type: 'NOTES_CREATE', payload: { title: 'X', content: '' } })
    const reply = await dispatch({ type: 'NOTES_LIST' })
    expect(reply.ok).toBe(true)
    expect(Array.isArray((reply as { data?: unknown }).data)).toBe(true)
  })

  it('VAULT_STATUS returns locked when not unlocked', async () => {
    const reply = await dispatch({ type: 'VAULT_STATUS' })
    expect(reply.ok).toBe(true)
    expect((reply as { data?: { locked?: boolean } }).data?.locked).toBe(true)
  })

  it('VAULT_UNLOCK then SECRETS_CREATE then SECRETS_LIST', async () => {
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const unlockReply = await dispatch({ type: 'VAULT_UNLOCK', payload: { password: 'pw', salt: Array.from(salt) } })
    expect(unlockReply.ok).toBe(true)

    const createReply = await dispatch({ type: 'SECRETS_CREATE', payload: { label: 'MyToken', value: 'abc123' } })
    expect(createReply.ok).toBe(true)

    const listReply = await dispatch({ type: 'SECRETS_LIST' })
    expect(listReply.ok).toBe(true)
    expect(((listReply as { data?: unknown }).data as Array<unknown>).length).toBe(1)
  })

  it('NOTES_DELETE unknown id returns error', async () => {
    const reply = await dispatch({ type: 'NOTES_DELETE', payload: { id: 'nonexistent' } })
    expect(reply.ok).toBe(false)
    expect(reply.error).toBeDefined()
  })

  it('NOTES_CREATE with tags stores and returns tags', async () => {
    const reply = await dispatch({ type: 'NOTES_CREATE', payload: { title: 'Tagged', content: '', tags: ['work', 'urgent'] } })
    expect(reply.ok).toBe(true)
    expect((reply as { data?: { tags?: string[] } }).data?.tags).toEqual(['work', 'urgent'])
  })

  it('NOTES_LIST filters by tag', async () => {
    await dispatch({ type: 'NOTES_CREATE', payload: { title: 'Work note', content: '', tags: ['work'] } })
    await dispatch({ type: 'NOTES_CREATE', payload: { title: 'Personal note', content: '', tags: ['personal'] } })
    const reply = await dispatch({ type: 'NOTES_LIST', payload: { tag: 'work' } })
    expect(reply.ok).toBe(true)
    const notes = (reply as { data?: Array<{ title: string; tags: string[] }> }).data ?? []
    expect(notes.length).toBe(1)
    expect(notes[0].title).toBe('Work note')
  })

  it('VAULT_UNLOCK then SECRETS_CREATE with tags then SECRETS_LIST filter by tag', async () => {
    const salt = crypto.getRandomValues(new Uint8Array(16))
    await dispatch({ type: 'VAULT_UNLOCK', payload: { password: 'pw', salt: Array.from(salt) } })

    await dispatch({ type: 'SECRETS_CREATE', payload: { label: 'InfraToken', value: 'abc', tags: ['infra'] } })
    await dispatch({ type: 'SECRETS_CREATE', payload: { label: 'AppToken', value: 'xyz', tags: ['app'] } })

    const infraReply = await dispatch({ type: 'SECRETS_LIST', payload: { tag: 'infra' } })
    expect(infraReply.ok).toBe(true)
    const infraList = ((infraReply as { data?: unknown }).data as Array<{ label: string }>) ?? []
    expect(infraList.length).toBe(1)
    expect(infraList[0].label).toBe('InfraToken')
  })

  it('SUBS_CREATE and SUBS_LIST', async () => {
    const createReply = await dispatch({
      type: 'SUBS_CREATE',
      payload: {
        name: 'Netflix', amount: 15.99, currency: 'USD',
        cycle: 'monthly', start_date: '2024-01-01', tags: ['entertainment'], notes: ''
      }
    })
    expect(createReply.ok).toBe(true)
    expect((createReply as { data?: { name?: string } }).data?.name).toBe('Netflix')

    const listReply = await dispatch({ type: 'SUBS_LIST' })
    expect(listReply.ok).toBe(true)
    const list = (listReply as { data?: unknown }).data as Array<{ name: string }>
    expect(list.some(s => s.name === 'Netflix')).toBe(true)
  })

  it('SUBS_DELETE removes subscription', async () => {
    const createReply = await dispatch({
      type: 'SUBS_CREATE',
      payload: { name: 'ToDelete', amount: 1, currency: 'USD', cycle: 'monthly', start_date: '2024-01-01', tags: [], notes: '' }
    })
    const id = ((createReply as { data?: { id?: string } }).data?.id) as string
    const deleteReply = await dispatch({ type: 'SUBS_DELETE', payload: { id } })
    expect(deleteReply.ok).toBe(true)
  })
})
