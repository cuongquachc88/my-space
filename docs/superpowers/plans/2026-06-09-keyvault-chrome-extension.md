# KeyVault Chrome Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome MV3 extension with a glassmorphism side panel for notes and AES-256-GCM encrypted secrets, backed by PGlite and optionally synced to Google Drive.

**Architecture:** Four isolated layers (Side Panel → Service Worker → Offscreen Document → PGlite/Crypto) communicate exclusively via `chrome.runtime.sendMessage`. The offscreen document hosts PGlite and all crypto operations so they survive service worker restarts. The side panel is a pure React UI that never touches crypto or DB directly.

**Tech Stack:** Chrome MV3, React 19, TypeScript, Tailwind CSS v4, PGlite, Web Crypto API, Vite + @crxjs/vite-plugin, Vitest

---

## File Map

| File | Responsibility |
|---|---|
| `manifest.json` | Extension manifest — permissions, entry points |
| `vite.config.ts` | Vite + @crxjs config for multi-entry build |
| `src/shared/messages.ts` | All message type literals + request/response TypeScript types |
| `src/offscreen/index.html` | Offscreen document HTML shell |
| `src/offscreen/main.ts` | Offscreen document bootstrap — init DB, attach message listener |
| `src/offscreen/db.ts` | PGlite init, schema migration, all SQL query functions |
| `src/offscreen/crypto.ts` | PBKDF2 key derivation, AES-256-GCM encrypt/decrypt, vault state |
| `src/offscreen/handler.ts` | Message dispatcher — routes incoming messages to db.ts / crypto.ts |
| `src/service-worker/index.ts` | Extension lifecycle, offscreen doc management, Google Drive sync |
| `src/sidepanel/main.tsx` | React root mount |
| `src/sidepanel/App.tsx` | Root component — active view state, message helpers |
| `src/sidepanel/components/icons/index.tsx` | All four duotone SVG icon components |
| `src/sidepanel/components/IconRail.tsx` | Vertical nav rail with duotone icons + active state |
| `src/sidepanel/components/NoteCard.tsx` | Single note card (title, preview, timestamp) |
| `src/sidepanel/components/SecretCard.tsx` | Single secret card (label, masked value, reveal/copy) |
| `src/sidepanel/views/NotesView.tsx` | Notes list + search + create/edit/delete |
| `src/sidepanel/views/KeyvaultView.tsx` | Secrets list + vault unlock banner + search |
| `src/sidepanel/views/SyncView.tsx` | Drive connection + push/pull buttons + last sync |
| `src/sidepanel/views/SettingsView.tsx` | Master password change + auto-lock timeout |
| `tests/crypto.test.ts` | Unit tests for crypto.ts |
| `tests/db.test.ts` | Unit tests for db.ts |
| `tests/handler.test.ts` | Unit tests for handler.ts message dispatch |

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `manifest.json`
- Create: `src/offscreen/index.html`
- Create: `src/sidepanel/index.html`
- Create: `.gitignore`

- [ ] **Step 1: Install dependencies**

```bash
npm init -y
npm install react react-dom @electric-sql/pglite
npm install -D typescript vite @crxjs/vite-plugin @vitejs/plugin-react \
  tailwindcss @tailwindcss/vite vitest @types/react @types/react-dom \
  @types/chrome
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 3: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import manifest from './manifest.json'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    crx({ manifest }),
  ],
  test: {
    environment: 'node',
    globals: true,
  },
})
```

- [ ] **Step 4: Create `manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "KeyVault",
  "version": "0.1.0",
  "description": "Notes and encrypted secrets in your browser sidebar",
  "permissions": [
    "storage",
    "offscreen",
    "identity",
    "sidePanel"
  ],
  "host_permissions": [
    "https://www.googleapis.com/*"
  ],
  "background": {
    "service_worker": "src/service-worker/index.ts",
    "type": "module"
  },
  "side_panel": {
    "default_path": "src/sidepanel/index.html"
  },
  "action": {
    "default_title": "Open KeyVault"
  },
  "oauth2": {
    "client_id": "YOUR_GOOGLE_CLIENT_ID",
    "scopes": ["https://www.googleapis.com/auth/drive.appdata"]
  }
}
```

- [ ] **Step 5: Create `src/offscreen/index.html`**

```html
<!DOCTYPE html>
<html>
  <head><meta charset="utf-8" /></head>
  <body>
    <script type="module" src="./main.ts"></script>
  </body>
</html>
```

- [ ] **Step 6: Create `src/sidepanel/index.html`**

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>KeyVault</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Create `.gitignore`**

```
node_modules/
dist/
.env
```

- [ ] **Step 8: Verify build runs without errors**

```bash
npx vite build
```

Expected: `dist/` directory created with no TypeScript errors.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: scaffold Chrome MV3 extension with Vite + crxjs"
```

---

## Task 2: Shared Message Types

**Files:**
- Create: `src/shared/messages.ts`

- [ ] **Step 1: Create `src/shared/messages.ts`**

```ts
export type Msg<T extends string, P = undefined> = P extends undefined
  ? { type: T }
  : { type: T; payload: P }

export type Reply<D = undefined> = D extends undefined
  ? { ok: boolean; error?: string }
  : { ok: boolean; data?: D; error?: string }

// Note shape
export interface Note {
  id: string
  title: string
  content: string
  created_at: string
  updated_at: string
}

// Secret list item (no ciphertext)
export interface SecretMeta {
  id: string
  label: string
  updated_at: string
}

// Decrypted secret (only in SECRETS_GET response)
export interface SecretValue {
  id: string
  label: string
  value: string
}

// --- Note messages ---
export type NotesListMsg    = Msg<'NOTES_LIST'>
export type NotesGetMsg     = Msg<'NOTES_GET',    { id: string }>
export type NotesCreateMsg  = Msg<'NOTES_CREATE', { title: string; content: string }>
export type NotesUpdateMsg  = Msg<'NOTES_UPDATE', { id: string; title?: string; content?: string }>
export type NotesDeleteMsg  = Msg<'NOTES_DELETE', { id: string }>

// --- Vault messages ---
export type VaultUnlockMsg  = Msg<'VAULT_UNLOCK', { password: string }>
export type VaultLockMsg    = Msg<'VAULT_LOCK'>
export type VaultStatusMsg  = Msg<'VAULT_STATUS'>

// --- Secret messages ---
export type SecretsListMsg   = Msg<'SECRETS_LIST'>
export type SecretsGetMsg    = Msg<'SECRETS_GET',    { id: string }>
export type SecretsCreateMsg = Msg<'SECRETS_CREATE', { label: string; value: string }>
export type SecretsUpdateMsg = Msg<'SECRETS_UPDATE', { id: string; label?: string; value?: string }>
export type SecretsDeleteMsg = Msg<'SECRETS_DELETE', { id: string }>

// --- Sync messages ---
export type SyncPushMsg   = Msg<'SYNC_PUSH'>
export type SyncPullMsg   = Msg<'SYNC_PULL'>
export type SyncStatusMsg = Msg<'SYNC_STATUS'>

// --- DB import (service worker → offscreen) ---
export type DbImportMsg = Msg<'DB_IMPORT', { notes: Note[]; secrets: Array<{ id: string; label: string; ciphertext: string; iv: string; updated_at: string }> }>
export type DbExportMsg = Msg<'DB_EXPORT'>

