# Bento Glassmorphism Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the entire My SPACE PWA with glassmorphism pastel aesthetic, bento grid layouts, custom duotone SVG icons, Clash Display + Satoshi typography, animated gradient background, splash screen, and hybrid nav.

**Architecture:** Animated gradient background persists full-screen behind all views. Entry flow: SplashScreen (2s) → UnlockForm (master password) → AppShell. AppShell renders hybrid nav (desktop side rail / mobile bottom pill) + current view. All views refactored to bento grid layout using shared GlassCard component.

**Tech Stack:** React 19, Tailwind v4, TypeScript, Vite, PGlite, Web Crypto API. Fonts via Fontshare CDN (Clash Display, Satoshi). All icons hand-coded SVG inline.

## Global Constraints

- Tailwind v4 (import-based in index.css — no tailwind.config.js)
- No new runtime dependencies — fonts via CDN link in index.html only
- All icons: 24×24 viewBox, 2px stroke, strokeLinecap/Join="round", currentColor stroke, feature accent @ 25% opacity fill
- CSS custom properties for all design tokens (defined in index.css :root)
- `prefers-reduced-motion`: gradient animation disabled, static fallback
- Capacitor safe-area classes must be preserved on nav components
- Vault crypto unlock lifted to App level — VaultView no longer shows password form

---

## File Structure

**Create:**
- `pwa/src/design/tokens.ts` — token constants (colors, radii, shadows)
- `pwa/src/design/icons.tsx` — all custom SVG icon components
- `pwa/src/design/GlassCard.tsx` — base glass card component
- `pwa/src/design/PillButton.tsx` — pill button (primary/secondary/ghost)
- `pwa/src/design/GlassInput.tsx` — glass-style input
- `pwa/src/design/BentoGrid.tsx` — asymmetric grid wrapper
- `pwa/src/design/AppBackground.tsx` — animated gradient background
- `pwa/src/SplashScreen.tsx` — 2s animated splash
- `pwa/src/UnlockForm.tsx` — master password entry (create + unlock modes)
- `pwa/src/app/NavRail.tsx` — desktop side rail (56px/200px)
- `pwa/src/app/NavPill.tsx` — mobile bottom pill nav

**Modify:**
- `pwa/index.html` — add Fontshare CDN links
- `pwa/src/index.css` — replace CSS variables, add glass utilities, font stack
- `pwa/src/App.tsx` — orchestrate Splash → Unlock → Shell
- `pwa/src/app/AppShell.tsx` — use NavRail + NavPill, animated background
- `pwa/src/app/views/NotesView.tsx` — bento layout
- `pwa/src/app/views/VaultView.tsx` — bento layout, remove inline unlock form
- `pwa/src/app/views/TodoView.tsx` — bento layout
- `pwa/src/app/views/SubscriptionsView.tsx` — bento layout
- `pwa/src/app/views/MapView.tsx` — bento layout
- `pwa/src/app/views/GeneratorView.tsx` — bento layout
- `pwa/src/app/views/ReportsView.tsx` — bento layout
- `pwa/src/app/views/SyncView.tsx` — bento layout
- `pwa/src/app/views/SettingsView.tsx` — bento layout

**Delete:**
- `pwa/src/landing/LandingPage.tsx`

---

## Task 1: Design Tokens + Font Setup

**Files:**
- Create: `pwa/src/design/tokens.ts`
- Modify: `pwa/index.html`
- Modify: `pwa/src/index.css`

**Interfaces:**
- Produces: `ACCENT` record, `GLASS` object, `RADIUS` object exported from `tokens.ts`; CSS custom properties `--glass-bg`, `--glass-border`, `--text-primary`, `--text-secondary` available globally

- [ ] **Step 1: Add Fontshare CDN to index.html**

In `pwa/index.html`, inside `<head>`, add after the existing `<title>`:
```html
<link rel="preconnect" href="https://api.fontshare.com">
<link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=clash-display@200,300,400,500,600,700&f[]=satoshi@300,400,500,600,700,900&display=swap">
```

- [ ] **Step 2: Create tokens.ts**

```typescript
// pwa/src/design/tokens.ts
export const ACCENT: Record<string, string> = {
  notes:   '#6366f1',
  vault:   '#f59e0b',
  todo:    '#38bdf8',
  subs:    '#34d399',
  maps:    '#fb923c',
  gen:     '#a78bfa',
  reports: '#f472b6',
  sync:    '#3b82f6',
  settings:'#94a3b8',
  purple:  '#7c6af7',
  pink:    '#f472b6',
}

export const GLASS = {
  bg:        'rgba(255,255,255,0.45)',
  bgHover:   'rgba(255,255,255,0.65)',
  border:    'rgba(255,255,255,0.6)',
  blur:      'blur(20px)',
  shadow:    '0 4px 24px rgba(124,106,247,0.08)',
  navBg:     'rgba(255,255,255,0.35)',
  navBlur:   'blur(16px)',
} as const

export const RADIUS = {
  card:   '20px',
  button: '100px',
  input:  '12px',
  icon:   '10px',
} as const

export const TEXT = {
  primary:   '#1a1a2e',
  secondary: '#4a4a6a',
} as const
```

- [ ] **Step 3: Replace index.css**

Replace entire `pwa/src/index.css` with:
```css
@import "tailwindcss";

:root {
  --glass-bg:        rgba(255,255,255,0.45);
  --glass-bg-hover:  rgba(255,255,255,0.65);
  --glass-border:    rgba(255,255,255,0.6);
  --glass-shadow:    0 4px 24px rgba(124,106,247,0.08);
  --text-primary:    #1a1a2e;
  --text-secondary:  #4a4a6a;
  --radius-card:     20px;
  --radius-button:   100px;
  --radius-input:    12px;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: #c9d6ff;
  color: var(--text-primary);
  font-family: 'Satoshi', system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4, h5, h6 {
  font-family: 'Clash Display', system-ui, sans-serif;
}

.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
}

.glass:hover { background: var(--glass-bg-hover); }

.safe-area-pb { padding-bottom: env(safe-area-inset-bottom); }
.safe-area-pt { padding-top: env(safe-area-inset-top); }

/* Markdown */
.prose h1 { font-family: 'Clash Display', sans-serif; font-size: 1.5rem; font-weight: 700; margin: 0.5rem 0; color: var(--text-primary); }
.prose h2 { font-family: 'Clash Display', sans-serif; font-size: 1.25rem; font-weight: 600; margin: 0.5rem 0; color: var(--text-primary); }
.prose h3 { font-size: 1.1rem; font-weight: 600; margin: 0.4rem 0; color: var(--text-primary); }
.prose p  { margin: 0.25rem 0; line-height: 1.6; color: var(--text-primary); }
.prose ul, .prose ol { padding-left: 1.25rem; margin: 0.25rem 0; }
.prose li { margin: 0.15rem 0; }
.prose code { background: rgba(99,102,241,0.1); padding: 0.1em 0.3em; border-radius: 4px; font-size: 0.875em; font-family: 'Satoshi', monospace; }
.prose pre { background: rgba(99,102,241,0.08); padding: 0.75rem; border-radius: 12px; overflow-x: auto; margin: 0.5rem 0; }
.prose pre code { background: none; padding: 0; }
.prose a { color: #7c6af7; text-decoration: underline; }
.prose blockquote { border-left: 3px solid #7c6af7; padding-left: 0.75rem; opacity: 0.8; margin: 0.25rem 0; }
.prose table { border-collapse: collapse; width: 100%; font-size: 0.875rem; }
.prose th, .prose td { border: 1px solid var(--glass-border); padding: 0.35rem 0.6rem; text-align: left; }
.prose th { background: rgba(124,106,247,0.08); }
.prose hr { border: none; border-top: 1px solid var(--glass-border); margin: 0.75rem 0; }
.prose strong { font-weight: 700; }
.prose em { font-style: italic; }
```

- [ ] **Step 4: Commit**

```bash
git add pwa/index.html pwa/src/index.css pwa/src/design/tokens.ts
git commit -m "feat: design tokens, font setup, glass CSS utilities"
```

---

## Task 2: Custom SVG Icon System

**Files:**
- Create: `pwa/src/design/icons.tsx`

**Interfaces:**
- Produces: `IconNotes`, `IconVault`, `IconTodo`, `IconSubs`, `IconMaps`, `IconGen`, `IconReports`, `IconSync`, `IconSettings`, `IconLock`, `IconAppShield` — all accept `{ size?: number; accent?: string; filled?: boolean; className?: string }`

- [ ] **Step 1: Create icons.tsx**

