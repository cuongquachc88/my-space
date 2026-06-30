# Tooling

The build and release toolchain for both projects in the monorepo. For the day-to-day loop, see [Development workflow](./development-workflow.md).

## Chrome extension

### Vite build config

The build is configured in `chrome-extension/vite.config.ts`:

```ts
export default defineConfig({
  plugins: [react(), tailwindcss(), crx({ manifest })],
  define: {
    'process': JSON.stringify({ exitCode: 0, env: {}, version: '', versions: {} }),
  },
  build: {
    rollupOptions: {
      input: { offscreen: 'src/offscreen/index.html' },
    },
  },
  test: { environment: 'node', globals: true },
})
```

Key points:

- **`defineConfig` from `vitest/config`** - the same file configures both Vite (build) and Vitest (tests). The `test` block only applies to `vitest run`, not to `vite build`.
- **`process` polyfill** - Emscripten-compiled PGlite references `process` dynamically. The `define` block replaces the entire `process` global with a stub for the browser build. Tests run with `environment: 'node'`, so they keep the real `process` object. Do not try to replace individual `process` properties; the comment in the file explains why that is insufficient.
- **Explicit offscreen input** - `src/offscreen/index.html` is listed as an explicit Rollup input so the offscreen document is emitted into `dist/`. Without this, the offscreen document would not appear in the build (a bug fixed in `70c6dfe`).
- **`@vitejs/plugin-react`** - enables JSX and Fast Refresh for the React side panel.

### @crxjs/vite-plugin

`@crxjs/vite-plugin` (the `crx({ manifest })` plugin) reads `chrome-extension/manifest.json` and wires the entry points (service worker, side panel, offscreen document) into the Vite build. It handles MV3-specific concerns like the service worker bundle, content security policy, and reloading during development. The manifest is the source of truth for permissions, OAuth scopes, and entry paths; see [Configuration](../reference/configuration.md).

### Tailwind v4

Tailwind is wired in via the `@tailwindcss/vite` plugin (not a PostCSS config). There is no `tailwind.config.js` in the project; Tailwind v4 uses CSS-first configuration, so theme tokens live in CSS. The plugin compiles utility classes at build time into the side panel's CSS bundle.

### Version bump script

`chrome-extension/scripts/bump.js` is a small Node script that bumps the version in both `package.json` and `manifest.json` in lockstep. It takes one argument (`patch`, `minor`, or `major`), parses the current `package.json` version, computes the next version, and writes both files:

```bash
node scripts/bump.js patch   # 0.3.0 -> 0.3.1
node scripts/bump.js minor   # 0.3.1 -> 0.4.0
node scripts/bump.js major   # 0.3.1 -> 1.0.0
```

The npm scripts `release:patch`, `release:minor`, and `release:major` each run `bump.js` followed by `npm run pack`. Keeping the version in sync between `package.json` and `manifest.json` is required because the pack step reads the version from `package.json` to name the zip, while Chrome itself reads the version from `manifest.json`.

### Icon generation script

`chrome-extension/scripts/gen-icons.mjs` is a self-contained Node script that generates the shield-keyhole PNG icons (`icon16.png`, `icon48.png`, `icon128.png`) directly into `chrome-extension/public/`. It draws the shield and keyhole with hand-rolled pixel math (alpha compositing, scanline polygon fill) and encodes the PNG by hand using `zlib.deflateSync`. No image library is used. Re-run it only if the brand mark changes.

### npm scripts

From `chrome-extension/package.json`:

| Script | What it does |
|---|---|
| `npm run dev` | `vite build --watch` - rebuild on every change |
| `npm run build` | `vite build` - one production build to `dist/` |
| `npm run pack` | `vite build` then zip `dist/` to `output/my-space-<version>.zip` |
| `npm run release:patch` | `bump.js patch` then `npm run pack` |
| `npm run release:minor` | `bump.js minor` then `npm run pack` |
| `npm run release:major` | `bump.js major` then `npm run pack` |
| `npm test` | `vitest run` |

## Android app

### Gradle config

The Android build uses the modern plugins block and a version catalog. Top-level config in `android/build.gradle.kts`:

```kotlin
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
}
```

App-level config in `android/app/build.gradle.kts`:

- `namespace = "com.myspace.app"`, `applicationId = "com.myspace.app"`
- `compileSdk = 35`, `minSdk = 26`, `targetSdk = 35`
- `versionCode = 3`, `versionName = "0.3.1"`
- `isCoreLibraryDesugaringEnabled = true` with Java 17 source/target and `jvmTarget = 17`
- `buildFeatures { compose = true }`
- Release build has `isMinifyEnabled = true` with the default ProGuard rules plus `proguard-rules.pro`
- Room uses `kapt` for the compiler: `kapt(libs.androidx.room.compiler)`

### Version catalog

All dependency versions are centralized in `android/gradle/libs.versions.toml` (the `libs.*` references in `build.gradle.kts`). Key versions: AGP 8.5.2, Kotlin 2.0.21, Compose BOM 2024.09.03, Room 2.6.1, Retrofit 2.11.0, OkHttp 4.12.0, Gson 2.11.0, Coil 2.7.0. See [Dependencies](../reference/dependencies.md) for the full list with purposes.

### gradle.properties

`android/gradle.properties`:

```properties
android.useAndroidX=true
android.enableJetifier=true
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
kotlin.code.style=official
```

`enableJetifier=true` is kept for any legacy support libraries; `org.gradle.jvmargs` bumps the Gradle JVM heap to 2 GB, which the Compose toolchain appreciates.

### Building

```bash
cd android
./gradlew assembleDebug      # debug APK
./gradlew assembleRelease    # release APK (minified)
```

Output lands in `android/app/build/outputs/apk/`. In Android Studio, the **Run** button does the debug build and install in one step.

## Related pages

- [Development workflow](./development-workflow.md) - how to use these tools day to day
- [Dependencies](../reference/dependencies.md) - what each dependency is for
- [Configuration](../reference/configuration.md) - `manifest.json` fields and Gradle config in detail
- [Testing](./testing.md) - the Vitest config in `vite.config.ts`
