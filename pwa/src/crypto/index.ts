let _key: CryptoKey | null = null

export const isLocked = () => _key === null
export const getKey = () => { if (!_key) throw new Error('Vault locked'); return _key }

const VERIFY_KEY = 'myspace_vault_verify'
const VERIFY_PLAIN = 'myspace-ok'

export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: 600_000, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

// Store an encrypted verification token after first successful setup
export async function saveVerifyToken(key: CryptoKey): Promise<void> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const buf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(VERIFY_PLAIN))
  localStorage.setItem(VERIFY_KEY, JSON.stringify({ c: b64(new Uint8Array(buf)), iv: b64(iv) }))
}

export async function unlock(password: string, salt: Uint8Array): Promise<void> {
  const candidate = await deriveKey(password, salt)
  // Verify the password is correct by decrypting the stored token
  const stored = localStorage.getItem(VERIFY_KEY)
  if (stored) {
    try {
      const { c, iv } = JSON.parse(stored) as { c: string; iv: string }
      const buf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, candidate, unb64(c))
      if (new TextDecoder().decode(buf) !== VERIFY_PLAIN) throw new Error('bad')
    } catch {
      throw new Error('Incorrect password')
    }
  }
  _key = candidate
}

export function lock(): void { _key = null }

export async function encrypt(plaintext: string): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const buf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, getKey(), new TextEncoder().encode(plaintext))
  return { ciphertext: b64(new Uint8Array(buf)), iv: b64(iv) }
}

export async function decrypt(ciphertext: string, iv: string): Promise<string> {
  const buf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, getKey(), unb64(ciphertext))
  return new TextDecoder().decode(buf)
}

export async function encryptWithKey(plaintext: string, key: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const buf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext))
  return { ciphertext: b64(new Uint8Array(buf)), iv: b64(iv) }
}

export async function decryptWithKey(ciphertext: string, iv: string, key: CryptoKey): Promise<string> {
  const buf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, key, unb64(ciphertext))
  return new TextDecoder().decode(buf)
}

const b64 = (buf: Uint8Array) => btoa(Array.from(buf, c => String.fromCharCode(c)).join(''))
const unb64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0))
