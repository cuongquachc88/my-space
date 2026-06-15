# Hacker News — Show HN

**Title:**
Show HN: My SPACE – encrypted side panel vault for Chrome (notes, secrets, passwords, subscriptions)

**Body:**
I built My SPACE, a Chrome MV3 extension that lives in the side panel as a private vault.

Tech choices worth noting:

**Database:** PGlite (PostgreSQL compiled to WASM via Emscripten) running in an offscreen document. This gives real SQL — tags, full-text search — without a backend. Data is persisted to IndexedDB via IdbFs.

**Encryption:** Web Crypto API, AES-GCM 256-bit. Key derived from master password using PBKDF2 (600k iterations, SHA-256, random 16-byte salt stored per-user). Random 12-byte IV per encrypt operation.

**Architecture:** Side panel (React) → Service Worker (message router + OAuth + Drive sync) → Offscreen Document (PGlite + crypto). The offscreen document never unloads, so the DB stays warm.

**OAuth:** `chrome.identity.getAuthToken` — no redirect URI, no client secret in the extension, no token stored in plaintext. Drive backup uses `appDataFolder` (private to the app, not visible in user's Drive UI). Data encrypted locally before upload.

**Import:** 1Password CSV, Bitwarden CSV parsers.

Repo: github.com/cuongquachc88/my-space
Chrome Web Store: [link]
Landing page: cuongquachc88.github.io/my-space/
