# My SPACE — Android

> Private, offline-first vault for Android. Notes, secrets, passwords, and subscriptions — all encrypted with Android Keystore. Optional Google Drive sync compatible with the Chrome extension.

[![Platform](https://img.shields.io/badge/Android-26%2B-3DDC84?logo=android&logoColor=white)](https://developer.android.com)
[![Kotlin](https://img.shields.io/badge/Kotlin-2.0-7F52FF?logo=kotlin&logoColor=white)](https://kotlinlang.org)
[![Compose](https://img.shields.io/badge/Jetpack_Compose-Material3-4285F4)](https://developer.android.com/jetpack/compose)

---

## Features

| | Feature | Details |
|---|---|---|
| 📝 | **Notes** | Create and search notes with tag support |
| 🔐 | **Secret Vault** | AES-GCM 256-bit via Android Keystore — hardware-backed on supported devices |
| 🔑 | **Password Generator** | Configurable length, uppercase, digits, symbols |
| 💳 | **Subscriptions** | Recurring cost tracker with multi-currency FX conversion |
| ☁️ | **Google Drive Sync** | End-to-end encrypted sync — same format as Chrome extension |

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI | Jetpack Compose + Material3 |
| Navigation | Navigation Compose |
| Database | Room (SQLite) |
| Crypto | Android Keystore — AES/GCM/NoPadding 256-bit |
| Networking | Retrofit 2 + OkHttp |
| Sync | Google Drive REST API v3 — `appDataFolder` |
| Min SDK | API 26 (Android 8.0) |
| Target SDK | API 35 (Android 15) |

---

## Project Structure

```
android/
├── app/
│   └── src/main/
│       ├── java/com/myspace/app/
│       │   ├── MainActivity.kt
│       │   ├── crypto/
│       │   │   └── CryptoManager.kt      Android Keystore AES-GCM
│       │   ├── data/
│       │   │   └── AppDatabase.kt        Room DB — notes, secrets, subscriptions
│       │   ├── sync/
│       │   │   └── DriveRepository.kt    Drive REST push/pull
│       │   └── ui/
│       │       ├── MySpaceApp.kt         Nav scaffold + bottom bar
│       │       ├── theme/
│       │       │   ├── Theme.kt          Dark color scheme matching extension
│       │       │   └── Typography.kt
│       │       └── screens/
│       │           ├── NotesScreen.kt
│       │           ├── VaultScreen.kt
│       │           ├── GeneratorScreen.kt
│       │           ├── SubscriptionsScreen.kt
│       │           └── SyncScreen.kt
│       ├── AndroidManifest.xml
│       └── res/
│           └── values/
│               ├── strings.xml
│               └── themes.xml
├── build.gradle.kts
├── settings.gradle.kts
└── gradle/
    └── libs.versions.toml                Version catalog
```

---

## Setup

### Prerequisites

- Android Studio Hedgehog (2023.1.1) or later
- Android SDK 26+
- JDK 17

### Open in Android Studio

1. Open Android Studio
2. **File → Open** → select the `android/` folder
3. Wait for Gradle sync to complete
4. Run on a device or emulator (API 26+)

### Build from CLI

```bash
cd android
./gradlew assembleDebug      # debug APK → app/build/outputs/apk/debug/
./gradlew assembleRelease    # release APK (requires signing config)
./gradlew bundleRelease      # AAB for Play Store
```

---

## Encryption

Secrets are encrypted using **Android Keystore** — the key never leaves secure hardware on devices that support it (most Android 6+ devices with a Trusted Execution Environment).

- Algorithm: `AES/GCM/NoPadding`
- Key size: 256-bit
- IV: random 12 bytes per encryption, stored alongside ciphertext in Room
- The keystore alias is `myspace_vault_key` — unique per device, non-exportable

---

## Drive Sync & Cross-Platform Compatibility

The Android app uses the same Drive `appDataFolder` file (`keyvault-backup.json`) and the same JSON payload format as the Chrome extension:

```json
{ "ciphertext": "...", "iv": "..." }
```

The plaintext inside is:
```json
{ "notes": [...], "secrets": [...], "subscriptions": [...] }
```

> **Note:** Encryption keys are platform-local (Android Keystore vs Web Crypto). When you pull from Drive, the app re-encrypts data with the local device key. The data is never stored unencrypted on disk.

---

## Privacy

- All data stored in Room (SQLite on device) — no external servers
- Secrets encrypted at rest with Android Keystore AES-GCM
- Drive backup encrypted before upload — Google cannot read the content
- No analytics, no telemetry, no crash reporting SDKs

[Privacy Policy](../docs/privacy-policy.md) · [Terms of Service](../docs/terms-of-service.md)
