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
})
