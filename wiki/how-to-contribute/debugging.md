# Debugging

Where to look when something is broken. My SPACE has three Chrome extension execution contexts (side panel, service worker, offscreen document) and one Android process, and each has its own devtools surface.

## Chrome extension

Load the unpacked extension from `chrome-extension/dist/` via `chrome://extensions` with developer mode on, then use the contexts below.

### Side panel devtools

The side panel is a normal extension page rendered by React. Right-click inside the side panel and choose **Inspect** (or use the "Inspect view" links on the `chrome://extensions` card for the side panel page). This gives you the Elements panel, Console, Network, and React DevTools if installed.

Most UI bugs live here: render errors, `chrome.storage.local` reads, and message round trips to the service worker. Console errors from the side panel are the first thing to check when a view is blank or unresponsive.

### Service worker devtools

The service worker (`chrome-extension/src/service-worker/index.ts`) handles Drive sync, OAuth via `launchWebAuthFlow`, and relayed messages. On the `chrome://extensions` card for My SPACE, click **Inspect** next to "Service Worker". This opens a dedicated devtools window for the worker.

Service worker quirks to know:

- The worker is terminated when idle and restarted on events, so console logs disappear across restarts. Use the **Console** tab's "Preserve log" option.
- `chrome.storage.local` is the worker's persistent memory. Sync state (`driveConnected`, `driveFileId`, `syncedAt`, `driveEmail`, `driveAvatar`) lives here. See [Configuration](../reference/configuration.md).
- Drive API responses show up in the **Network** tab of the service worker devtools, not the side panel devtools.

### Offscreen document devtools

The offscreen document (`chrome-extension/src/offscreen/index.html`) hosts PGlite and the crypto module. It is created on demand by the service worker and is the only context allowed to use `wasm-unsafe-eval`. To inspect it:

1. On `chrome://extensions`, the My SPACE card lists active views. When the offscreen document is running, an **Inspect** link for it appears under "Inspect views".
2. If the link is missing, the offscreen document is not currently alive. Trigger a vault unlock or any DB operation from the side panel, then refresh `chrome://extensions`.

The offscreen devtools are where PGlite errors, Web Crypto errors, and `process` polyfill issues show up. The `define` block in `chrome-extension/vite.config.ts` replaces `process` with a stub for the browser build; if you see `process is not defined` errors here, that polyfill is the culprit.

## Android app

### logcat

In Android Studio, open **View > Tool Windows > Logcat**. Filter by the application ID `com.myspace.app` or by a tag. The sync layer (`DriveRepository.kt`) and crypto layer (`CryptoManager`) log errors here, including Drive API failures and decryption errors.

From the command line:

```bash
cd android
adb logcat | grep com.myspace.app
```

### Android Studio debugger

Set breakpoints in the Kotlin sources under `android/app/src/main/java/com/myspace/app/` and use **Run > Debug 'app'**. The debugger attaches to the running process and pauses on breakpoints. This is the fastest way to diagnose a Compose recomposition issue or a Room query that returns unexpected rows.

For Room, enable database inspection in Android Studio via **View > Tool Windows > App Inspection** to query the on-device SQLite database directly while the app runs.

## Common errors

### "Vault not initialised - set a password first"

Thrown by `handlePush` in `chrome-extension/src/service-worker/index.ts` when `chrome.storage.local` has no `vaultSalt`. The user has not set a password yet, so there is no key to encrypt the Drive backup with. Fix: set a password in the side panel's Settings view before attempting to sync.

### "Offscreen not ready" / offscreen document not found

The service worker creates the offscreen document lazily. If a message is sent before the document has finished loading, the relay can fail. Symptoms include a missing **Inspect** link for the offscreen view on `chrome://extensions` and crypto/DB messages that never get a response. Fix: trigger any vault operation from the side panel (which forces document creation), wait a moment, and retry. If it persists, reload the extension.

### Drive API 401 (Unauthorized)

The OAuth access token has expired or been revoked. The service worker stores the token in `chrome.storage.local` and refreshes it via `launchWebAuthFlow`. A 401 from `googleapis.com` means the flow needs to re-run. Fix: in the side panel's Sync view, disconnect and reconnect Google Drive. If the `client_id` in `manifest.json` is wrong or the OAuth consent screen is misconfigured, reconnect will also fail; check `manifest.json`'s `oauth2.client_id` and the configured scopes.

### React error #300 in TaskRow

A historical bug (`1cce8c1`, fixed) caused by React hooks being called after an early return in `TaskRow`. If you see a "Rendered more hooks than during the previous render" error in the side panel devtools after editing a To-Do component, you have reintroduced an early return before a hook call. Move all hooks above any conditional returns.

### IndexedDB / PGlite data loss

If notes disappear on browser restart, the PGlite persistence layer (`IdbFs`) is not loading. This was fixed in `e050a9d` ("persist database to IndexedDB via IdbFs"). If it recurs, check the offscreen document devtools console for IndexedDB quota errors or PGlite mount failures.

## Related pages

- [Development workflow](./development-workflow.md) - how to load and reload the extension
- [Testing](./testing.md) - when to write a test instead of debugging manually
- [Configuration](../reference/configuration.md) - the `chrome.storage.local` keys and OAuth scopes
- [Tooling](./tooling.md) - the `vite.config.ts` `process` polyfill and CSP
