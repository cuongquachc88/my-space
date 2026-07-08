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
│   ├── db.ts             # PGlite schema + CRUD for all tables
│   └── crypto.ts         # AES-GCM encrypt/decrypt via Web Crypto API
├── sidepanel/
│   ├── App.tsx           # Root — icon rail, view routing, idle lock
│   ├── views/
│   │   ├── NotesView.tsx
│   │   ├── KeyvaultView.tsx
│   │   ├── GeneratorView.tsx
│   │   ├── SubscriptionsView.tsx
│   │   ├── SyncView.tsx
│   │   └── SettingsView.tsx
│   ├── components/
│   │   ├── IconRail.tsx
│   │   └── icons/index.tsx
│   └── index.css         # Tailwind + glass-card design tokens
├── lib/
│   ├── renderMarkdown.ts # Markdown → HTML with XSS sanitisation
│   ├── generatePassword.ts
│   ├── parseImport.ts    # 1Password / Bitwarden / generic CSV parser
│   └── nextBilling.ts    # Next billing date calculator
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

Tables: `notes`, `secrets`, `subscriptions`

All CRUD functions are in `db.ts` and called from `handler.ts`. The vault (secrets table) is only accessible after `VAULT_UNLOCK` sets the encryption key in memory.

## Crypto

`src/offscreen/crypto.ts` wraps the Web Crypto API:

- **Vault encryption**: AES-GCM, key derived from passphrase via PBKDF2
- **Sync encryption**: AES-GCM with a per-export random IV, key derived from the vault key

The vault key is held in memory in the offscreen document only. It is never written to storage. Locking the vault clears it.

## Google Drive Sync

Handled entirely in `src/service-worker/index.ts`.

Two OAuth flows are supported:

| Flow | When | How |
|---|---|---|
| **Implicit** | Chrome Extension client (no secret) | `response_type=token`, access token stored in session storage |
| **Code** | Desktop app client (with secret) | `response_type=code`, exchanges for refresh token, stored in local storage |

`getAccessToken()` checks session storage first, then refreshes automatically (refresh token grant or silent implicit re-auth with `prompt=none`).

Push flow: `DB_EXPORT` → encrypt → upload to Drive appData  
Pull flow: download from Drive → decrypt → `DB_IMPORT`

## Design System

Glass-card dark UI. Key CSS variables in `src/sidepanel/index.css`:

```css
--bg-base: #0d1117
--glass-bg: rgba(255,255,255,0.06)
--glass-border: rgba(255,255,255,0.08)
--accent-notes: #6366f1
--accent-vault: #f59e0b
--accent-sync: #3b82f6
```

Use `glass-card` class for cards. Tailwind v4 is available for layout and spacing.

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