export type AnyMsg =
  | NotesListMsg | NotesGetMsg | NotesCreateMsg | NotesUpdateMsg | NotesDeleteMsg
  | VaultUnlockMsg | VaultLockMsg | VaultStatusMsg
  | SecretsListMsg | SecretsGetMsg | SecretsCreateMsg | SecretsUpdateMsg | SecretsDeleteMsg
  | SyncPushMsg | SyncPullMsg | SyncStatusMsg
  | DbImportMsg | DbExportMsg
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/messages.ts
git commit -m "feat: add shared message type definitions"
```

---

## Task 3: Crypto Module

**Files:**
- Create: `src/offscreen/crypto.ts`
- Create: `tests/crypto.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/crypto.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { deriveKey, encrypt, decrypt, initVault, lockVault, isVaultLocked } from '../src/offscreen/crypto'

describe('crypto', () => {
  const password = 'correct-horse-battery-staple'
  const salt = crypto.getRandomValues(new Uint8Array(16))

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
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run tests/crypto.test.ts
```

Expected: FAIL — `Cannot find module '../src/offscreen/crypto'`

- [ ] **Step 3: Implement `src/offscreen/crypto.ts`**

```ts
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
    { name: 'PBKDF2', salt, iterations: 600_000, hash: 'SHA-256' },
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
function bufToBase64(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf))
}

function base64ToBuf(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0))
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run tests/crypto.test.ts
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/offscreen/crypto.ts tests/crypto.test.ts
git commit -m "feat: add AES-256-GCM crypto module with PBKDF2 key derivation"
```

---

## Task 4: Database Module

**Files:**
- Create: `src/offscreen/db.ts`
- Create: `tests/db.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/db.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { initDb, createNote, listNotes, getNote, updateNote, deleteNote } from '../src/offscreen/db'

