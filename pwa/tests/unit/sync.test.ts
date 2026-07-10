import { describe, it, expect, vi, beforeEach } from 'vitest'

// We test the re-encryption logic in isolation by extracting the core transform.
// The full pull() function wires together DB + Drive + crypto; we test the crypto transform here.

import { deriveKey, encryptWithKey, decryptWithKey } from '../../src/crypto'

describe('cross-device secret re-encryption', () => {
  it('re-encrypts a secret from backupKey to localKey and the result is readable by localKey', async () => {
    const password = 'hunter2'
    const backupSalt = crypto.getRandomValues(new Uint8Array(16))
    const localSalt = crypto.getRandomValues(new Uint8Array(16))

    const backupKey = await deriveKey(password, backupSalt)
    const localKey = await deriveKey(password, localSalt)

    // Simulate a secret that was encrypted on the source device
    const original = 'my-super-secret-password'
    const { ciphertext, iv } = await encryptWithKey(original, backupKey)

    // Re-encrypt under localKey (this is what pull() must do)
    const plainValue = await decryptWithKey(ciphertext, iv, backupKey)
    const { ciphertext: newCt, iv: newIv } = await encryptWithKey(plainValue, localKey)

    // The re-encrypted value must be readable by localKey
    const revealed = await decryptWithKey(newCt, newIv, localKey)
    expect(revealed).toBe(original)
  })

  it('throws when decrypting with the wrong key', async () => {
    const backupSalt = crypto.getRandomValues(new Uint8Array(16))
    const wrongSalt = crypto.getRandomValues(new Uint8Array(16))

    const backupKey = await deriveKey('correct', backupSalt)
    const wrongKey = await deriveKey('wrong', wrongSalt)

    const { ciphertext, iv } = await encryptWithKey('value', backupKey)

    await expect(decryptWithKey(ciphertext, iv, wrongKey)).rejects.toThrow()
  })
})
