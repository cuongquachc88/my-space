# My SPACE

> Private, offline-first vault for notes, secrets, passwords, subscriptions, to-dos, and map pins. No servers. No analytics. Your data stays on your device.

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/my-space/jepnoaiigfppibgfcjmecfoepjipngjb)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

---

## Features

| Feature | Description |
|---|---|
| **Notes** | Markdown notes with tag filtering, image attachments, and full-text search |
| **Secret Vault** | AES-GCM encrypted credentials, unlocked with your master password (PBKDF2, 600 000 iterations) |
| **URL + Description on Secrets** | Each secret carries its origin URL and a free-form note |
| **Inline Edit Vault Items** | Edit label, value, URL and description directly from each secret card |
| **Save Password Prompt** | Floating "Save to My SPACE?" badge on login forms (extension only) |
| **Password Generator** | Crypto-random passwords with configurable length and charset |
| **Subscriptions** | Track recurring costs with multi-currency conversion and renewal date alerts |
| **Reports & Bills** | Monthly spending reports with 6-month summary, actual vs expected |
| **To-Do Lists** | Colour-coded lists with priority, due dates, recurrence, and timeline grouping |
| **Map Pins** | Save locations from any map URL (Google, OSM, Bing, Apple) into named stacks |
| **QR Scan** | Scan a shared map-stack QR code (Android) to import pins instantly |
| **Google Drive Sync** | End-to-end encrypted push/pull via Drive `appDataFolder` — same backup works on both platforms |

---

## Repository Structure

```
my-space/
├── extension/              Chrome MV3 side panel extension (primary shipped product)
│   ├── src/
│   │   ├── sidepanel/      React UI — 9 views + 6 components
│   │   ├── offscreen/      PGlite WASM database + AES-GCM crypto host
│   │   ├── service-worker/ OAuth, Drive sync, message router
│   │   ├── content/        Map URL extractor + save-password badge
│   │   ├── shared/         Message type definitions (single source of truth for all data models)
│   │   └── lib/            Password gen, billing, markdown, import, currency, share links
│   ├── public/             Extension icons
│   ├── scripts/            Version bump script
│   └── output/             Packed .zip files (gitignored)
│
├── android/                Native Android app (Kotlin + Jetpack Compose)
│   └── app/src/main/java/com/myspace/app/
│       ├── crypto/         VaultCrypto — PBKDF2 + AES-GCM matching extension crypto exactly
│       ├── data/
│       │   ├── entity/     Room entities mirroring extension DB schema 1:1
│       │   ├── dao/        DAOs for all 8 tables
│       │   └── AppDatabase.kt
│       ├── di/             Hilt modules (DB, DataStore)
│       ├── ui/
│       │   ├── screen/     One screen per feature (Unlock, Notes, Keyvault, Generator,
│       │   │               Subscriptions, Reports, Todos, MapPins, QrScanner, Sync, Settings)
│       │   ├── viewmodel/  One ViewModel per screen
│       │   ├── navigation/ Sealed Screen routes
│       │   └── theme/      Dark glassmorphism palette matching extension
│       └── util/           MapUrlParser — port of extension mapExtractor.ts
│
└── docs/                   GitHub Pages landing page
    ├── index.html
    ├── privacy-policy.html
    └── terms-of-service.html
```

---

## Chrome Extension

### Prerequisites
- Node.js 20+
- Chrome 114+ (Side Panel API)

### Development

```bash
cd extension
npm install
npm run dev          # watch mode — reload unpacked extension in Chrome
```

### Build & Pack

```bash
npm run build        # output → dist/
npm run pack         # build + zip → output/my-space-x.x.x.zip
```

### Release

```bash
npm run release:patch   # bump patch, build, zip
npm run release:minor   # bump minor, build, zip
npm run release:major   # bump major, build, zip
```

### Load as Unpacked Extension

1. `npm run build`
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** → select `extension/dist/`

### Architecture

```
Side Panel (React)
    ↕ chrome.runtime.sendMessage
Service Worker
    ↕ chrome.runtime.sendMessage
Offscreen Document (PGlite WASM + Web Crypto)
```

| Layer | Technology |
|---|---|
| UI | React 19 + Tailwind 4 + glassmorphism inline styles |
| Database | PGlite (PostgreSQL in WASM) → IndexedDB |
| Crypto | Web Crypto API — AES-GCM-256, PBKDF2 600k iterations |
| Sync | Google Drive REST API (`drive.appdata` scope) |
| Build | Vite 8 + crxjs |

---

## Android App

### Prerequisites
- Android Studio Hedgehog or later
- Android SDK 26+ (minSdk)
- JDK 17

### Open in Android Studio

1. **File → Open** → select the `android/` folder
2. Let Gradle sync
3. Run on device or emulator (API 26+)

### Architecture

| Layer | Technology |
|---|---|
| UI | Jetpack Compose + Material3 (dark glassmorphism) |
| Database | Room (SQLite) — schema mirrors extension 1:1 |
| Crypto | Android Keystore + PBKDF2-SHA256 600k iterations + AES-GCM-256 |
| Navigation | Navigation Compose |
| DI | Hilt |
| QR Scanning | ML Kit Barcode + CameraX |
| Sync | Google Drive REST API (same `appDataFolder` file as extension) |

### Screens

| Screen | Extension equivalent |
|---|---|
| Unlock | Vault unlock prompt |
| Notes | NotesView |
| Note Edit | Note create/edit form |
| Keyvault | KeyvaultView |
| Generator | GeneratorView |
| Subscriptions | SubscriptionsView |
| Reports | ReportsView |
| To-Dos | TodoView (list of lists) |
| Todo Tasks | TodoView (tasks within a list) |
| Map Pins | MapPinsView (list of stacks) |
| Map Pin Stack | MapPinsView (pins within a stack) |
| QR Scanner | — (Android exclusive: scan shared stack QR codes) |
| Sync | SyncView |
| Settings | SettingsView |

### Crypto compatibility

The Android app uses the same encryption scheme as the extension so Drive backups are cross-platform:

- **Key derivation**: PBKDF2-SHA256, 600 000 iterations, 256-bit output — matches extension `crypto.ts`
- **Encryption**: AES-GCM-256, random 12-byte IV, base64-encoded ciphertext and IV — matches extension `encrypt()`/`decrypt()`
- **Cross-platform import**: if the Drive backup was created on the extension with a different password, the pull flow re-derives the key using the provided password + embedded salt, then re-encrypts locally

---

## Google Drive Sync (both platforms)

Both the extension and Android app write to the same Drive `appDataFolder` file (`myspace-backup.json`). The file format is:

```json
{
  "salt": "<base64 16-byte PBKDF2 salt>",
  "iv": "<base64 12-byte AES-GCM IV>",
  "ciphertext": "<base64 AES-GCM ciphertext of the full JSON export>"
}
```

The inner plaintext is a JSON export of all notes, secrets (raw values), subscriptions, bills, todos, and map pins. It is **never** stored in plaintext — only the AES-GCM ciphertext leaves the device.

---

## Privacy

- **No servers** — all data stored locally (IndexedDB on extension, SQLite on Android)
- **No analytics** — no tracking, no telemetry
- **No plaintext secrets ever leave your device** — AES-GCM encrypted before Drive upload
- Google Drive sync uses the private `appDataFolder` — not visible in your Drive UI

---

## License

ISC © [cuongquachc88](https://github.com/cuongquachc88)
