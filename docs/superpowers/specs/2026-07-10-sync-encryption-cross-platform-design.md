# Sync Encryption Cross-Platform Design

**Date:** 2026-07-10
**Status:** Implemented

## Problem

The backup format stores the entire DB export as one AES-GCM blob encrypted with `PBKDF2(password, backup_salt)`. Inside that blob, secrets already carry their own `(ciphertext, iv)` — encrypted with the vault key that was active when they were created. This means secrets are effectively double-encrypted.

When the receiving device decrypts the outer envelope it gets the raw secret rows. If it stores those rows as-is, the `ciphertext` values are still tied to the **backup key** (derived from `backup_salt + password`), not the **local vault key**. Revealing a secret on the receiving device then fails because the local key can't decrypt them.

## Solution: Re-encrypt Secrets on Pull (Approach A)

During pull, after decrypting the outer backup envelope:
1. Derive `backupKey = PBKDF2(password, backup_salt)`
2. For each secret row: decrypt `secret.ciphertext` with `backupKey` → get plaintext value
3. Re-encrypt the plaintext value with the **local vault key** → new `(ciphertext, iv)`
4. Store the new `(ciphertext, iv)` in the local DB

After pull, every secret lives under the local vault key and is immediately revealable.

**Same-device optimisation:** If `backup_salt == local_salt`, the backup key equals the local vault key. Skip per-secret re-encryption and import rows directly.

## Data Flow (Cross-Device Pull)

```
Drive backup: { ciphertext_outer, iv_outer, salt: backupSalt }
  │
  ▼ PBKDF2(password, backupSalt) → backupKey
  ▼ AES-GCM decrypt outer envelope
  └── { notes[], secrets[{ id, label, ciphertext, iv, ... }], ... }
                             │
                             ▼ AES-GCM decrypt with backupKey  →  plaintext value
                             ▼ AES-GCM encrypt with localVaultKey  →  new (ciphertext, iv)
                             ▼ INSERT / UPDATE secrets table
```

## Changes Required

### PWA — `pwa/src/app/views/SyncView.tsx` (`pull()`)

**Current behaviour:** Attempts re-encryption in a try/catch and silently falls back to `ON CONFLICT DO NOTHING` on any decrypt failure, leaving secrets encrypted under the backup key.

**Fix:**
- Guard at top of `pull()`: if vault is locked, fail immediately with "Unlock your vault before syncing"
- Compare `backup.salt` with `localStorage.getItem('myspace_vault_salt')` to detect same-device pull
- If same-device: import secret rows as-is (no re-encryption needed)
- If cross-device: for every secret, `decryptWithKey(s.ciphertext, s.iv, backupKey)` then `encryptWithKey(value, localKey)` — store new `(ciphertext, iv)`. Remove the try/catch fallback entirely; a decrypt failure is a hard error.
- The local vault key is already available via `getKey()` (imported from `../../crypto`) after unlock check

### Extension — `extension/src/service-worker/index.ts`

**`handlePull()` / `handlePullConfirm()`:**
- Thread `password` and `backupSalt` into `finishImport()` alongside `plaintext`
- If backup salt equals local `vaultSalt`: pass `null` for password (same-device, skip re-encrypt)

**`finishImport(plaintext, password, backupSalt)`:**
- If `password` is non-null (cross-device): for each secret, send `SYNC_DECRYPT_WITH_SALT` then `SYNC_ENCRYPT` to the offscreen document and replace `(ciphertext, iv)` before passing to `DB_IMPORT`
- If `password` is null (same-device): pass secret rows to `DB_IMPORT` as-is (existing behaviour)
- Vault must be unlocked before `SYNC_ENCRYPT` is called — guard with `VAULT_STATUS` check

### No Changes Required

- Crypto primitives (`pwa/src/crypto/index.ts`, `extension/src/offscreen/crypto.ts`) — already correct
- Backup wire format (`{ ciphertext, iv, salt }`) — unchanged
- Push logic on either platform — unchanged
- DB schema — no migrations needed

## Error Handling

| Situation | Behaviour |
|---|---|
| Vault locked at pull time | Hard error: "Unlock your vault before syncing" |
| Secret can't be decrypted with backup key | Hard error: backup is corrupt or wrong password — surface to user, abort pull |
| Backup missing `salt` field (legacy) | Existing behaviour: attempt decrypt with local key; if fails, prompt for password |
| No backup on Drive | Existing error: "No backup found on Drive" |

## Crypto API Used

| Operation | PWA | Extension |
|---|---|---|
| Derive backup key | `deriveKey(password, backupSalt)` | `SYNC_DECRYPT_WITH_SALT` (offscreen) |
| Decrypt secret with backup key | `decryptWithKey(ct, iv, backupKey)` | `SYNC_DECRYPT_WITH_SALT` (offscreen) |
| Encrypt secret with local key | `encryptWithKey(value, localKey)` | `SYNC_ENCRYPT` (offscreen, uses vault key) |

## Testing

- Pull from extension → reveal on PWA: secrets decryptable immediately
- Pull from PWA → reveal on extension: secrets decryptable immediately
- Same-device pull (same salt): behaviour unchanged, no re-encryption overhead
- Legacy backup (no `salt`): existing password-prompt flow still works
- Wrong password on cross-device pull: hard error, no partial import
