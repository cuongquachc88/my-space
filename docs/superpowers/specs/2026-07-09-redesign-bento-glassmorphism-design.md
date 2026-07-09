# My SPACE — Bento Glassmorphism Redesign

**Date:** 2026-07-09  
**Scope:** Full redesign — splash screen, unlock form, app shell, all 9 views  
**Approach:** Glassmorphism pastel system (Option A)

---

## 1. Design System Tokens

### Colors

```
Background:     animated gradient #c9d6ff → #e2e2e2 → #f5c6cb (pastel blue/gray/pink)
Surface card:   rgba(255,255,255,0.45) + backdrop-filter: blur(20px)
Surface hover:  rgba(255,255,255,0.65)
Border:         rgba(255,255,255,0.6)

Text primary:   #1a1a2e
Text secondary: #4a4a6a

Accent purple:  #7c6af7
Accent pink:    #f472b6
Accent cyan:    #38bdf8
Accent green:   #34d399

Feature accents (per-view):
  Notes:         #6366f1 (indigo)
  Vault:         #f59e0b (amber)
  Todo:          #38bdf8 (cyan)
  Subscriptions: #34d399 (green)
  Maps:          #fb923c (orange)
  Generator:     #a78bfa (violet)
  Reports:       #f472b6 (pink)
  Sync:          #3b82f6 (blue)
  Settings:      #94a3b8 (slate)
```

### Typography

| Role       | Font          | Weight | Size  | Letter-spacing |
|------------|---------------|--------|-------|----------------|
| Display    | Clash Display | 800    | 48–64px | -0.02em      |
| Heading    | Clash Display | 600–700| 24–32px | -0.01em      |
| Subheading | Satoshi       | 600    | 18px  | 0             |
| Body       | Satoshi       | 400    | 15px  | 0             |
| Small      | Satoshi       | 400    | 13px  | 0.01em        |
| Mono       | Satoshi Mono  | 400    | 13–15px | 0            |

Scale: 11 / 13 / 15 / 18 / 24 / 32 / 48 / 64px

Fonts loaded via Google Fonts CDN:
- `Clash Display` — Variable, 200–700 (from fontshare.com or CDN)
- `Satoshi` — Variable, 300–900 (from fontshare.com or CDN)

### Spacing & Radius

```
Base unit:       4px
Card radius:     20px
Button radius:   100px (pill)
Input radius:    12px
Icon radius:     10px (wrapper)
Bento gap:       12px
Section padding: 16px mobile / 24px desktop
Max content width: 900px
```

### Elevation / Glass

```
Card default:  background rgba(255,255,255,0.45), blur(20px), border rgba(255,255,255,0.6) 1px
Card hover:    background rgba(255,255,255,0.65), transition 200ms ease
Modal:         background rgba(255,255,255,0.55), blur(28px)
Nav pill:      background rgba(255,255,255,0.35), blur(16px)
Shadow:        0 4px 24px rgba(124,106,247,0.08)
```

---

## 2. Animated Background

Single `<div class="app-bg">` fixed full-screen, z-index 0. All content z-index > 0.

```css
@keyframes gradientShift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.app-bg {
  position: fixed;
  inset: 0;
  background: linear-gradient(135deg, #c9d6ff, #e2e2e2, #f5c6cb, #d4e4ff);
  background-size: 400% 400%;
  animation: gradientShift 12s ease infinite;
  z-index: 0;
}

@media (prefers-reduced-motion: reduce) {
  .app-bg { animation: none; background-position: 0% 50%; }
}
```

Background persists across all views — no reset on navigate.

---

## 3. App Icon

**Shape:** Rounded square (superellipse, iOS-style)  
**Size:** 80×80 splash, 40×40 unlock form, 32×32 nav

```
Background: linear-gradient(135deg, #7c6af7, #38bdf8)
Symbol:     Shield outline (duotone stroke)
            + 3×3 dot grid inside shield
Stroke:     white, 2px, round caps
Fill:       white @ 25% opacity inside shield body
```

SVG inline — no external dependency.

---

## 4. Splash Screen

**Duration:** 2 seconds total  
**Sequence:**

```
0.0s  Background gradient visible (already animating)
0.0s  App icon: scale(0.8) opacity(0) → scale(1.0) opacity(1), 600ms ease-out
0.3s  "My SPACE" text: opacity(0) → opacity(1), 400ms ease
0.8s  Tagline: "Your private space." opacity(0) → opacity(1), 300ms ease
1.4s  Begin fade-out: whole splash opacity(1) → opacity(0), 400ms
1.8s  Unlock form slides up from bottom, 300ms ease-out
2.0s  Splash unmounted
```

