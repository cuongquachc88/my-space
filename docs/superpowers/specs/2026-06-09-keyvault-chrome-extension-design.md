# KeyVault Chrome Extension — Design Spec

**Date:** 2026-06-09  
**Status:** Approved

---

## Overview

A Chrome extension that provides a persistent side panel for storing notes and encrypted secrets (keyvault), with optional manual sync to Google Drive. Built on Chrome Manifest V3 using PGlite (PostgreSQL/WASM) for local storage and AES-256-GCM for secret encryption.

---

## 1. Architecture

Four layers, each with one responsibility, communicating exclusively via `chrome.runtime.sendMessage`.

| Layer | What it is | Responsibility |
|---|---|---|
| Side Panel | Chrome Side Panel page (MV3) | All UI — notes list, keyvault, sync, settings |
| Service Worker | MV3 background script | Extension lifecycle, Google Drive OAuth + sync |
| Offscreen Document | Hidden persistent page | PGlite instance, all DB reads/writes, crypto ops |
| Crypto Module | Shared JS module (imported by offscreen doc) | AES-256-GCM encrypt/decrypt, PBKDF2 key derivation |

**Why offscreen document for PGlite:** Chrome MV3 service workers are killed after ~30s of inactivity. An offscreen document is a hidden persistent page that Chrome keeps alive, making it the correct host for a WASM database that must survive across requests.

The side panel never touches the database or crypto directly — it sends typed messages and receives responses.

---

## 2. UI Design

**Layout:** Chrome Side Panel (right-side persistent panel, Chrome 114+)

**Style:** Glassmorphism — frosted glass cards, soft gradients, ambient glow per section, dark background (`#0d1117` base).

**Navigation:** Vertical icon rail (48px wide) on the left, content area on the right. Four icons:
- Notes (top, purple accent `#6366f1`)
- Keyvault (amber accent `#f59e0b`)
- Sync (blue accent `#3b82f6`, bottom)
- Settings (bottom)

**Icons:** Custom duotone SVG — semi-transparent fill + colored stroke. No emoji. Active icon gets the section's accent color; inactive icons are `rgba(255,255,255,0.25)`.

**Per-section ambient color:**
- Notes: purple radial glow
- Keyvault: amber radial glow
- Sync/Settings: blue radial glow

**Search:** Full-width search bar at top of Notes and Keyvault views. Searches within the active section only.

**Notes view:** Cards with title, content preview, and relative timestamp. "+ New" button in section header.

**Keyvault view:** Cards with label and masked value (`••••••••`). Reveal (👁) and Copy actions per row. Vault status banner showing lock state and auto-lock countdown.

**Sync view:** Google Drive connection status, last sync time, Push and Pull buttons, summary of last sync result.

**Settings view:** Master password change, vault auto-lock timeout (15m / 30m / 1h / Never).

---

## 3. Data Model

PGlite schema, two tables:

