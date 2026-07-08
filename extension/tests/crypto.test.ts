import { describe, it, expect, beforeEach } from 'vitest'
import { deriveKey, encrypt, decrypt, initVault, lockVault, isVaultLocked, getVaultStatus, resetLockTimer } from '../src/offscreen/crypto'

describe('crypto', () => {
  const password = 'correct-horse-battery-staple'
  const salt = new Uint8Array(16).fill(0xab)

  beforeEach(() => {
    lockVault()
  })

  it('deriveKey returns a CryptoKey', async () => {
    const key = await deriveKey(password, salt)
    expect(key).toBeDefined()
    expect(key.type).toBe('secret')
    expect(key.extractable).toBe(false)
  })

  it('encrypt + decrypt roundtrip', async () => {
    const key = await deriveKey(password, salt)
    const plaintext = 'super-secret-api-key'
    const { ciphertext, iv } = await encrypt(key, plaintext)
    expect(ciphertext).not.toBe(plaintext)
    const result = await decrypt(key, ciphertext, iv)
    expect(result).toBe(plaintext)
  })

  it('decrypt fails with wrong key', async () => {
    const key = await deriveKey(password, salt)
    const wrongSalt = crypto.getRandomValues(new Uint8Array(16))
    const wrongKey = await deriveKey('wrong-password', wrongSalt)
    const { ciphertext, iv } = await encrypt(key, 'secret')
    await expect(decrypt(wrongKey, ciphertext, iv)).rejects.toThrow()
  })

  it('vault starts locked', () => {
    expect(isVaultLocked()).toBe(true)
  })

  it('initVault unlocks vault, lockVault re-locks it', async () => {
    await initVault(password, salt)
    expect(isVaultLocked()).toBe(false)
    lockVault()
    expect(isVaultLocked()).toBe(true)
  })

  it('getVaultStatus returns locked:true with no expiresAt when locked', () => {
    const status = getVaultStatus()
    expect(status.locked).toBe(true)
    expect(status.expiresAt).toBeUndefined()
  })

  it('getVaultStatus returns locked:false with expiresAt after initVault', async () => {
    await initVault('pw', salt)
    const status = getVaultStatus()
    expect(status.locked).toBe(false)
    expect(typeof status.expiresAt).toBe('number')
  })

  it('resetLockTimer while locked does not set expiresAt', () => {
    resetLockTimer(60_000)
    expect(getVaultStatus().expiresAt).toBeUndefined()
  })
})
