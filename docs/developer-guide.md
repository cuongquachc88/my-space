# Developer Guide

## Architecture

My SPACE is a Chrome MV3 extension with three execution contexts:

```
┌─────────────────────────────────────────────────────────┐
│  Side Panel  (React UI)                                  │
│  src/sidepanel/                                          │
│  Renders views, sends messages to service worker         │
└────────────────────────┬────────────────────────────────┘
                         │ chrome.runtime.sendMessage
┌────────────────────────▼────────────────────────────────┐
│  Service Worker  (message router + OAuth)                │
│  src/service-worker/index.ts                             │
│  Routes DB messages to offscreen, handles sync/OAuth     │
└────────────────────────┬────────────────────────────────┘
                         │ chrome.runtime.sendMessage
┌────────────────────────▼────────────────────────────────┐
│  Offscreen Document  (database host)                     │
│  src/offscreen/                                          │
│  Runs PGlite (PostgreSQL WASM), handles crypto           │
└─────────────────────────────────────────────────────────┘
```

The offscreen document is needed because Chrome service workers cannot run WebAssembly (PGlite). The service worker creates the offscreen document on demand and proxies database messages to it.

## Project Structure

```
src/
├── service-worker/
│   └── index.ts          # Message router, OAuth flows, Drive sync
├── offscreen/
│   ├── main.ts           # Offscreen entry — wires chrome.runtime.onMessage
│   ├── handler.ts        # Dispatches messages to db.ts / crypto.ts
│   ├── db.ts             # PGlite schema + CRUD for all 8 tables
│   ├── crypto.ts         # AES-GCM encrypt/decrypt via Web Crypto API
│   └── polyfill.ts       # WASM/PGlite environment polyfills
├── sidepanel/
│   ├── App.tsx           # Root — icon rail, view routing, idle lock, setup/lock screens
│   ├── views/
│   │   ├── NotesView.tsx         # Markdown notes with tags, images, search
│   │   ├── KeyvaultView.tsx      # Encrypted secrets with tag grouping
│   │   ├── GeneratorView.tsx     # Password generator with strength meter
│   │   ├── SubscriptionsView.tsx # Subscription tracker with renewal alerts
│   │   ├── ReportsView.tsx       # Monthly reports, bills, 6-month bar chart
│   │   ├── TodoView.tsx          # Task lists with priority, due dates, recurrence
│   │   ├── MapPinsView.tsx       # Location pins with auto-extract, share links
│   │   ├── SyncView.tsx          # Google Drive sync with animated progress
│   │   └── SettingsView.tsx      # Change password, auto-lock, import
│   ├── components/
│   │   ├── IconRail.tsx          # Vertical navigation rail
│   │   ├── NoteCard.tsx          # Note list item
│   │   ├── SecretCard.tsx        # Secret with reveal/copy/auto-hide
│   │   ├── TagInput.tsx          # Tag chip input
│   │   ├── IconPicker.tsx        # Pixel icon selector for lists/stacks
│   │   └── icons/index.tsx       # SVG icon components
│   └── index.css         # Tailwind + glass-card design tokens
├── content/
│   ├── mapExtractor.ts   # Content script — floating Pin button on map pages (extracts lat/lng + URL)
│   └── savePrompt.ts     # Content script — "Save to My SPACE?" badge on login forms across the web
├── lib/
│   ├── renderMarkdown.ts # Markdown → HTML with XSS sanitisation
│   ├── generatePassword.ts  # Crypto-random password generator
│   ├── parseImport.ts    # 1Password / Bitwarden / generic CSV parser
│   ├── nextBilling.ts    # Next billing date calculator
│   ├── currency.ts       # Multi-currency USD conversion rates
│   └── shareLink.ts      # LZ-compressed share link encode/decode
└── shared/
    └── messages.ts       # All message type definitions (AnyMsg union)
```

## Message Protocol

