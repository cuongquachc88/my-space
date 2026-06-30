# Lore

The development history of My SPACE, told as a series of eras. Dates are taken from `git log --format="%h %ad %s" --date=short` on the repository at `/Users/cuongquachc/Projects/poc/my-space`. For the raw numbers behind this narrative, see [By the numbers](./by-the-numbers.md).

## Era 0 - Design and scaffold (2025-06-09)

The repository opens with two planning documents, `c751f93` ("Add KeyVault Chrome extension design spec") and `343df6d` ("Add KeyVault Chrome extension implementation plan"), followed immediately by the Vite + crxjs scaffold (`d69187d`). Within the same day the foundational modules land:

- `7dfec3e` - AES-256-GCM crypto module with PBKDF2 key derivation
- `0e0264c` - shared message type definitions
- `38d8e1a` - PGlite database module with notes and secrets CRUD
- `fc0701a` - offscreen message handler and bootstrap

A flurry of `fix(crypto)` and `fix(db)` commits the same day shows the solo developer shaking out Web Crypto / PGlite integration issues, ending the day with the offscreen handler bootstrapped and the database tested.

## Era 1 - Initial Chrome extension (2025-06-10)

This is the day the extension becomes a usable product. The service worker with Drive push/pull sync arrives (`1e83b9a`), the side-panel UI shell lands with icons, notes view, keyvault view, and sync/settings views (`2735572`), and the layout becomes responsive with a first-time setup screen and lock screen (`d030cc1`). Tag support for notes and secrets is added (`e93db3d`), and the OAuth flow is swapped from the Chrome identity API to user-provided client credentials via `launchWebAuthFlow` (`6227697`).

The day closes with the rename to "My SPACE" (`bf823b3`) and a `npm run pack` command, plus generated shield-keyhole PNG icons (`23f9713`). README, developer guide, and privacy policy land here too (`576df31`).

This era establishes the four core views that define the extension: **notes**, **vault** (secrets), **generator** (passwords), and **subs** (subscriptions).

## Era 2 - Persistence and sync overhaul (2025-06-10 to 2025-06-15)

A critical fix on 2025-06-10 (`e050a9d`, "persist database to IndexedDB via IdbFs - data survives browser restart") saves the project from being a demo that loses its data on every restart. Version bumps to 0.1.1 (`3b10522`).

On 2025-06-15 the Drive sync gets a major overhaul alongside subscription fixes and a terminal-style Sync UI (`24659c3`, tagged v0.1.2). Subscription amounts start being converted to display currency for the monthly total (`ec440f2`). The repo is restructured into the `chrome-extension/` + `android/` monorepo layout (`420d96b`), and the chrome-extension is converted from a git submodule to a regular directory (`d398131`).

## Era 3 - Import support and test expansion (2025-06-15)

The test suite grows up in this era. Currency logic is extracted into a lib and given 17 unit tests (`bced3cd`, 116 total), then handler tests are expanded to 140 covering notes/vault/secrets/subs/export-import alongside a marketing plan (`f4d59f5`). Import/export support lands as a first-class feature, exercised by `parseImport.test.ts` and the handler tests.

## Era 4 - To-Do and Map Pins (2025-06-19)

Two new data domains arrive together in `f4437a3` ("feat: add MapPins, Todo, icon picker with pixel-art icons"). This commit adds:

- Map Pins (saved locations with pixel-art icons)
- To-Do tasks
- An icon picker using generated pixel-art icons

Landing-page and README copy is updated to advertise the new features (`7825439`, `bd333ad`, `359f881`), the version bumps to 0.1.5, and an unused `scripting` permission is removed from the manifest (`fb2873f`). A React error #300 in `TaskRow` from hooks-after-early-return is fixed (`1cce8c1`).

## Era 5 - Android app development (2025-06-15 to 2025-06-22)

The Android scaffold appears early (2025-06-15, in the same restructure commit that created the monorepo), but the app is completed on 2025-06-15 with `4cdd4b7` ("fix: complete android project - gradle wrapper, mipmap icons, desugaring, icon fixes"). The Android app mirrors the extension's data model in Room and adds a Reports & Bills button in the Subs screen with back navigation (`406e910`), though the Reports screen and bills table are later removed from Android (`e70f900`).

The Android UI is built with Jetpack Compose and Material3, using a `MySpaceApp` composable that hosts the navigation between Notes, Vault, Generator, Subs, Sync, MapPins, and Todo screens.

## Era 6 - Reports & Bills feature (2025-06-15)

The bills/reports feature is added to the Chrome extension and synced to Android in `37d6145` ("feat: add bills/reports feature to chrome ext; sync active-flag, bills, BillingCalc to Android"). This brings a Reports view into the Subs screen of the extension, with a back button added shortly after (`55e2550`). On Android the Reports screen is later removed (`e70f900`) but the bills sync fields remain, making this an extension-primary feature that the Android app consumes at the data layer.

## Era 7 - Drive sync maturity (2025-06-22)

The final era in the current history hardens the Drive sync UX. Map Pins and To-Do are added to Google Drive sync (`e5edaca`, v0.1.8), the connected Google account email is shown in the Sync view (`2a460d2`, v0.1.9), and the Google avatar is shown with a fix for pull decryption and a 0-count log (`6997b9f`). The version bumps to 0.2.0 (`f84cc5d`), the current head of `main`.

## Timeline at a glance

```
2025-06-09  Design spec, scaffold, crypto, DB, offscreen handler
2025-06-10  Service worker, side-panel UI, sync, tags, rename, icons
2025-06-10  IndexedDB persistence (data survives restart)
2025-06-15  Sync overhaul v0.1.2, currency, monorepo restructure
2025-06-15  Test expansion (116 -> 140 tests), import/export
2025-06-15  Android project completed
2025-06-15  Reports & Bills feature, bills sync to Android
2025-06-19  Map Pins + To-Do + icon picker (v0.1.5)
2025-06-22  Map Pins & Todo in Drive sync (v0.1.8)
2025-06-22  Google email + avatar in Sync view (v0.1.9)
2025-06-22  v0.2.0 release
```

## Related pages

- [By the numbers](./by-the-numbers.md) - the commit and line counts behind this story
- [How to contribute](./how-to-contribute/index.md) - how to write the next era
- [Reference](./reference/index.md) - data models, dependencies, configuration
