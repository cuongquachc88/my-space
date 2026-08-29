# My SPACE — Android App

Native Android companion to the Chrome extension. All features match 1:1. Data is stored locally in Room (SQLite) and can be synced with the extension via the shared Google Drive `appDataFolder` backup.

## Tech Stack

| Layer | Technology |
|---|---|
| UI | Jetpack Compose + Material3 |
| Database | Room (SQLite) |
| Crypto | PBKDF2-SHA256 (600k iterations) + AES-GCM-256 — identical to extension |
| DI | Hilt |
| Navigation | Navigation Compose |
| QR Scanning | ML Kit Barcode + CameraX |
| Sync | Google Drive REST API |

## Prerequisites

- Android Studio Hedgehog 2023.1.1 or later
- Android SDK 26+ (`minSdk 26`)
- JDK 17

## Open & Run

1. **File → Open** → select this `android/` folder
2. Wait for Gradle sync
3. Connect a device or start an emulator (API 26+)
4. Click **Run**

## Screens

| Screen | Description |
|---|---|
| Unlock | Master password entry — PBKDF2 key derivation, auto-lock after 15 min idle |
| Notes | List + search; tap to edit, Markdown content |
| Note Edit | Title + content editor with delete |
| Keyvault | Search, add, copy, delete encrypted secrets; tag grouping |
| Generator | Configurable password generator — length 8–64, upper/lower/digit/symbol toggles |
| Subscriptions | Active/inactive subscriptions, monthly total, per-currency |
| Reports | Last 6 months spending summary |
| To-Do Lists | Named, colour-coded lists |
| Todo Tasks | Tasks with priority (low/medium/high), due date, recurrence, done toggle |
| Map Pins | Named stacks of location pins |
| Map Pin Stack | Pins with label, lat/lng, URL (opens map), note, category, rating |
| QR Scanner | CameraX + ML Kit — scan a shared stack QR link to import pins |
| Sync | Google Drive push/pull (E2E encrypted — same backup as extension) |
| Settings | App info, future: biometric toggle, lock timeout |

## Crypto Compatibility with Extension

The Android crypto (`VaultCrypto.kt`) is a direct port of the extension's `crypto.ts`:

| Property | Extension | Android |
|---|---|---|
| KDF | PBKDF2-SHA256, 600k iters | PBKDF2WithHmacSHA256, 600k iters |
| Key size | 256-bit AES | 256-bit AES |
| Cipher | AES-GCM, 12-byte random IV | AES/GCM/NoPadding, 12-byte random IV |
| Encoding | base64 (btoa) | Base64.NO_WRAP |
| Lock timeout | 15 min idle | 15 min idle |

Drive backups encrypted on the extension can be decrypted on Android and vice versa, provided the vault password is the same.

## Project Structure

```
app/src/main/java/com/myspace/app/
├── MySpaceApp.kt           Hilt application class
├── MainActivity.kt
├── crypto/
│   └── VaultCrypto.kt      PBKDF2 + AES-GCM vault, password generator
├── data/
│   ├── entity/Entities.kt  Room entities (notes, secrets, subscriptions, bills, todos, map pins)
│   ├── dao/Daos.kt         DAOs for all 8 tables
│   └── AppDatabase.kt
├── di/
│   ├── DatabaseModule.kt   Hilt DB + DAO providers
│   └── DataStoreModule.kt  DataStore for vault salt
├── ui/
│   ├── MySpaceNavHost.kt   NavHost + bottom nav
│   ├── navigation/NavGraph.kt  Sealed Screen routes
│   ├── theme/Theme.kt      Dark glassmorphism palette
│   ├── screen/             One file per screen
│   └── viewmodel/          One ViewModel per screen
└── util/
    └── MapUrlParser.kt     Parses Google/OSM/Bing/Apple map URLs → lat/lng
```

## Implementation Status

| Feature | Status |
|---|---|
| Unlock / lock / auto-lock | ✅ Implemented |
| Notes CRUD + search | ✅ Implemented |
| Secrets CRUD + copy | ✅ Implemented |
| Password Generator | ✅ Implemented |
| Subscriptions CRUD + toggle | ✅ Implemented |
| Reports (6-month) | ✅ Implemented |
| To-Do Lists + Tasks | ✅ Implemented |
| Map Pins + URL parsing | ✅ Implemented |
| QR Scanner (CameraX + ML Kit) | ✅ Implemented |
| Google Drive Sync | 🔧 Scaffold (TODO: OAuth + Drive API) |
| Biometric unlock | 🔧 Dependency wired (TODO: BiometricPrompt) |
| Import (1Password / Bitwarden CSV) | 📋 Planned |
| Note image attachments | 📋 Planned |