All communication uses `chrome.runtime.sendMessage`. Every message has a `type` string and optional `payload`. Every response has `{ ok: boolean, data?, error? }`.

Types are defined in `src/shared/messages.ts`. Adding a new message:

1. Add `Msg<'MY_TYPE', PayloadType>` to `messages.ts` and include it in the `AnyMsg` union
2. Handle it in `src/offscreen/handler.ts` (for DB operations) or `src/service-worker/index.ts` (for everything else)
3. Call it from the side panel via the `sendMsg` prop

```ts
// In a view component
const res = await sendMsg('MY_TYPE', { foo: 'bar' })
if (res.ok) console.log(res.data)
```

## Database

PGlite runs inside the offscreen document. Schema is initialised in `src/offscreen/db.ts` → `initDb()`.

Eight tables:

| Table | Purpose |
|---|---|
| `notes` | Markdown notes with tags and embedded images (base64 data URLs) |
| `secrets` | AES-GCM encrypted credentials (ciphertext + IV stored, value never plaintext) plus `url` and `description` columns for the save-password matcher and human context |
| `subscriptions` | Recurring billing tracker with currency, cycle, active toggle, logo |
| `bills` | Actual paid bills per subscription per month (composite PK: sub_id, year, month) |
| `todo_lists` | Colour-coded, icon-tagged task lists |
| `todo_tasks` | Tasks with priority, due date, recurrence (FK to todo_lists, CASCADE delete) |
| `map_stacks` | Colour-coded, icon-tagged pin collections |
| `map_pins` | Location pins with lat/lng, category, priority, rating, review (FK to map_stacks, CASCADE delete) |

All CRUD functions are in `db.ts` and called from `handler.ts`. The vault (secrets table) is only accessible after `VAULT_UNLOCK` sets the encryption key in memory.

The `exportAllRows()` function serialises all 8 tables for sync, and `importRows()` performs upsert-by-updated_at conflict resolution (last-write-wins for notes/secrets/subs/tasks, first-write-wins for stacks/pins).

## Content Scripts

My SPACE ships two content scripts that live in `src/content/` and are registered in `manifest.json`:

### 1. `mapExtractor.ts` — floating Pin button on map pages

Matches: `google.com/maps`, `maps.google.com`, `openstreetmap.org`, `bing.com/maps`, `maps.apple.com`.

Flow:

1. On load, scans the URL for lat/lng patterns (`/@lat,lng`, `ll=lat,lng`, `map=zoom/lat/lng`, `cp=lat~lng`, `!3dlat!4dlng`, `lat=…&lng=…`).
2. If coords are found, injects a floating "Pin to My SPACE" button at `bottom: 220px right: 16px` (above the Google Maps zoom / locate / pegman controls).
3. A small "×" collapse button next to it shrinks the badge to an icon-only state.
4. On click, the button sends `{ type: 'MAP_PIN_CAPTURE', payload: ExtractedPin }` to the service worker.
5. The service worker forwards `{ type: 'MAP_PIN_FROM_PAGE', payload }` to the side panel.
6. `MapPinsView` listens for `MAP_PIN_FROM_PAGE` — when received, it sets `pendingPin` and `addMode='page'` so the confirm form is pre-filled with the captured coords + page title.

A `MutationObserver` re-scans the URL on SPA navigation (Google Maps pushes new coordinates as the user pans without a full reload).

### 2. `savePrompt.ts` — Save Password badge on login forms

The script wants to run on every login form on the web, which would normally trigger Chrome Web Store's "Broad Host Permissions" review. We avoid that by registering the script **dynamically** with `chrome.scripting.registerContentScripts` only after the user opts in.

