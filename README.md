# My SPACE

Private, offline-first vault for notes, secrets, passwords, and subscriptions.

## Structure

```
my-space/
├── chrome-extension/   Chrome MV3 side panel extension (TypeScript + React + Vite)
├── android/            Android app (Kotlin + Jetpack Compose)
└── docs/               GitHub Pages landing page + privacy policy + ToS
```

## Chrome Extension

```bash
cd chrome-extension
npm install
npm run dev        # watch build
npm run pack       # build + zip → output/
```

## Android

Open `android/` in Android Studio. Requires Android SDK 26+.
