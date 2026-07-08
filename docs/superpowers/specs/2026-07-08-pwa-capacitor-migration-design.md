# PWA + Capacitor Migration Design

**Date:** 2026-07-08  
**Status:** Approved — executing

---

## Context

My SPACE was a monorepo with three clients:
- `chrome-extension/` — mature Chrome MV3 side panel (PGlite offscreen, full features)
- `android/` — Kotlin/Compose native app (now removed)
- `pwa/` — React PWA (started, ~70% feature complete)

**Goal:** Make `pwa/` the canonical cross-platform client. Wrap it with Capacitor for Android + iOS. Keep `chrome-extension/` independent.

---

## Architecture

```
my-space/
├── chrome-extension/   # unchanged — MV3 side panel, independent lifecycle
├── pwa/                # canonical app — React + Vite + PGlite + Capacitor
│   ├── src/
│   │   ├── app/
│   │   │   ├── AppShell.tsx          # responsive: sidebar (md+) / bottom nav (mobile)
│   │   │   ├── views/                # all 9 views
│   │   │   ├── components/
│   │   │   └── lib/
│   │   ├── crypto/index.ts           # AES-GCM, PBKDF2 — unchanged
│   │   ├── db/index.ts               # PGlite IdbFs — extended schema
│   │   ├── landing/LandingPage.tsx   # unchanged
│   │   └── App.tsx
│   ├── android/        # Capacitor-generated (gitignored build outputs)
│   ├── ios/            # Capacitor-generated
│   └── capacitor.config.ts
└── docs/
```

---

## Data Model (full parity with extension)

### New tables (added to `pwa/src/db/index.ts`)

**todo_lists** — color-coded lists  
**todo_tasks** — tasks with priority, due_date, recurrence (none/daily/weekly/monthly), done  
**map_stacks** — named pin collections with color + icon  
**map_pins** — rich: lat, lng, url, note, priority, category, rating (0-5), review_note  
**bills** — actual billing records per subscription per month  

Existing tables (notes, secrets, todos, subscriptions, map_pins) are migrated: the simple `todos` and `map_pins` tables are replaced by the richer schema above.

---

## Layout: Responsive AppShell

Single `AppShell.tsx` responds to viewport width:

- **Mobile (< 768px):** bottom tab bar (current behaviour)  
- **Desktop (≥ 768px):** left sidebar (fixed 220px), icon + label, content fills remaining width

9 tabs: Notes, Vault, Todo, Subs, Maps, Generator, Reports, Sync, Settings

---

## Views: Feature Parity with Extension

| View | Current PWA state | Target |
|---|---|---|
| Notes | ✅ complete | no change |
| Vault | ✅ complete | no change |
| Todo | ⚠️ simple (flat tasks) | lists + tasks + recurrence |
| Subscriptions | ✅ complete | no change |
| Maps | ⚠️ simple (flat pins) | stacks + rich pins |
| Generator | ✅ complete | no change |
| **Reports** | ❌ missing | port from extension |
| Sync | ✅ complete | no change |
| Settings | ✅ complete | no change |

### Reports View
Ported from `chrome-extension/src/sidepanel/views/ReportsView.tsx`:
- Per-subscription bill rows with expected vs actual
- 6-month bar chart (canvas, no external charting lib)
- Bill upsert/delete inline
- Display currency selector (USD/EUR/GBP/VND/JPY/SGD)

---

## Capacitor Shell

- Init Capacitor inside `pwa/`
- Platforms: `android`, `ios`
- `webDir: dist` — Capacitor serves from the Vite build output
- Plugins:
  - `@capacitor/app` — back button handling
  - `@capacitor/haptics` — touch feedback
  - `@capacitor/status-bar` — teal status bar color
  - `@capacitor/splash-screen` — branded splash

Vault unlock uses the existing Web Crypto PBKDF2 flow (same as browser). Native biometrics (`@capacitor-community/biometric-auth`) can be layered on later without changing the crypto layer.

---

## What stays the same

- **Crypto layer** (`pwa/src/crypto/index.ts`) — no changes, same AES-GCM/PBKDF2 as extension
- **Drive sync format** — same `keyvault-backup.json` schema, cross-platform compatible
- **Chrome extension** — completely independent, not touched

---

## Build targets

| Target | Command | Output |
|---|---|---|
| Browser PWA | `npm run build` in `pwa/` | `pwa/dist/` |
| Android APK | `npx cap sync && npx cap open android` | Android Studio |
| iOS | `npx cap sync && npx cap open ios` | Xcode |
