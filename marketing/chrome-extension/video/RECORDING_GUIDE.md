# Demo Video Recording Guide

Target: **90-second MP4**, 1920×1080 or 1280×720, for Chrome Web Store + YouTube.

---

## Tools

| Tool | Platform | Free? |
|---|---|---|
| **QuickTime Player** | macOS | ✓ — File → New Screen Recording |
| **OBS Studio** | Mac/Win/Linux | ✓ — obsproject.com |
| **Loom** | Any | ✓ free tier — loom.com |
| **ScreenStudio** | macOS | Paid — nice cursor effects |

Recommended: **OBS** for full control, or **Loom** for quick share.

---

## Pre-Recording Checklist

- [ ] Load extension from `chrome-extension/dist/`
- [ ] Pre-load seed data (see `screenshots/HOW_TO_CAPTURE.md`)
- [ ] Vault unlocked and ready
- [ ] Close all other Chrome tabs / notifications
- [ ] Set display to 1920×1080 or 1280×720
- [ ] Microphone off (no voiceover needed — captions only)
- [ ] Record at 60fps if possible
- [ ] Hide bookmarks bar (`⌘⇧B`) for clean look

---

## Script (no voiceover — timed actions)

```
[0:00–0:03]  Chrome with a regular webpage open
             → Click My SPACE icon in toolbar
             → Side panel slides open

[0:03–0:08]  TITLE CARD: "My SPACE"
             Subtitle: "Your private vault — right in the side panel"

[0:08–0:22]  NOTES
             → Click Notes tab
             → Open "Meeting notes" note — Markdown renders
             → Type a line in a new note
             → Tag it with [work]
             → Search "meeting" — filtered result appears

[0:22–0:38]  VAULT
             → Click Vault tab (shows locked state)
             → Type master password → click Unlock
             → Secret list appears
             → Click eye icon on "GitHub Token" — value reveals
             → Click eye again — hidden
             → Click + Add → fill label "AWS Key" + value → Save

[0:38–0:48]  PASSWORD GENERATOR
             → Click Generator tab
             → Drag length slider to 24
             → Toggle Symbols on
             → Click Regenerate 2-3 times (show randomness)
             → Click Copy → "Copied!" flash

[0:48–1:02]  SUBSCRIPTIONS
             → Click Subs tab
             → Monthly total visible in header (USD)
             → Change dropdown to VND → total converts instantly
             → Click + Add → fill "Netflix" 15.99 USD monthly → Save
             → Total updates

[1:02–1:18]  SYNC
             → Click Sync tab
             → Click ↑ Push
             → Terminal console animates:
               › [13:05:01] Exporting database…
               › [13:05:02] Encrypting vault…
               › [13:05:03] Uploading to Drive…
               ✓ [13:05:04] Push complete
             → Progress bar fills green

[1:18–1:25]  TITLE CARD (full screen dark)
             "Private. Encrypted. Yours."
             "Free on the Chrome Web Store"
             [CTA button mockup]

[1:25–1:30]  FADE OUT
```

---

## Editing

Recommended editors:
- **DaVinci Resolve** (free, Mac/Win/Linux) — davinciresolve.com
- **iMovie** (macOS) — free, simpler
- **CapCut** (web/desktop) — free, good captions

### Cuts to make
1. Trim dead time between actions (keep pauses < 0.5s)
2. Add subtle zoom-in (1.05×) on key UI elements
3. Add captions from the Script above
4. Add background music: lo-fi, ~60 BPM, low volume (Pixabay has free tracks)
5. Color grade: slight cool tone, slight vignette

### Export settings
- Format: MP4 H.264
- Resolution: 1920×1080
- FPS: 30 or 60
- Audio: none (no voiceover) or music at -20dB
- File size: aim < 100MB for Web Store upload

---

## Where to Upload

| Platform | Purpose | Settings |
|---|---|---|
| YouTube | Chrome Web Store demo link | Unlisted, no age restriction |
| Loom | Reddit / HN embeds | Public link, no download |
| GitHub Releases | Download for power users | Attach to v0.1.x release |

---

## Thumbnail (YouTube)

- 1280×720 px
- Background: `#0D1117`
- Left side: screenshot of terminal sync console
- Right side: "My SPACE" in Syne 800 white, 72px
- Subtext: "Private Chrome Vault" — DM Sans, 28px, indigo `#6366F1`
