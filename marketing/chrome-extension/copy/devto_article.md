# DEV.to Article

**Title:** How I built a fully encrypted Chrome extension vault using Web Crypto API and PostgreSQL in WASM

**Tags:** chrome, security, webdev, javascript

---

I built My SPACE — a Chrome side panel extension that stores notes, secrets, passwords, and subscriptions — all encrypted on-device. No backend, no account, no analytics.

Here's how the interesting parts work.

## Architecture

```
Side Panel (React 19)
    ↕ chrome.runtime.sendMessage
Service Worker (MV3)
    ↕ chrome.runtime.sendMessage
Offscreen Document
    ├── PGlite (PostgreSQL WASM)  ← database
    └── Web Crypto API            ← encryption
```

The offscreen document is the secret weapon. It runs in the background, never unloads, and owns all state. The service worker is stateless — it just routes messages and handles OAuth/Drive calls.

## PostgreSQL in the browser?

[PGlite](https://pglite.dev) compiles PostgreSQL to WASM using Emscripten. This gives you real SQL — JOINs, full-text search, triggers — running entirely in the browser. Data is persisted to IndexedDB via `IdbFs`.

```ts
const db = new PGlite(new IdbFs('myspace-db'))
await db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )
`)
```

## AES-GCM Encryption

Every secret is encrypted before writing to the DB:

```ts
async function encrypt(key: CryptoKey, plaintext: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12))  // random IV per operation
  const ciphertextBytes = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext)
  )
  return { ciphertext: bufToBase64(new Uint8Array(ciphertextBytes)), iv: bufToBase64(iv) }
}
```

Key derivation from master password:

```ts
async function deriveKey(password: string, salt: Uint8Array) {
  const baseKey = await crypto.subtle.importKey('raw', encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt.buffer, iterations: 600_000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}
```

600,000 PBKDF2 iterations is the OWASP 2023 recommendation for SHA-256.

## OAuth without a redirect URI

Most OAuth flows need a redirect URI. Chrome extensions have `chrome.identity.getAuthToken` which handles the full flow internally — no redirect, no client secret stored in the extension:

```ts
chrome.identity.getAuthToken({ interactive: true, scopes: SCOPES }, result => {
  const token = typeof result === 'string' ? result : result?.token
  // use token for Drive API calls
})
```

The extension's `manifest.json` includes an `oauth2` block with the client ID and scopes. The extension ID is pinned with a `key` field so the local dev ID matches the published ID.

## Drive Backup

Backup uses Drive's `appDataFolder` — a private space invisible to the user's Drive UI. Data is encrypted locally before upload using the vault key:

```ts
const { ciphertext, iv } = await encrypt(vaultKey, JSON.stringify({ notes, secrets, subscriptions }))
// upload { ciphertext, iv } as JSON — Google only ever sees ciphertext
```

## Try it

- [Chrome Web Store](#)
- [GitHub](https://github.com/cuongquachc88/my-space)
- [Landing page](https://cuongquachc88.github.io/my-space/)

Happy to answer questions about any part of the implementation!
