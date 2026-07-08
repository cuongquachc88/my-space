# My SPACE — Chrome Extension

> A private, offline-first Chrome side panel extension. Notes, secrets, passwords, subscriptions, to-dos, and map pins — all stored locally on your device.

[![Chrome Web Store](https://img.shields.io/badge/Chrome_Web_Store-Install-4285F4?logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/my-space/jepnoaiigfppibgfcjmecfoepjipngjb)
[![Version](https://img.shields.io/badge/version-0.1.5-22c55e)](package.json)
[![MV3](https://img.shields.io/badge/Manifest-V3-orange)](manifest.json)

## Features

| Feature | Description |
|---|---|
| **Notes** | Write notes with Markdown preview and image attachments |
| **Secret Vault** | AES-GCM encrypted passwords, API keys, tokens |
| **Password Generator** | Configurable length and character sets |
| **Subscriptions** | Track billing cycles, monthly spend, renewal alerts, per-month bill override |
| **Reports** | Monthly billing summary across all subscriptions |
| **To-Do Lists** | Task lists with priority, due date, recurrence, and timeline grouping |
| **Map Pins** | Save locations from any map URL into named stacks; add category, priority, star rating, and review notes |
| **Google Drive Sync** | End-to-end encrypted backup — works across devices and Chrome profiles |
| **Idle Lock** | Auto-locks vault after 15 minutes of inactivity |

## Requirements

- Node.js 20+
- Chrome 114+ (for side panel support)

## Getting Started

```bash
npm install
npm run dev       # watch mode — rebuilds on file change
```

Load the extension in Chrome:
1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `dist/` folder

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Watch mode (rebuilds on change) |
| `npm run build` | One-time production build |
| `npm run pack` | Build + zip for Chrome Web Store upload |
| `npm run release:patch` | Bump patch version (0.1.0 → 0.1.1), build, zip |
| `npm run release:minor` | Bump minor version (0.1.0 → 0.2.0), build, zip |
| `npm run release:major` | Bump major version (0.1.0 → 1.0.0), build, zip |
| `npm test` | Run test suite |

## Architecture

```
src/
├── service-worker/   # Background: Drive sync, OAuth, message routing
├── offscreen/        # PGlite (Postgres WASM) + AES-GCM crypto — isolated context
│   ├── db.ts         # All SQL: notes, secrets, subscriptions, todos, map pins
│   ├── crypto.ts     # PBKDF2 key derivation, AES-GCM encrypt/decrypt
│   └── handler.ts    # Message dispatcher for offscreen messages
├── sidepanel/        # React UI
│   ├── views/        # NotesView, KeyvaultView, SubscriptionsView, ReportsView,
│   │                 # TodoView, MapPinsView, SyncView, GeneratorView
│   └── components/   # IconRail, IconPicker (pixel-art), icons/
├── content/          # Content script: map URL coordinate extraction
├── shared/           # Message types shared across contexts
└── lib/              # Utilities: currency, billing, markdown, password gen, share links
```

### Data storage

- **Database**: PGlite (Postgres in WASM) persisted to IndexedDB via `IdbFs`
- **Secrets**: AES-GCM 256-bit, key derived with PBKDF2 (100k iterations, SHA-256) from vault password + random salt
- **Images**: Stored as base64 data URLs directly in the `notes.image_data` column — included in Drive backups automatically
- **Drive backup**: Entire DB exported as JSON, encrypted with vault key, then uploaded to Drive's private `appDataFolder`

### Cross-device sync

Backups are self-contained: the push step includes the vault's PBKDF2 salt alongside the ciphertext. On a different device/Chrome profile, the pull step detects a salt mismatch and prompts for the vault password to re-derive the correct key, then imports and updates the local salt.

### Map Pins

Paste any map URL (Google Maps, OpenStreetMap, Bing Maps, Apple Maps) into the manual entry field — coordinates are auto-parsed. Pins are organised into named, colour-coded stacks. Each stack can be shared via a compressed share link.

### To-Do Lists

Tasks support priority (low / medium / high), due date, recurrence (daily / weekly / monthly), and a freeform note. The task screen groups by date with an overdue/today timeline view.

## Release

```bash
npm run release:patch   # or release:minor / release:major
```

This bumps the version in both `package.json` and `manifest.json`, builds, and produces `output/my-space-<version>.zip` ready for upload to the Chrome Web Store.

## Privacy

All data stays on your device. No analytics, no telemetry, no external servers. See [docs/privacy-policy.md](docs/privacy-policy.md).