describe('db - notes', () => {
  beforeEach(async () => {
    await initDb()
  })

  it('createNote returns a note with id', async () => {
    const note = await createNote('Test title', 'Test content')
    expect(note.id).toBeDefined()
    expect(note.title).toBe('Test title')
    expect(note.content).toBe('Test content')
    expect(note.created_at).toBeDefined()
  })

  it('listNotes returns created notes', async () => {
    await createNote('A', '')
    await createNote('B', '')
    const notes = await listNotes()
    expect(notes.length).toBeGreaterThanOrEqual(2)
  })

  it('updateNote changes title and content', async () => {
    const note = await createNote('Old', 'Old content')
    const updated = await updateNote(note.id, { title: 'New', content: 'New content' })
    expect(updated.title).toBe('New')
    expect(updated.content).toBe('New content')
  })

  it('deleteNote removes the note', async () => {
    const note = await createNote('To delete', '')
    await deleteNote(note.id)
    await expect(getNote(note.id)).rejects.toThrow('not found')
  })

  it('listNotes filters by search query', async () => {
    await createNote('Shopping list', 'Milk eggs bread')
    await createNote('Work tasks', 'Write PR description')
    const results = await listNotes('shopping')
    expect(results.length).toBe(1)
    expect(results[0].title).toBe('Shopping list')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run tests/db.test.ts
```

Expected: FAIL — `Cannot find module '../src/offscreen/db'`

- [ ] **Step 3: Implement `src/offscreen/db.ts`**

```ts
import { PGlite } from '@electric-sql/pglite'
import type { Note } from '../shared/messages'

let db: PGlite | null = null

export async function initDb(): Promise<void> {
  db = new PGlite()
  await db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      title       TEXT NOT NULL,
      content     TEXT NOT NULL DEFAULT '',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS secrets (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      label       TEXT NOT NULL,
      ciphertext  TEXT NOT NULL,
      iv          TEXT NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)
}

function getDb(): PGlite {
  if (!db) throw new Error('DB not initialised')
  return db
}

export async function listNotes(query?: string): Promise<Note[]> {
  const d = getDb()
  if (query) {
    const res = await d.query<Note>(
      `SELECT * FROM notes WHERE title ILIKE $1 OR content ILIKE $1 ORDER BY updated_at DESC`,
      [`%${query}%`]
    )
    return res.rows
  }
  const res = await d.query<Note>(`SELECT * FROM notes ORDER BY updated_at DESC`)
  return res.rows
}

export async function getNote(id: string): Promise<Note> {
  const res = await getDb().query<Note>(`SELECT * FROM notes WHERE id = $1`, [id])
  if (!res.rows[0]) throw new Error(`Note ${id} not found`)
  return res.rows[0]
}

export async function createNote(title: string, content: string): Promise<Note> {
  const res = await getDb().query<Note>(
    `INSERT INTO notes (title, content) VALUES ($1, $2) RETURNING *`,
    [title, content]
  )
  return res.rows[0]
}

export async function updateNote(
  id: string,
  fields: { title?: string; content?: string }
): Promise<Note> {
  const sets: string[] = []
  const values: unknown[] = []
  let i = 1
  if (fields.title !== undefined) { sets.push(`title = $${i++}`); values.push(fields.title) }
  if (fields.content !== undefined) { sets.push(`content = $${i++}`); values.push(fields.content) }
  sets.push(`updated_at = now()`)
  values.push(id)
  const res = await getDb().query<Note>(
    `UPDATE notes SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  )
  if (!res.rows[0]) throw new Error(`Note ${id} not found`)
  return res.rows[0]
}

export async function deleteNote(id: string): Promise<void> {
  await getDb().exec(`DELETE FROM notes WHERE id = '${id}'`)
}

// --- Secrets ---
export interface SecretRow {
  id: string; label: string; ciphertext: string; iv: string
  created_at: string; updated_at: string
}

export async function listSecretMeta(query?: string): Promise<Array<{ id: string; label: string; updated_at: string }>> {
  const d = getDb()
  if (query) {
    const res = await d.query<{ id: string; label: string; updated_at: string }>(
      `SELECT id, label, updated_at FROM secrets WHERE label ILIKE $1 ORDER BY updated_at DESC`,
      [`%${query}%`]
    )
    return res.rows
  }
  const res = await d.query<{ id: string; label: string; updated_at: string }>(
    `SELECT id, label, updated_at FROM secrets ORDER BY updated_at DESC`
  )
  return res.rows
}

export async function getSecretRow(id: string): Promise<SecretRow> {
  const res = await getDb().query<SecretRow>(`SELECT * FROM secrets WHERE id = $1`, [id])
  if (!res.rows[0]) throw new Error(`Secret ${id} not found`)
  return res.rows[0]
}

export async function createSecretRow(label: string, ciphertext: string, iv: string): Promise<{ id: string; label: string }> {
  const res = await getDb().query<{ id: string; label: string }>(
    `INSERT INTO secrets (label, ciphertext, iv) VALUES ($1, $2, $3) RETURNING id, label`,
    [label, ciphertext, iv]
  )
  return res.rows[0]
}

export async function updateSecretRow(
  id: string,
  fields: { label?: string; ciphertext?: string; iv?: string }
): Promise<{ id: string; label: string }> {
  const sets: string[] = []
  const values: unknown[] = []
  let i = 1
  if (fields.label !== undefined) { sets.push(`label = $${i++}`); values.push(fields.label) }
  if (fields.ciphertext !== undefined) { sets.push(`ciphertext = $${i++}`); values.push(fields.ciphertext) }
  if (fields.iv !== undefined) { sets.push(`iv = $${i++}`); values.push(fields.iv) }
  sets.push(`updated_at = now()`)
  values.push(id)
  const res = await getDb().query<{ id: string; label: string }>(
    `UPDATE secrets SET ${sets.join(', ')} WHERE id = $${i} RETURNING id, label`,
    values
  )
  if (!res.rows[0]) throw new Error(`Secret ${id} not found`)
  return res.rows[0]
}

export async function deleteSecretRow(id: string): Promise<void> {
  await getDb().exec(`DELETE FROM secrets WHERE id = '${id}'`)
}

export async function exportAllRows(): Promise<{ notes: Note[]; secrets: SecretRow[] }> {
  const notes = await listNotes()
  const res = await getDb().query<SecretRow>(`SELECT * FROM secrets`)
  return { notes, secrets: res.rows }
}

export async function importRows(
  notes: Note[],
  secrets: SecretRow[]
): Promise<{ notesUpdated: number; secretsAdded: number }> {
  let notesUpdated = 0
  let secretsAdded = 0
  const d = getDb()
  for (const n of notes) {
    const existing = await d.query<Note>(`SELECT updated_at FROM notes WHERE id = $1`, [n.id])
    if (!existing.rows[0]) {
      await d.query(
        `INSERT INTO notes (id, title, content, created_at, updated_at) VALUES ($1,$2,$3,$4,$5)`,
        [n.id, n.title, n.content, n.created_at, n.updated_at]
      )
      notesUpdated++
    } else if (n.updated_at > existing.rows[0].updated_at) {
      await d.query(
        `UPDATE notes SET title=$1, content=$2, updated_at=$3 WHERE id=$4`,
        [n.title, n.content, n.updated_at, n.id]
      )
      notesUpdated++
    }
  }
  for (const s of secrets) {
    const existing = await d.query<SecretRow>(`SELECT updated_at FROM secrets WHERE id = $1`, [s.id])
    if (!existing.rows[0]) {
      await d.query(
        `INSERT INTO secrets (id, label, ciphertext, iv, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6)`,
        [s.id, s.label, s.ciphertext, s.iv, s.created_at, s.updated_at]
      )
      secretsAdded++
    } else if (s.updated_at > existing.rows[0].updated_at) {
      await d.query(
        `UPDATE secrets SET label=$1, ciphertext=$2, iv=$3, updated_at=$4 WHERE id=$5`,
        [s.label, s.ciphertext, s.iv, s.updated_at, s.id]
      )
    }
  }
  return { notesUpdated, secretsAdded }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run tests/db.test.ts
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/offscreen/db.ts tests/db.test.ts
git commit -m "feat: add PGlite database module with notes and secrets CRUD"
```

---

## Task 5: Offscreen Message Handler

**Files:**
- Create: `src/offscreen/handler.ts`
- Create: `src/offscreen/main.ts`
- Create: `tests/handler.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/handler.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { initDb } from '../src/offscreen/db'
import { dispatch } from '../src/offscreen/handler'

describe('handler', () => {
  beforeEach(async () => {
    await initDb()
  })

  it('NOTES_CREATE returns ok + note', async () => {
    const reply = await dispatch({ type: 'NOTES_CREATE', payload: { title: 'Hi', content: 'World' } })
    expect(reply.ok).toBe(true)
    expect(reply.data?.title).toBe('Hi')
  })

  it('NOTES_LIST returns ok + array', async () => {
    await dispatch({ type: 'NOTES_CREATE', payload: { title: 'X', content: '' } })
    const reply = await dispatch({ type: 'NOTES_LIST' })
    expect(reply.ok).toBe(true)
    expect(Array.isArray(reply.data)).toBe(true)
  })

  it('VAULT_STATUS returns locked when not unlocked', async () => {
    const reply = await dispatch({ type: 'VAULT_STATUS' })
    expect(reply.ok).toBe(true)
    expect(reply.data?.locked).toBe(true)
  })

  it('VAULT_UNLOCK then SECRETS_CREATE then SECRETS_LIST', async () => {
    // Set a salt first (normally stored in chrome.storage.local)
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const unlockReply = await dispatch({ type: 'VAULT_UNLOCK', payload: { password: 'pw', salt: Array.from(salt) } })
    expect(unlockReply.ok).toBe(true)

    const createReply = await dispatch({ type: 'SECRETS_CREATE', payload: { label: 'MyToken', value: 'abc123' } })
    expect(createReply.ok).toBe(true)

    const listReply = await dispatch({ type: 'SECRETS_LIST' })
    expect(listReply.ok).toBe(true)
    expect((listReply.data as Array<unknown>).length).toBe(1)
  })

  it('NOTES_DELETE unknown id returns error', async () => {
    const reply = await dispatch({ type: 'NOTES_DELETE', payload: { id: 'nonexistent' } })
    expect(reply.ok).toBe(false)
    expect(reply.error).toBeDefined()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run tests/handler.test.ts
```

Expected: FAIL — `Cannot find module '../src/offscreen/handler'`

- [ ] **Step 3: Implement `src/offscreen/handler.ts`**

```ts
import type { AnyMsg, Reply } from '../shared/messages'
import * as db from './db'
import {
  initVault, lockVault, getVaultStatus, getKey, deriveKey,
  encrypt, decrypt, resetLockTimer
} from './crypto'

const LOCK_TIMEOUT_MS = 15 * 60 * 1000

export async function dispatch(msg: AnyMsg & { payload?: Record<string, unknown> }): Promise<Reply<unknown>> {
  try {
    switch (msg.type) {
      case 'NOTES_LIST': {
        const q = (msg as { payload?: { query?: string } }).payload?.query
        return { ok: true, data: await db.listNotes(q) }
      }
      case 'NOTES_GET': {
        const { id } = (msg as { payload: { id: string } }).payload
        return { ok: true, data: await db.getNote(id) }
      }
      case 'NOTES_CREATE': {
        const { title, content } = (msg as { payload: { title: string; content: string } }).payload
        return { ok: true, data: await db.createNote(title, content) }
      }
      case 'NOTES_UPDATE': {
        const { id, title, content } = (msg as { payload: { id: string; title?: string; content?: string } }).payload
        return { ok: true, data: await db.updateNote(id, { title, content }) }
      }
      case 'NOTES_DELETE': {
        const { id } = (msg as { payload: { id: string } }).payload
        await db.deleteNote(id)
        return { ok: true }
      }

      case 'VAULT_UNLOCK': {
        const { password, salt } = (msg as { payload: { password: string; salt: number[] } }).payload
        const saltBytes = new Uint8Array(salt)
        await initVault(password, saltBytes, LOCK_TIMEOUT_MS)
        return { ok: true }
      }
      case 'VAULT_LOCK': {
        lockVault()
        return { ok: true }
      }
      case 'VAULT_STATUS': {
        return { ok: true, data: getVaultStatus() }
      }

      case 'SECRETS_LIST': {
        const q = (msg as { payload?: { query?: string } }).payload?.query
        return { ok: true, data: await db.listSecretMeta(q) }
      }
      case 'SECRETS_GET': {
        const { id } = (msg as { payload: { id: string } }).payload
        const row = await db.getSecretRow(id)
        const value = await decrypt(getKey(), row.ciphertext, row.iv)
        resetLockTimer(LOCK_TIMEOUT_MS)
        return { ok: true, data: { id: row.id, label: row.label, value } }
      }
      case 'SECRETS_CREATE': {
        const { label, value } = (msg as { payload: { label: string; value: string } }).payload
        const { ciphertext, iv } = await encrypt(getKey(), value)
        resetLockTimer(LOCK_TIMEOUT_MS)
        return { ok: true, data: await db.createSecretRow(label, ciphertext, iv) }
      }
      case 'SECRETS_UPDATE': {
        const { id, label, value } = (msg as { payload: { id: string; label?: string; value?: string } }).payload
        const fields: { label?: string; ciphertext?: string; iv?: string } = {}
        if (label !== undefined) fields.label = label
        if (value !== undefined) {
          const enc = await encrypt(getKey(), value)
          fields.ciphertext = enc.ciphertext
          fields.iv = enc.iv
          resetLockTimer(LOCK_TIMEOUT_MS)
        }
        return { ok: true, data: await db.updateSecretRow(id, fields) }
      }
      case 'SECRETS_DELETE': {
        const { id } = (msg as { payload: { id: string } }).payload
        await db.deleteSecretRow(id)
        return { ok: true }
      }

      case 'DB_EXPORT': {
        return { ok: true, data: await db.exportAllRows() }
      }
      case 'DB_IMPORT': {
        const { notes, secrets } = (msg as { payload: { notes: db.Note[]; secrets: db.SecretRow[] } }).payload
        const summary = await db.importRows(notes, secrets)
        return { ok: true, data: summary }
      }

      default:
        return { ok: false, error: `Unknown message type: ${(msg as { type: string }).type}` }
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
```

- [ ] **Step 4: Create `src/offscreen/main.ts`**

```ts
import { initDb } from './db'
import { dispatch } from './handler'

initDb().then(() => {
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    dispatch(msg).then(sendResponse)
    return true // keep channel open for async response
  })
})
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npx vitest run tests/handler.test.ts
```

Expected: all 5 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/offscreen/handler.ts src/offscreen/main.ts tests/handler.test.ts
git commit -m "feat: add offscreen message handler and bootstrap"
```

---

## Task 6: Service Worker

**Files:**
- Create: `src/service-worker/index.ts`

- [ ] **Step 1: Create `src/service-worker/index.ts`**

```ts
const OFFSCREEN_URL = chrome.runtime.getURL('src/offscreen/index.html')

async function ensureOffscreen(): Promise<void> {
  const existing = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    documentUrls: [OFFSCREEN_URL],
  })
  if (existing.length === 0) {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_URL,
      reasons: [chrome.offscreen.Reason.WORKERS],
      justification: 'PGlite WASM database host',
    })
  }
}

async function sendToOffscreen(msg: unknown): Promise<unknown> {
  await ensureOffscreen()
  return chrome.runtime.sendMessage(msg)
}

// Open side panel on extension icon click
chrome.action.onClicked.addListener(tab => {
  if (tab.id) chrome.sidePanel.open({ tabId: tab.id })
})

// Relay note/secret/vault messages from side panel to offscreen
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const noteOrVaultTypes = [
    'NOTES_LIST','NOTES_GET','NOTES_CREATE','NOTES_UPDATE','NOTES_DELETE',
    'VAULT_UNLOCK','VAULT_LOCK','VAULT_STATUS',
    'SECRETS_LIST','SECRETS_GET','SECRETS_CREATE','SECRETS_UPDATE','SECRETS_DELETE',
    'DB_EXPORT','DB_IMPORT',
  ]
  if (noteOrVaultTypes.includes(msg.type)) {
    sendToOffscreen(msg).then(sendResponse)
    return true
  }

  if (msg.type === 'SYNC_STATUS') {
    chrome.storage.local.get(['syncedAt', 'googleToken'], result => {
      sendResponse({
        ok: true,
        data: {
          connected: !!result.googleToken,
          lastSync: result.syncedAt ?? null,
        }
      })
    })
    return true
  }

  if (msg.type === 'SYNC_PUSH') {
    handlePush().then(sendResponse)
    return true
  }

  if (msg.type === 'SYNC_PULL') {
    handlePull().then(sendResponse)
    return true
  }
})