```tsx
// pwa/src/design/icons.tsx
interface IconProps {
  size?: number
  accent?: string
  filled?: boolean
  className?: string
}

function Icon({ size = 24, children, className }: { size?: number; children: React.ReactNode; className?: string }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  )
}

export function IconNotes({ size = 24, accent = '#6366f1', filled = false, className }: IconProps) {
  return (
    <Icon size={size} className={className}>
      {filled && <rect x="5" y="3" width="11" height="18" rx="2" fill={accent} fillOpacity="0.25" stroke="none" />}
      <rect x="5" y="3" width="11" height="18" rx="2" />
      {/* spiral binding */}
      <circle cx="5" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="5" cy="17" r="1" fill="currentColor" stroke="none" />
      {/* lines */}
      <line x1="8" y1="8" x2="14" y2="8" />
      <line x1="8" y1="12" x2="14" y2="12" />
      <line x1="8" y1="16" x2="12" y2="16" />
    </Icon>
  )
}

export function IconVault({ size = 24, accent = '#f59e0b', filled = false, className }: IconProps) {
  return (
    <Icon size={size} className={className}>
      {filled && <path d="M12 2 L20 6 L20 13 C20 17 16 20 12 22 C8 20 4 17 4 13 L4 6 Z" fill={accent} fillOpacity="0.25" stroke="none" />}
      <path d="M12 2 L20 6 L20 13 C20 17 16 20 12 22 C8 20 4 17 4 13 L4 6 Z" />
      {/* keyhole */}
      <circle cx="12" cy="11" r="2" />
      <line x1="12" y1="13" x2="12" y2="16" />
    </Icon>
  )
}

export function IconTodo({ size = 24, accent = '#38bdf8', filled = false, className }: IconProps) {
  return (
    <Icon size={size} className={className}>
      {filled && <rect x="3" y="5" width="9" height="9" rx="2" fill={accent} fillOpacity="0.25" stroke="none" />}
      <rect x="3" y="5" width="9" height="9" rx="2" />
      <polyline points="5,9.5 7,11.5 10,8" />
      <line x1="15" y1="8" x2="21" y2="8" />
      <line x1="15" y1="12" x2="21" y2="12" />
      <line x1="15" y1="16" x2="18" y2="16" />
    </Icon>
  )
}

export function IconSubs({ size = 24, accent = '#34d399', filled = false, className }: IconProps) {
  return (
    <Icon size={size} className={className}>
      {filled && <rect x="2" y="7" width="20" height="14" rx="2" fill={accent} fillOpacity="0.25" stroke="none" />}
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <rect x="2" y="7" width="20" height="5" rx="2" fill={accent} fillOpacity={filled ? "0.4" : "0"} stroke="none" />
      <rect x="2" y="7" width="20" height="5" rx="2" />
      {/* wifi arc bottom right */}
      <path d="M17 17 Q18.5 15.5 20 17" strokeWidth="1.5" />
    </Icon>
  )
}

export function IconMaps({ size = 24, accent = '#fb923c', filled = false, className }: IconProps) {
  return (
    <Icon size={size} className={className}>
      {filled && <path d="M12 2 C8.5 2 6 5 6 8.5 C6 13 12 20 12 20 C12 20 18 13 18 8.5 C18 5 15.5 2 12 2 Z" fill={accent} fillOpacity="0.25" stroke="none" />}
      <path d="M12 2 C8.5 2 6 5 6 8.5 C6 13 12 20 12 20 C12 20 18 13 18 8.5 C18 5 15.5 2 12 2 Z" />
      <circle cx="12" cy="8.5" r="2" />
    </Icon>
  )
}

export function IconGen({ size = 24, accent = '#a78bfa', filled = false, className }: IconProps) {
  return (
    <Icon size={size} className={className}>
      {filled && <polygon points="12,3 14.5,8 20,8 15.5,12 17.5,18 12,14.5 6.5,18 8.5,12 4,8 9.5,8" fill={accent} fillOpacity="0.25" stroke="none" />}
      <polygon points="12,3 14.5,8 20,8 15.5,12 17.5,18 12,14.5 6.5,18 8.5,12 4,8 9.5,8" />
      {/* center hexagon */}
      <polygon points="12,9 13.5,10.5 13.5,12.5 12,14 10.5,12.5 10.5,10.5" fill={accent} fillOpacity="0.4" stroke="none" />
    </Icon>
  )
}

export function IconReports({ size = 24, accent = '#f472b6', filled = false, className }: IconProps) {
  return (
    <Icon size={size} className={className}>
      {filled && (
        <>
          <rect x="4" y="13" width="4" height="8" rx="1" fill={accent} fillOpacity="0.25" stroke="none" />
          <rect x="10" y="9" width="4" height="12" rx="1" fill={accent} fillOpacity="0.25" stroke="none" />
          <rect x="16" y="5" width="4" height="16" rx="1" fill={accent} fillOpacity="0.25" stroke="none" />
        </>
      )}
      <rect x="4" y="13" width="4" height="8" rx="1" />
      <rect x="10" y="9" width="4" height="12" rx="1" />
      <rect x="16" y="5" width="4" height="16" rx="1" />
      <line x1="2" y1="21" x2="22" y2="21" strokeWidth="1.5" />
    </Icon>
  )
}

export function IconSync({ size = 24, accent = '#3b82f6', filled = false, className }: IconProps) {
  return (
    <Icon size={size} className={className}>
      {filled && <path d="M17 4 C20 7 20 17 12 18 C8 18 5 15 4 12" fill={accent} fillOpacity="0.15" stroke="none" />}
      <path d="M21 2 L17 4 L21 8" />
      <path d="M17 4 C20 7 20 17 12 18 C8 18 5 15 4 12" />
      <path d="M3 22 L7 20 L3 16" />
      <path d="M7 20 C4 17 4 7 12 6 C16 6 19 9 20 12" />
    </Icon>
  )
}

export function IconSettings({ size = 24, accent = '#94a3b8', filled = false, className }: IconProps) {
  return (
    <Icon size={size} className={className}>
      {filled && <circle cx="12" cy="12" r="3" fill={accent} fillOpacity="0.35" stroke="none" />}
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2 L12 5 M12 19 L12 22 M2 12 L5 12 M19 12 L22 12 M4.9 4.9 L7 7 M17 17 L19.1 19.1 M19.1 4.9 L17 7 M7 17 L4.9 19.1" strokeWidth="1.5" />
    </Icon>
  )
}

export function IconLock({ size = 24, accent = '#7c6af7', filled = false, className }: IconProps) {
  return (
    <Icon size={size} className={className}>
      {filled && <rect x="5" y="11" width="14" height="11" rx="2" fill={accent} fillOpacity="0.25" stroke="none" />}
      <rect x="5" y="11" width="14" height="11" rx="2" />
      <path d="M8 11 L8 7 C8 4.8 9.8 3 12 3 C14.2 3 16 4.8 16 7 L16 11" />
      <circle cx="12" cy="16" r="1.5" fill="currentColor" stroke="none" />
    </Icon>
  )
}

export function IconAppShield({ size = 24, accent = 'white', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 2 L20 6 L20 13 C20 17 16 20 12 22 C8 20 4 17 4 13 L4 6 Z"
        fill="rgba(255,255,255,0.25)" stroke="white" strokeWidth="2" strokeLinejoin="round" />
      {/* 3x3 dot grid */}
      {[8,12,16].flatMap(x => [8,12,16].map(y => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1" fill="white" />
      )))}
    </svg>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd pwa && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add pwa/src/design/icons.tsx
git commit -m "feat: custom duotone SVG icon system"
```

---

## Task 3: Shared Glass Components

**Files:**
- Create: `pwa/src/design/GlassCard.tsx`
- Create: `pwa/src/design/PillButton.tsx`
- Create: `pwa/src/design/GlassInput.tsx`
- Create: `pwa/src/design/BentoGrid.tsx`
- Create: `pwa/src/design/AppBackground.tsx`

**Interfaces:**
- Produces:
  - `GlassCard({ children, className?, accent?, accentBar? })` — glass card with optional top accent bar
  - `PillButton({ children, onClick, variant?, accent?, className?, type? })` — variant: `'primary'|'secondary'|'ghost'`
  - `GlassInput({ value, onChange, placeholder?, type?, className? })`
  - `BentoGrid({ children, className? })` — grid wrapper
  - `BentoCell({ children, span?, className? })` — span: `'1'|'2'|'3'|'full'`
  - `AppBackground()` — fixed full-screen gradient

- [ ] **Step 1: Create AppBackground.tsx**

