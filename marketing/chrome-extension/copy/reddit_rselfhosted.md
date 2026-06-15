# Reddit — r/selfhosted

**Title:**
My SPACE — a Chrome extension password vault that needs zero server infrastructure (PostgreSQL WASM + Web Crypto)

**Body:**
r/selfhosted folks, you'll appreciate this: **My SPACE** is a Chrome extension that runs a full PostgreSQL database (via PGlite/WASM) directly in the browser with zero backend.

**No infrastructure needed at all:**
- DB: PGlite (PostgreSQL compiled to WASM) → persisted to IndexedDB
- Crypto: Web Crypto API, AES-GCM 256-bit
- Sync: optional, to your *own* Google Drive appDataFolder — encrypted before upload
- Hosting: GitHub Pages for the landing page (static HTML, no server)

**What it does:**
- Markdown notes with tag search
- Secret vault (passwords, API keys, tokens)
- Password generator
- Subscription tracker with multi-currency spend

**For the self-hosters specifically:** the Drive sync uses `appDataFolder` which is private to the app. If you don't trust Drive, you can skip sync entirely — all data stays in your browser's IndexedDB. Export/import is also available (JSON).

Open source → github.com/cuongquachc88/my-space
Chrome Web Store → [link]
