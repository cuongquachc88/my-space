# My SPACE overview

My SPACE is a private, offline-first vault for notes, secrets, passwords, subscriptions, to-dos, and map pins. There are no servers and no analytics. Every byte of your data lives on your device, encrypted at rest, and only leaves it as ciphertext bound for your own Google Drive `appDataFolder`.

The project ships as two platforms that interoperate through that encrypted Drive backup:

- A **Chrome MV3 extension** (React side panel + PGlite WASM + Web Crypto)
- An **Android app** (Kotlin + Jetpack Compose + Room + Android Keystore)

Both read and write the same `keyvault-backup.json` payload, so a note created on desktop lands on your phone and vice versa.

## Who it's for

People who want a single, self-contained place to keep credentials, recurring-cost trackers, notes, and location pins without handing plaintext to a third party. If you already use 1Password or Bitwarden, the extension can import from those CSV/JSON exports. If you do not want sync at all, you can ignore Drive entirely and the app stays a purely local vault.

## Feature set

| Feature | What it does |
|---|---|
| Notes | Markdown notes with tag filtering, full-text search, and embedded base64 images |
| Secret Vault | AES-GCM encrypted credentials unlocked by a master password (PBKDF2 key derivation) |
| Password Generator | Crypto-random passwords with a strength meter and configurable length/charset |
| Subscriptions | Recurring cost tracker with multi-currency USD conversion and renewal alerts |
| Reports & Bills | Monthly spending summary with a 6-month bar chart and per-month bill overrides |
| To-Do Lists | Colour-coded lists with priority, due dates, recurrence, and timeline grouping |
| Map Pins | Save coordinates from any map URL (Google, OSM, Bing, Apple) into named, shareable stacks |
| Google Drive Sync | End-to-end encrypted push/pull via the private `appDataFolder`, cross-device |
| Import | 1Password and Bitwarden CSV/JSON import |

## Repository layout

```
my-space/
├── chrome-extension/     Chrome MV3 side panel extension (React + PGlite)
├── android/              Android app (Kotlin + Jetpack Compose + Room)
├── docs/                 GitHub Pages landing page + privacy/terms/developer guide
├── marketing/            Store listing assets
├── keys/                 Signing key material (not committed secrets)
└── droid-wiki/           This wiki
```

## Quick links

- Source entry points
  - Extension service worker: `chrome-extension/src/service-worker/index.ts`
  - Extension offscreen DB/crypto host: `chrome-extension/src/offscreen/db.ts`, `chrome-extension/src/offscreen/crypto.ts`
  - Extension React root: `chrome-extension/src/sidepanel/App.tsx`
  - Extension message types: `chrome-extension/src/shared/messages.ts`
  - Android DB: `android/app/src/main/java/com/myspace/app/data/AppDatabase.kt`
  - Android crypto: `android/app/src/main/java/com/myspace/app/crypto/CryptoManager.kt`
  - Android Drive sync: `android/app/src/main/java/com/myspace/app/sync/DriveRepository.kt`
  - Android root composable: `android/app/src/main/java/com/myspace/app/ui/MySpaceApp.kt`
- Manifests and config
  - `chrome-extension/manifest.json`
  - `chrome-extension/package.json`
  - `android/app/build.gradle.kts`
  - `android/gradle/libs.versions.toml`
- Docs
  - `docs/developer-guide.md`
  - `docs/privacy-policy.md`
  - `docs/terms-of-service.md`
  - `chrome-extension/README.md`
  - `android/README.md`
- Wiki
  - [Architecture](architecture.md)
  - [Getting started](getting-started.md)
  - [Glossary](glossary.md)
  - [Patterns and conventions](../how-to-contribute/patterns-and-conventions.md)

## Privacy posture

- No servers, no analytics, no telemetry, no crash-reporting SDKs.
- No plaintext secret ever leaves the device. Secrets are AES-GCM encrypted before any Drive upload.
- Drive sync uses the private `appDataFolder` scope, which is not visible in the user's Drive UI.
- The vault key lives only in memory and is cleared on lock or after the idle timer (default 15 minutes, configurable).

See `docs/privacy-policy.md` and `docs/terms-of-service.md` for the full statements.
