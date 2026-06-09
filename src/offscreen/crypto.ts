let _key: CryptoKey | null = null
let _lockTimer: ReturnType<typeof setTimeout> | null = null
let _expiresAt: number | null = null

export function isVaultLocked(): boolean {
  return _key === null
}

export function getVaultStatus(): { locked: boolean; expiresAt?: number } {
  return { locked: _key === null, expiresAt: _expiresAt ?? undefined }
}

export function getKey(): CryptoKey {
  if (!_key) throw new Error('Vault is locked')
  return _key
}

export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const baseKey = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: 600_000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encrypt(
  key: CryptoKey,
  plaintext: string
): Promise<{ ciphertext: string; iv: string }> {
  const enc = new TextEncoder()
  const ivBytes = crypto.getRandomValues(new Uint8Array(12))
  const ciphertextBytes = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: ivBytes },
    key,
    enc.encode(plaintext)
  )
  return {
    ciphertext: bufToBase64(new Uint8Array(ciphertextBytes)),
    iv: bufToBase64(ivBytes),
  }
}

export async function decrypt(
  key: CryptoKey,
  ciphertext: string,
  iv: string
): Promise<string> {
  const dec = new TextDecoder()
  const plainBytes = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBuf(iv) },
    key,
    base64ToBuf(ciphertext)
  )
  return dec.decode(plainBytes)
}

export async function initVault(
  password: string,
  salt: Uint8Array,
  timeoutMs = 15 * 60 * 1000
): Promise<void> {
  _key = await deriveKey(password, salt)
  resetLockTimer(timeoutMs)
}

export function lockVault(): void {
  _key = null
  _expiresAt = null
  if (_lockTimer) clearTimeout(_lockTimer)
  _lockTimer = null
}

export function resetLockTimer(timeoutMs: number): void {
  if (_lockTimer) clearTimeout(_lockTimer)
  _expiresAt = Date.now() + timeoutMs
  _lockTimer = setTimeout(lockVault, timeoutMs)
}

// --- helpers ---
function bufToBase64(buf: Uint8Array<ArrayBuffer>): string {
  return btoa(String.fromCharCode(...buf))
}

function base64ToBuf(b64: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>
}
