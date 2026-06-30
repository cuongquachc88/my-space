# Google Drive sync

Google Drive sync backs up and restores all My SPACE data through an encrypted file stored in the user's Google Drive appDataFolder. No servers are involved; the extension and app talk directly to the Drive API with OAuth tokens. The backup file is AES-GCM encrypted, so Google never sees plaintext.

## How it works

### Chrome extension

The service worker (`index.ts`) is the sync orchestrator. It handles OAuth, Drive API calls, and coordinates with the offscreen document for encryption/decryption and database export/import.

```mermaid
sequenceDiagram
  participant UI as SyncView
  participant SW as Service worker
  participant OFF as Offscreen doc
  participant GD as Google Drive

  Note over UI,SW: Connect
  UI->>SW: SYNC_CONNECT
  SW->>SW: chrome.identity.getAuthToken (interactive)
  SW->>SW: fetch userinfo (email, avatar)
  SW->>GD: (token stored for later use)

  Note over UI,SW: Push
  UI->>SW: SYNC_PUSH
  SW->>OFF: VAULT_STATUS (check unlocked)
  SW->>OFF: DB_EXPORT (all tables)
  SW->>OFF: SYNC_ENCRYPT (plaintext -> ciphertext)
  SW->>SW: findFileId (appDataFolder search)
  SW->>GD: multipart upload (ciphertext + iv + salt)
  GD-->>SW: file id
  SW->>SW: store syncedAt

  Note over UI,SW: Pull (same device)
  UI->>SW: SYNC_PULL
  SW->>GD: GET file content
  SW->>SW: compare backup salt vs local salt
  alt Salts match
    SW->>OFF: SYNC_DECRYPT (using in-memory key)
    SW->>OFF: DB_IMPORT (replace all tables)
  else Salts differ (cross-device)
    SW->>SW: store pendingPull in session
    SW-->>UI: needsPassword: true
    UI->>SW: SYNC_PULL_CONFIRM {password}
    SW->>OFF: SYNC_DECRYPT_WITH_SALT {password, salt}
    SW->>OFF: DB_IMPORT
  end
```

**OAuth**: uses `chrome.identity.getAuthToken` with three scopes: `drive.appdata`, `userinfo.email`, and `userinfo.profile`. On connect, it clears any cached token to force a fresh consent screen, then fetches the user's email and avatar for display. Tokens are auto-refreshed by Chrome; on 401 responses, `driveRequest` clears the session token and retries once.

**Push flow**:
1. Check vault is unlocked (encryption requires the in-memory key).
2. Export all tables via `DB_EXPORT` (notes, secrets, subscriptions, bills, mapStacks, mapPins, todoLists, todoTasks).
3. Encrypt the JSON plaintext with the vault key (`SYNC_ENCRYPT`).
4. Find the backup file ID (cached in `chrome.storage.local` or searched in appDataFolder by name `keyvault-backup.json`).
5. Multipart upload the encrypted payload (`ciphertext`, `iv`, `salt`) to Drive. The salt is included so the backup is self-contained and decryptable on any device with the master password.
6. Store `syncedAt` timestamp.

**Pull flow**:
1. Fetch the backup file from Drive.
2. Compare the backup's salt with the local `vaultSalt`. If they differ (cross-device or cross-profile scenario), store the encrypted payload in `chrome.storage.session` and return `needsPassword: true`.
3. If salts match, decrypt with the in-memory key and import via `DB_IMPORT` (replaces all tables).
4. For cross-device pulls, the user enters their master password, which re-derives the key using the backup's salt (`SYNC_DECRYPT_WITH_SALT`), then imports.

**SyncView** provides a terminal-style log console with animated progress bars, step-by-step log lines, and color-coded output (info, success, error, highlight). It shows connection status with Google avatar, email, last sync time, and Push/Pull buttons.

### Android

`DriveRepository` and `SyncScreen` implement a simpler sync flow:

- **OAuth**: uses an explicit OAuth flow via `Intent(Intent.ACTION_VIEW)` opening the Google auth URL in the browser, with a custom redirect URI (`com.myspace.app:/oauth2callback`). The access token is stored in `SharedPreferences`. This is different from Chrome's `chrome.identity.getAuthToken` which handles the flow internally.
- **Encryption**: uses `CryptoManager` (Android Keystore) instead of the password-derived key. Since the Keystore key is device-local and not password-derived, there is no cross-device password prompt. The backup is encrypted with the device's Keystore key, meaning backups made on one Android device cannot be decrypted on another.
- **Push**: exports notes, secrets, and subscriptions (no bills, map pins, or todos), encrypts with `CryptoManager.encrypt`, and uploads via OkHttp multipart request.
- **Pull**: downloads the file, decrypts with `CryptoManager.decrypt`, and does a destructive replace (delete all then insert) for notes, secrets, and subscriptions.
- **No salt handling**: because the Keystore manages the key, there is no salt in the backup payload and no cross-device decryption flow.
- **UI**: `SyncScreen` has a simpler log console (LazyColumn of log lines) with Push/Pull buttons and connection status, but no animated progress bar or terminal styling.

### Key differences

| Aspect | Chrome | Android |
|--------|--------|---------|
| OAuth | `chrome.identity.getAuthToken` (implicit) | Browser intent with redirect URI (explicit) |
| Encryption key | Password-derived (PBKDF2) | Android Keystore (hardware-backed) |
| Cross-device pull | Yes (password re-derivation with salt) | No (Keystore key is device-local) |
| Data scope | All 8 tables | Notes, secrets, subscriptions only |
| Salt in backup | Yes | No |
| Pull import | `DB_IMPORT` (upsert logic) | Destructive replace (delete all + insert) |
| Progress UI | Animated terminal console with progress bar | Simple log list |

## Key source files

| File | Description |
|------|-------------|
| `chrome-extension/src/service-worker/index.ts` | OAuth, Drive API, push/pull orchestration, cross-device salt handling |
| `chrome-extension/src/sidepanel/views/SyncView.tsx` | Sync UI: status, connect, push/pull, password prompt, terminal log |
| `android/app/src/main/java/com/myspace/app/sync/DriveRepository.kt` | Android Drive push/pull with OkHttp and Keystore encryption |
| `android/app/src/main/java/com/myspace/app/ui/screens/SyncScreen.kt` | Android sync UI with OAuth intent and log console |

## Cross-links

- [Secret vault](./secret-vault.md) - encryption key derivation and vault unlock state required for sync
- [Notes](./notes.md), [Subscriptions](./subscriptions.md), [Reports and bills](./reports-and-bills.md), [To-do lists](./todo-lists.md), [Map pins](./map-pins.md) - all feature data is included in sync backups
- [Chrome extension](../applications/chrome-extension.md) - service worker and offscreen document architecture
