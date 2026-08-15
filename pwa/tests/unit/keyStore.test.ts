import { describe, it, expect, beforeEach } from 'vitest'
import { _setKeyStorage, persistKeyForReload, tryResumeKeyFromReload, clearPersistedKey, type KeyStorage } from '../../src/crypto/keyStore'

// happy-dom's IndexedDB doesn't reliably structured-clone real CryptoKey
// objects, so unit tests exercise our session-id logic against an
// in-memory fake; tests/e2e covers the real IndexedDB + reload path.
class FakeKeyStorage implements KeyStorage {
  map = new Map<string, CryptoKey>()
  async put(id: string, key: CryptoKey) { this.map.set(id, key) }
  async get(id: string) { return this.map.get(id) }
  async delete(id: string) { this.map.delete(id) }
  async clear() { this.map.clear() }
}

async function fakeKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

let fake: FakeKeyStorage

beforeEach(() => {
  fake = new FakeKeyStorage()
  _setKeyStorage(fake)
  sessionStorage.clear()
})

describe('persistKeyForReload / tryResumeKeyFromReload', () => {
  it('resumes the same key after persisting', async () => {
    const key = await fakeKey()
    await persistKeyForReload(key)
    const resumed = await tryResumeKeyFromReload()
    expect(resumed).toBe(key)
  })

  it('returns null when nothing was persisted (fresh tab)', async () => {
    const resumed = await tryResumeKeyFromReload()
    expect(resumed).toBeNull()
  })

  it('does not leave raw key bytes anywhere client-inspectable — only an id in sessionStorage', async () => {
    const key = await fakeKey()
    await persistKeyForReload(key)
    const values = Object.values(sessionStorage).join('')
    expect(values).not.toContain('AES')
    // sessionStorage only ever holds an opaque random id, never the key
    expect(sessionStorage.length).toBe(1)
  })

  it('clears orphaned entries when resuming with no session marker (e.g. after a crash)', async () => {
    const key = await fakeKey()
    fake.map.set('orphan-id', key) // simulate a leftover entry with no matching sessionStorage marker
    await tryResumeKeyFromReload()
    expect(fake.map.size).toBe(0)
  })
})

describe('clearPersistedKey', () => {
  it('removes the session marker so a later resume fails', async () => {
    const key = await fakeKey()
    await persistKeyForReload(key)
    clearPersistedKey()
    const resumed = await tryResumeKeyFromReload()
    expect(resumed).toBeNull()
  })

  it('deletes the underlying stored key', async () => {
    const key = await fakeKey()
    await persistKeyForReload(key)
    clearPersistedKey()
    await new Promise(r => setTimeout(r, 0)) // let the fire-and-forget delete settle
    expect(fake.map.size).toBe(0)
  })

  it('is a no-op when nothing was persisted', () => {
    expect(() => clearPersistedKey()).not.toThrow()
  })
})