**Layout:**
```
Full screen, flex center column
├── App icon SVG 80×80
├── "My SPACE" — Clash Display 700, 32px, #1a1a2e
└── "Your private space." — Satoshi 400, 15px, #4a4a6a
```

---

## 5. Unlock Form

**Layout:** Centered glass card on gradient background

```
Card: 360px wide, 20px radius, glass surface
├── App icon 40×40
├── "My SPACE" — Clash Display 700, 24px
├── "Enter your master password" — Satoshi 400, 14px, text-secondary
├── Password input (glass style, 12px radius, show/hide toggle)
├── Error message area (red text, 13px) — only visible on wrong password
├── "Unlock" button — pill, gradient #7c6af7→#f472b6, Satoshi 600 16px
└── "First time? Create a password" — link text, 13px, text-secondary
```

**First-launch state:** Same card, form switches to:
- "Create your master password"
- Password input + Confirm password input
- "Create & Enter" pill button

**On unlock animation:**
- Card: scale(1) → scale(0.95) + opacity(1) → opacity(0), 250ms
- App shell slides in from right, 300ms ease-out

---

## 6. App Shell

### Animated Background
Single persistent `AppBackground` component, fixed full-screen, z-index 0.

### Side Rail (Desktop ≥ 768px)

```
Width: 56px collapsed, 200px expanded (hover)
Position: fixed left, full height
Background: glass rgba(255,255,255,0.35) blur(16px)
Border-right: rgba(255,255,255,0.5) 1px
Transition: width 200ms ease

Top: App icon 32×32 + "My SPACE" label (hidden collapsed)

Nav items (9 tabs):
  Icon 24px + Label text (hidden collapsed, visible expanded)
  Active: accent-colored background pill (full width, 8px mx)
          icon stroke + fill, label Satoshi 600
  Inactive: icon stroke only, 60% opacity

Bottom (pinned): Settings icon

Tooltip on collapsed hover: label in glass pill, right of rail
```

### Bottom Pill Nav (Mobile < 768px)

```
Position: fixed bottom, 16px from edges
Shape: pill, auto width, max 360px, centered
Background: glass rgba(255,255,255,0.45) blur(20px)
Border: rgba(255,255,255,0.6) 1px
Padding: 8px 12px
Height: 64px

Primary tabs (5 visible): Notes, Vault, Todo, Subs, Maps
Center FAB: +8px taller than siblings, gradient #7c6af7→#f472b6 pill
            Opens quick-add context menu (Notes, Task, Secret, Pin)

Active: icon stroke + fill, accent color dot 4px below
Inactive: stroke only, 60% opacity

Overflow tabs (Generator, Reports, Sync, Settings):
  Via "···" button → slide-up tray (glass, 20px radius top)
```

### Main Content Area

```
Left: 56px offset (desktop rail) / 0 (mobile)
Bottom: 80px offset (mobile nav) / 0 (desktop)
Padding: 16px mobile / 24px desktop
Max-width: 900px, centered on desktop
```

---

## 7. Bento Grid Layout

### Common Header Card (all views)

```
Full width, glass card, 20px radius
├── 3px accent color bar (top edge, full width, border-radius 20px 20px 0 0)
├── Feature icon (duotone 32px) + View title (Clash Display 700, 28px)
├── Stats/subtitle (Satoshi 400, 14px, text-secondary)
└── Primary action button (pill, accent color)
```

### Per-View Bento

**Notes** (indigo `#6366f1`)
```
Row 1: [2/3] Note list + search bar    [1/3] Tag cloud + note count
Row 2: [full] Selected note editor — Markdown textarea + preview toggle
```

**Vault** (amber `#f59e0b`)
```
Row 1: [1/2] Secret list               [1/2] Quick-add secret form
Row 2: [full] Secret detail — blurred by default, tap to reveal
```

**Todo** (cyan `#38bdf8`)
```
Row 1: [1/3] List selector + colors    [2/3] Tasks in selected list
Row 2: [full] Task detail / edit panel
```

**Subscriptions** (green `#34d399`)
```
Row 1: [1/3] Total spend (big number)  [2/3] Subscription list
Row 2: [full] Bills history / monthly breakdown
```

**Maps** (orange `#fb923c`)
```
Row 1: [1/3] Stack selector            [2/3] Map view (Leaflet)
Row 2: [1/2] Pin list                  [1/2] Pin detail card
```

**Generator** (violet `#a78bfa`)
```
Row 1: [full] Generated password — Satoshi Mono, large, copyable
Row 2: [1/2] Config (length, charset sliders)  [1/2] Copy history
```

