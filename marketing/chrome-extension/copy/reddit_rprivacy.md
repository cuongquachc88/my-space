# Reddit — r/privacy

**Title:**
I built a Chrome extension password manager that runs 100% locally — no accounts, no servers, AES-GCM encrypted

**Body:**
I was frustrated that most password managers either require an account or send data to a cloud by default. I wanted something that just... stays on my device.

So I built **My SPACE** — a Chrome side panel extension:

**Privacy properties:**
- All data stored in browser IndexedDB — never touches a server
- Secrets encrypted at rest with AES-GCM 256-bit (Web Crypto API)
- Optional Drive backup: data is encrypted *locally before upload* — Google gets ciphertext only
- No analytics, no telemetry, no third-party SDKs at all
- No account required

**Tech for the curious:**
- Uses PGlite (PostgreSQL in WASM) running in an offscreen document
- PBKDF2 key derivation (600,000 iterations, SHA-256) from master password
- Random 12-byte IV per encrypt — no IV reuse possible
- `chrome.identity.getAuthToken` for OAuth — no redirect URI, no secret stored in extension

Open source: github.com/cuongquachc88/my-space

[Chrome Web Store link]

Curious what the privacy community thinks — anything I should harden?
