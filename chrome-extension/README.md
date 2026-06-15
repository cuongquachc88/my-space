# My SPACE — Chrome Extension

> A private, offline-first Chrome side panel extension. Notes, secrets, passwords, and subscriptions — all encrypted on your device.

[![Chrome Web Store](https://img.shields.io/badge/Chrome_Web_Store-Install-4285F4?logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/my-space/jepnoaiigfppibgfcjmecfoepjipngjb)
[![Version](https://img.shields.io/badge/version-0.1.3-22c55e)](package.json)
[![MV3](https://img.shields.io/badge/Manifest-V3-orange)](manifest.json)

## Features

| Feature | Description |
|---|---|
| **Notes** | Write notes with Markdown preview |
| **Secret Vault** | AES-GCM encrypted passwords, API keys, tokens |
| **Password Generator** | Configurable length and character sets |
| **Import** | 1Password CSV, Bitwarden JSON, generic CSV |
| **Subscriptions** | Track billing cycles, spend summary, renewal alerts |
| **Google Drive Sync** | Encrypted backup to Drive's private appData folder |
| **Idle Lock** | Auto-locks vault after configurable inactivity |

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

## Release

```bash
npm run release:patch   # or release:minor / release:major
```

This bumps the version in both `package.json` and `manifest.json`, builds, and produces `my-space-<version>.zip` ready for upload to the Chrome Web Store.

## Privacy

All data stays on your device. No analytics, no telemetry, no external servers. See [docs/privacy-policy.md](docs/privacy-policy.md).