- The bundle path `savePrompt.js` is generated by Vite with a non-hashed filename (see `vite.config.ts > build.rolldownOptions.output.entryFileNames`) and listed in `web_accessible_resources` so `chrome.scripting.registerContentScripts` can reference it.
- `<all_urls>` is declared under `optional_host_permissions`, not `host_permissions` — the extension ships with zero broad host grants.
- The Settings view shows a "Save Password Prompt" card. Clicking the orange button calls the service worker:
  - `SAVE_PROMPT_STATUS` — returns `{ enabled }` from `chrome.permissions.contains({ origins: ['<all_urls>'] })`
  - `SAVE_PROMPT_ENABLE` — `chrome.permissions.request({ origins: ['<all_urls>'] })` → on grant, `registerSavePromptScript()` (using `matches: ['<all_urls>']` and `excludeMatches` for map domains + localhost)
  - `SAVE_PROMPT_DISABLE` — `unregisterContentScripts` then `chrome.permissions.remove({ origins: ['<all_urls>'] })`
- On `chrome.runtime.onStartup` and `chrome.runtime.onInstalled`, the service worker re-checks `chrome.permissions.contains` and re-registers the script if the user previously granted, so the feature survives upgrades.

Matches when registered: `<all_urls>` (excluding the map domains listed above plus localhost).

Flow:

1. Scans the page for `<input type="password">` fields. For each, looks for a matching username field (heuristics: `type=email|tel|text`, `autocomplete=username|email`, `id|name|placeholder` matching `/email|user|login|account|signin/`).
2. Listens for `input` events on both fields (debounced 500 ms).
3. When both fields have non-empty values (password ≥ 4 chars), shows a floating orange "Save to My SPACE?" badge beside the password field.
4. On click, captures `{ url, username, password, formAction? }` and sends `{ type: 'SAVE_PASSWORD_OFFER', payload }` to the service worker.
5. The service worker forwards `{ type: 'SAVE_PASSWORD_OFFER_FROM_PAGE', payload }` to the side panel.
6. `KeyvaultView` listens for this message — when received, it renders a confirm card at the top with label (default = hostname), URL, tags, and description fields pre-filled. The user can edit these and click "Save to Vault" → `SECRETS_CREATE` is called.

Security: the password is sent in-process only (service-worker → side-panel is local). It is never written to storage until the user explicitly confirms. If the side panel is closed, the badge shows "Open My SPACE first" and the user clicks the extension icon. The badge collapses (×) and the prompt is dismissed silently when the user is not interested.

A 1.5 s scan interval re-attaches the badge for SPAs that mount forms after page load.

### Adding a new content script

1. Drop the script in `src/content/<name>.ts`. It must be self-contained (no sidepanel imports).
2. Add an entry in `manifest.json > content_scripts` with `matches`, optional `exclude_matches`, and `run_at`.
3. If it needs to talk to the side panel, use the same pattern: send to service worker, forward as `*_FROM_PAGE` to the side panel, listen in the relevant view.
4. Always clean up on `beforeunload` and disconnect any long-lived observers.

## Crypto

`src/offscreen/crypto.ts` wraps the Web Crypto API:

- **Vault encryption**: AES-GCM 256-bit, key derived from passphrase via PBKDF2 (600,000 iterations, SHA-256)
- **Sync encryption**: AES-GCM with a per-export random 12-byte IV, using the same vault key
- **Cross-device decrypt**: `SYNC_DECRYPT_WITH_SALT` re-derives a temporary key from the backup's salt + user password (never cached)
- **Salt storage**: 16-byte random salt stored in `chrome.storage.local` as `vaultSalt`, included in backup payload

The vault key is held in memory in the offscreen document only. It is never written to storage. Locking the vault clears it. An auto-lock timer (default 15 min, configurable in Settings) clears the key after inactivity.

## Google Drive Sync

Handled entirely in `src/service-worker/index.ts`.

OAuth uses `chrome.identity.getAuthToken` with three scopes: `drive.appdata`, `userinfo.email`, `userinfo.profile`. The user's Google avatar and email are fetched and displayed in the Sync view.

