# Glossary

Project-specific terms used across the My SPACE codebase, docs, and wiki. Look here when a name in a message type or a CSS variable is not obvious from context.

## A

**AES-GCM**
The authenticated symmetric cipher used for both vault secrets and Drive backups. 256-bit key, 12-byte random IV per encryption. On Chrome it is provided by the Web Crypto API (`SubtleCrypto`). On Android it is `AES/GCM/NoPadding` backed by the Android Keystore. The IV is stored alongside the ciphertext and is never reused.

**appDataFolder**
A private, app-scoped folder in Google Drive that is invisible in the user's Drive UI. My SPACE stores a single file there, `keyvault-backup.json`, scoped via the `drive.appdata` OAuth scope. Only the app that created it can read or write it.

## B

**backup payload**
The encrypted JSON blob uploaded to Drive. Shape: `{ ciphertext, iv }` with the vault salt carried alongside. The decrypted plaintext is `{ notes: [...], secrets: [...], subscriptions: [...] }` on both platforms.

## C

**cross-device pull**
The flow triggered when a backup's salt differs from the local salt (different device or Chrome profile). The user is prompted for their master password, `SYNC_DECRYPT_WITH_SALT` re-derives a temporary key from the backup's salt plus the password, decrypts, imports, and updates the local salt. The temporary key is never cached.

## G

**glass-card**
The dark UI surface style used across both platforms. Defined by CSS variables in `chrome-extension/src/sidepanel/index.css`: `--bg-base: #0d1117`, `--glass-bg: rgba(255,255,255,0.06)`, `--glass-border: rgba(255,255,255,0.08)`. The Android theme mirrors these in `android/app/src/main/java/com/myspace/app/ui/theme/Theme.kt`.

**GATED_VIEWS**
The set of side panel view names that require `VAULT_UNLOCK` before they render. Currently includes the Vault and Generator views. Defined in `chrome-extension/src/sidepanel/App.tsx`.

## I

**IdbFs**
The PGlite filesystem adapter that persists the WASM Postgres database to IndexedDB. This is how the offscreen document's DB survives service worker and side panel restarts.

**idle lock**
The auto-lock timer that clears the vault key from memory after inactivity. Default is 15 minutes, configurable in Settings. Implemented in the side panel and triggers `VAULT_LOCK`.

## M

**master password**
The user-chosen passphrase that unlocks the vault. It is never stored. It is fed into PBKDF2 along with the vault salt to derive the AES-GCM key. On Chrome the derivation runs in the offscreen document; on Android it is handled by `CryptoManager.kt` backed by the Keystore.

**message protocol**
The `chrome.runtime.sendMessage` contract used between the three Chrome contexts. Every message is a `Msg<'TYPE', payload?>`; every reply is `Reply<data?>` with `{ ok, data?, error? }`. Types are unioned in `AnyMsg` inside `chrome-extension/src/shared/messages.ts`.

## O

**offscreen document**
The Chrome MV3 context that hosts PGlite and all crypto. Created on demand by the service worker because service workers cannot run WebAssembly. Source: `chrome-extension/src/offscreen/` (`main.ts`, `handler.ts`, `db.ts`, `crypto.ts`, `polyfill.ts`).

## P

**PBKDF2**
Password-Based Key Derivation Function 2, used to turn the master password into a 256-bit AES key. On Chrome the extension uses 600,000 iterations with SHA-256 (the developer guide notes 100k in one place; the canonical value is 600k). The Android app relies on the Keystore's hardware-backed key instead of a pure PBKDF2 path.

**per-feature accent colour**
Each feature has a dedicated accent used in its icon, glows, and highlights. Defined as CSS variables in the extension and mirrored in the Android theme. Examples: `--accent-notes: #6366f1` (indigo), `--accent-vault: #f59e0b` (amber), `--accent-sync: #3b82f6` (blue), `--accent-maps: #fb923c` (orange).

**PGlite**
PostgreSQL compiled to WebAssembly, from `@electric-sql/pglite`. Runs inside the offscreen document and provides the full SQL surface (tables, constraints, foreign keys with `CASCADE` deletes) for the extension's 8 tables. Persisted to IndexedDB via `IdbFs`.

## S

**salt (vault salt)**
A 16-byte random value stored in `chrome.storage.local` under the key `vaultSalt`. Combined with the master password in PBKDF2. Included in every Drive backup so a receiving device can re-derive the same key. A salt mismatch on pull triggers the cross-device password prompt.

**service worker**
The Chrome MV3 background context. Owns OAuth, Drive REST calls, and message routing. It does not own the database; it proxies DB/crypto messages to the offscreen document. Source: `chrome-extension/src/service-worker/index.ts`.

**share link**
An LZ-compressed URL encoding a map pin stack, produced by `chrome-extension/src/lib/shareLink.ts`. Lets users share a stack of pins without going through Drive.

**side panel**
The Chrome Side Panel API surface that renders the React UI. Ephemeral: it unmounts when collapsed, so it must not own state. Source: `chrome-extension/src/sidepanel/`.

**sync resolution**
The conflict rule applied during `importRows()` when a backup row collides with a local row. Last-write-wins by `updated_at` for notes, secrets, subscriptions, and tasks; first-write-wins for stacks and pins (the local definition is preserved).

## V

**vault key**
The derived AES-GCM key held in memory in the offscreen document (Chrome) or backed by the Android Keystore (Android). Never written to storage. Cleared on `VAULT_LOCK` or idle lock.

**VAULT_UNLOCK / VAULT_LOCK**
Message types that set or clear the vault key in the offscreen document. `VAULT_UNLOCK` carries the password and salt; on success the key is derived and held in memory and gated views become available.