```sql
CREATE TABLE notes (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  content     TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE secrets (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  label       TEXT NOT NULL,
  ciphertext  TEXT NOT NULL,   -- AES-256-GCM encrypted value, base64
  iv          TEXT NOT NULL,   -- 12-byte IV, base64
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Notes are stored plaintext. Only secrets are encrypted. `ciphertext` and `iv` are base64 strings for easy JSON serialisation during Drive sync.

---

## 4. Security Model

**Key derivation:**
- Master password → PBKDF2-SHA256 (600,000 iterations) + random 16-byte salt → 256-bit AES key
- Salt stored in `chrome.storage.local` — never leaves the device, never synced to Drive
- Derived key is a Web Crypto `CryptoKey` marked `extractable: false` — held in offscreen document memory only

**Encryption:**
- Algorithm: AES-256-GCM (confidentiality + integrity)
- Each secret write generates a fresh random 12-byte IV
- Notes stored plaintext — encryption is secrets-only

**Vault locking:**
- On lock: in-memory `CryptoKey` dereferenced and garbage collected
- Auto-lock timer resets on any user interaction
- On browser restart: vault starts locked

**Drive sync security:**
- Full export JSON encrypted as a single blob before upload (same AES key)
- Google OAuth token in `chrome.storage.session` — cleared on browser close
- Drive scope: `drive.appdata` only — file invisible to user's Drive UI, not shareable

**Principle of least exposure:**
- `SECRETS_LIST` returns only `{ id, label, updatedAt }` — no ciphertext in list view
- Plaintext value only exists in memory during `SECRETS_GET` response, discarded after render
- Side panel never holds a `CryptoKey`

---

## 5. Message Protocol

All messages follow:
```ts
// Request
{ type: string, payload?: unknown }
// Response
{ ok: boolean, data?: unknown, error?: string }
```

**Notes (Side Panel ↔ Offscreen Document):**

| type | payload | response data |
|---|---|---|
| `NOTES_LIST` | — | `Note[]` |
| `NOTES_GET` | `{ id }` | `Note` |
| `NOTES_CREATE` | `{ title, content }` | `Note` |
| `NOTES_UPDATE` | `{ id, title?, content? }` | `Note` |
| `NOTES_DELETE` | `{ id }` | — |

**Secrets (Side Panel ↔ Offscreen Document):**

| type | payload | response data |
|---|---|---|
| `VAULT_UNLOCK` | `{ password }` | — |
| `VAULT_LOCK` | — | — |
| `VAULT_STATUS` | — | `{ locked: boolean, expiresAt?: number }` |
| `SECRETS_LIST` | — | `{ id, label, updatedAt }[]` |
| `SECRETS_GET` | `{ id }` | `{ id, label, value: string }` |
| `SECRETS_CREATE` | `{ label, value }` | `{ id, label }` |
| `SECRETS_UPDATE` | `{ id, label?, value? }` | `{ id, label }` |
| `SECRETS_DELETE` | `{ id }` | — |

**Sync (Side Panel → Service Worker):**

| type | payload | response data |
|---|---|---|
| `SYNC_PUSH` | — | `{ syncedAt: string }` |
| `SYNC_PULL` | — | `{ syncedAt: string }` |
| `SYNC_STATUS` | — | `{ connected: boolean, lastSync?: string }` |

---

## 6. Google Drive Sync

**Authentication:** OAuth 2.0 via `chrome.identity.launchWebAuthFlow`. Scope: `drive.appdata` only. Token in `chrome.storage.session`.

**Push (local → Drive):**
1. Service worker requests full DB export from offscreen document
2. Serialises to JSON, encrypts entire blob with AES-256-GCM
3. Uploads to Drive `appDataFolder` as `keyvault-backup.json` (overwrites)
4. Stores `{ syncedAt, fileId }` in `chrome.storage.local`

**Pull (Drive → local):**
1. Service worker fetches `keyvault-backup.json`
2. Decrypts — abort with error if decryption fails
3. Sends decrypted rows to offscreen document via `DB_IMPORT`
4. Merge by `updated_at`: newer record wins; no deletions propagated
5. Returns summary to side panel: "N notes updated, M secrets added"

**Conflict strategy:** Last-write-wins per row by `updated_at`. Manual sync gives the user full control over when merges happen.

---

## 7. Tech Stack

| Concern | Choice |
|---|---|
| Extension platform | Chrome MV3 |
| UI framework | React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| Local DB | PGlite (PostgreSQL/WASM) |
| Crypto | Web Crypto API (built-in) |
| Drive sync | Google Drive REST API v3 |
| OAuth | `chrome.identity` API |
| Build tool | Vite + `@crxjs/vite-plugin` |

---

## 8. File Structure

```
my-space/
├── manifest.json
├── vite.config.ts
├── src/
│   ├── sidepanel/          # Side Panel React app
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── views/
│   │   │   ├── NotesView.tsx
│   │   │   ├── KeyvaultView.tsx
│   │   │   ├── SyncView.tsx
│   │   │   └── SettingsView.tsx
│   │   └── components/
│   │       ├── IconRail.tsx
│   │       ├── NoteCard.tsx
│   │       ├── SecretCard.tsx
│   │       └── icons/      # Duotone SVG icon components
│   ├── offscreen/          # Offscreen document
│   │   ├── index.html
│   │   ├── main.ts
│   │   ├── db.ts           # PGlite init + queries
│   │   ├── crypto.ts       # AES-256-GCM, PBKDF2
│   │   └── handler.ts      # Message handler
│   ├── service-worker/
│   │   └── index.ts        # Lifecycle + Drive sync
│   └── shared/
│       └── messages.ts     # Message type definitions
└── docs/
    └── superpowers/specs/
        └── 2026-06-09-keyvault-chrome-extension-design.md
```