```tsx
// pwa/src/design/AppBackground.tsx
export default function AppBackground() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        background: 'linear-gradient(135deg, #c9d6ff, #e2e2e2, #f5c6cb, #d4e4ff)',
        backgroundSize: '400% 400%',
        animation: 'gradientShift 12s ease infinite',
      }}
      aria-hidden="true"
    >
      <style>{`
        @keyframes gradientShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
```

- [ ] **Step 2: Create GlassCard.tsx**

```tsx
// pwa/src/design/GlassCard.tsx
interface Props {
  children: React.ReactNode
  className?: string
  accent?: string
  accentBar?: boolean
  style?: React.CSSProperties
}

export default function GlassCard({ children, className = '', accent, accentBar = false, style }: Props) {
  return (
    <div
      className={`glass ${className}`}
      style={{ borderRadius: 20, overflow: 'hidden', transition: 'background 200ms ease', ...style }}
    >
      {accentBar && accent && (
        <div style={{ height: 3, background: accent, width: '100%' }} />
      )}
      {children}
    </div>
  )
}
```

- [ ] **Step 3: Create PillButton.tsx**

```tsx
// pwa/src/design/PillButton.tsx
interface Props {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  accent?: string
  className?: string
  type?: 'button' | 'submit'
  disabled?: boolean
}

export default function PillButton({
  children, onClick, variant = 'primary', accent = '#7c6af7',
  className = '', type = 'button', disabled = false,
}: Props) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold transition-all active:scale-95 cursor-pointer border-0 outline-none'
  const radius = 'rounded-full'
  const padding = 'px-6 py-2.5'
  const font = 'text-[15px]'

  let style: React.CSSProperties = {}
  let extraClass = ''

  if (variant === 'primary') {
    style = {
      background: `linear-gradient(135deg, ${accent}, #f472b6)`,
      color: 'white',
      boxShadow: `0 4px 16px ${accent}40`,
    }
  } else if (variant === 'secondary') {
    style = {
      background: 'rgba(255,255,255,0.45)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.6)',
      color: '#1a1a2e',
    }
  } else {
    extraClass = 'text-[#4a4a6a] hover:text-[#1a1a2e]'
    style = { background: 'transparent' }
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${radius} ${padding} ${font} ${extraClass} ${className}`}
      style={{ ...style, opacity: disabled ? 0.5 : 1 }}
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 4: Create GlassInput.tsx**

```tsx
// pwa/src/design/GlassInput.tsx
interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  className?: string
  autoFocus?: boolean
}

export default function GlassInput({ value, onChange, placeholder, type = 'text', className = '', autoFocus }: Props) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className={className}
      style={{
        background: 'rgba(255,255,255,0.4)',
        border: '1px solid rgba(255,255,255,0.6)',
        borderRadius: 12,
        padding: '12px 16px',
        fontSize: 15,
        fontFamily: 'Satoshi, sans-serif',
        color: '#1a1a2e',
        outline: 'none',
        width: '100%',
        transition: 'border-color 150ms, box-shadow 150ms',
      }}
      onFocus={e => {
        e.target.style.borderColor = 'rgba(124,106,247,0.6)'
        e.target.style.boxShadow = '0 0 0 3px rgba(124,106,247,0.12)'
      }}
      onBlur={e => {
        e.target.style.borderColor = 'rgba(255,255,255,0.6)'
        e.target.style.boxShadow = 'none'
      }}
    />
  )
}
```

- [ ] **Step 5: Create BentoGrid.tsx**

```tsx
// pwa/src/design/BentoGrid.tsx
interface GridProps { children: React.ReactNode; className?: string }
interface CellProps {
  children: React.ReactNode
  span?: '1' | '2' | '3' | 'full'
  className?: string
}

export function BentoGrid({ children, className = '' }: GridProps) {
  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12,
      }}
    >
      {children}
    </div>
  )
}

export function BentoCell({ children, span = '1', className = '' }: CellProps) {
  const colSpan: Record<string, string> = {
    '1': 'span 1',
    '2': 'span 2',
    '3': 'span 3',
    'full': '1 / -1',
  }
  return (
    <div className={className} style={{ gridColumn: colSpan[span] }}>
      {children}
    </div>
  )
}
```

- [ ] **Step 6: Verify TypeScript**

```bash
cd pwa && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add pwa/src/design/
git commit -m "feat: glass component library (card, button, input, bento, background)"
```

---

## Task 4: Splash Screen + Unlock Form + App.tsx

**Files:**
- Create: `pwa/src/SplashScreen.tsx`
- Create: `pwa/src/UnlockForm.tsx`
- Modify: `pwa/src/App.tsx`
- Delete: `pwa/src/landing/LandingPage.tsx`

**Interfaces:**
- Consumes: `IconAppShield`, `AppBackground`, `GlassCard`, `GlassInput`, `PillButton` from design/
- Consumes: `unlock`, `isLocked`, `lock` from `../../crypto`
- Consumes: `SALT_KEY = 'myspace_vault_salt'` from localStorage (same key VaultView uses)
- Produces: `SplashScreen({ onDone: () => void })`, `UnlockForm({ onUnlocked: () => void })`
- App.tsx screen states: `'splash' | 'unlock' | 'app'`

- [ ] **Step 1: Create SplashScreen.tsx**

```tsx
// pwa/src/SplashScreen.tsx
import { useEffect, useState } from 'react'
import AppBackground from './design/AppBackground'
import { IconAppShield } from './design/icons'

interface Props { onDone: () => void }

export default function SplashScreen({ onDone }: Props) {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 600)
    const t2 = setTimeout(() => setPhase('out'), 1400)
    const t3 = setTimeout(() => onDone(), 1800)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  const opacity = phase === 'out' ? 0 : 1
  const iconScale = phase === 'in' ? 0.8 : 1

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, transition: 'opacity 400ms ease', opacity }}>
      <AppBackground />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 80, height: 80, borderRadius: 20,
          background: 'linear-gradient(135deg, #7c6af7, #38bdf8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: `scale(${iconScale})`,
          transition: 'transform 600ms cubic-bezier(0.34,1.56,0.64,1)',
          boxShadow: '0 8px 32px rgba(124,106,247,0.35)',
        }}>
          <IconAppShield size={48} />
        </div>
        <div style={{ textAlign: 'center', opacity: phase === 'in' ? 0 : 1, transition: 'opacity 400ms ease 300ms' }}>
          <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 700, fontSize: 32, color: '#1a1a2e', letterSpacing: '-0.02em' }}>
            My <span style={{ color: '#7c6af7' }}>SPACE</span>
          </div>
          <div style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 15, color: '#4a4a6a', marginTop: 4 }}>
            Your private space.
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create UnlockForm.tsx**

```tsx
// pwa/src/UnlockForm.tsx
import { useState } from 'react'
import AppBackground from './design/AppBackground'
import GlassCard from './design/GlassCard'
import GlassInput from './design/GlassInput'
import PillButton from './design/PillButton'
import { IconAppShield, IconLock } from './design/icons'
import { unlock } from './crypto'

interface Props { onUnlocked: () => void }

const SALT_KEY = 'myspace_vault_salt'

function getSalt(): Uint8Array {
  const stored = localStorage.getItem(SALT_KEY)
  if (stored) return Uint8Array.from(atob(stored), c => c.charCodeAt(0))
  const s = crypto.getRandomValues(new Uint8Array(32))
  localStorage.setItem(SALT_KEY, btoa(Array.from(s, c => String.fromCharCode(c)).join('')))
  return s
}

const isFirstTime = () => !localStorage.getItem(SALT_KEY)

export default function UnlockForm({ onUnlocked }: Props) {
  const [firstTime] = useState(isFirstTime)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [exiting, setExiting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (firstTime && password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 4) { setError('Password must be at least 4 characters.'); return }
    setLoading(true)
    try {
      const salt = getSalt()
      await unlock(password, salt)
      setExiting(true)
      setTimeout(onUnlocked, 280)
    } catch {
      setError('Incorrect password.')
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <AppBackground />
      <GlassCard
        style={{
          position: 'relative', zIndex: 1,
          width: '100%', maxWidth: 360, padding: 32,
          transform: exiting ? 'scale(0.95)' : 'scale(1)',
          opacity: exiting ? 0 : 1,
          transition: 'transform 250ms ease, opacity 250ms ease',
        }}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'linear-gradient(135deg, #7c6af7, #38bdf8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(124,106,247,0.3)',
          }}>
            <IconAppShield size={28} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 700, fontSize: 24, color: '#1a1a2e', letterSpacing: '-0.01em' }}>
              My <span style={{ color: '#7c6af7' }}>SPACE</span>
            </div>
            <div style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 14, color: '#4a4a6a', marginTop: 4 }}>
              {firstTime ? 'Create your master password' : 'Enter your master password'}
            </div>
          </div>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <GlassInput
              value={password}
              onChange={setPassword}
              placeholder="Master password"
              type="password"
              autoFocus
            />
            {firstTime && (
              <GlassInput
                value={confirm}
                onChange={setConfirm}
                placeholder="Confirm password"
                type="password"
              />
            )}
            {error && (
              <div style={{ fontSize: 13, color: '#ef4444', textAlign: 'center', fontFamily: 'Satoshi, sans-serif' }}>
                {error}
              </div>
            )}
          </div>
          <PillButton type="submit" disabled={loading} className="w-full">
            <IconLock size={16} />
            {loading ? 'Unlocking…' : firstTime ? 'Create & Enter' : 'Unlock'}
          </PillButton>
        </form>
      </GlassCard>
    </div>
  )
}
```

