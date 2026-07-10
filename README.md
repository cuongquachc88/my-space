# My SPACE

> Private, offline-first vault for notes, secrets, passwords, and subscriptions. No servers. No analytics. Your data stays on your device.

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/my-space/jepnoaiigfppibgfcjmecfoepjipngjb)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.3.2-green.svg)](chrome-extension/package.json)

---

## Features

| Feature | Description |
|---|---|
| 📝 **Notes** | Markdown notes with tag filtering, image attachments, and full-text search |
| 🔐 **Secret Vault** | AES-GCM encrypted credentials, unlocked with your master password (PBKDF2, 600k iterations) |
| 🔐 **URL + Description on Secrets** | Each secret can carry its origin URL and a free-form note (for the autofill matcher and human context) |
| ✏️ **Inline Edit Vault Items** | Edit label, value, URL and description directly from each secret card without retyping |
| 💾 **Save Password Prompt** | Floating "Save to My SPACE?" badge appears on login forms across the web — one click sends credentials to the side panel for review and save |
| 🔑 **Password Generator** | Crypto-random passwords with strength meter, configurable length and charset |
| 💳 **Subscriptions** | Track recurring costs with multi-currency conversion and renewal date alerts |
| 📊 **Reports & Bills** | Monthly spending reports with 6-month bar chart, actual vs expected, receipt images |
| ✅ **To-Do Lists** | Colour-coded lists with priority, due dates, recurrence, and timeline grouping |
| 📍 **Map Pins** | Save locations from any map URL (Google, OSM, Bing, Apple), share stacks via compressed links |
| 📍 **Pin Button on Map Pages** | Floating "Pin to My SPACE" button on Google Maps, OSM, Bing and Apple Maps — click to capture current coordinates into the active map stack |
| ☁️ **Google Drive Sync** | End-to-end encrypted push/pull via Drive appDataFolder, cross-device password prompt |
| 📥 **Import** | 1Password and Bitwarden CSV/JSON import |

---

## Repository Structure

```
my-space/
├── pwa/                  PWA + Capacitor mobile app (main codebase)
│   ├── src/
│   │   ├── app/          AppShell, NavRail, NavPill, views (mobile + desktop)
│   │   ├── crypto/       AES-GCM-256 + PBKDF2 encryption
│   │   ├── db/           PGlite WASM PostgreSQL (offline-first)
│   │   ├── design/       Glass UI components, icons, tokens
│   │   ├── lib/          Password gen, billing, markdown, currency
│   │   └── services/     Google Drive sync service
│   ├── public/           Static assets (favicon, oauth-callback.html)
│   ├── ios/              Xcode project (Capacitor)
│   ├── android/          Android Studio project (Capacitor)
│   └── tests/            Unit tests (Vitest) + E2E (Playwright)
│
├── chrome-extension/     Chrome MV3 side panel extension
│   ├── src/
│   │   ├── sidepanel/    React UI (9 views + 6 components)
│   │   ├── offscreen/    PGlite WASM database + crypto host
│   │   ├── service-worker/  OAuth + Drive sync + message router
│   │   ├── content/      Map page coordinate extractor
│   │   ├── shared/       Message type definitions
│   │   └── lib/          Password gen, billing, markdown, import, currency, share links
│   ├── public/           Extension icons
│   ├── scripts/          Version bump script
│   └── output/           Packed .zip files (gitignored)
│
└── docs/                 GitHub Pages landing page
    ├── index.html        Landing page
    ├── privacy-policy.html
    └── terms-of-service.html
```

---

## PWA + Mobile App (`/pwa`)

The primary codebase — a React PWA that runs in the browser and is packaged as a native iOS/Android app via Capacitor.

### Prerequisites
- Node.js 18+
- For iOS: macOS + Xcode + CocoaPods
- For Android: Android Studio + Android SDK + JDK 17

### Setup

```bash
cd pwa
npm install
cp .env.example .env.local
# Edit .env.local — set VITE_GOOGLE_CLIENT_ID (required for Google Drive sync)
```

### Development

