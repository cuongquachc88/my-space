# Sync Encryption Cross-Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After a cross-device pull from Google Drive, secrets are immediately decryptable with the receiving device's current vault password — no re-unlock or extra password entry required.

**Architecture:** On pull, after decrypting the outer backup envelope, re-encrypt each secret's value under the local vault key before storing it. Same-device pulls (matching salts) skip re-encryption. The fix is two separate code changes — one in the PWA pull flow, one in the extension's `finishImport()`.

**Tech Stack:** TypeScript, Web Crypto API (AES-GCM / PBKDF2), PGlite, Chrome Extension Manifest V3

## Global Constraints

- No changes to the backup wire format `{ ciphertext, iv, salt: number[] }` — push is unchanged
- No DB schema changes or migrations
- No changes to crypto primitives (`pwa/src/crypto/index.ts`, `extension/src/offscreen/crypto.ts`)
- Same-device pull (backup salt == local salt) must continue to work identically to today
- Legacy backups without a `salt` field must continue to use the existing password-prompt fallback
- Vault must be unlocked before any pull can proceed — surface a hard error if not

---

### Task 1: PWA — Fix `pull()` to re-encrypt secrets under the local vault key

**Files:**
- Modify: `pwa/src/app/views/SyncView.tsx` (the `pull()` function inside `useSyncLogic`)
- Test: `pwa/tests/unit/sync.test.ts` (create new)

**Interfaces:**
- Consumes: `deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey>` from `../../crypto`
- Consumes: `decryptWithKey(ciphertext: string, iv: string, key: CryptoKey): Promise<string>` from `../../crypto`
- Consumes: `encryptWithKey(plaintext: string, key: CryptoKey): Promise<{ ciphertext: string; iv: string }>` from `../../crypto`
- Consumes: `getKey(): CryptoKey` (throws if locked) from `../../crypto`
- Produces: no new exports — changes are internal to `pull()`

- [ ] **Step 1: Create the test file with a failing test for cross-device re-encryption**

