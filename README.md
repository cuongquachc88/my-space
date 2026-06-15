# My SPACE

> Private, offline-first vault for notes, secrets, passwords, and subscriptions. No servers. No analytics. Your data stays on your device.

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/my-space/jepnoaiigfppibgfcjmecfoepjipngjb)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.3-green.svg)](chrome-extension/package.json)

---

## Features

| Feature | Description |
|---|---|
| 📝 **Notes** | Markdown notes with tag filtering and full-text search |
| 🔐 **Secret Vault** | AES-GCM encrypted credentials — unlocked with your master password |
| 🔑 **Password Generator** | Configurable length, charset, one-click copy |
| 💳 **Subscriptions** | Track recurring costs with multi-currency conversion |
| ☁️ **Google Drive Sync** | End-to-end encrypted push/pull via Drive appDataFolder |
| 📥 **Import** | 1Password and Bitwarden CSV import |

---

## Repository Structure

```
my-space/
├── chrome-extension/     Chrome MV3 side panel extension
│   ├── src/
│   │   ├── sidepanel/    React UI (views + components)
│   │   ├── offscreen/    PGlite WASM database + crypto host
│   │   ├── service-worker/  OAuth + Drive sync + message router
│   │   ├── shared/       Message type definitions
│   │   └── lib/          Password generator, billing, markdown, import parser
│   ├── public/           Extension icons
│   ├── scripts/          Version bump script
│   └── output/           Packed .zip files (gitignored)
│
├── android/              Android app (Kotlin + Jetpack Compose)
│   └── app/src/main/
│       ├── java/com/myspace/app/
│       │   ├── crypto/   Android Keystore AES-GCM
│       │   ├── data/     Room database (notes, secrets, subscriptions)
│       │   ├── sync/     Google Drive REST sync
│       │   └── ui/       Jetpack Compose screens
│       └── res/
│
└── docs/                 GitHub Pages landing page
    ├── index.html
    ├── privacy-policy.md
    └── terms-of-service.md
```

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