- [ ] **Step 3: Rewrite App.tsx**

```tsx
// pwa/src/App.tsx
import { useState, useCallback } from 'react'
import SplashScreen from './SplashScreen'
import UnlockForm from './UnlockForm'
import AppShell from './app/AppShell'
import { lock } from './crypto'

type Screen = 'splash' | 'unlock' | 'app'

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash')

  const handleLock = useCallback(() => {
    lock()
    setScreen('unlock')
  }, [])

  if (screen === 'splash') return <SplashScreen onDone={() => setScreen('unlock')} />
  if (screen === 'unlock') return <UnlockForm onUnlocked={() => setScreen('app')} />
  return <AppShell onLogout={handleLock} />
}
```

- [ ] **Step 4: Delete LandingPage.tsx**

```bash
rm pwa/src/landing/LandingPage.tsx
```

Check if the landing/ directory has other files; if empty, remove it:
```bash
ls pwa/src/landing/ 2>/dev/null && rmdir pwa/src/landing/ 2>/dev/null || true
```

- [ ] **Step 5: Verify build**

```bash
cd pwa && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add pwa/src/App.tsx pwa/src/SplashScreen.tsx pwa/src/UnlockForm.tsx
git rm pwa/src/landing/LandingPage.tsx
git commit -m "feat: splash screen, unlock form, replace landing page"
```

---

## Task 5: AppShell + NavRail + NavPill

**Files:**
- Create: `pwa/src/app/NavRail.tsx`
- Create: `pwa/src/app/NavPill.tsx`
- Modify: `pwa/src/app/AppShell.tsx`

**Interfaces:**
- Consumes: all Icon* from `../design/icons`, `ACCENT` from `../design/tokens`, `AppBackground` from `../design/AppBackground`
- `NavRail({ tab, onTab, onLogout })` — tab: Tab type
- `NavPill({ tab, onTab })` — shows 5 primary tabs + overflow
- `AppShell({ onLogout })` — composes background + rails + view

- [ ] **Step 1: Create NavRail.tsx**

```tsx
// pwa/src/app/NavRail.tsx
import { useState } from 'react'
import { IconNotes, IconVault, IconTodo, IconSubs, IconMaps, IconGen, IconReports, IconSync, IconSettings, IconAppShield } from '../design/icons'
import { ACCENT } from '../design/tokens'

export type Tab = 'notes'|'vault'|'todo'|'subs'|'maps'|'gen'|'reports'|'sync'|'settings'

const TABS: { id: Tab; label: string; Icon: React.ComponentType<{ size?: number; accent?: string; filled?: boolean }> }[] = [
  { id: 'notes',    label: 'Notes',       Icon: IconNotes    },
  { id: 'vault',    label: 'Vault',       Icon: IconVault    },
  { id: 'todo',     label: 'Todo',        Icon: IconTodo     },
  { id: 'subs',     label: 'Subs',        Icon: IconSubs     },
  { id: 'maps',     label: 'Maps',        Icon: IconMaps     },
  { id: 'gen',      label: 'Generator',   Icon: IconGen      },
  { id: 'reports',  label: 'Reports',     Icon: IconReports  },
  { id: 'sync',     label: 'Sync',        Icon: IconSync     },
  { id: 'settings', label: 'Settings',    Icon: IconSettings },
]

interface Props { tab: Tab; onTab: (t: Tab) => void; onLogout: () => void }

export default function NavRail({ tab, onTab }: Props) {
  const [hovered, setHovered] = useState(false)

  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'fixed', left: 0, top: 0, bottom: 0,
        width: hovered ? 200 : 56,
        transition: 'width 200ms ease',
        background: 'rgba(255,255,255,0.35)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRight: '1px solid rgba(255,255,255,0.5)',
        display: 'flex', flexDirection: 'column',
        zIndex: 20, overflow: 'hidden',
      }}
      className="safe-area-pt"
    >
      {/* Logo */}
      <div style={{ padding: '16px 12px 8px', display: 'flex', alignItems: 'center', gap: 10, minWidth: 200 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#7c6af7,#38bdf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <IconAppShield size={18} />
        </div>
        <span style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 700, fontSize: 16, color: '#1a1a2e', whiteSpace: 'nowrap', opacity: hovered ? 1 : 0, transition: 'opacity 150ms ease' }}>
          My <span style={{ color: '#7c6af7' }}>SPACE</span>
        </span>
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 6px' }}>
        {TABS.map(t => {
          const active = tab === t.id
          const accent = ACCENT[t.id]
          return (
            <button
              key={t.id}
              onClick={() => onTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 10px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: active ? `${accent}20` : 'transparent',
                color: active ? accent : '#4a4a6a',
                transition: 'background 150ms, color 150ms',
                minWidth: 0, whiteSpace: 'nowrap', width: '100%',
              }}
            >
              <t.Icon size={22} accent={accent} filled={active} />
              <span style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: active ? 600 : 400, fontSize: 14, opacity: hovered ? 1 : 0, transition: 'opacity 150ms ease' }}>
                {t.label}
              </span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}

export { TABS }
```

- [ ] **Step 2: Create NavPill.tsx**

```tsx
// pwa/src/app/NavPill.tsx
import { useState } from 'react'
import { IconNotes, IconVault, IconTodo, IconSubs, IconMaps, IconGen, IconReports, IconSync, IconSettings } from '../design/icons'
import { ACCENT } from '../design/tokens'
import type { Tab } from './NavRail'

const PRIMARY: Tab[] = ['notes', 'vault', 'todo', 'subs', 'maps']
const OVERFLOW: Tab[] = ['gen', 'reports', 'sync', 'settings']
const ICON_MAP: Record<Tab, React.ComponentType<{ size?: number; accent?: string; filled?: boolean }>> = {
  notes: IconNotes, vault: IconVault, todo: IconTodo, subs: IconSubs, maps: IconMaps,
  gen: IconGen, reports: IconReports, sync: IconSync, settings: IconSettings,
}
const LABEL_MAP: Record<Tab, string> = {
  notes:'Notes', vault:'Vault', todo:'Todo', subs:'Subs', maps:'Maps',
  gen:'Gen', reports:'Reports', sync:'Sync', settings:'Settings',
}

interface Props { tab: Tab; onTab: (t: Tab) => void }

export default function NavPill({ tab, onTab }: Props) {
  const [overflowOpen, setOverflowOpen] = useState(false)

  return (
    <>
      {/* Overflow tray */}
      {overflowOpen && (
        <div
          style={{
            position: 'fixed', bottom: 88, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)',
            borderRadius: 20, border: '1px solid rgba(255,255,255,0.6)',
            padding: '12px 16px', display: 'flex', gap: 8, zIndex: 30,
            boxShadow: '0 4px 24px rgba(124,106,247,0.12)',
          }}
        >
          {OVERFLOW.map(t => {
            const Ic = ICON_MAP[t]
            const accent = ACCENT[t]
            const active = tab === t
            return (
              <button key={t} onClick={() => { onTab(t); setOverflowOpen(false) }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 12px', borderRadius: 12, border: 'none', cursor: 'pointer', background: active ? `${accent}20` : 'transparent', color: active ? accent : '#4a4a6a' }}>
                <Ic size={22} accent={accent} filled={active} />
                <span style={{ fontSize: 11, fontFamily: 'Satoshi, sans-serif' }}>{LABEL_MAP[t]}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Pill nav */}
      <div
        className="safe-area-pb"
        style={{
          position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.6)', borderRadius: 100,
          padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 2,
          zIndex: 20, boxShadow: '0 4px 24px rgba(124,106,247,0.1)',
        }}
      >
        {PRIMARY.map(t => {
          const Ic = ICON_MAP[t]
          const accent = ACCENT[t]
          const active = tab === t
          return (
            <button key={t} onClick={() => onTab(t)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 12px', borderRadius: 80, border: 'none', cursor: 'pointer', background: active ? `${accent}20` : 'transparent', color: active ? accent : '#4a4a6a', transition: 'background 150ms' }}>
              <Ic size={22} accent={accent} filled={active} />
            </button>
          )
        })}
        {/* overflow */}
        <button onClick={() => setOverflowOpen(o => !o)}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 12px', borderRadius: 80, border: 'none', cursor: 'pointer', background: OVERFLOW.includes(tab) ? 'rgba(124,106,247,0.15)' : 'transparent', color: '#4a4a6a', fontSize: 18, fontWeight: 700 }}>
          ···
        </button>
      </div>
    </>
  )
}
```

