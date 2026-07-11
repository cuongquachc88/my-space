# Sync Cross-Platform — Implementation Notes

## What was built

End-to-end encrypted sync between Chrome extension and PWA (Android + web) via Google Drive.

## Backup format

```json
{ "ciphertext": "...", "iv": "...", "salt": [1,2,3,...] }
```

- `salt` — PBKDF2 salt of the device that pushed. Used to detect cross-device pulls.
- Inner secrets each have their own `(ciphertext, iv)` encrypted with the vault key.

## Cross-device pull flow

1. Download backup from Drive
2. Compare `backup.salt` vs local salt
3. **Same device** → decrypt outer envelope with current vault key → import as-is
4. **Different device** → show password prompt (no always-visible field)
5. User enters master password → derive `backupKey = PBKDF2(password, backup.salt)`
6. Decrypt outer envelope with `backupKey`
7. For each secret: decrypt with `backupKey` → re-encrypt with local vault key
8. Import to local DB — secrets immediately revealable without re-unlock

## PWA implementation

- `pwa/src/app/views/SyncView.tsx` — `useSyncLogic()` hook shared by mobile + desktop
- Push: uses `getKey()` (vault must be unlocked)
- Pull: `pendingPull` state stores encrypted payload; password prompt shown inline only on cross-device
- `finishImport()` handles re-encryption and DB merge including `todo_lists`, `map_stacks` (FK parents before children)

## Extension implementation

- `extension/src/service-worker/index.ts` — `handlePull()` / `handlePullConfirm()` / `finishImport()`
- Cross-device re-encryption via offscreen messages: `SYNC_DECRYPT_WITH_SALT` → `SYNC_ENCRYPT`
- Supports both PWA snake_case keys (`map_pins`, `todo_tasks`) and extension camelCase keys (`mapPins`, `todoTasks`)

## Tables synced

| Table | Notes |
|---|---|
| `notes` | Full upsert |
| `secrets` | Re-encrypted on cross-device pull |
| `subscriptions` | Full upsert |
| `todo_lists` | Inserted before `todo_tasks` (FK) |
| `todo_tasks` | Column is `note` not `notes` |
| `map_stacks` | Inserted before `map_pins` (FK) |
| `map_pins` | Full upsert (was DO NOTHING — fixed) |
