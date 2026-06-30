# Dependencies

Every external dependency in both projects, with its purpose. Versions are pinned in `chrome-extension/package.json` and `android/gradle/libs.versions.toml`.

## Chrome extension

### Runtime dependencies

Declared in `chrome-extension/package.json` under `dependencies`. These ship in the extension bundle.

| Package | Version | Purpose |
|---|---|---|
| `@electric-sql/pglite` | `^0.5.1` | PostgreSQL compiled to WebAssembly. Runs inside the offscreen document and provides the notes, secrets, subs, maps, and todos tables. Persisted to IndexedDB via an `IdbFs` adapter so data survives browser restarts. |
| `lz-string` | `^1.5.0` | String compression, used for share-link generation (`shareLink.test.ts`) and compacting payloads. |
| `react` | `^19.2.7` | UI library for the side panel. |
| `react-dom` | `^19.2.7` | React DOM renderer for the side panel. |

### Dev dependencies

Declared in `chrome-extension/package.json` under `devDependencies`. These are build-time only and do not ship in the extension.

| Package | Version | Purpose |
|---|---|---|
| `@crxjs/vite-plugin` | `^2.5.0` | Vite plugin for Chrome MV3. Reads `manifest.json` and wires the service worker, side panel, and offscreen document into the build. See [Tooling](../how-to-contribute/tooling.md). |
| `@tailwindcss/vite` | `^4.3.0` | Tailwind v4 Vite plugin. CSS-first config, no `tailwind.config.js`. |
| `tailwindcss` | `^4.3.0` | Tailwind v4 itself, the utility CSS framework used by the side panel. |
| `@vitejs/plugin-react` | `^6.0.2` | Vite plugin for React (JSX, Fast Refresh). |
| `typescript` | `^6.0.3` | TypeScript compiler. Note the v6 line, which is why the `process` polyfill in `vite.config.ts` uses `Uint8Array<ArrayBuffer>` typing. |
| `vite` | `^8.0.16` | The build tool and dev server. |
| `vitest` | `^4.1.8` | The test runner. Configured via the `test` block in `vite.config.ts`. See [Testing](../how-to-contribute/testing.md). |
| `@types/chrome` | `^0.1.43` | Type definitions for the `chrome.*` extension APIs. |
| `@types/lz-string` | `^1.3.34` | Type definitions for `lz-string`. |
| `@types/react` | `^19.2.17` | Type definitions for React 19. |
| `@types/react-dom` | `^19.2.3` | Type definitions for `react-dom`. |

## Android app

All Android dependencies are declared in `android/app/build.gradle.kts` via the version catalog at `android/gradle/libs.versions.toml`.

### Jetpack Compose / UI

| Library | Version | Purpose |
|---|---|---|
| `androidx.core:core-ktx` | 1.13.1 | Kotlin extensions for Android core. |
| `androidx.activity:activity-compose` | 1.9.2 | Compose entry point from an Activity. |
| `androidx.compose:compose-bom` | 2024.09.03 | Bill of Materials aligning Compose library versions. |
| `androidx.compose.ui:ui` | (BOM) | Core Compose UI runtime. |
| `androidx.compose.ui:ui-graphics` | (BOM) | Graphics layer for Compose. |
| `androidx.compose.ui:ui-tooling-preview` | (BOM) | `@Preview` support for Compose. |
| `androidx.compose.material3:material3` | (BOM) | Material 3 components used throughout the app. |
| `androidx.compose.material:material-icons-extended` | (BOM) | The extended Material icon set (used by nav and screens). |
| `androidx.navigation:navigation-compose` | 2.8.2 | Type-safe navigation between screens in `MySpaceApp.kt`. |

### Lifecycle

| Library | Version | Purpose |
|---|---|---|
| `androidx.lifecycle:lifecycle-runtime-ktx` | 2.8.6 | Lifecycle-aware components. |
| `androidx.lifecycle:lifecycle-viewmodel-compose` | 2.8.6 | ViewModel integration for Compose. |

### Room (local database)

| Library | Version | Purpose |
|---|---|---|
| `androidx.room:room-runtime` | 2.6.1 | Room runtime, the SQLite ORM mirroring the extension's PGlite schema. |
| `androidx.room:room-ktx` | 2.6.1 | Kotlin coroutines and Flow support for Room. |
| `androidx.room:room-compiler` | 2.6.1 | KAPT processor that generates Room implementations. Wired via `kapt(libs.androidx.room.compiler)`. |

### Security / identity / credentials

| Library | Version | Purpose |
|---|---|---|
| `androidx.security:security-crypto` | 1.1.0-alpha06 | EncryptedSharedPreferences for storing the Drive access token and secrets. |
| `androidx.datastore:datastore-preferences` | 1.1.1 | DataStore for typed preferences. |
| `androidx.credentials:credentials` | 1.3.0 | Credential Manager for Google sign-in. |
| `com.google.android.libraries.identity:googleid` | 1.1.1 | Google ID token support for the Credentials API. |

### Networking

| Library | Version | Purpose |
|---|---|---|
| `com.squareup.retrofit2:retrofit` | 2.11.0 | HTTP client for the Google Drive sync layer in `DriveRepository.kt`. |
| `com.squareup.retrofit2:converter-gson` | 2.11.0 | Gson converter for Retrofit responses. |
| `com.squareup.okhttp3:logging-interceptor` | 4.12.0 | OkHttp logging interceptor for debugging Drive requests. |
| `com.google.code.gson:gson` | 2.11.0 | JSON serialization for sync payloads. |

### Image loading / splash

| Library | Version | Purpose |
|---|---|---|
| `io.coil-kt:coil-compose` | 2.7.0 | Image loading, used to render the Google avatar in the Sync screen. |
| `androidx.core:core-splashscreen` | 1.0.1 | Splash screen API for app launch. |

### Build / tooling

| Library | Version | Purpose |
|---|---|---|
| `com.android.tools:desugar_jdk_libs` | 2.1.3 | Core library desugaring for Java 8+ time APIs on older Android. Enabled via `isCoreLibraryDesugaringEnabled = true`. |
| `junit:junit` | 4.13.2 | JUnit for the (not-yet-populated) Android unit-test module. |

### Kotlin / compiler plugins

Declared as plugins in `android/app/build.gradle.kts`:

| Plugin | Version | Purpose |
|---|---|---|
| `com.android.application` | 8.5.2 (AGP) | Android Gradle plugin. |
| `org.jetbrains.kotlin.android` | 2.0.21 | Kotlin compiler. |
| `org.jetbrains.kotlin.plugin.compose` | 2.0.21 | Kotlin Compose compiler plugin (the modern replacement for `composeOptions`). |

## Related pages

- [Configuration](./configuration.md) - how these libraries are configured
- [Tooling](../how-to-contribute/tooling.md) - Vite, Gradle, the bump script
- [Reference](./index.md) - back to the reference index