```bash
npm run dev          # Vite dev server at http://localhost:5173
npm run build        # Production build → dist/
npm run preview      # Serve dist/ locally
```

### Testing

```bash
npm test             # Unit tests (Vitest) — 125 tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
npm run test:e2e     # E2E tests (Playwright)
```

### Deploy to Cloudflare Pages

```
Root directory:        pwa
Build command:         npm run build
Build output directory: dist
Environment variables: VITE_GOOGLE_CLIENT_ID=<your-client-id>
```

### Mobile (Capacitor)

```bash
npm run cap:sync     # Build PWA + sync to iOS/Android
npm run cap:ios      # Open Xcode
npm run cap:android  # Open Android Studio
```

**App ID:** `com.myspace.app`

**OAuth Deep Link:** `com.myspace.app:/oauth-callback`

### Architecture

| Layer | Technology |
|---|---|
| UI | React 19 + inline styles (glassmorphism) |
| Database | PGlite (PostgreSQL in WASM) → IndexedDB |
| Crypto | Web Crypto API — AES-GCM-256, PBKDF2 600k iterations |
| Mobile | Capacitor 7 (iOS + Android) |
| Sync | Google Drive REST API (`drive.appdata` scope) |
| Build | Vite 6 + TypeScript + Tailwind 4 |
| PWA | vite-plugin-pwa + Workbox (15MB cache) |

**Desktop vs Mobile:** At ≥640px, each view renders a completely separate desktop dashboard component with sidebar navigation. Mobile keeps the bottom nav + bottom sheet layout.

---

## Chrome Extension

### Prerequisites
- Node.js 18+
- Chrome 114+ (Side Panel API)

### Development

```bash
cd chrome-extension
npm install
npm run dev          # watch mode — reload unpacked extension in Chrome
```

### Build & Pack

```bash
npm run build        # output to dist/
npm run pack         # build + zip → output/my-space-x.x.x.zip
```

### Release

```bash
npm run release:patch   # bump patch, build, zip
npm run release:minor   # bump minor, build, zip
npm run release:major   # bump major, build, zip
```

### Load as Unpacked Extension

1. Run `npm run build`
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** → select `chrome-extension/dist/`

### Architecture

```
Side Panel (React)
    ↕ chrome.runtime.sendMessage
Service Worker
    ↕ chrome.runtime.sendMessage
Offscreen Document (PGlite WASM + Web Crypto)
```

The offscreen document runs PGlite (PostgreSQL in WASM) and all crypto operations. The service worker handles OAuth via `chrome.identity.getAuthToken` and Google Drive REST calls. The side panel is a React app communicating via message passing.

---

## Android

### Prerequisites
- Android Studio Hedgehog or later
- Android SDK 26+ (minSdk)
- JDK 17

### Open in Android Studio

1. Open Android Studio
2. **File → Open** → select the `android/` folder
3. Let Gradle sync
4. Run on device or emulator (API 26+)

### Tech Stack

| Layer | Technology |
|---|---|
| UI | Jetpack Compose + Material3 |
| Database | Room (SQLite) |
| Crypto | Android Keystore AES-GCM |
| Sync | Drive REST API + Retrofit |
| Navigation | Navigation Compose |

### Sync with Chrome Extension

The Android app uses the same Drive `appDataFolder` file (`keyvault-backup.json`) and the same JSON format as the Chrome extension. Data encrypted on one platform can be decrypted on the other as long as you use the same vault key.

> ⚠️ The encryption keys are platform-local (Android Keystore vs Web Crypto). Cross-platform sync currently transfers data in decrypted form within the app — re-encrypted with the local platform key on import.

---

## Privacy

- **No servers** — all data stored locally (IndexedDB on Chrome, Room on Android)
- **No analytics** — no tracking, no telemetry
- **No plaintext secrets ever leave your device** — AES-GCM encrypted before Drive upload
- Google Drive sync uses the private `appDataFolder` — not visible in your Drive UI

See [Privacy Policy](docs/privacy-policy.md) and [Terms of Service](docs/terms-of-service.md).

---

## License

ISC © [cuongquachc88](https://github.com/cuongquachc88)