- [ ] **Step 3: Rewrite AppShell.tsx**

```tsx
// pwa/src/app/AppShell.tsx
import { useState } from 'react'
import AppBackground from '../design/AppBackground'
import NavRail, { type Tab } from './NavRail'
import NavPill from './NavPill'
import NotesView from './views/NotesView'
import VaultView from './views/VaultView'
import TodoView from './views/TodoView'
import SubscriptionsView from './views/SubscriptionsView'
import MapView from './views/MapView'
import GeneratorView from './views/GeneratorView'
import ReportsView from './views/ReportsView'
import SyncView from './views/SyncView'
import SettingsView from './views/SettingsView'

interface Props { onLogout: () => void }

export default function AppShell({ onLogout }: Props) {
  const [tab, setTab] = useState<Tab>('notes')

  return (
    <div style={{ position: 'relative', minHeight: '100dvh' }}>
      <AppBackground />

      {/* Desktop side rail */}
      <div className="hidden md:block">
        <NavRail tab={tab} onTab={setTab} onLogout={onLogout} />
      </div>

      {/* Main content */}
      <main style={{
        position: 'relative', zIndex: 1,
        marginLeft: 0, paddingBottom: 96,
      }}
        className="md:ml-14"
      >
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '16px' }} className="md:p-6">
          {tab === 'notes'    && <NotesView />}
          {tab === 'vault'    && <VaultView />}
          {tab === 'todo'     && <TodoView />}
          {tab === 'subs'     && <SubscriptionsView />}
          {tab === 'maps'     && <MapView />}
          {tab === 'gen'      && <GeneratorView />}
          {tab === 'reports'  && <ReportsView />}
          {tab === 'sync'     && <SyncView />}
          {tab === 'settings' && <SettingsView onLogout={onLogout} />}
        </div>
      </main>

      {/* Mobile bottom pill */}
      <div className="block md:hidden">
        <NavPill tab={tab} onTab={setTab} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify build**

```bash
cd pwa && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add pwa/src/app/NavRail.tsx pwa/src/app/NavPill.tsx pwa/src/app/AppShell.tsx
git commit -m "feat: hybrid nav (desktop rail + mobile pill) + app shell redesign"
```

---

## Task 6: ViewHeader Component + NotesView Bento

**Files:**
- Create: `pwa/src/app/ViewHeader.tsx`
- Modify: `pwa/src/app/views/NotesView.tsx`

**Interfaces:**
- Produces: `ViewHeader({ title, icon, accent, stats?, action?, onAction? })`
- Consumes: `GlassCard`, `BentoGrid`, `BentoCell`, `PillButton`, `GlassInput`

- [ ] **Step 1: Create ViewHeader.tsx**

```tsx
// pwa/src/app/ViewHeader.tsx
import GlassCard from '../design/GlassCard'
import PillButton from '../design/PillButton'

interface Props {
  title: string
  icon: React.ReactNode
  accent: string
  stats?: string
  action?: string
  onAction?: () => void
}

export default function ViewHeader({ title, icon, accent, stats, action, onAction }: Props) {
  return (
    <GlassCard accentBar accent={accent} style={{ marginBottom: 12 }}>
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 700, fontSize: 24, color: '#1a1a2e', letterSpacing: '-0.01em', lineHeight: 1.2 }}>{title}</div>
          {stats && <div style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 13, color: '#4a4a6a', marginTop: 2 }}>{stats}</div>}
        </div>
        {action && onAction && (
          <PillButton onClick={onAction} accent={accent} variant="primary">
            {action}
          </PillButton>
        )}
      </div>
    </GlassCard>
  )
}
```

- [ ] **Step 2: Rewrite NotesView.tsx with bento layout**

Replace the entire return statement of `NotesView` (keep all state/logic, only replace JSX). The full file:

```tsx
// pwa/src/app/views/NotesView.tsx
import { useEffect, useState, useCallback, useRef } from 'react'
import { getDb } from '../../db'
import { renderMarkdown } from '../../lib/renderMarkdown'
import { safeHtml } from '../../lib/safeHtml'
import { ACCENT } from '../../design/tokens'
import GlassCard from '../../design/GlassCard'
import GlassInput from '../../design/GlassInput'
import PillButton from '../../design/PillButton'
import { BentoGrid, BentoCell } from '../../design/BentoGrid'
import ViewHeader from '../ViewHeader'
import { IconNotes } from '../../design/icons'
import TagInput from '../components/TagInput'

interface Note { id: string; title: string; content: string; tags: string[]; image_data: string; updated_at: string }
const parseImages = (raw: string) => { try { return JSON.parse(raw ?? '[]') } catch { return [] } }
const accent = ACCENT.notes

