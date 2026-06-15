# Screenshot Capture Guide

Chrome Web Store accepts **1280×800 px** or **640×400 px** PNG/JPEG.

---

## Setup

1. Open Chrome → `chrome://extensions` → enable **Developer mode** → load unpacked → `chrome-extension/dist/`
2. Open a new tab → click the My SPACE toolbar icon → side panel opens
3. Set Chrome window to exactly **1280×800** (or use a browser resize extension)
4. Pre-populate data so screenshots look realistic (see seed data below)

### Seed Data

```
Notes:
  - Title: "Meeting notes — Q3 planning"
    Content: "## Action items\n- [ ] Review roadmap\n- [ ] Update timeline\n- [x] Book venue\n\n**Owner:** @cuong"
    Tags: [work, planning]

  - Title: "Recipe — Pho Bo"
    Content: "Ingredients:\n- Beef bones\n- Star anise\n- Cinnamon\n\nSoak bones 1hr, boil 6hrs"
    Tags: [personal, food]

Secrets:
  - Label: "GitHub Token"   (value: ghp_xxxxxxxxxxxxxxxxxx)
  - Label: "AWS Access Key" (value: AKIA...)
  - Label: "OpenAI API Key" (value: sk-...)

Subscriptions:
  - Netflix  — $15.99/mo  USD
  - Spotify  — $9.99/mo   USD
  - ChatGPT  — $20.00/mo  USD
  - Figma    — $15.00/mo  USD
  - Adobe CC — 600,000₫/mo VND
```

---

## Screenshot 1 — Notes View

1. Click **Notes** tab
2. Open the "Meeting notes" note
3. Make sure Markdown is rendered (checkboxes visible)
4. Screenshot the full side panel
5. Save as `screenshots/01-notes.png`

**Overlay text:** "Markdown notes — always within reach"

---

## Screenshot 2 — Secret Vault

1. Click **Vault** tab
2. Unlock with master password
3. Show secret list — **do not reveal** any actual values (keep dots)
4. Screenshot
5. Save as `screenshots/02-vault.png`

**Overlay text:** "AES-256 encrypted. Only you hold the key."

---

## Screenshot 3 — Password Generator

1. Click **Generator** tab
2. Set length to **20**
3. Enable all charsets (upper, lower, digits, symbols)
4. Generate a password — make sure it's visible (not blank)
5. Screenshot
6. Save as `screenshots/03-generator.png`

**Overlay text:** "Strong passwords in one click"

---

## Screenshot 4 — Subscriptions

1. Click **Subs** tab
2. Make sure seed subscriptions are loaded
3. Set display currency to **VND** to show multi-currency conversion
4. Screenshot with the monthly total visible in header
5. Save as `screenshots/04-subscriptions.png`

**Overlay text:** "Track every recurring cost — in your currency"

---

## Screenshot 5 — Sync

1. Click **Sync** tab
2. Connect to Google Drive (or mock with a prior push)
3. Click **↑ Push** and let the terminal console animate through all steps
4. Screenshot when "Push complete ✓" is visible
5. Save as `screenshots/05-sync.png`

**Overlay text:** "End-to-end encrypted Drive backup"

---

## Adding Overlays (optional but recommended)

Use Figma, Canva, or Sketch:
1. Import screenshot as background
2. Add a semi-transparent dark bar at the bottom (height ~80px, `rgba(13,17,23,0.9)`)
3. Add overlay text in **Syne 700** or **DM Sans 500**, white, 24px
4. Export as PNG 1280×800

---

## Promo Tile (440×280)

Not required but boosts CTR in search results.

- Background: `#0D1117`
- Logo: `icon128.png` centered, ~64px
- Text: "My SPACE" — Syne 800, 48px, white
- Subtext: "Private. Encrypted. Yours." — DM Sans 300, 20px, `rgba(255,255,255,0.5)`
- Accent gradient bar (4px, full width bottom): `#6366f1 → #3b82f6 → #34d399`
