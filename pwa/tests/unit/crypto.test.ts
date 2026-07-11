import { describe, it, expect, beforeEach } from 'vitest'
import { deriveKey, unlock, lock, isLocked, getKey, encrypt, decrypt, encryptWithKey, decryptWithKey } from '../../src/crypto'

const password = 'correct-horse-battery-staple'
const salt = new Uint8Array(16).fill(0xab)

beforeEach(() => lock())

describe('deriveKey', () => {
  it('returns a CryptoKey', async () => {
    const key = await deriveKey(password, salt)
    expect(key).toBeDefined()
    expect(key.type).toBe('secret')
    expect(key.extractable).toBe(false)
  })

  it('same password+salt produces equivalent keys', async () => {
    const k1 = await deriveKey(password, salt)
    const k2 = await deriveKey(password, salt)
    // Both keys should encrypt/decrypt the same plaintext
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const plaintext = new TextEncoder().encode('test')
    const buf1 = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k1, plaintext)
    const result = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, k2, buf1)
    expect(new TextDecoder().decode(result)).toBe('test')
  })
})

describe('lock / unlock / isLocked', () => {
  it('starts locked', () => {
    expect(isLocked()).toBe(true)
  })

  it('unlock() unlocks, lock() re-locks', async () => {
    await unlock(password, salt)
    expect(isLocked()).toBe(false)
    lock()
    expect(isLocked()).toBe(true)
  })

  it('getKey() throws when locked', () => {
    expect(() => getKey()).toThrow('Vault locked')
  })

  it('getKey() returns CryptoKey after unlock', async () => {
    await unlock(password, salt)
    const key = getKey()
    expect(key).toBeDefined()
    expect(key.type).toBe('secret')
  })
})

describe('encrypt / decrypt', () => {
  beforeEach(async () => { await unlock(password, salt) })

  it('encrypt returns non-empty ciphertext and iv', async () => {
    const { ciphertext, iv } = await encrypt('super-secret')
    expect(ciphertext.length).toBeGreaterThan(0)
    expect(iv.length).toBeGreaterThan(0)
    expect(ciphertext).not.toBe('super-secret')
  })

  it('roundtrip: encrypt then decrypt returns original', async () => {
    const plaintext = 'my secret api key 1234'
    const { ciphertext, iv } = await encrypt(plaintext)
    const result = await decrypt(ciphertext, iv)
    expect(result).toBe(plaintext)
  })

  it('different IVs each call (random)', async () => {
    const a = await encrypt('same')
    const b = await encrypt('same')
    expect(a.iv).not.toBe(b.iv)
    expect(a.ciphertext).not.toBe(b.ciphertext)
  })

  it('decrypt fails with corrupted ciphertext', async () => {
    const { iv } = await encrypt('data')
    await expect(decrypt('aGVsbG8=', iv)).rejects.toThrow()
  })

  it('decrypt throws when locked', async () => {
    const { ciphertext, iv } = await encrypt('data')
    lock()
    await expect(decrypt(ciphertext, iv)).rejects.toThrow('Vault locked')
  })
})

describe('encryptWithKey / decryptWithKey', () => {
  it('roundtrip with explicit key', async () => {
    const key = await deriveKey(password, salt)
    const plaintext = 'drive-sync-payload'
    const { ciphertext, iv } = await encryptWithKey(plaintext, key)
    const result = await decryptWithKey(ciphertext, iv, key)
    expect(result).toBe(plaintext)
  })

  it('decryptWithKey fails with wrong key', async () => {
    const key1 = await deriveKey(password, salt)
    const key2 = await deriveKey('wrong-pass', new Uint8Array(16).fill(0xcc))
    const { ciphertext, iv } = await encryptWithKey('secret', key1)
    await expect(decryptWithKey(ciphertext, iv, key2)).rejects.toThrow()
  })

  it('encryptWithKey does not require vault to be unlocked', async () => {
    expect(isLocked()).toBe(true) // still locked
    const key = await deriveKey(password, salt)
    const { ciphertext, iv } = await encryptWithKey('no vault needed', key)
    const result = await decryptWithKey(ciphertext, iv, key)
    expect(result).toBe('no vault needed')
  })
})