Create `pwa/tests/unit/sync.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run the test to verify it passes (pure crypto logic, no mocks needed)**

```bash
cd pwa && npx vitest run tests/unit/sync.test.ts
```

Expected: both tests PASS (this validates the crypto primitives are sound before wiring them in)

- [ ] **Step 3: Rewrite the `pull()` function in `pwa/src/app/views/SyncView.tsx`**

Replace the entire `pull()` function (currently lines 105–167) with:

```typescript
async function pull() {
  if (!syncPw.trim()) { log('Enter your vault password', 'error'); setStatus('error'); return }
  const token = getStoredToken()
  if (!token) { log('Not connected — click Connect first', 'error'); setStatus('error'); return }

  // Vault must be unlocked so we can re-encrypt secrets under the local key
  let localKey: CryptoKey
  try {
    localKey = getKey()
  } catch {
    log('Unlock your vault before syncing', 'error'); setStatus('error'); return
  }

  setStatus('busy'); log('Searching Drive for backup…')
  try {
    const fileId = await findFile(token)
    if (!fileId) { log('No backup found on Drive', 'error'); setStatus('error'); return }
    log('Downloading…')
    const raw = await downloadFile(token, fileId)
    const payload = JSON.parse(raw) as { ciphertext: string; iv: string; salt: number[] }
    if (!payload.salt || !payload.ciphertext || !payload.iv) {
      throw new Error('Backup is missing required fields (salt/ciphertext/iv). Push from the source device first.')
    }
    log('Decrypting…')
    const backupSalt = Uint8Array.from(payload.salt)
    const backupKey = await deriveKey(syncPw, backupSalt)
    const plaintext = await decryptWithKey(payload.ciphertext, payload.iv, backupKey)
    const data = JSON.parse(plaintext) as Record<string, unknown[]>

    // Detect same-device pull: if salts match, backupKey == localKey — skip re-encryption
    const localSaltB64 = localStorage.getItem('myspace_vault_salt')
    const localSalt = localSaltB64 ? Uint8Array.from(atob(localSaltB64), c => c.charCodeAt(0)) : null
    const sameSalt = localSalt && backupSalt.length === localSalt.length &&
      backupSalt.every((b, i) => b === localSalt[i])

    log('Merging…')
    const db = await getDb()

    if (data.notes) {
      for (const n of data.notes as { id: string; title: string; content: string; tags: string[]; image_data: string }[]) {
        await db.query(
          'INSERT INTO notes (id,title,content,tags,image_data) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, content=EXCLUDED.content, tags=EXCLUDED.tags, image_data=EXCLUDED.image_data, updated_at=now()',
          [n.id, n.title, n.content, n.tags, n.image_data]
        )
      }
      log(`Merged ${data.notes.length} notes`)
    }

    if (data.secrets) {
      const secrets = data.secrets as { id: string; label: string; ciphertext: string; iv: string; tags: string[]; url: string; description: string }[]
      for (const s of secrets) {
        let finalCt: string
        let finalIv: string
        if (sameSalt) {
          // Same device: ciphertext is already under the local key
          finalCt = s.ciphertext
          finalIv = s.iv
        } else {
          // Cross-device: decrypt with backup key, re-encrypt with local key
          const plainValue = await decryptWithKey(s.ciphertext, s.iv, backupKey)
          const enc = await encryptWithKey(plainValue, localKey)
          finalCt = enc.ciphertext
          finalIv = enc.iv
        }
        await db.query(
          'INSERT INTO secrets (id,label,ciphertext,iv,tags,url,description) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO UPDATE SET label=EXCLUDED.label, ciphertext=EXCLUDED.ciphertext, iv=EXCLUDED.iv, tags=EXCLUDED.tags, url=EXCLUDED.url, description=EXCLUDED.description, updated_at=now()',
          [s.id, s.label, finalCt, finalIv, s.tags, s.url ?? '', s.description ?? '']
        )
      }
      log(`Merged ${secrets.length} secrets`)
    }

    if (data.subscriptions) {
      for (const s of data.subscriptions as { id: string; name: string; amount: number; currency: string; cycle: string; start_date: string; notes: string; active: boolean; tags: string[] }[]) {
        await db.query(
          'INSERT INTO subscriptions (id,name,amount,currency,cycle,start_date,notes,active,tags) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, amount=EXCLUDED.amount, currency=EXCLUDED.currency, cycle=EXCLUDED.cycle, start_date=EXCLUDED.start_date, notes=EXCLUDED.notes, active=EXCLUDED.active, tags=EXCLUDED.tags, updated_at=now()',
          [s.id, s.name, s.amount, s.currency, s.cycle, s.start_date, s.notes ?? '', s.active, s.tags]
        )
      }
      log(`Merged ${data.subscriptions.length} subscriptions`)
    }

    if (data.todo_tasks) {
      for (const t of data.todo_tasks as { id: string; list_id: string; title: string; done: boolean; priority: string; due_date: string; notes: string }[]) {
        await db.query(
          'INSERT INTO todo_tasks (id,list_id,title,done,priority,due_date,notes) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, done=EXCLUDED.done, priority=EXCLUDED.priority, due_date=EXCLUDED.due_date, notes=EXCLUDED.notes',
          [t.id, t.list_id, t.title, t.done, t.priority, t.due_date, t.notes]
        )
      }
      log(`Merged ${data.todo_tasks.length} tasks`)
    }

    if (data.map_pins) {
      for (const p of data.map_pins as { id: string; stack_id: string; label: string; lat: number; lng: number; url: string; note: string; priority: string; category: string; rating: number; review_note: string }[]) {
        await db.query(
          'INSERT INTO map_pins (id,stack_id,label,lat,lng,url,note,priority,category,rating,review_note) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING',
          [p.id, p.stack_id, p.label, p.lat, p.lng, p.url ?? '', p.note ?? '', p.priority ?? 'none', p.category ?? '', p.rating ?? 0, p.review_note ?? '']
        )
      }
      log(`Merged ${(data.map_pins as unknown[]).length} pins`)
    }

    log('Pull complete ✓', 'ok'); setStatus('ok')
  } catch (e) { log(String(e), 'error'); setStatus('error') }
}
```

Also update the import at the top of `SyncView.tsx` — make sure `getKey` is imported:

```typescript
import { deriveKey, encryptWithKey, decryptWithKey, encrypt, getKey } from '../../crypto'
```

- [ ] **Step 4: Verify the TypeScript compiles**

```bash
cd pwa && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
cd pwa && git add src/app/views/SyncView.tsx tests/unit/sync.test.ts
git commit -m "fix: re-encrypt secrets under local vault key on PWA pull"
```

---

### Task 2: Extension — Fix `finishImport()` to re-encrypt secrets under the local vault key

**Files:**
- Modify: `extension/src/service-worker/index.ts` — `handlePull()`, `handlePullConfirm()`, `finishImport()`

**Interfaces:**
- Consumes: `sendToOffscreen({ type: 'SYNC_DECRYPT_WITH_SALT', payload: { ciphertext, iv, salt, password } })` → `{ ok: boolean; data: { plaintext: string } }`
- Consumes: `sendToOffscreen({ type: 'SYNC_ENCRYPT', payload: { plaintext } })` → `{ ok: boolean; data: { ciphertext: string; iv: string } }`
- Consumes: `sendToOffscreen({ type: 'VAULT_STATUS' })` → `{ ok: boolean; data: { locked: boolean } }`
- Produces: no new exports — changes are internal

- [ ] **Step 1: Update `finishImport()` signature and add re-encryption logic**

Replace the existing `finishImport` function (currently starting at line 443) with:

```typescript
async function finishImport(
  plaintext: string,
  backupPassword: string | null,
  backupSalt: number[] | null
): Promise<{ ok: boolean; data?: { syncedAt: string; notesUpdated: number; secretsAdded: number; subsUpdated: number; mapsUpdated: number; todosUpdated: number; totalNotes: number; totalSecrets: number; totalSubs: number; totalMaps: number; totalTodos: number }; error?: string }> {
  const parsed = JSON.parse(plaintext) as {
    notes: unknown[]
    secrets: db.SecretRow[]
    subscriptions: unknown[]
    bills: unknown[]
    mapStacks: unknown[]
    mapPins: unknown[]
    todoLists: unknown[]
    todoTasks: unknown[]
  }
  const { notes, subscriptions, bills, mapStacks, mapPins, todoLists, todoTasks } = parsed
  let secrets = parsed.secrets

  // Cross-device: re-encrypt each secret under the local vault key.
  // backupPassword is null when backup salt == local salt (same device) — skip.
  if (backupPassword !== null && backupSalt !== null) {
    const vaultStatus = await sendToOffscreen({ type: 'VAULT_STATUS' }) as { ok: boolean; data: { locked: boolean } }
    if (vaultStatus.data.locked) throw new Error('Vault is locked — unlock before syncing')

    const reencrypted: db.SecretRow[] = []
    for (const s of secrets) {
      const decReply = await sendToOffscreen({
        type: 'SYNC_DECRYPT_WITH_SALT',
        payload: { ciphertext: s.ciphertext, iv: s.iv, salt: backupSalt, password: backupPassword },
      }) as { ok: boolean; data: { plaintext: string }; error?: string }
      if (!decReply.ok) throw new Error(`Failed to decrypt secret "${s.label}": ${decReply.error ?? 'unknown error'}`)

      const encReply = await sendToOffscreen({
        type: 'SYNC_ENCRYPT',
        payload: { plaintext: decReply.data.plaintext },
      }) as { ok: boolean; data: { ciphertext: string; iv: string }; error?: string }
      if (!encReply.ok) throw new Error(`Failed to re-encrypt secret "${s.label}": ${encReply.error ?? 'unknown error'}`)

      reencrypted.push({ ...s, ciphertext: encReply.data.ciphertext, iv: encReply.data.iv })
    }
    secrets = reencrypted
  }

  const importReply = await sendToOffscreen({
    type: 'DB_IMPORT',
    payload: { notes, secrets, subscriptions, bills, mapStacks, mapPins, todoLists, todoTasks },
  }) as { ok: boolean; data: { notesUpdated: number; secretsAdded: number; subsUpdated: number; mapsUpdated: number; todosUpdated: number } }
  if (!importReply.ok) throw new Error('DB import failed')

  const syncedAt = new Date().toISOString()
  await chrome.storage.local.set({ syncedAt })
  return {
    ok: true,
    data: {
      syncedAt,
      ...importReply.data,
      totalNotes:   notes.length,
      totalSecrets: secrets.length,
      totalSubs:    subscriptions.length,
      totalMaps:    mapPins.length,
      totalTodos:   todoTasks.length,
    },
  }
}
```

- [ ] **Step 2: Update `handlePull()` to thread password and salt into `finishImport()`**

Replace the `handlePull` function (currently starting at line 376) with:

```typescript
async function handlePull(): Promise<{ ok: boolean; needsPassword?: boolean; data?: unknown; error?: string }> {
  try {
    const fileId = await findFileId()
    if (!fileId) throw new Error('No backup found on Drive — push first')
    const res = await driveRequest(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, { headers: {} })

    const text = await res.text()
    if (!text.trim()) throw new Error('No data on Drive — push first')

    const backup = JSON.parse(text) as { ciphertext: string; iv: string; salt?: number[] }
    const { ciphertext, iv } = backup
    const backupSalt: number[] | undefined = backup.salt

    const { vaultSalt } = await chrome.storage.local.get('vaultSalt') as { vaultSalt: number[] | undefined }

    const saltsDiffer = backupSalt && vaultSalt && JSON.stringify(backupSalt) !== JSON.stringify(vaultSalt)
    const noLocalSalt = backupSalt && !vaultSalt

    if (saltsDiffer || noLocalSalt) {
      await chrome.storage.session.set({ pendingPull: { ciphertext, iv, salt: backupSalt } })
      return { ok: true, needsPassword: true }
    }

    const vaultStatus = await sendToOffscreen({ type: 'VAULT_STATUS' }) as { ok: boolean; data: { locked: boolean } }
    if (vaultStatus.data.locked) throw new Error('Vault is locked — unlock before syncing')

    const decReply = await sendToOffscreen({ type: 'SYNC_DECRYPT', payload: { ciphertext, iv } }) as { ok: boolean; data: { plaintext: string } }
    if (!decReply.ok) {
      if (!backupSalt) {
        throw new Error('Cannot decrypt: this backup was created with an older version. Push from your original device first to include the encryption key, then pull here.')
      }
      await chrome.storage.session.set({ pendingPull: { ciphertext, iv, salt: backupSalt } })
      return { ok: true, needsPassword: true }
    }

    // Same-device pull: pass null for password/salt to skip per-secret re-encryption
    return finishImport(decReply.data.plaintext, null, null)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
```

- [ ] **Step 3: Update `handlePullConfirm()` to thread password and salt into `finishImport()`**

Replace the `handlePullConfirm` function (currently starting at line 426) with:

```typescript
async function handlePullConfirm(password: string): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  try {
    const session = await chrome.storage.session.get('pendingPull') as { pendingPull?: { ciphertext: string; iv: string; salt: number[] } }
    if (!session.pendingPull) throw new Error('No pending pull — start a pull first')
    const { ciphertext, iv, salt } = session.pendingPull

    const decReply = await sendToOffscreen({
      type: 'SYNC_DECRYPT_WITH_SALT',
      payload: { ciphertext, iv, salt, password },
    }) as { ok: boolean; data: { plaintext: string } }
    if (!decReply.ok) throw new Error('Wrong password — decryption failed')

    await chrome.storage.session.remove('pendingPull')

    // Cross-device: pass password + salt so finishImport can re-encrypt each secret
    return finishImport(decReply.data.plaintext, password, salt)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
```

- [ ] **Step 4: Verify the TypeScript compiles**

```bash
cd extension && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
cd extension && git add src/service-worker/index.ts
git commit -m "fix: re-encrypt secrets under local vault key on extension pull"
```

---

### Task 3: Manual end-to-end verification

- [ ] **Step 1: Build both targets**

```bash
cd pwa && npm run build
cd ../extension && npm run build
```

Expected: both complete without errors

- [ ] **Step 2: Test cross-device pull (extension → PWA)**

1. In the extension: unlock vault, add a secret (e.g. label "test", value "hello123"), push to Drive
2. In the PWA (different device or cleared localStorage): unlock vault (set a new password/salt), go to Sync, enter the extension's vault password, click Pull
3. Go to Vault → reveal the "test" secret
4. Expected: value shows "hello123" without any additional prompt

- [ ] **Step 3: Test cross-device pull (PWA → extension)**

1. In the PWA: unlock vault, add a secret, push to Drive
2. In the extension (after clearing `vaultSalt` from `chrome.storage.local` to simulate a different device): unlock, go to Sync, click Pull, enter the PWA vault password when prompted
3. Reveal the secret
4. Expected: value shows correctly

- [ ] **Step 4: Test same-device pull (regression)**

1. Push from the extension
2. Pull on the same extension profile (same `vaultSalt`)
3. Reveal secrets
4. Expected: works exactly as before — no password prompt, values readable

- [ ] **Step 5: Test locked-vault guard**

1. Lock the vault on the PWA
2. Go to Sync, enter any password, click Pull
3. Expected: error log shows "Unlock your vault before syncing"

- [ ] **Step 6: Commit verification note**

```bash
git commit --allow-empty -m "test: verified cross-platform sync re-encryption end-to-end"
```