Push flow: `DB_EXPORT` → encrypt → upload to Drive `appDataFolder` (file: `keyvault-backup.json`)
Pull flow: download from Drive → decrypt → `DB_IMPORT`

Cross-device pull: if the backup's salt differs from the local salt (different device/profile), the user is prompted for their master password. `SYNC_DECRYPT_WITH_SALT` re-derives the key using the backup's salt, decrypts, then imports. The local vault key is not affected.

Token refresh: on 401 responses, the cached token is cleared and a fresh silent token is fetched automatically.

## Design System

Glass-card dark UI. Key CSS variables in `src/sidepanel/index.css`:

```css
--bg-base: #0d1117
--glass-bg: rgba(255,255,255,0.06)
--glass-border: rgba(255,255,255,0.08)
--accent-notes: #6366f1   (indigo)
--accent-vault: #f59e0b   (amber)
--accent-sync: #3b82f6    (blue)
--accent-gen: #a78bfa     (violet)
--accent-subs: #34d399    (emerald)
--accent-reports: #f472b6 (pink)
--accent-todo: #38bdf8    (sky)
--accent-maps: #fb923c    (orange)
```

Use `glass-card` class for cards. Tailwind v4 is available for layout and spacing.

## Android App

The `android/` directory contains a Kotlin + Jetpack Compose app that mirrors the Chrome extension's feature set.

| Layer | Technology |
|---|---|
| UI | Jetpack Compose + Material3, HorizontalPager navigation |
| Database | Room (SQLite), 8 entities, 6 migrations (v1→v7) |
| Crypto | Android Keystore AES-GCM (hardware-backed) |
| Sync | Google Drive REST API via OkHttp + OAuth implicit flow |
| Images | Coil async image loading |

Key files:
- `crypto/CryptoManager.kt` — Keystore-backed AES-GCM encrypt/decrypt
- `data/AppDatabase.kt` — Room database with all entities, DAOs, and migrations
- `sync/DriveRepository.kt` — Drive push/pull with multipart upload
- `ui/MySpaceApp.kt` — Root composable with pager navigation and accent glows
- `ui/screens/` — 8 screen composables (Notes, Vault, Generator, Subs, Todo, MapPins, Sync, Reports, Splash)
- `ui/theme/Theme.kt` — Dark colour scheme with per-feature accent colours
- `util/BillingCalc.kt` — Monthly equivalent USD conversion and chart data builder

The Android app syncs with the Chrome extension using the same Drive `appDataFolder` file (`keyvault-backup.json`). Cross-platform sync currently transfers notes, secrets, and subscriptions (Todo, Map Pins, and Bills sync are not yet in the Android `DriveExport`).

## Testing

```bash
npm test
```

Tests live in `tests/`. Currently covers `renderMarkdown`, `parseImport`, `generatePassword`, `nextBilling`, and `crypto`.

The test environment is Vitest with jsdom. `Cannot find module` errors in your editor for test files are false positives — the TS server doesn't resolve the Vite path aliases, but `npm test` works correctly.

## Adding a New View

1. Create `src/sidepanel/views/MyView.tsx` — accept `{ sendMsg }` as props
2. Add an icon to `src/sidepanel/components/icons/index.tsx`
3. Add the view name to the `View` type in `App.tsx` and add it to the icon rail in `IconRail.tsx`
4. Import and render it in `App.tsx` (add to the `GATED_VIEWS` set if it requires vault unlock)
5. Add message types to `src/shared/messages.ts` and handle in `handler.ts`

## Versioning & Release

Version is kept in sync between `package.json` and `manifest.json` via `scripts/bump.js`.

```bash
npm run release:patch   # bump + build + zip
```

The zip file is named `my-space-<version>.zip` and is ready for Chrome Web Store upload. The `"key"` field in `manifest.json` is for local dev only (stable extension ID) and is stripped from the build output automatically by the pack script.
