# Getting started

This page gets both platforms running from a fresh clone of the repo at `/Users/cuongquachc/Projects/poc/my-space`.

## Chrome extension

### Prerequisites

- Node.js 20+ (the README states 18+ in one place; `package.json` deps require 20+ in practice)
- Chrome 114+ (Side Panel API support)
- A Chrome profile you are willing to load an unpacked extension into

### Install

```bash
cd chrome-extension
npm install
```

### Build and run

```bash
npm run dev      # watch mode — rebuilds dist/ on every file change
```

Then load it into Chrome:

1. Open `chrome://extensions`
2. Toggle **Developer mode** on (top right)
3. Click **Load unpacked** and select `chrome-extension/dist/`
4. Click the My SPACE toolbar icon to open the side panel

After the first load, `npm run dev` will rebuild on save; reload the extension in `chrome://extensions` to pick up changes.

### One-time build

```bash
npm run build    # single production build into dist/
```

### Test

```bash
npm test         # vitest run
```

Tests live in `chrome-extension/tests/` and cover `renderMarkdown`, `parseImport`, `generatePassword`, `nextBilling`, and `crypto`. The test environment is Vitest with jsdom. If your editor shows "Cannot find module" errors on test files, those are false positives from the TS server not resolving Vite path aliases; `npm test` still works.

### Pack and release

```bash
npm run pack             # build + zip → output/my-space-<version>.zip
npm run release:patch    # bump patch, build, zip
npm run release:minor    # bump minor, build, zip
npm run release:major    # bump major, build, zip
```

`scripts/bump.js` keeps `package.json` and `manifest.json` versions in sync and strips the local `"key"` field from the build output. The resulting `output/my-space-<version>.zip` is ready for Chrome Web Store upload.

### First run in the extension

1. Open the side panel. You will land on a vault setup/lock screen.
2. Set a master password. This derives the vault key via PBKDF2 and stores a random 16-byte salt in `chrome.storage.local`.
3. The vault unlocks and the icon rail becomes available. Gated views (Vault, Generator) stay locked until `VAULT_UNLOCK` succeeds.
4. Optional: open Sync and authorise Google Drive to enable push/pull.

## Android app

### Prerequisites

- Android Studio Hedgehog (2023.1.1) or later
- Android SDK with minSdk 26 (Android 8.0) and targetSdk 35 (Android 15)
- JDK 17
- An emulator or device running API 26+

### Open in Android Studio

1. **File → Open** and select the `android/` folder (not the repo root)
2. Let Gradle sync finish
3. Pick a device/emulator and press Run

### Build from the command line

```bash
cd android
./gradlew assembleDebug      # debug APK → app/build/outputs/apk/debug/
./gradlew assembleRelease    # release APK (requires a signing config)
./gradlew bundleRelease      # AAB for Play Store upload
```

### Run on an emulator

A helper script is provided:

```bash
cd android
./run-emulator.sh
```

### First run in the app

1. Launch My SPACE. The splash screen routes into the main pager.
2. Set a vault password. The app creates an AES-GCM key in the Android Keystore under alias `myspace_vault_key`.
3. Optional: open Sync and sign in with Google to enable Drive push/pull. The app uses the same `keyvault-backup.json` file as the extension, so you can pull a backup made on desktop.

### Version catalog

Gradle dependencies are pinned in `android/gradle/libs.versions.toml`. Edit versions there rather than in individual `build.gradle.kts` files.

## Working on both platforms

Because both platforms share the encrypted backup, a typical cross-platform change touches three places:

1. The shared plaintext JSON shape (add a field to notes/secrets/subscriptions).
2. The extension's `chrome-extension/src/offscreen/db.ts` schema and `exportAllRows()` / `importRows()`.
3. The Android `android/app/src/main/java/com/myspace/app/data/AppDatabase.kt` entities plus a new Room migration.

Keep the JSON shape identical on both sides or the receiver will drop unknown fields. See [Patterns and conventions](../how-to-contribute/patterns-and-conventions.md) for the upsert-by-updated-at resolution rule.

## Environment variables

`chrome-extension/.env.example` documents the env vars the build expects. Copy it to `chrome-extension/.env` and fill in the OAuth client id if you are forking the extension with your own Chrome Web Store item. The committed `manifest.json` already contains the project's OAuth client id for local development.