// --- Drive helpers ---

async function getToken(): Promise<string> {
  const stored = await chrome.storage.session.get('googleToken')
  if (stored.googleToken) return stored.googleToken as string
  const token = await chrome.identity.getAuthToken({ interactive: true })
  await chrome.storage.session.set({ googleToken: token })
  return token as string
}

async function handlePush(): Promise<{ ok: boolean; data?: { syncedAt: string }; error?: string }> {
  try {
    const token = await getToken()
    const exportReply = await sendToOffscreen({ type: 'DB_EXPORT' }) as { ok: boolean; data: unknown }
    if (!exportReply.ok) throw new Error('DB export failed')

    // Encrypt the export blob
    const keyReply = await sendToOffscreen({ type: 'VAULT_STATUS' }) as { ok: boolean; data: { locked: boolean } }
    if (keyReply.data.locked) throw new Error('Vault is locked — unlock before syncing')

    const plaintext = JSON.stringify(exportReply.data)
    // Encrypt via offscreen (it holds the key)
    const encReply = await sendToOffscreen({ type: 'SYNC_ENCRYPT', payload: { plaintext } }) as { ok: boolean; data: { ciphertext: string; iv: string } }
    if (!encReply.ok) throw new Error('Encryption failed')

    const body = JSON.stringify({ ciphertext: encReply.data.ciphertext, iv: encReply.data.iv })

    // Find or create the file
    const stored = await chrome.storage.local.get('driveFileId')
    let fileId: string = stored.driveFileId as string

    if (fileId) {
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body,
      })
    } else {
      const meta = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'keyvault-backup.json', parents: ['appDataFolder'] }),
      }).then(r => r.json())
      fileId = meta.id
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body,
      })
    }

    const syncedAt = new Date().toISOString()
    await chrome.storage.local.set({ syncedAt, driveFileId: fileId })
    return { ok: true, data: { syncedAt } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

async function handlePull(): Promise<{ ok: boolean; data?: { syncedAt: string; notesUpdated: number; secretsAdded: number }; error?: string }> {
  try {
    const token = await getToken()
    const stored = await chrome.storage.local.get('driveFileId')
    if (!stored.driveFileId) throw new Error('No Drive file found — push first')

    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${stored.driveFileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const { ciphertext, iv } = await res.json()

    const decReply = await sendToOffscreen({ type: 'SYNC_DECRYPT', payload: { ciphertext, iv } }) as { ok: boolean; data: { plaintext: string } }
    if (!decReply.ok) throw new Error('Decryption failed — wrong key or corrupted file')

    const { notes, secrets } = JSON.parse(decReply.data.plaintext)
    const importReply = await sendToOffscreen({ type: 'DB_IMPORT', payload: { notes, secrets } }) as { ok: boolean; data: { notesUpdated: number; secretsAdded: number } }

    const syncedAt = new Date().toISOString()
    await chrome.storage.local.set({ syncedAt })
    return { ok: true, data: { syncedAt, ...importReply.data } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
```

- [ ] **Step 2: Add `SYNC_ENCRYPT` and `SYNC_DECRYPT` to `src/offscreen/handler.ts`**

Add these two cases inside the `switch` in `dispatch()`, before the `default`:

```ts
case 'SYNC_ENCRYPT': {
  const { plaintext } = (msg as { payload: { plaintext: string } }).payload
  const result = await encrypt(getKey(), plaintext)
  return { ok: true, data: result }
}
case 'SYNC_DECRYPT': {
  const { ciphertext, iv } = (msg as { payload: { ciphertext: string; iv: string } }).payload
  const plaintext = await decrypt(getKey(), ciphertext, iv)
  return { ok: true, data: { plaintext } }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/service-worker/index.ts src/offscreen/handler.ts
git commit -m "feat: add service worker with Drive push/pull sync"
```

---

## Task 7: Duotone SVG Icons

**Files:**
- Create: `src/sidepanel/components/icons/index.tsx`

- [ ] **Step 1: Create `src/sidepanel/components/icons/index.tsx`**

```tsx
interface IconProps {
  active?: boolean
  accentColor?: string
  size?: number
}

const baseStroke = 'rgba(255,255,255,0.25)'

export function NotesIcon({ active, accentColor = '#818cf8', size = 20 }: IconProps) {
  const stroke = active ? accentColor : baseStroke
  const fill = active ? `${accentColor}33` : 'rgba(255,255,255,0.06)'
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <rect x="3" y="1.5" width="11" height="14" rx="2" fill={fill} stroke={stroke} strokeWidth="1.4" />
      <line x1="6" y1="6" x2="11" y2="6" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="6" y1="9" x2="11" y2="9" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="6" y1="12" x2="9" y2="12" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export function KeyvaultIcon({ active, accentColor = '#f59e0b', size = 20 }: IconProps) {
  const stroke = active ? accentColor : baseStroke
  const fill = active ? `${accentColor}33` : 'rgba(255,255,255,0.06)'
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M10 1.5L3 4.5v5c0 4 3.1 7.5 7 8.5 3.9-1 7-4.5 7-8.5v-5L10 1.5z"
        fill={fill} stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="10" cy="8.5" r="2" fill={fill} stroke={stroke} strokeWidth="1.3" />
      <line x1="10" y1="10.5" x2="10" y2="13" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" />
      <line x1="8.5" y1="11.8" x2="11.5" y2="11.8" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

export function SyncIcon({ active, accentColor = '#3b82f6', size = 20 }: IconProps) {
  const stroke = active ? accentColor : baseStroke
  const fill = active ? `${accentColor}33` : 'rgba(255,255,255,0.06)'
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M5.5 13.5a3 3 0 01-.4-6 4.5 4.5 0 018.8-.8 2.5 2.5 0 01.6 4.8H5.5z"
        fill={fill} stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />
      <line x1="10" y1="11" x2="10" y2="17" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
      <polyline points="7.5,14.5 10,17 12.5,14.5" stroke={stroke} strokeWidth="1.4"
        strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

export function SettingsIcon({ active, accentColor = '#3b82f6', size = 20 }: IconProps) {
  const stroke = active ? accentColor : baseStroke
  const fill = active ? `${accentColor}22` : 'transparent'
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <line x1="3" y1="5" x2="17" y2="5" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="7" cy="5" r="2" fill={fill} stroke={stroke} strokeWidth="1.3" />
      <line x1="3" y1="10" x2="17" y2="10" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="13" cy="10" r="2" fill={fill} stroke={stroke} strokeWidth="1.3" />
      <line x1="3" y1="15" x2="17" y2="15" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="9" cy="15" r="2" fill={fill} stroke={stroke} strokeWidth="1.3" />
    </svg>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/sidepanel/components/icons/index.tsx
git commit -m "feat: add duotone SVG icon components"
```

---

## Task 8: Icon Rail + App Shell

**Files:**
- Create: `src/sidepanel/components/IconRail.tsx`
- Create: `src/sidepanel/App.tsx`
- Create: `src/sidepanel/main.tsx`
- Create: `src/sidepanel/index.css`

- [ ] **Step 1: Create `src/sidepanel/index.css`**

```css
@import "tailwindcss";

:root {
  --bg-base: #0d1117;
  --glass-bg: rgba(255,255,255,0.06);
  --glass-border: rgba(255,255,255,0.08);
  --text-primary: rgba(255,255,255,0.87);
  --text-secondary: rgba(255,255,255,0.4);
  --text-muted: rgba(255,255,255,0.2);
  --accent-notes: #6366f1;
  --accent-vault: #f59e0b;
  --accent-sync: #3b82f6;
}

body {
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  margin: 0;
  width: 360px;
  min-height: 100vh;
  overflow-x: hidden;
}

.glass-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(10px);
  border-radius: 12px;
}
```

- [ ] **Step 2: Create `src/sidepanel/components/IconRail.tsx`**

```tsx
import { NotesIcon, KeyvaultIcon, SyncIcon, SettingsIcon } from './icons'

export type View = 'notes' | 'keyvault' | 'sync' | 'settings'

interface Props {
  active: View
  onChange: (v: View) => void
}

const items: Array<{ view: View; Icon: React.FC<{ active?: boolean }>; accent: string }> = [
  { view: 'notes',    Icon: NotesIcon,    accent: '#818cf8' },
  { view: 'keyvault', Icon: KeyvaultIcon, accent: '#f59e0b' },
]

const bottomItems: Array<{ view: View; Icon: React.FC<{ active?: boolean }>; accent: string }> = [
  { view: 'sync',     Icon: SyncIcon,     accent: '#60a5fa' },
  { view: 'settings', Icon: SettingsIcon, accent: '#60a5fa' },
]

export function IconRail({ active, onChange }: Props) {
  const btn = (view: View, Icon: React.FC<{ active?: boolean; accentColor?: string }>, accent: string) => (
    <button
      key={view}
      onClick={() => onChange(view)}
      className="w-8 h-8 flex items-center justify-center rounded-[10px] transition-all duration-150"
      style={active === view ? {
        background: `${accent}22`,
        boxShadow: `0 0 12px ${accent}44`,
      } : {}}
      title={view}
    >
      <Icon active={active === view} accentColor={accent} size={20} />
    </button>
  )

  return (
    <div
      className="flex flex-col items-center py-4 gap-2 border-r"
      style={{
        width: 48,
        background: 'rgba(255,255,255,0.03)',
        borderColor: 'rgba(255,255,255,0.07)',
        minHeight: '100vh',
      }}
    >
      {items.map(({ view, Icon, accent }) => btn(view, Icon, accent))}
      <div className="flex-1" />
      {bottomItems.map(({ view, Icon, accent }) => btn(view, Icon, accent))}
    </div>
  )
}
```

- [ ] **Step 3: Create `src/sidepanel/App.tsx`**

```tsx
import { useState } from 'react'
import { IconRail, type View } from './components/IconRail'
import { NotesView } from './views/NotesView'
import { KeyvaultView } from './views/KeyvaultView'
import { SyncView } from './views/SyncView'
import { SettingsView } from './views/SettingsView'

export async function sendMsg(type: string, payload?: unknown): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  return chrome.runtime.sendMessage({ type, payload })
}

const glows: Record<View, string> = {
  notes:    'radial-gradient(ellipse 120px 80px at 60px -20px, rgba(99,102,241,0.2) 0%, transparent 70%)',
  keyvault: 'radial-gradient(ellipse 120px 80px at 60px -20px, rgba(245,158,11,0.18) 0%, transparent 70%)',
  sync:     'radial-gradient(ellipse 120px 80px at 60px -20px, rgba(59,130,246,0.18) 0%, transparent 70%)',
  settings: 'radial-gradient(ellipse 120px 80px at 60px -20px, rgba(59,130,246,0.18) 0%, transparent 70%)',
}

export default function App() {
  const [view, setView] = useState<View>('notes')

  return (
    <div className="flex min-h-screen relative" style={{ background: '#0d1117' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: glows[view] }} />
      <IconRail active={view} onChange={setView} />
      <div className="flex-1 overflow-hidden relative z-10">
        {view === 'notes'    && <NotesView sendMsg={sendMsg} />}
        {view === 'keyvault' && <KeyvaultView sendMsg={sendMsg} />}
        {view === 'sync'     && <SyncView sendMsg={sendMsg} />}
        {view === 'settings' && <SettingsView sendMsg={sendMsg} />}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `src/sidepanel/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors (stub views may be needed — see Task 9).

- [ ] **Step 6: Commit**

```bash
git add src/sidepanel/
git commit -m "feat: add side panel shell with icon rail and ambient glow"
```

---

## Task 9: Notes View

**Files:**
- Create: `src/sidepanel/components/NoteCard.tsx`
- Create: `src/sidepanel/views/NotesView.tsx`

- [ ] **Step 1: Create `src/sidepanel/components/NoteCard.tsx`**

```tsx
import type { Note } from '../../shared/messages'

interface Props {
  note: Note
  active: boolean
  onClick: () => void
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(iso).toLocaleDateString()
}

export function NoteCard({ note, active, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl p-3 transition-all duration-150"
      style={{
        background: active ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
        border: active ? '1px solid rgba(129,140,248,0.4)' : '1px solid rgba(255,255,255,0.07)',
        boxShadow: active ? '0 4px 20px rgba(99,102,241,0.15)' : 'none',
      }}
    >
      <div className="flex justify-between items-start gap-2">
        <span className="text-sm font-semibold truncate" style={{ color: 'rgba(255,255,255,0.87)' }}>
          {note.title || 'Untitled'}
        </span>
        <span className="text-xs shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }}>
          {relativeTime(note.updated_at)}
        </span>
      </div>
      {note.content && (
        <p className="text-xs mt-1 line-clamp-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {note.content}
        </p>
      )}
    </button>
  )
}
```

- [ ] **Step 2: Create `src/sidepanel/views/NotesView.tsx`**

```tsx
import { useEffect, useState, useCallback } from 'react'
import type { Note } from '../../shared/messages'
import { NoteCard } from '../components/NoteCard'

interface Props {
  sendMsg: (type: string, payload?: unknown) => Promise<{ ok: boolean; data?: unknown; error?: string }>
}

export function NotesView({ sendMsg }: Props) {
  const [notes, setNotes] = useState<Note[]>([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Note | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async (q = '') => {
    const res = await sendMsg('NOTES_LIST', q ? { query: q } : undefined)
    if (res.ok) setNotes(res.data as Note[])
  }, [sendMsg])

  useEffect(() => { load() }, [load])

  function selectNote(note: Note) {
    setSelected(note)
    setEditTitle(note.title)
    setEditContent(note.content)
  }

  async function save() {
    if (!selected) return
    setSaving(true)
    await sendMsg('NOTES_UPDATE', { id: selected.id, title: editTitle, content: editContent })
    await load(query)
    setSaving(false)
  }

  async function createNote() {
    const res = await sendMsg('NOTES_CREATE', { title: 'New note', content: '' })
    if (res.ok) {
      await load(query)
      selectNote(res.data as Note)
    }
  }

  async function deleteNote(id: string) {
    await sendMsg('NOTES_DELETE', { id })
    setSelected(null)
    await load(query)
  }

  return (
    <div className="flex h-screen">
      {/* List pane */}
      <div className="flex flex-col w-44 shrink-0 border-r p-2 gap-2 overflow-y-auto"
        style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        {/* Search */}
        <div className="flex items-center gap-2 rounded-[10px] px-3 py-2"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
            <circle cx="8" cy="8" r="5" stroke="rgba(255,255,255,0.35)" strokeWidth="1.6"/>
            <line x1="12" y1="12" x2="17" y2="17" stroke="rgba(255,255,255,0.35)" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          <input
            className="bg-transparent text-xs outline-none flex-1"
            style={{ color: 'rgba(255,255,255,0.6)' }}
            placeholder="Search notes..."
            value={query}
            onChange={e => { setQuery(e.target.value); load(e.target.value) }}
          />
        </div>
        {/* Header */}
        <div className="flex justify-between items-center px-1">
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Notes
          </span>
          <button onClick={createNote}
            className="text-xs font-semibold px-2 py-1 rounded-md"
            style={{ background: 'linear-gradient(135deg,#818cf8,#6366f1)', color: 'white' }}>
            + New
          </button>
        </div>
        {/* Cards */}
        {notes.map(n => (
          <NoteCard key={n.id} note={n} active={selected?.id === n.id} onClick={() => selectNote(n)} />
        ))}
        {notes.length === 0 && (
          <p className="text-xs text-center py-8" style={{ color: 'rgba(255,255,255,0.2)' }}>No notes yet</p>
        )}
      </div>

      {/* Editor pane */}
      {selected ? (
        <div className="flex flex-col flex-1 p-3 gap-2 overflow-hidden">
          <input
            className="bg-transparent text-sm font-semibold outline-none"
            style={{ color: 'rgba(255,255,255,0.87)' }}
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onBlur={save}
            placeholder="Title"
          />
          <textarea
            className="flex-1 bg-transparent text-xs outline-none resize-none leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.55)' }}
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            onBlur={save}
            placeholder="Start writing..."
          />
          <div className="flex justify-between items-center">
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
              {saving ? 'Saving...' : 'Auto-saved'}
            </span>
            <button onClick={() => deleteNote(selected.id)}
              className="text-xs px-2 py-1 rounded-md"
              style={{ color: 'rgba(239,68,68,0.7)', border: '1px solid rgba(239,68,68,0.2)' }}>
              Delete
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>Select a note</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/sidepanel/components/NoteCard.tsx src/sidepanel/views/NotesView.tsx
git commit -m "feat: add notes view with list, search, create, edit, delete"
```

---

## Task 10: Keyvault View

**Files:**
- Create: `src/sidepanel/components/SecretCard.tsx`
- Create: `src/sidepanel/views/KeyvaultView.tsx`

- [ ] **Step 1: Create `src/sidepanel/components/SecretCard.tsx`**

```tsx
import { useState } from 'react'
import type { SecretMeta } from '../../shared/messages'

interface Props {
  secret: SecretMeta
  onReveal: (id: string) => Promise<string>
  onCopy: (id: string) => void
  onDelete: (id: string) => void
}

export function SecretCard({ secret, onReveal, onCopy, onDelete }: Props) {
  const [revealed, setRevealed] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleReveal() {
    if (revealed) { setRevealed(null); return }
    setLoading(true)
    const val = await onReveal(secret.id)
    setRevealed(val)
    setLoading(false)
    setTimeout(() => setRevealed(null), 30_000) // auto-hide after 30s
  }

  return (
    <div className="rounded-xl p-3 flex flex-col gap-2"
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}>
      <div className="flex justify-between items-center">
        <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.87)' }}>
          {secret.label}
        </span>
        <div className="flex gap-3">
          <button onClick={handleReveal} className="text-xs" style={{ color: 'rgba(251,191,36,0.6)' }}>
            {loading ? '...' : revealed ? 'Hide' : 'Reveal'}
          </button>
          <button onClick={() => onCopy(secret.id)} className="text-xs" style={{ color: 'rgba(251,191,36,0.6)' }}>
            Copy
          </button>
          <button onClick={() => onDelete(secret.id)} className="text-xs" style={{ color: 'rgba(239,68,68,0.5)' }}>
            ✕
          </button>
        </div>
      </div>
      <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.25)', letterSpacing: '0.05em' }}>
        {revealed ?? '••••••••••••••••'}
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/sidepanel/views/KeyvaultView.tsx`**

```tsx
import { useEffect, useState, useCallback } from 'react'
import type { SecretMeta } from '../../shared/messages'
import { SecretCard } from '../components/SecretCard'

interface Props {
  sendMsg: (type: string, payload?: unknown) => Promise<{ ok: boolean; data?: unknown; error?: string }>
}

export function KeyvaultView({ sendMsg }: Props) {
  const [locked, setLocked] = useState(true)
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  const [password, setPassword] = useState('')
  const [secrets, setSecrets] = useState<SecretMeta[]>([])
  const [query, setQuery] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newValue, setNewValue] = useState('')
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState('')

  const checkStatus = useCallback(async () => {
    const res = await sendMsg('VAULT_STATUS')
    if (res.ok && res.data) {
      const d = res.data as { locked: boolean; expiresAt?: number }
      setLocked(d.locked)
      setExpiresAt(d.expiresAt ?? null)
    }
  }, [sendMsg])

  const loadSecrets = useCallback(async (q = '') => {
    const res = await sendMsg('SECRETS_LIST', q ? { query: q } : undefined)
    if (res.ok) setSecrets(res.data as SecretMeta[])
  }, [sendMsg])

  useEffect(() => { checkStatus() }, [checkStatus])
  useEffect(() => { if (!locked) loadSecrets() }, [locked, loadSecrets])

  // Countdown ticker
  useEffect(() => {
    if (!expiresAt) return
    const id = setInterval(() => {
      const secs = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
      const m = Math.floor(secs / 60), s = secs % 60
      setCountdown(`${m}m ${s.toString().padStart(2,'0')}s`)
      if (secs === 0) { setLocked(true); clearInterval(id) }
    }, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  async function unlock() {
    const saltRes = await chrome.storage.local.get('vaultSalt')
    let salt: number[]
    if (!saltRes.vaultSalt) {
      const bytes = crypto.getRandomValues(new Uint8Array(16))
      salt = Array.from(bytes)
      await chrome.storage.local.set({ vaultSalt: salt })
    } else {
      salt = saltRes.vaultSalt as number[]
    }
    const res = await sendMsg('VAULT_UNLOCK', { password, salt })
    if (res.ok) {
      setLocked(false); setPassword(''); setError('')
      await checkStatus()
      await loadSecrets()
    } else {
      setError(res.error ?? 'Unlock failed')
    }
  }

  async function revealSecret(id: string): Promise<string> {
    const res = await sendMsg('SECRETS_GET', { id })
    return res.ok ? (res.data as { value: string }).value : ''
  }

  async function copySecret(id: string) {
    const val = await revealSecret(id)
    await navigator.clipboard.writeText(val)
  }

  async function addSecret() {
    if (!newLabel || !newValue) return
    await sendMsg('SECRETS_CREATE', { label: newLabel, value: newValue })
    setNewLabel(''); setNewValue('')
    await loadSecrets(query)
  }

  async function deleteSecret(id: string) {
    await sendMsg('SECRETS_DELETE', { id })
    await loadSecrets(query)
  }

  if (locked) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 gap-4">
        <div style={{ color: 'rgba(251,191,36,0.8)', fontSize: 32 }}>
          {/* Lock icon placeholder — replace with SVG from Task 7 if desired */}
          🔒
        </div>
        <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Vault is locked
        </p>
        <input
          type="password"
          className="w-full rounded-[10px] px-3 py-2 text-sm outline-none"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
          placeholder="Master password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && unlock()}
        />
        {error && <p className="text-xs" style={{ color: 'rgba(239,68,68,0.8)' }}>{error}</p>}
        <button onClick={unlock}
          className="w-full py-2 rounded-[10px] text-sm font-semibold"
          style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', color: '#1c1917' }}>
          Unlock
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen p-3 gap-3 overflow-y-auto">
      {/* Status banner */}
      <div className="rounded-[10px] px-3 py-2 flex justify-between items-center"
        style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
        <span className="text-xs" style={{ color: 'rgba(251,191,36,0.8)' }}>Vault unlocked</span>
        <span className="text-xs" style={{ color: 'rgba(251,191,36,0.5)' }}>{countdown} left</span>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 rounded-[10px] px-3 py-2"
        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
          <circle cx="8" cy="8" r="5" stroke="rgba(255,255,255,0.35)" strokeWidth="1.6"/>
          <line x1="12" y1="12" x2="17" y2="17" stroke="rgba(255,255,255,0.35)" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
        <input className="bg-transparent text-xs outline-none flex-1"
          style={{ color: 'rgba(255,255,255,0.6)' }}
          placeholder="Search secrets..."
          value={query}
          onChange={e => { setQuery(e.target.value); loadSecrets(e.target.value) }}
        />
      </div>

      {/* Header */}
      <div className="flex justify-between items-center px-1">
        <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Secrets
        </span>
      </div>

      {/* Secret cards */}
      {secrets.map(s => (
        <SecretCard key={s.id} secret={s}
          onReveal={revealSecret} onCopy={copySecret} onDelete={deleteSecret} />
      ))}

      {/* Add new secret */}
      <div className="rounded-xl p-3 flex flex-col gap-2 mt-2"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.1)' }}>
        <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Add secret
        </p>
        <input className="rounded-lg px-3 py-2 text-xs outline-none"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
          placeholder="Label (e.g. GitHub Token)"
          value={newLabel} onChange={e => setNewLabel(e.target.value)}
        />
        <input type="password"
          className="rounded-lg px-3 py-2 text-xs outline-none font-mono"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
          placeholder="Secret value"
          value={newValue} onChange={e => setNewValue(e.target.value)}
        />
        <button onClick={addSecret}
          className="py-2 rounded-lg text-xs font-semibold"
          style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', color: '#1c1917' }}>
          Save Secret
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/sidepanel/components/SecretCard.tsx src/sidepanel/views/KeyvaultView.tsx
git commit -m "feat: add keyvault view with unlock, secrets CRUD, reveal/copy"
```

---

## Task 11: Sync View + Settings View

**Files:**
- Create: `src/sidepanel/views/SyncView.tsx`
- Create: `src/sidepanel/views/SettingsView.tsx`

- [ ] **Step 1: Create `src/sidepanel/views/SyncView.tsx`**

```tsx
import { useEffect, useState } from 'react'

interface Props {
  sendMsg: (type: string, payload?: unknown) => Promise<{ ok: boolean; data?: unknown; error?: string }>
}

export function SyncView({ sendMsg }: Props) {
  const [connected, setConnected] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [loading, setLoading] = useState<'push' | 'pull' | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    sendMsg('SYNC_STATUS').then(res => {
      if (res.ok && res.data) {
        const d = res.data as { connected: boolean; lastSync: string | null }
        setConnected(d.connected)
        setLastSync(d.lastSync)
      }
    })
  }, [sendMsg])

  async function push() {
    setLoading('push'); setResult(null); setError(null)
    const res = await sendMsg('SYNC_PUSH')
    setLoading(null)
    if (res.ok && res.data) {
      const d = res.data as { syncedAt: string }
      setLastSync(d.syncedAt)
      setResult('Pushed successfully')
    } else {
      setError(res.error ?? 'Push failed')
    }
  }

  async function pull() {
    setLoading('pull'); setResult(null); setError(null)
    const res = await sendMsg('SYNC_PULL')
    setLoading(null)
    if (res.ok && res.data) {
      const d = res.data as { syncedAt: string; notesUpdated: number; secretsAdded: number }
      setLastSync(d.syncedAt)
      setResult(`${d.notesUpdated} notes updated, ${d.secretsAdded} secrets added`)
    } else {
      setError(res.error ?? 'Pull failed')
    }
  }

  return (
    <div className="flex flex-col p-4 gap-4 overflow-y-auto">
      <p className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.8)' }}>Sync</p>

      <div className="glass-card p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: connected ? '#22c55e' : '#6b7280' }} />
          <div>
            <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>Google Drive</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {connected ? 'Connected' : 'Not connected'}
            </p>
          </div>
        </div>
        {lastSync && (
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Last sync: {new Date(lastSync).toLocaleString()}
          </p>
        )}
        <div className="flex gap-2">
          <button onClick={push} disabled={!!loading}
            className="flex-1 py-2 rounded-[10px] text-xs font-semibold disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#60a5fa,#3b82f6)', color: 'white' }}>
            {loading === 'push' ? 'Pushing...' : '↑ Push to Drive'}
          </button>
          <button onClick={pull} disabled={!!loading}
            className="flex-1 py-2 rounded-[10px] text-xs font-semibold disabled:opacity-50"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
            {loading === 'pull' ? 'Pulling...' : '↓ Pull from Drive'}
          </button>
        </div>
        {result && <p className="text-xs" style={{ color: 'rgba(134,239,172,0.8)' }}>{result}</p>}
        {error && <p className="text-xs" style={{ color: 'rgba(239,68,68,0.8)' }}>{error}</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/sidepanel/views/SettingsView.tsx`**

```tsx
import { useState } from 'react'

interface Props {
  sendMsg: (type: string, payload?: unknown) => Promise<{ ok: boolean; data?: unknown; error?: string }>
}

const TIMEOUTS = [
  { label: '15m', ms: 15 * 60 * 1000 },
  { label: '30m', ms: 30 * 60 * 1000 },
  { label: '1h',  ms: 60 * 60 * 1000 },
  { label: '∞',   ms: 0 },
]

export function SettingsView({ sendMsg }: Props) {
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [timeout, setTimeout_] = useState(15 * 60 * 1000)

  async function changePw() {
    if (newPw !== confirmPw) { setPwMsg('Passwords do not match'); return }
    if (newPw.length < 8) { setPwMsg('Password must be at least 8 characters'); return }

    // Re-derive with current password to verify, then re-encrypt all secrets with new key
    // For simplicity: lock vault, wipe salt, let user unlock with new password
    const saltRes = await chrome.storage.local.get('vaultSalt')
    if (!saltRes.vaultSalt) { setPwMsg('Vault not initialised'); return }

    // Unlock with current password
    const unlockRes = await sendMsg('VAULT_UNLOCK', { password: currentPw, salt: saltRes.vaultSalt })
    if (!unlockRes.ok) { setPwMsg('Current password is incorrect'); return }

    // Export all secrets decrypted
    const exportRes = await sendMsg('DB_EXPORT')
    if (!exportRes.ok) { setPwMsg('Export failed'); return }

    // Generate new salt
    const newSalt = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    await chrome.storage.local.set({ vaultSalt: newSalt })

    // Unlock with new password
    await sendMsg('VAULT_UNLOCK', { password: newPw, salt: newSalt })

    // Re-import (all secrets will be re-encrypted with new key)
    const data = exportRes.data as { notes: unknown[]; secrets: Array<{ id: string; label: string; ciphertext: string; iv: string; created_at: string; updated_at: string }> }
    // Re-encrypt each secret with the new key
    for (const s of data.secrets) {
      const decRes = await sendMsg('SECRETS_GET', { id: s.id })
      if (decRes.ok) {
        await sendMsg('SECRETS_UPDATE', { id: s.id, value: (decRes.data as { value: string }).value })
      }
    }

    setPwMsg('Password changed successfully')
    setCurrentPw(''); setNewPw(''); setConfirmPw('')
  }

  return (
    <div className="flex flex-col p-4 gap-4 overflow-y-auto">
      <p className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.8)' }}>Settings</p>

      {/* Master password */}
      <div className="glass-card p-4 flex flex-col gap-3">
        <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Master Password
        </p>
        <input type="password"
          className="rounded-lg px-3 py-2 text-xs outline-none"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
          placeholder="Current password"
          value={currentPw} onChange={e => setCurrentPw(e.target.value)}
        />
        <input type="password"
          className="rounded-lg px-3 py-2 text-xs outline-none"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
          placeholder="New password (min 8 chars)"
          value={newPw} onChange={e => setNewPw(e.target.value)}
        />
        <input type="password"
          className="rounded-lg px-3 py-2 text-xs outline-none"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
          placeholder="Confirm new password"
          value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
        />
        <button onClick={changePw}
          className="py-2 rounded-lg text-xs font-semibold"
          style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)', color: 'rgba(239,68,68,0.8)' }}>
          Change Password
        </button>
        {pwMsg && (
          <p className="text-xs" style={{ color: pwMsg.includes('success') ? 'rgba(134,239,172,0.8)' : 'rgba(239,68,68,0.8)' }}>
            {pwMsg}
          </p>
        )}
      </div>

      {/* Auto-lock timeout */}
      <div className="glass-card p-4 flex flex-col gap-3">
        <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Vault Auto-lock
        </p>
        <div className="flex gap-2">
          {TIMEOUTS.map(t => (
            <button key={t.label} onClick={() => setTimeout_(t.ms)}
              className="flex-1 py-2 rounded-lg text-xs font-semibold"
              style={timeout === t.ms
                ? { background: 'linear-gradient(135deg,#818cf8,#6366f1)', color: 'white' }
                : { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/sidepanel/views/SyncView.tsx src/sidepanel/views/SettingsView.tsx
git commit -m "feat: add sync view and settings view"
```

---

## Task 12: Full Build + Load in Chrome

- [ ] **Step 1: Add Google OAuth client ID to `manifest.json`**

In `manifest.json`, replace `"YOUR_GOOGLE_CLIENT_ID"` with a real OAuth client ID from Google Cloud Console:
1. Go to https://console.cloud.google.com → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID → Chrome App → paste Extension ID
3. Enable the Google Drive API
4. Copy the client ID into `manifest.json`

- [ ] **Step 2: Build the extension**

```bash
npx vite build
```

Expected: `dist/` directory with `manifest.json`, `service-worker`, `sidepanel`, `offscreen` entries.

- [ ] **Step 3: Load in Chrome**

1. Open `chrome://extensions`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `dist/` folder

Expected: "KeyVault" extension appears in the list with no errors.

- [ ] **Step 4: Test the golden path**

1. Click the extension icon → side panel opens
2. Notes tab: create a note, type content, verify auto-save
3. Keyvault tab: enter a master password, add a secret, reveal it, copy it
4. Lock the vault, unlock again with correct password
5. Sync tab: connect Google Drive, push, pull
6. Settings tab: change the timeout

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete KeyVault Chrome extension MVP"
```
