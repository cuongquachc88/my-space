# My SPACE Android — Feature Parity, Unit Tests & Release Pipeline

**Date:** 2026-07-04
**Status:** Approved

---

## Overview

Four-part deliverable:

1. **Feature parity** — close the gap between the Chrome extension and the Android app across Vault, Map Pins, and a new Settings screen.
2. **Unit tests** — expand Android test coverage (JVM + instrumented) to match the confidence level of the Chrome extension test suite.
3. **Simulator testing** — extend the existing `run-emulator.sh` to run tests headlessly with a clear exit code.
4. **Play Store build pipeline** — a local signing script and a GitHub Actions CI/CD workflow that produces a signed AAB on every push to `main`.

---

## Section 1 — Feature Parity

### 1A. Vault — Search + Tag Filtering

**Gap:** `VaultScreen.kt` shows all secrets with no way to filter. The Chrome extension's `KeyvaultView.tsx` has a search bar and tag filter chips.

**Solution:**

- Add `searchMeta(q: String): List<SecretMeta>` and `searchMetaByTag(tag: String): List<SecretMeta>` to `SecretDao` using SQL `LIKE` + `INSTR` on the `tags` JSON string.
- Add `query: String` and `activeTag: String?` state to `VaultScreen`.
- Render a search `OutlinedTextField` at the top and a horizontal scrolling `LazyRow` of tag `FilterChip`s below it (avoids the `@ExperimentalLayoutApi` `FlowRow` dependency).
- No DB migration needed — `tags` column already exists in `SecretMeta`.

**Files changed:** `AppDatabase.kt` (+2 DAO queries), `VaultScreen.kt` (~+60 lines UI).

---

### 1B. Map Pins — Missing Fields & Share Link

**Gap:** `MapPinsScreen.kt` does not surface `rating`, `reviewNote`, or stack `icon`. There is no share-link feature. The Chrome extension has all of these.

**Solution:**

**Star rating + review note in PinRow:**
- Add interactive 5-star row (tap to set, tap same to clear) using `Icon(Icons.Default.Star)` tinted amber.
- Add a `reviewNote` text field in the edit dialog (already stored in `MapPinEntity`).
- Surface both in read mode below the coordinates row.

**Icon picker on stacks:**
- Introduce a sealed class `PinIcon` with 8 variants matching the extension's `IconPicker.tsx` pixel icons (pin, hotel, café, restaurant, attraction, shopping, transport, hospital).
- Render each as a small `Canvas` composable (simple geometric shapes — no SVG needed in Compose).
- Show the picker in the "New Stack" and "Edit Stack" dialogs.

**Share link:**
- Add a pure-Kotlin LZString encoder (`LZString.kt`, ~80 lines) that produces the same `compressToEncodedURIComponent` output as the JS library.
- `buildShareUrl(stack, pins)` mirrors the extension's implementation exactly — same URL shape, same payload schema (`name`, `color`, `pins[]`).
- A "Share" `IconButton` in the stack detail header copies the URL to the clipboard via `ClipboardManager`.

**Files changed:** `MapPinsScreen.kt` (~+150 lines), new `PinIconPicker.kt` (~60 lines), new `LZString.kt` (~80 lines).

---

### 1C. Settings Screen

**Gap:** No Settings screen on Android.

**Solution:** New `SettingsScreen.kt` with four card sections:

| Section | Detail |
|---|---|
| **Security** | Biometric unlock toggle. Uses `BiometricManager.canAuthenticate(BIOMETRIC_WEAK)` to check device support; stores preference in `SharedPreferences("myspace_settings", "biometric_enabled")`. When enabled, `MainActivity` shows `BiometricPrompt` on app foreground before showing content. |
| **Auto-lock** | Segment control: 5m / 15m / 30m / ∞. Persisted in `SharedPreferences`. The pager in `MySpaceApp` reads this on resume and applies an idle timeout. |
| **Lock Now** | Clears the in-memory session (a `var sessionActive: Boolean` hoisted to `MySpaceApp`) and navigates the pager to page 0. |
| **About** | `BuildConfig.VERSION_NAME`, tappable links to Privacy Policy and Terms of Service (fire `ACTION_VIEW` intent). |

`Screen.Settings` is added to `allScreens` in `MySpaceApp.kt` (last position). Settings persistence uses `Context.getSharedPreferences` — no new DB tables, no DataStore migration needed.

**Files changed:** new `SettingsScreen.kt` (~200 lines), `MySpaceApp.kt` (~+30 lines).

---

## Section 2 — Unit Tests

### Test philosophy

Follow the existing `BillingCalcTest.kt` pattern: pure functions → JVM tests (fast, no emulator). Android-framework-dependent logic → instrumented tests (Room, Crypto).

### JVM tests (`src/test/`)

**`GeneratorTest.kt`**
- Generated password has correct length.
- Each enabled charset is represented in the output.
- All-disabled throws `IllegalArgumentException`.
- Length < enabled-set count throws.
- Consecutive calls with same config produce different outputs (probabilistic).

**`MapPinShareTest.kt`**
- `buildShareUrl` → parse → pins round-trip with coordinate precision (5 dp).
- Empty pins list produces a valid (degenerate) URL.
- Stack name and color survive the round-trip.

**`VaultSearchTest.kt`**
- Tag-parsing helper correctly splits JSON tag arrays.
- Search filter correctly matches label substrings (case-insensitive).
- Active-tag filter excludes non-matching secrets.

### Instrumented tests (`src/androidTest/`)