**Reports** (pink `#f472b6`)
```
Row 1: [full] 6-month billing chart (full-width bento)
Row 2: [1/3] This month   [1/3] Expected   [1/3] Delta
```

**Sync** (blue `#3b82f6`)
```
Row 1: [1/2] Connection status card    [1/2] Last sync timestamp
Row 2: [full] Sync log + action buttons
```

**Settings** (slate `#94a3b8`)
```
Row 1: [1/2] Security settings         [1/2] Appearance settings
Row 2: [full] About / version info
```

---

## 8. Custom Icon System

### Grid & Geometry

```
ViewBox: 24×24
Stroke width: 2px
Stroke cap: round
Stroke join: round
Fill: feature accent @ 25–30% opacity (inner shape only)
Rectangle corners: rx="2"
```

### Icon Definitions

| Icon | Stroke shape | Accent fill area |
|------|-------------|-----------------|
| Notes | Notebook rectangle 6×8 + spiral binding left + 3 horizontal lines | Lines area |
| Vault | Shield outline + keyhole center | Shield body |
| Todo | Checkbox square + checkmark + 2 task lines right | Checkbox interior |
| Subscriptions | Credit card rectangle + top strip + wifi arc bottom-right | Top strip |
| Maps | Teardrop pin + center dot | Pin body |
| Generator | 6-pointed asterisk + center hexagon | Center hexagon |
| Reports | 3 ascending bars | Each bar top half |
| Sync | 2 circular arrows | Center enclosed area |
| Settings | 6-tooth gear + center circle | Center circle |
| Lock | Padlock body + shackle arc | Padlock body |
| App icon | Shield + 3×3 dot grid | Shield body |

### Usage Sizes

| Context | Size | Style |
|---------|------|-------|
| Nav inactive | 24px | stroke only, 60% opacity |
| Nav active | 24px | stroke + accent fill |
| View header | 32px | stroke + accent fill |
| Bento decoration | 48px | stroke + accent fill |

---

## 9. Component Library

### Glass Card
```tsx
// Base reusable card — all bento cells use this
background: rgba(255,255,255,0.45)
backdropFilter: blur(20px)
border: 1px solid rgba(255,255,255,0.6)
borderRadius: 20px
boxShadow: 0 4px 24px rgba(124,106,247,0.08)
```

### Pill Button
```
Variants: primary (gradient), secondary (glass), ghost (transparent)
Radius: 100px
Padding: 10px 24px
Font: Satoshi 600, 15px
Transition: transform 150ms, opacity 150ms
Active: scale(0.96)
```

### Glass Input
```
Background: rgba(255,255,255,0.4)
Border: 1px solid rgba(255,255,255,0.6)
Radius: 12px
Padding: 12px 16px
Font: Satoshi 400, 15px, #1a1a2e
Focus: border rgba(124,106,247,0.6), box-shadow 0 0 0 3px rgba(124,106,247,0.12)
```

---

## 10. File Structure Changes

### New files to create
```
pwa/src/
├── design/
│   ├── tokens.ts          — design token constants
│   ├── icons.tsx          — all custom SVG icon components
│   └── components/
│       ├── GlassCard.tsx
│       ├── PillButton.tsx
│       ├── GlassInput.tsx
│       ├── BentoGrid.tsx
│       └── AppIcon.tsx
├── app/
│   ├── SplashScreen.tsx   — 2s animated splash
│   ├── UnlockForm.tsx     — master password entry
│   ├── AppShell.tsx       — shell with hybrid nav
│   ├── NavRail.tsx        — desktop side rail
│   └── NavPill.tsx        — mobile bottom pill
```

### Files to replace
```
pwa/src/landing/LandingPage.tsx    → DELETE (replaced by SplashScreen + UnlockForm)
pwa/src/App.tsx                    → Rewrite — orchestrate Splash → Unlock → Shell
pwa/src/app/views/*.tsx            → Refactor all 9 views to use bento layout + new components
pwa/src/index.css                  → Add font imports, CSS tokens, glass utilities
```

---

## 11. Implementation Order

1. `design/tokens.ts` + `design/icons.tsx` — design system foundation
2. `GlassCard`, `PillButton`, `GlassInput`, `BentoGrid` — component library
3. `AppBackground` — animated gradient (shared)
4. `SplashScreen` + `UnlockForm` — entry flow
5. `AppShell` + `NavRail` + `NavPill` — navigation shell
6. Views (order): Notes → Vault → Todo → Subs → Maps → Generator → Reports → Sync → Settings
7. Font imports + CSS variables in `index.css`
8. Remove `LandingPage.tsx`, update `App.tsx` orchestration
