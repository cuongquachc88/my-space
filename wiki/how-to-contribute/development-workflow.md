# Development workflow

The day-to-day loop for working on My SPACE. The repo is a monorepo at `/Users/cuongquachc/Projects/poc/my-space` with two independently buildable projects: the Chrome extension under `chrome-extension/` and the Android app under `android/`. There is no shared build that produces both; each is built with its own toolchain.

## The loop

1. **Branch.** From `main`, create a descriptively named branch.
2. **Code.** Make the change. Keep commits focused and use the `feat:` / `fix:` / `chore:` / `docs:` / `test:` prefixes the history already uses.
3. **Test.** Run `npm test` in `chrome-extension/` (see [Testing](./testing.md)).
4. **Build.** Run `npm run build` in `chrome-extension/` and/or build the Android app in Android Studio.
5. **Manual check.** Load the extension or run the app and click through the affected screen.
6. **PR.** Open against `main`.

## Chrome extension

All Chrome extension commands run from `chrome-extension/`.

### Develop with watch mode

```bash
cd chrome-extension
npm run dev
```

This runs `vite build --watch`, rebuilding `dist/` on every file change. Keep it running in a terminal while you edit. To see your changes in Chrome:

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select `chrome-extension/dist/`.
4. After a rebuild, click the reload arrow on the My SPACE card. The side panel and service worker will pick up the new code.

### Build once

```bash
cd chrome-extension
npm run build
```

Produces a production `dist/` directory. Use this for a clean check before opening a PR.

### Pack a release zip

```bash
cd chrome-extension
npm run pack
```

Runs `vite build` and then zips `dist/` into `chrome-extension/output/my-space-<version>.zip`, where `<version>` is read from `package.json`. This is what gets uploaded to the Chrome Web Store.

### Bump and release

```bash
cd chrome-extension
npm run release:patch   # 0.2.0 -> 0.2.1
npm run release:minor   # 0.2.0 -> 0.3.0
npm run release:major   # 0.2.0 -> 1.0.0
```

Each release command runs `scripts/bump.js` to bump the version in both `package.json` and `manifest.json`, then runs `npm run pack`. See [Tooling](./tooling.md) for what `bump.js` does.

### Prerequisites

- Node.js (the project uses TypeScript 6 and Vite 8, so use a recent Node).
- `npm install` once in `chrome-extension/` to install dependencies.

## Android app

The Android app is a standard Gradle project under `android/`. The recommended way to work on it is Android Studio.

### Open and run

1. Open Android Studio.
2. **File > Open** and select the `android/` directory (not the repo root).
3. Let Gradle sync finish.
4. Pick an emulator (API 26 or higher, since `minSdk = 26`) or a physical device.
5. Click **Run** (the green play button) to install and launch `My SPACE`.

### Build from the command line

```bash
cd android
./gradlew assembleDebug
```

The debug APK lands in `android/app/build/outputs/apk/debug/`. Use `assembleRelease` for a release build (minification is enabled for release via ProGuard).

### Prerequisites

- Android Studio (Koala or newer, given AGP 8.5.2).
- JDK 17 (the project sets `sourceCompatibility` and `targetCompatibility` to 17 and `jvmTarget` to 17).
- An emulator or device running API 26+.

## Where things live

| Concern | Chrome extension | Android app |
|---|---|---|
| Source root | `chrome-extension/src/` | `android/app/src/main/java/com/myspace/app/` |
| Build config | `chrome-extension/vite.config.ts`, `chrome-extension/manifest.json` | `android/app/build.gradle.kts`, `android/gradle/libs.versions.toml` |
| Tests | `chrome-extension/tests/` | (none yet) |
| Output | `chrome-extension/dist/`, `chrome-extension/output/` | `android/app/build/outputs/apk/` |

## Related pages

- [Testing](./testing.md) - the Vitest suite
- [Tooling](./tooling.md) - Vite, crxjs, Tailwind v4, the bump script, Gradle config
- [Debugging](./debugging.md) - Chrome devtools and Android logcat
- [Contributing](./index.md) - the PR process and how to add a new feature
