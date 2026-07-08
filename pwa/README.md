# My SPACE — PWA

Privacy-first encrypted vault. One codebase, three targets:

| Target | Command | Notes |
|---|---|---|
| **Web** (PWA) | `npm run dev` / `npm run build` | Works in any modern browser, installable |
| **Android** | `npm run cap:android` | Opens Android Studio — requires Android SDK |
| **iOS** | `npm run cap:ios` | Opens Xcode — requires macOS + Xcode + CocoaPods |

## Quick start

```bash
cd pwa
npm install
npm run dev          # dev server at localhost:5173
```

## Build for Android

```bash
npm run cap:android  # builds PWA → syncs to android/ → opens Android Studio
```

Then in Android Studio: Run → select device.

## Build for iOS

Prerequisites:
```bash
brew install cocoapods
# Install Xcode from the App Store
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

Then:
```bash
npm run cap:ios      # builds PWA → syncs to ios/ → opens Xcode
```

## Environment

Copy `.env.example` to `.env` and fill in:

```
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

Required only for Google Drive Sync. All other features work without it.

## Architecture

```
src/
├── crypto/         AES-GCM 256-bit + PBKDF2 600k iterations
├── db/             PGlite (WASM Postgres) — offline-first, no server
├── lib/            Pure utilities: currency, markdown, password gen, safeHtml
├── landing/        Public landing page
└── app/
    ├── AppShell.tsx  Sidebar nav ≥768px · bottom nav on mobile
    ├── components/   TagInput
    └── views/        Notes · Vault · Todo · Subs · Maps · Generator
                      Reports · Sync · Settings
```

## Platforms

- **Web** — `dist/` served as PWA with service worker + offline cache
- **Android** — Capacitor wraps `dist/` in `android/` (Gradle project, `com.myspace.app`)
- **iOS** — Capacitor wraps `dist/` in `ios/` (Xcode project, `com.myspace.app`)

Data never leaves the device. Drive Sync encrypts locally before upload.