export default function NotesView() {
  const [notes, setNotes] = useState<Note[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Note | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editTags, setEditTags] = useState<string[]>([])
  const [editImages, setEditImages] = useState<string[]>([])
  const [preview, setPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async (q = '', tag: string | null = null) => {
    const db = await getDb()
    let rows
    if (tag) rows = await db.query<Note>('SELECT * FROM notes WHERE $1 = ANY(tags) ORDER BY updated_at DESC', [tag])
    else if (q) rows = await db.query<Note>('SELECT * FROM notes WHERE title ILIKE $1 OR content ILIKE $1 ORDER BY updated_at DESC', [`%${q}%`])
    else rows = await db.query<Note>('SELECT * FROM notes ORDER BY updated_at DESC')
    const list = rows.rows
    setNotes(list)
    setAllTags([...new Set(list.flatMap(n => n.tags ?? []))].sort())
  }, [])

  useEffect(() => { load() }, [load])

  function select(n: Note) {
    setSelected(n); setEditTitle(n.title); setEditContent(n.content)
    setEditTags(n.tags ?? []); setEditImages(parseImages(n.image_data)); setPreview(false)
  }

  async function create() {
    try {
      const db = await getDb()
      const res = await db.query<Note>('INSERT INTO notes (title, content) VALUES ($1, $2) RETURNING *', ['Untitled', ''])
      await load(query, activeTag)
      select(res.rows[0])
    } catch (e) { console.error('[notes] create failed:', e) }
  }

  async function save() {
    if (!selected) return
    setSaving(true)
    const db = await getDb()
    await db.query('UPDATE notes SET title=$1, content=$2, tags=$3, image_data=$4, updated_at=now() WHERE id=$5',
      [editTitle, editContent, editTags, JSON.stringify(editImages), selected.id])
    await load(query, activeTag)
    setSaving(false)
  }

  async function remove() {
    if (!selected) return
    const db = await getDb()
    await db.query('DELETE FROM notes WHERE id=$1', [selected.id])
    setSelected(null); await load(query, activeTag)
  }

  function addImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setEditImages(prev => [...prev, ev.target!.result as string])
    reader.readAsDataURL(file); e.target.value = ''
  }

  function search(q: string) { setQuery(q); load(q, activeTag) }

  return (
    <div>
      <ViewHeader
        title="Notes" icon={<IconNotes size={22} accent={accent} filled />}
        accent={accent} stats={`${notes.length} notes`}
        action="+ New" onAction={create}
      />
      <BentoGrid>
        {/* Note list + search */}
        <BentoCell span="2">
          <GlassCard style={{ height: '100%' }}>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <GlassInput value={query} onChange={search} placeholder="Search notes…" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
                {notes.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#4a4a6a', padding: 24, fontFamily: 'Satoshi, sans-serif', fontSize: 14 }}>No notes yet. Create one!</div>
                )}
                {notes.map(n => (
                  <button key={n.id} onClick={() => select(n)}
                    style={{
                      textAlign: 'left', padding: '10px 12px', borderRadius: 12, border: 'none', cursor: 'pointer',
                      background: selected?.id === n.id ? `${accent}18` : 'rgba(255,255,255,0.4)',
                      borderLeft: selected?.id === n.id ? `3px solid ${accent}` : '3px solid transparent',
                      transition: 'background 150ms',
                    }}>
                    <div style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 600, fontSize: 14, color: '#1a1a2e', marginBottom: 2 }}>{n.title || 'Untitled'}</div>
                    <div style={{ fontSize: 12, color: '#4a4a6a' }}>{new Date(n.updated_at).toLocaleDateString()}</div>
                  </button>
                ))}
              </div>
            </div>
          </GlassCard>
        </BentoCell>

        {/* Tag cloud */}
        <BentoCell span="1">
          <GlassCard style={{ height: '100%' }}>
            <div style={{ padding: 16 }}>
              <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: 14, color: '#1a1a2e', marginBottom: 10 }}>Tags</div>
              {allTags.length === 0 && <div style={{ fontSize: 13, color: '#4a4a6a', fontFamily: 'Satoshi, sans-serif' }}>No tags yet</div>}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {allTags.map(tag => (
                  <button key={tag} onClick={() => { setActiveTag(activeTag === tag ? null : tag); load(query, activeTag === tag ? null : tag) }}
                    style={{ padding: '4px 10px', borderRadius: 100, border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'Satoshi, sans-serif',
                      background: activeTag === tag ? accent : `${accent}18`, color: activeTag === tag ? 'white' : accent }}>
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          </GlassCard>
        </BentoCell>

        {/* Editor */}
        <BentoCell span="full">
          <GlassCard>
            <div style={{ padding: 20 }}>
              {!selected ? (
                <div style={{ textAlign: 'center', color: '#4a4a6a', padding: 32, fontFamily: 'Satoshi, sans-serif' }}>
                  Select a note or create a new one
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                    style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 700, fontSize: 22, color: '#1a1a2e', background: 'transparent', border: 'none', outline: 'none', width: '100%' }}
                    placeholder="Title" />
                  <TagInput value={editTags} onChange={setEditTags} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <PillButton variant="secondary" onClick={() => setPreview(false)} accent={accent}>Edit</PillButton>
                    <PillButton variant="secondary" onClick={() => setPreview(true)} accent={accent}>Preview</PillButton>
                  </div>
                  {preview ? (
                    <div className="prose" dangerouslySetInnerHTML={{ __html: safeHtml(renderMarkdown(editContent)) }} />
                  ) : (
                    <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                      style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 15, color: '#1a1a2e', background: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.6)', borderRadius: 12, padding: 12, minHeight: 180, resize: 'vertical', outline: 'none' }}
                      placeholder="Write in Markdown…" />
                  )}
                  {editImages.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {editImages.map((img, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                          <img src={img} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} />
                          <button onClick={() => setEditImages(prev => prev.filter((_, j) => j !== i))}
                            style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: '#ef4444', border: 'none', color: 'white', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <PillButton onClick={save} accent={accent} disabled={saving}>{saving ? 'Saving…' : 'Save'}</PillButton>
                    <PillButton variant="secondary" onClick={() => fileRef.current?.click()}>+ Image</PillButton>
                    <PillButton variant="ghost" onClick={remove}>Delete</PillButton>
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={addImage} />
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </BentoCell>
      </BentoGrid>
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd pwa && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add pwa/src/app/ViewHeader.tsx pwa/src/app/views/NotesView.tsx
git commit -m "feat: ViewHeader component + NotesView bento layout"
```

---

## Task 7: VaultView Bento (remove inline unlock form)

**Files:**
- Modify: `pwa/src/app/views/VaultView.tsx`

**Interfaces:**
- Consumes: `isLocked` from `../../crypto` — used only to guard decrypt, not to show a password form
- VaultView assumes crypto key is already unlocked when rendered (App.tsx ensures this)

- [ ] **Step 1: Rewrite VaultView.tsx**

Replace entire file. Keep all DB/crypto logic, replace JSX with bento layout. Remove the `password` state, `saltHex`, `pwError`, and password form — the vault is always unlocked when this view renders:

```tsx
// pwa/src/app/views/VaultView.tsx
import { useEffect, useState, useCallback } from 'react'
import { getDb } from '../../db'
import { encrypt, decrypt } from '../../crypto'
import { ACCENT } from '../../design/tokens'
import GlassCard from '../../design/GlassCard'
import GlassInput from '../../design/GlassInput'
import PillButton from '../../design/PillButton'
import { BentoGrid, BentoCell } from '../../design/BentoGrid'
import ViewHeader from '../ViewHeader'
import { IconVault } from '../../design/icons'
import TagInput from '../components/TagInput'

interface SecretMeta { id: string; label: string; tags: string[]; url: string; description: string; updated_at: string }

const accent = ACCENT.vault

export default function VaultView() {
  const [secrets, setSecrets] = useState<SecretMeta[]>([])
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [allTags, setAllTags] = useState<string[]>([])
  const [editing, setEditing] = useState<SecretMeta & { value?: string } | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editValue, setEditValue] = useState('')
  const [editTags, setEditTags] = useState<string[]>([])
  const [editUrl, setEditUrl] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [revealId, setRevealId] = useState<string | null>(null)
  const [revealValue, setRevealValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [showAdd, setShowAdd] = useState(false)

  const load = useCallback(async () => {
    const db = await getDb()
    const res = await db.query<SecretMeta>(
      query
        ? 'SELECT id,label,tags,url,description,updated_at FROM secrets WHERE label ILIKE $1 OR description ILIKE $1 ORDER BY updated_at DESC'
        : activeTag
          ? 'SELECT id,label,tags,url,description,updated_at FROM secrets WHERE $1=ANY(tags) ORDER BY updated_at DESC'
          : 'SELECT id,label,tags,url,description,updated_at FROM secrets ORDER BY updated_at DESC',
      query ? [`%${query}%`] : activeTag ? [activeTag] : []
    )
    setSecrets(res.rows)
    setAllTags([...new Set(res.rows.flatMap(s => s.tags ?? []))].sort())
  }, [query, activeTag])

  useEffect(() => { load() }, [load])

  function startNew() {
    setEditing(null); setEditLabel(''); setEditValue(''); setEditTags([]); setEditUrl(''); setEditDesc(''); setShowAdd(true)
  }

  async function saveSecret() {
    if (!editLabel.trim()) return
    setSaving(true)
    try {
      const db = await getDb()
      const { ciphertext, iv } = await encrypt(editValue)
      if (editing) {
        await db.query('UPDATE secrets SET label=$1,ciphertext=$2,iv=$3,tags=$4,url=$5,description=$6,updated_at=now() WHERE id=$7',
          [editLabel, ciphertext, iv, editTags, editUrl, editDesc, editing.id])
      } else {
        await db.query('INSERT INTO secrets (label,ciphertext,iv,tags,url,description) VALUES ($1,$2,$3,$4,$5,$6)',
          [editLabel, ciphertext, iv, editTags, editUrl, editDesc])
      }
      setShowAdd(false); setEditing(null); await load()
    } catch (e) { console.error('[vault] save failed:', e) }
    setSaving(false)
  }

  async function reveal(s: SecretMeta) {
    if (revealId === s.id) { setRevealId(null); setRevealValue(''); return }
    try {
      const db = await getDb()
      const row = await db.query<{ ciphertext: string; iv: string }>('SELECT ciphertext,iv FROM secrets WHERE id=$1', [s.id])
      if (row.rows[0]) {
        const val = await decrypt(row.rows[0].ciphertext, row.rows[0].iv)
        setRevealId(s.id); setRevealValue(val)
      }
    } catch (e) { console.error('[vault] reveal failed:', e) }
  }

  async function deleteSecret(id: string) {
    const db = await getDb()
    await db.query('DELETE FROM secrets WHERE id=$1', [id])
    if (revealId === id) { setRevealId(null); setRevealValue('') }
    await load()
  }

  return (
    <div>
      <ViewHeader
        title="Vault" icon={<IconVault size={22} accent={accent} filled />}
        accent={accent} stats={`${secrets.length} secrets`}
        action="+ Add" onAction={startNew}
      />
      <BentoGrid>
        <BentoCell span="2">
          <GlassCard style={{ height: '100%' }}>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <GlassInput value={query} onChange={v => { setQuery(v) }} placeholder="Search secrets…" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 340, overflowY: 'auto' }}>
                {secrets.length === 0 && <div style={{ textAlign: 'center', color: '#4a4a6a', padding: 24, fontFamily: 'Satoshi, sans-serif', fontSize: 14 }}>No secrets yet.</div>}
                {secrets.map(s => (
                  <div key={s.id} style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.4)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 600, fontSize: 14, color: '#1a1a2e' }}>{s.label}</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <PillButton variant="secondary" accent={accent} onClick={() => reveal(s)}>{revealId === s.id ? 'Hide' : 'Reveal'}</PillButton>
                        <PillButton variant="ghost" onClick={() => deleteSecret(s.id)}>Delete</PillButton>
                      </div>
                    </div>
                    {revealId === s.id && (
                      <div style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 13, background: `${accent}15`, borderRadius: 8, padding: '6px 10px', color: '#1a1a2e', wordBreak: 'break-all' }}>{revealValue}</div>
                    )}
                    {s.url && <div style={{ fontSize: 12, color: '#4a4a6a' }}>{s.url}</div>}
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </BentoCell>

        <BentoCell span="1">
          <GlassCard style={{ height: '100%' }}>
            <div style={{ padding: 16 }}>
              <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: 14, color: '#1a1a2e', marginBottom: 10 }}>Tags</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {allTags.map(tag => (
                  <button key={tag} onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                    style={{ padding: '4px 10px', borderRadius: 100, border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'Satoshi, sans-serif', background: activeTag === tag ? accent : `${accent}18`, color: activeTag === tag ? 'white' : accent }}>
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          </GlassCard>
        </BentoCell>

        {showAdd && (
          <BentoCell span="full">
            <GlassCard accentBar accent={accent}>
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 700, fontSize: 18, color: '#1a1a2e' }}>
                  {editing ? 'Edit Secret' : 'New Secret'}
                </div>
                <GlassInput value={editLabel} onChange={setEditLabel} placeholder="Label (e.g. Gmail password)" />
                <GlassInput value={editValue} onChange={setEditValue} placeholder="Secret value" type="password" />
                <GlassInput value={editUrl} onChange={setEditUrl} placeholder="URL (optional)" />
                <GlassInput value={editDesc} onChange={setEditDesc} placeholder="Description (optional)" />
                <TagInput value={editTags} onChange={setEditTags} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <PillButton onClick={saveSecret} accent={accent} disabled={saving}>{saving ? 'Saving…' : 'Save'}</PillButton>
                  <PillButton variant="ghost" onClick={() => setShowAdd(false)}>Cancel</PillButton>
                </div>
              </div>
            </GlassCard>
          </BentoCell>
        )}
      </BentoGrid>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd pwa && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add pwa/src/app/views/VaultView.tsx
git commit -m "feat: VaultView bento layout, unlock lifted to app level"
```

---

## Task 8: TodoView + SubscriptionsView Bento

**Files:**
- Modify: `pwa/src/app/views/TodoView.tsx`
- Modify: `pwa/src/app/views/SubscriptionsView.tsx`

- [ ] **Step 1: Read current SubscriptionsView**

```bash
cat pwa/src/app/views/SubscriptionsView.tsx
```

- [ ] **Step 2: Rewrite TodoView.tsx**

Keep all existing state/logic. Replace JSX return with:

```tsx
// return JSX only — keep all existing state, hooks, and handlers above
return (
  <div>
    <ViewHeader
      title="Todo" icon={<IconTodo size={22} accent={ACCENT.todo} filled />}
      accent={ACCENT.todo} stats={`${lists.length} lists`}
      action="+ List" onAction={() => setShowNewList(true)}
    />
    <BentoGrid>
      <BentoCell span="1">
        <GlassCard style={{ height: '100%' }}>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: 14, color: '#1a1a2e', marginBottom: 4 }}>Lists</div>
            {showNewList && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                <GlassInput value={newListName} onChange={setNewListName} placeholder="List name" autoFocus />
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setNewListColor(c)}
                      style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: newListColor === c ? '2px solid #1a1a2e' : '2px solid transparent', cursor: 'pointer' }} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <PillButton onClick={createList} accent={ACCENT.todo}>Create</PillButton>
                  <PillButton variant="ghost" onClick={() => setShowNewList(false)}>Cancel</PillButton>
                </div>
              </div>
            )}
            {lists.map(l => (
              <button key={l.id} onClick={() => setActiveList(l)}
                style={{ textAlign: 'left', padding: '8px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  background: activeList?.id === l.id ? `${l.color}20` : 'rgba(255,255,255,0.4)', borderLeft: `3px solid ${l.color}` }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
                <span style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 500, fontSize: 14, color: '#1a1a2e' }}>{l.name}</span>
              </button>
            ))}
          </div>
        </GlassCard>
      </BentoCell>

      <BentoCell span="2">
        <GlassCard style={{ height: '100%' }}>
          <div style={{ padding: 16 }}>
            {!activeList ? (
              <div style={{ textAlign: 'center', color: '#4a4a6a', padding: 32, fontFamily: 'Satoshi, sans-serif' }}>Select a list</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 700, fontSize: 18, color: '#1a1a2e' }}>{activeList.name}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <GlassInput value={newTaskTitle} onChange={setNewTaskTitle} placeholder="New task…" />
                  <PillButton onClick={addTask} accent={ACCENT.todo}>Add</PillButton>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
                  {tasks.map(t => (
                    <div key={t.id} style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button onClick={() => toggleDone(t)} style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${ACCENT.todo}`, background: t.done ? ACCENT.todo : 'transparent', cursor: 'pointer', flexShrink: 0 }} />
                      <span style={{ flex: 1, fontFamily: 'Satoshi, sans-serif', fontSize: 14, color: '#1a1a2e', textDecoration: t.done ? 'line-through' : 'none', opacity: t.done ? 0.5 : 1 }}>{t.title}</span>
                      <span style={{ fontSize: 11, fontFamily: 'Satoshi, sans-serif', color: t.priority === 'high' ? '#ef4444' : t.priority === 'medium' ? '#f59e0b' : '#94a3b8' }}>{t.priority}</span>
                      <PillButton variant="ghost" onClick={() => deleteTask(t.id)}>×</PillButton>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </GlassCard>
      </BentoCell>
    </BentoGrid>
  </div>
)
```

Add missing imports at top of TodoView.tsx:
```tsx
import { ACCENT } from '../../design/tokens'
import GlassCard from '../../design/GlassCard'
import GlassInput from '../../design/GlassInput'
import PillButton from '../../design/PillButton'
import { BentoGrid, BentoCell } from '../../design/BentoGrid'
import ViewHeader from '../ViewHeader'
import { IconTodo } from '../../design/icons'
```

Add missing handler functions (if not already present):
```tsx
async function addTask() {
  if (!newTaskTitle.trim() || !activeList) return
  const db = await getDb()
  await db.query('INSERT INTO todo_tasks (list_id,title) VALUES ($1,$2)', [activeList.id, newTaskTitle])
  setNewTaskTitle(''); await loadTasks(activeList.id)
}

async function toggleDone(t: TodoTask) {
  const db = await getDb()
  await db.query('UPDATE todo_tasks SET done=$1,updated_at=now() WHERE id=$2', [!t.done, t.id])
  await loadTasks(activeList!.id)
}

async function deleteTask(id: string) {
  const db = await getDb()
  await db.query('DELETE FROM todo_tasks WHERE id=$1', [id])
  await loadTasks(activeList!.id)
}
```

- [ ] **Step 3: Rewrite SubscriptionsView.tsx**

Read the file first, then keep all logic, replace JSX with bento. Wrap the return in:
```tsx
return (
  <div>
    <ViewHeader
      title="Subscriptions" icon={<IconSubs size={22} accent={ACCENT.subs} filled />}
      accent={ACCENT.subs} stats={`${subs.length} active`}
      action="+ Add" onAction={openNew}
    />
    <BentoGrid>
      <BentoCell span="1">
        <GlassCard accentBar accent={ACCENT.subs}>
          <div style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 700, fontSize: 36, color: ACCENT.subs }}>{/* total spend */}</div>
            <div style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 13, color: '#4a4a6a', marginTop: 4 }}>Monthly total</div>
          </div>
        </GlassCard>
      </BentoCell>
      <BentoCell span="2">
        <GlassCard style={{ height: '100%' }}>
          <div style={{ padding: 16 }}>
            {/* subscription list — keep existing list JSX, styled with Satoshi font, glass rows */}
          </div>
        </GlassCard>
      </BentoCell>
      <BentoCell span="full">
        <GlassCard>
          <div style={{ padding: 16 }}>
            {/* bills history / form — keep existing JSX */}
          </div>
        </GlassCard>
      </BentoCell>
    </BentoGrid>
  </div>
)
```

Add imports: `ACCENT`, `GlassCard`, `PillButton`, `GlassInput`, `BentoGrid`, `BentoCell`, `ViewHeader`, `IconSubs`.

- [ ] **Step 4: Verify TypeScript**

```bash
cd pwa && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add pwa/src/app/views/TodoView.tsx pwa/src/app/views/SubscriptionsView.tsx
git commit -m "feat: TodoView + SubscriptionsView bento layout"
```

---

## Task 9: MapView + GeneratorView + ReportsView Bento

**Files:**
- Modify: `pwa/src/app/views/MapView.tsx`
- Modify: `pwa/src/app/views/GeneratorView.tsx`
- Modify: `pwa/src/app/views/ReportsView.tsx`

- [ ] **Step 1: Read all three current views**

```bash
head -30 pwa/src/app/views/MapView.tsx
head -30 pwa/src/app/views/GeneratorView.tsx
head -30 pwa/src/app/views/ReportsView.tsx
```

- [ ] **Step 2: Wrap MapView in bento**

Keep all Leaflet map logic. Wrap return:
```tsx
return (
  <div>
    <ViewHeader title="Maps" icon={<IconMaps size={22} accent={ACCENT.maps} filled />} accent={ACCENT.maps} stats={`${pins.length} pins`} action="+ Stack" onAction={openNewStack} />
    <BentoGrid>
      <BentoCell span="1">
        <GlassCard style={{ height: 400 }}>
          <div style={{ padding: 16 }}>{/* stack selector list */}</div>
        </GlassCard>
      </BentoCell>
      <BentoCell span="2">
        <GlassCard style={{ height: 400, overflow: 'hidden' }}>
          {/* map container — keep existing map div */}
        </GlassCard>
      </BentoCell>
      <BentoCell span="full">
        <GlassCard>
          <div style={{ padding: 16 }}>{/* pin list + pin detail */}</div>
        </GlassCard>
      </BentoCell>
    </BentoGrid>
  </div>
)
```

- [ ] **Step 3: Wrap GeneratorView in bento**

```tsx
return (
  <div>
    <ViewHeader title="Generator" icon={<IconGen size={22} accent={ACCENT.gen} filled />} accent={ACCENT.gen} />
    <BentoGrid>
      <BentoCell span="full">
        <GlassCard accentBar accent={ACCENT.gen}>
          <div style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 28, letterSpacing: '0.05em', color: '#1a1a2e', wordBreak: 'break-all', background: `${ACCENT.gen}10`, borderRadius: 12, padding: '16px 24px' }}>
              {/* generated password */}
            </div>
            <PillButton onClick={copyPassword} accent={ACCENT.gen} style={{ marginTop: 16 }}>Copy</PillButton>
          </div>
        </GlassCard>
      </BentoCell>
      <BentoCell span="2">
        <GlassCard>
          <div style={{ padding: 20 }}>{/* config sliders — keep existing */}</div>
        </GlassCard>
      </BentoCell>
      <BentoCell span="1">
        <GlassCard>
          <div style={{ padding: 16 }}>{/* copy history */}</div>
        </GlassCard>
      </BentoCell>
    </BentoGrid>
  </div>
)
```

- [ ] **Step 4: Wrap ReportsView in bento**

```tsx
return (
  <div>
    <ViewHeader title="Reports" icon={<IconReports size={22} accent={ACCENT.reports} filled />} accent={ACCENT.reports} stats="6-month overview" />
    <BentoGrid>
      <BentoCell span="full">
        <GlassCard accentBar accent={ACCENT.reports}>
          <div style={{ padding: 20 }}>{/* chart — keep existing SVG/canvas chart */}</div>
        </GlassCard>
      </BentoCell>
      <BentoCell span="1">
        <GlassCard accentBar accent={ACCENT.reports}>
          <div style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 700, fontSize: 28, color: ACCENT.reports }}>{/* this month */}</div>
            <div style={{ fontSize: 13, color: '#4a4a6a', fontFamily: 'Satoshi, sans-serif', marginTop: 4 }}>This month</div>
          </div>
        </GlassCard>
      </BentoCell>
      <BentoCell span="1">
        <GlassCard>
          <div style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 700, fontSize: 28, color: '#1a1a2e' }}>{/* expected */}</div>
            <div style={{ fontSize: 13, color: '#4a4a6a', fontFamily: 'Satoshi, sans-serif', marginTop: 4 }}>Expected</div>
          </div>
        </GlassCard>
      </BentoCell>
      <BentoCell span="1">
        <GlassCard>
          <div style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 700, fontSize: 28, color: '#1a1a2e' }}>{/* delta */}</div>
            <div style={{ fontSize: 13, color: '#4a4a6a', fontFamily: 'Satoshi, sans-serif', marginTop: 4 }}>Delta</div>
          </div>
        </GlassCard>
      </BentoCell>
    </BentoGrid>
  </div>
)
```

- [ ] **Step 5: Add imports to all three views**

Each view needs: `ACCENT`, `GlassCard`, `PillButton`, `BentoGrid`, `BentoCell`, `ViewHeader`, and respective Icon.

- [ ] **Step 6: Verify TypeScript**

```bash
cd pwa && npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add pwa/src/app/views/MapView.tsx pwa/src/app/views/GeneratorView.tsx pwa/src/app/views/ReportsView.tsx
git commit -m "feat: MapView, GeneratorView, ReportsView bento layout"
```

---

## Task 10: SyncView + SettingsView Bento + Final Polish

**Files:**
- Modify: `pwa/src/app/views/SyncView.tsx`
- Modify: `pwa/src/app/views/SettingsView.tsx`

- [ ] **Step 1: Wrap SyncView in bento**

```tsx
return (
  <div>
    <ViewHeader title="Sync" icon={<IconSync size={22} accent={ACCENT.sync} filled />} accent={ACCENT.sync} stats="Google Drive" />
    <BentoGrid>
      <BentoCell span="1">
        <GlassCard accentBar accent={ACCENT.sync}>
          <div style={{ padding: 20 }}>
            <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: 16, color: '#1a1a2e', marginBottom: 8 }}>Status</div>
            {/* connection status — keep existing */}
          </div>
        </GlassCard>
      </BentoCell>
      <BentoCell span="2">
        <GlassCard>
          <div style={{ padding: 20 }}>
            <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: 16, color: '#1a1a2e', marginBottom: 8 }}>Last Sync</div>
            {/* sync timestamp + actions — keep existing */}
          </div>
        </GlassCard>
      </BentoCell>
      <BentoCell span="full">
        <GlassCard>
          <div style={{ padding: 16 }}>
            {/* sync log — keep existing */}
          </div>
        </GlassCard>
      </BentoCell>
    </BentoGrid>
  </div>
)
```

- [ ] **Step 2: Wrap SettingsView in bento**

```tsx
return (
  <div>
    <ViewHeader title="Settings" icon={<IconSettings size={22} accent={ACCENT.settings} filled />} accent={ACCENT.settings} />
    <BentoGrid>
      <BentoCell span="1">
        <GlassCard accentBar accent={ACCENT.settings}>
          <div style={{ padding: 20 }}>
            <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: 16, color: '#1a1a2e', marginBottom: 12 }}>Security</div>
            {/* security settings — keep existing */}
            <PillButton variant="secondary" onClick={onLogout} accent={ACCENT.settings}>Lock App</PillButton>
          </div>
        </GlassCard>
      </BentoCell>
      <BentoCell span="2">
        <GlassCard>
          <div style={{ padding: 20 }}>
            <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: 16, color: '#1a1a2e', marginBottom: 12 }}>About</div>
            {/* version info, links — keep existing */}
          </div>
        </GlassCard>
      </BentoCell>
    </BentoGrid>
  </div>
)
```

- [ ] **Step 3: Full build verification**

```bash
cd pwa && npm run build
```
Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 4: Run dev server and visually verify**

```bash
cd pwa && npm run dev
```

Check in browser:
- Splash screen animates and transitions to unlock form
- Unlock form accepts a password and enters app
- All 9 tabs render with bento layout
- Mobile (< 768px): bottom pill nav visible
- Desktop (> 768px): side rail visible, expands on hover
- Gradient background animates continuously

- [ ] **Step 5: Final commit**

```bash
git add pwa/src/app/views/SyncView.tsx pwa/src/app/views/SettingsView.tsx
git commit -m "feat: SyncView + SettingsView bento layout, full redesign complete"
```