**`AppDatabaseTest.kt`**
- Uses `Room.inMemoryDatabaseBuilder` — no device state.
- Note CRUD: upsert → getAll → delete → getAll returns empty.
- Secret CRUD: upsert → getMeta → delete.
- MapPin CRUD: upsert pin → getForStack → deleteForStack.
- Migration 7→8: verifies `url` and `description` columns exist on `secrets` after migration.

**`CryptoManagerTest.kt`**
- Encrypt → decrypt round-trip returns original plaintext.
- Two encryptions of the same plaintext produce different ciphertexts (IV randomness).
- Decryption with wrong IV throws `AEADBadTagException`.

### Build config additions (`app/build.gradle.kts`)

```kotlin
testImplementation(libs.androidx.room.testing)
androidTestImplementation("androidx.test.ext:junit:1.2.1")
androidTestImplementation("androidx.test:runner:1.6.1")
androidTestImplementation("androidx.test:rules:1.6.1")
defaultConfig {
    testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
}
```

Add to `libs.versions.toml`:
```toml
androidx-room-testing = { group = "androidx.room", name = "room-testing", version.ref = "room" }
```

---

## Section 3 — Simulator Testing & Build Pipeline

### 3A. `android/run-emulator.sh` extension

New flags:

| Flag | Behaviour |
|---|---|
| *(none)* | Existing behaviour — boot emulator interactively |
| `--unit` | Run `./gradlew test`; print report path; exit with Gradle code |
| `--test` | Boot emulator if not running → `./gradlew connectedAndroidTest` → pull HTML report to `android/build/reports/androidTests/` → exit with Gradle code |

The `--test` path uses `adb shell getprop sys.boot_completed` polling (max 120 s) to wait for emulator readiness before running tests.

### 3B. `android/build-release.sh`

```
Inputs (env vars):
  KEYSTORE_PATH    — path to .jks file
  STORE_PASSWORD   — keystore password
  KEY_ALIAS        — key alias
  KEY_PASSWORD     — key password

Steps:
  1. Validate env vars are set
  2. Write keystore.properties (trap → delete on exit)
  3. cd android && ./gradlew bundleRelease
  4. Copy AAB to android/output/myspace-<versionName>.aab
  5. Print path and SHA-256 checksum
```

`app/build.gradle.kts` gains a `signingConfigs { release { ... } }` block that reads `android/keystore.properties` when the file exists.

`android/keystore.properties` and `android/output/*.aab` added to `.gitignore`.

### 3C. `.github/workflows/android-release.yml`

**Trigger:** `push` to `main`, `workflow_dispatch`.

**Jobs:**

```
unit-test
  └─ actions/checkout
  └─ actions/setup-java (Java 17, temurin)
  └─ gradle/actions/setup-gradle (cache)
  └─ ./gradlew test
  └─ Upload test report artifact

instrumented-test
  └─ reactivecircus/android-emulator-runner@v2 (api-level: 33)
      └─ ./gradlew connectedAndroidTest
  └─ Upload instrumented report artifact

release-build  (needs: [unit-test, instrumented-test])
  └─ Decode KEYSTORE_BASE64 secret → /tmp/myspace-release.jks
  └─ Write keystore.properties
  └─ ./gradlew bundleRelease
  └─ Upload AAB as artifact (retention: 90 days)
  └─ # (commented) google-github-actions/upload-to-play placeholder
```

**Required GitHub Secrets:**
- `KEYSTORE_BASE64` — `base64 -i keys/myspace-release.jks`
- `KEY_ALIAS`, `KEY_PASSWORD`, `STORE_PASSWORD`

---

## File Inventory

| Path | Action |
|---|---|
| `android/app/src/main/java/com/myspace/app/data/AppDatabase.kt` | Add 2 SecretDao search queries |
| `android/app/src/main/java/com/myspace/app/ui/screens/VaultScreen.kt` | Add search bar + tag filter UI |
| `android/app/src/main/java/com/myspace/app/ui/screens/MapPinsScreen.kt` | Add star rating, review note, share button |
| `android/app/src/main/java/com/myspace/app/ui/screens/SettingsScreen.kt` | **New** |
| `android/app/src/main/java/com/myspace/app/ui/components/PinIconPicker.kt` | **New** |
| `android/app/src/main/java/com/myspace/app/util/LZString.kt` | **New** |
| `android/app/src/main/java/com/myspace/app/ui/MySpaceApp.kt` | Add Settings screen + session lock state |
| `android/app/src/test/java/com/myspace/app/GeneratorTest.kt` | **New** |
| `android/app/src/test/java/com/myspace/app/MapPinShareTest.kt` | **New** |
| `android/app/src/test/java/com/myspace/app/VaultSearchTest.kt` | **New** |
| `android/app/src/androidTest/java/com/myspace/app/AppDatabaseTest.kt` | **New** |
| `android/app/src/androidTest/java/com/myspace/app/CryptoManagerTest.kt` | **New** |
| `android/app/build.gradle.kts` | Add test deps + signing config |
| `android/gradle/libs.versions.toml` | Add room-testing entry |
| `android/run-emulator.sh` | Add `--unit` and `--test` flags |
| `android/build-release.sh` | **New** |
| `.github/workflows/android-release.yml` | **New** |
| `.gitignore` | Add `keystore.properties`, `android/output/*.aab` |

---

## Out of Scope

- Chrome extension changes (no modifications needed — the extension's feature set is already complete)
- Play Store service account / automatic publish (deferred — placeholder left in CI)
- iOS app
- Import from 1Password/Bitwarden on Android (extension-only feature)
