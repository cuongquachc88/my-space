import React from 'react'

export interface IconProps {
  active?: boolean
  accentColor?: string
  size?: number
}

const baseStroke = 'rgba(255,255,255,0.25)'

export function NotesIcon({ active, accentColor = '#818cf8', size = 20 }: IconProps) {
  const stroke = active ? accentColor : baseStroke
  const fill = active ? `${accentColor}33` : 'rgba(255,255,255,0.06)'
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <rect x="3" y="1.5" width="11" height="14" rx="2" fill={fill} stroke={stroke} strokeWidth="1.4" />
      <line x1="6" y1="6" x2="11" y2="6" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="6" y1="9" x2="11" y2="9" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="6" y1="12" x2="9" y2="12" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export function KeyvaultIcon({ active, accentColor = '#f59e0b', size = 20 }: IconProps) {
  const stroke = active ? accentColor : baseStroke
  const fill = active ? `${accentColor}33` : 'rgba(255,255,255,0.06)'
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M10 1.5L3 4.5v5c0 4 3.1 7.5 7 8.5 3.9-1 7-4.5 7-8.5v-5L10 1.5z"
        fill={fill} stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="10" cy="8.5" r="2" fill={fill} stroke={stroke} strokeWidth="1.3" />
      <line x1="10" y1="10.5" x2="10" y2="13" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" />
      <line x1="8.5" y1="11.8" x2="11.5" y2="11.8" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

export function SyncIcon({ active, accentColor = '#3b82f6', size = 20 }: IconProps) {
  const stroke = active ? accentColor : baseStroke
  const fill = active ? `${accentColor}33` : 'rgba(255,255,255,0.06)'
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M5.5 13.5a3 3 0 01-.4-6 4.5 4.5 0 018.8-.8 2.5 2.5 0 01.6 4.8H5.5z"
        fill={fill} stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />
      <line x1="10" y1="11" x2="10" y2="17" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
      <polyline points="7.5,14.5 10,17 12.5,14.5" stroke={stroke} strokeWidth="1.4"
        strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

export function SettingsIcon({ active, accentColor = '#3b82f6', size = 20 }: IconProps) {
  const stroke = active ? accentColor : baseStroke
  const fill = active ? `${accentColor}22` : 'rgba(255,255,255,0.06)'
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <line x1="3" y1="5" x2="17" y2="5" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="7" cy="5" r="2" fill={fill} stroke={stroke} strokeWidth="1.3" />
      <line x1="3" y1="10" x2="17" y2="10" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="13" cy="10" r="2" fill={fill} stroke={stroke} strokeWidth="1.3" />
      <line x1="3" y1="15" x2="17" y2="15" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="9" cy="15" r="2" fill={fill} stroke={stroke} strokeWidth="1.3" />
    </svg>
  )
}

export function GeneratorIcon({ active, accentColor = '#a78bfa', size = 20 }: IconProps) {
  const stroke = active ? accentColor : baseStroke
  const fill = active ? `${accentColor}33` : 'rgba(255,255,255,0.06)'
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <rect x="3" y="3" width="14" height="14" rx="3" fill={fill} stroke={stroke} strokeWidth="1.4" />
      <circle cx="7"  cy="7"  r="1.2" fill={stroke} />
      <circle cx="13" cy="7"  r="1.2" fill={stroke} />
      <circle cx="7"  cy="13" r="1.2" fill={stroke} />
      <circle cx="13" cy="13" r="1.2" fill={stroke} />
      <circle cx="10" cy="10" r="1.2" fill={stroke} />
    </svg>
  )
}

export function SubscriptionsIcon({ active, accentColor = '#34d399', size = 20 }: IconProps) {
  const stroke = active ? accentColor : baseStroke
  const fill = active ? `${accentColor}33` : 'rgba(255,255,255,0.06)'
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <rect x="2" y="4" width="16" height="12" rx="2.5" fill={fill} stroke={stroke} strokeWidth="1.4" />
      <line x1="2" y1="8" x2="18" y2="8" stroke={stroke} strokeWidth="1.2" />
      <circle cx="6"  cy="12" r="1.2" fill={stroke} />
      <circle cx="10" cy="12" r="1.2" fill={stroke} />
      <circle cx="14" cy="12" r="1.2" fill={stroke} />
    </svg>
  )
}

export function TodoIcon({ active, accentColor = '#38bdf8', size = 20 }: IconProps) {
  const stroke = active ? accentColor : baseStroke
  const fill = active ? `${accentColor}33` : 'rgba(255,255,255,0.06)'
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <rect x="3" y="2" width="14" height="16" rx="2.5" fill={fill} stroke={stroke} strokeWidth="1.4" />
      <polyline points="6.5,7 8,8.5 11,5.5" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12.5" y1="7" x2="14.5" y2="7" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" />
      <polyline points="6.5,11.5 8,13 11,10" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12.5" y1="11.5" x2="14.5" y2="11.5" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

export function MapPinsIcon({ active, accentColor = '#fb923c', size = 20 }: IconProps) {
  const stroke = active ? accentColor : baseStroke
  const fill = active ? `${accentColor}33` : 'rgba(255,255,255,0.06)'
  const dot = active ? accentColor : 'rgba(255,255,255,0.3)'
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M10 2.5C8 2.5 6.5 4 6.5 5.9c0 2.6 3.5 6.6 3.5 6.6s3.5-4 3.5-6.6C13.5 4 12 2.5 10 2.5z"
        fill={fill} stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="10" cy="5.8" r="1.4" fill={stroke} />
      <circle cx="5.5"  cy="15.5" r="1.3" fill={dot} />
      <circle cx="10"   cy="15.5" r="1.3" fill={dot} />
      <circle cx="14.5" cy="15.5" r="1.3" fill={dot} />
      <circle cx="5.5"  cy="11.5" r="1.3" fill={dot} />
      <circle cx="14.5" cy="11.5" r="1.3" fill={dot} />
    </svg>
  )
}

export function ReportsIcon({ active, accentColor = '#f472b6', size = 20 }: IconProps) {
  const stroke = active ? accentColor : baseStroke
  const fill = active ? `${accentColor}33` : 'rgba(255,255,255,0.06)'
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <rect x="2" y="2" width="16" height="16" rx="2.5" fill={fill} stroke={stroke} strokeWidth="1.4" />
      <rect x="5" y="11" width="2.5" height="5" rx="1" fill={stroke} />
      <rect x="8.75" y="8" width="2.5" height="8" rx="1" fill={stroke} />
      <rect x="12.5" y="5" width="2.5" height="11" rx="1" fill={stroke} />
    </svg>
  )
}

// ─── Pixel icon for list/stack badges ────────────────────────────────────────
// Each icon is a 16×16 pixel-art SVG drawn with integer-coord rects only.

function px(color: string, x: number, y: number, w = 1, h = 1) {
  return <rect key={`${x},${y}`} x={x} y={y} width={w} height={h} fill={color} />
}

export function PixelIcon({ id, color, size = 18 }: { id: string; color: string; size?: number }) {
  const c = color

  const icons: Record<string, React.ReactElement> = {
    // ── home ──
    home: (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        {/* roof */}
        {px(c,7,1,2,1)}{px(c,6,2,4,1)}{px(c,5,3,6,1)}{px(c,4,4,8,1)}
        {/* walls */}
        {px(c,4,5,1,7)}{px(c,11,5,1,7)}
        {/* floor */}
        {px(c,4,11,8,1)}
        {/* door */}
        {px(c,7,8,2,4)}
        {/* fill walls */}
        {px(c,5,5,6,6)}
      </svg>
    ),

    // ── work / office ──
    work: (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        {/* building */}
        {px(c,3,2,10,1)}{px(c,3,2,1,11)}{px(c,12,2,1,11)}{px(c,3,12,10,1)}
        {/* windows row 1 */}
        {px(c,5,4,2,2)}{px(c,9,4,2,2)}
        {/* windows row 2 */}
        {px(c,5,8,2,2)}{px(c,9,8,2,2)}
        {/* door */}
        {px(c,7,10,2,3)}
      </svg>
    ),

    // ── school ──
    school: (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        {/* roof triangle */}
        {px(c,7,1,2,1)}{px(c,6,2,4,1)}{px(c,5,3,6,1)}{px(c,4,4,8,1)}
        {/* bell tower */}
        {px(c,7,2,2,3)}
        {/* body */}
        {px(c,3,5,10,7)}
        {/* door */}
        {px(c,7,9,2,3)}
        {/* windows */}
        {px(c,4,6,2,2)}{px(c,10,6,2,2)}
      </svg>
    ),

    // ── hospital ──
    hospital: (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        {/* building */}
        {px(c,3,3,10,10)}
        {/* white cross */}
        <rect x="5" y="7" width="6" height="2" fill="rgba(0,0,0,0.45)" />
        <rect x="7" y="5" width="2" height="6" fill="rgba(0,0,0,0.45)" />
        <rect x="6" y="6" width="4" height="4" fill="rgba(0,0,0,0.45)" />
      </svg>
    ),

    // ── market / shopping cart ──
    market: (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        {/* handle */}
        {px(c,2,2,1,1)}{px(c,3,3,1,1)}{px(c,4,3,1,4)}
        {/* basket */}
        {px(c,4,7,9,1)}{px(c,4,7,1,4)}{px(c,12,7,1,4)}{px(c,5,11,7,1)}
        {/* items */}
        {px(c,6,9,2,1)}{px(c,9,9,2,1)}
        {/* wheels */}
        {px(c,6,13,2,2)}{px(c,10,13,2,2)}
      </svg>
    ),

    // ── gym ──
    gym: (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        {/* bar */}
        {px(c,6,7,4,2)}
        {/* left weight */}
        {px(c,3,5,2,6)}{px(c,1,6,2,4)}
        {/* right weight */}
        {px(c,11,5,2,6)}{px(c,13,6,2,4)}
      </svg>
    ),

    // ── park / tree ──
    park: (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        {/* canopy */}
        {px(c,7,1,2,1)}{px(c,6,2,4,1)}{px(c,5,3,6,2)}{px(c,4,5,8,2)}{px(c,3,7,10,2)}
        {/* trunk */}
        {px(c,7,9,2,5)}
        {/* ground */}
        {px(c,4,14,8,1)}
      </svg>
    ),

    // ── bank ──
    bank: (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        {/* roof */}
        {px(c,2,3,12,2)}
        {/* columns */}
        {px(c,3,5,2,6)}{px(c,7,5,2,6)}{px(c,11,5,2,6)}
        {/* base */}
        {px(c,2,11,12,2)}
        {/* pediment */}
        {px(c,5,1,6,1)}{px(c,4,2,8,1)}
      </svg>
    ),

    // ── restaurant / plate ──
    restaurant: (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        {/* plate rim */}
        {px(c,5,4,6,1)}{px(c,3,5,1,6)}{px(c,12,5,1,6)}{px(c,5,11,6,1)}
        {px(c,4,4,1,1)}{px(c,11,4,1,1)}{px(c,4,11,1,1)}{px(c,11,11,1,1)}
        {/* fork */}
        {px(c,5,6,1,5)}{px(c,5,6,1,1)}{px(c,6,6,1,3)}
        {/* knife */}
        {px(c,10,6,1,5)}{px(c,9,6,1,2)}{px(c,9,7,2,1)}
      </svg>
    ),

    // ── café / cup ──
    cafe: (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        {/* steam */}
        {px(c,6,1,1,2)}{px(c,9,1,1,2)}{px(c,5,2,1,1)}{px(c,8,2,1,1)}
        {/* cup */}
        {px(c,4,4,8,1)}{px(c,4,4,1,6)}{px(c,11,4,1,6)}{px(c,5,10,6,1)}
        {/* handle */}
        {px(c,11,6,1,1)}{px(c,12,6,1,3)}{px(c,11,9,1,1)}
        {/* saucer */}
        {px(c,3,11,10,1)}{px(c,5,12,6,1)}
      </svg>
    ),

    // ── hotel / bed ──
    hotel: (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        {/* headboard */}
        {px(c,2,5,2,6)}
        {/* bed frame */}
        {px(c,2,10,12,1)}{px(c,4,11,10,1)}
        {/* mattress */}
        {px(c,4,7,10,3)}
        {/* pillow */}
        {px(c,5,6,3,2)}{px(c,10,6,3,2)}
        {/* legs */}
        {px(c,4,12,1,2)}{px(c,13,12,1,2)}
      </svg>
    ),

    // ── airport / plane ──
    airport: (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        {/* fuselage */}
        {px(c,4,7,8,2)}
        {/* nose */}
        {px(c,12,8,2,1)}{px(c,11,7,1,1)}{px(c,11,9,1,1)}
        {/* wings */}
        {px(c,6,4,2,3)}{px(c,6,9,2,3)}
        {/* tail */}
        {px(c,4,6,1,1)}{px(c,3,5,1,2)}{px(c,4,10,1,1)}{px(c,3,9,1,2)}
        {/* runway line */}
        {px(c,2,14,12,1)}
      </svg>
    ),

    // ── star ──
    star: (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        {px(c,7,1,2,2)}{px(c,6,3,4,1)}{px(c,5,4,6,1)}{px(c,3,5,10,2)}
        {px(c,5,7,2,3)}{px(c,9,7,2,3)}{px(c,4,8,2,1)}{px(c,10,8,2,1)}
        {px(c,3,9,3,2)}{px(c,10,9,3,2)}{px(c,2,10,3,1)}{px(c,11,10,3,1)}
        {px(c,2,11,2,1)}{px(c,12,11,2,1)}{px(c,3,12,2,2)}{px(c,11,12,2,2)}
        {px(c,5,13,2,1)}{px(c,9,13,2,1)}{px(c,6,14,4,1)}
      </svg>
    ),

    // ── pin ──
    pin: (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        {/* head */}
        {px(c,6,1,4,1)}{px(c,5,2,6,1)}{px(c,4,3,8,3)}{px(c,5,6,6,1)}{px(c,6,7,4,1)}
        {/* hole */}
        {px('rgba(0,0,0,0.35)',6,4,4,2)}
        {/* stem */}
        {px(c,7,8,2,7)}
      </svg>
    ),

    // ── inbox ──
    inbox: (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        {/* box */}
        {px(c,2,8,12,1)}{px(c,2,8,1,5)}{px(c,13,8,1,5)}{px(c,2,13,12,1)}
        {/* flaps */}
        {px(c,2,3,5,5)}{px(c,9,3,5,5)}{px(c,7,6,2,3)}
        {/* down arrow */}
        {px(c,7,9,2,3)}{px(c,6,11,4,1)}{px(c,7,12,2,1)}
      </svg>
    ),

    // ── calendar ──
    calendar: (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        {/* frame */}
        {px(c,2,3,12,1)}{px(c,2,3,1,11)}{px(c,13,3,1,11)}{px(c,2,13,12,1)}
        {/* header bar */}
        {px(c,2,3,12,3)}
        {/* hooks */}
        {px(c,5,2,1,2)}{px(c,10,2,1,2)}
        {/* grid dots */}
        {px(c,4,8,2,1)}{px(c,7,8,2,1)}{px(c,10,8,2,1)}
        {px(c,4,11,2,1)}{px(c,7,11,2,1)}{px(c,10,11,2,1)}
      </svg>
    ),

    // ── book / study ──
    book: (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        {/* spine */}
        {px(c,6,2,1,12)}
        {/* cover */}
        {px(c,3,2,3,12)}{px(c,7,2,6,12)}
        {/* pages */}
        {px(c,7,3,5,10)}
        {/* lines */}
        {px(c,8,5,3,1)}{px(c,8,7,3,1)}{px(c,8,9,3,1)}
        {/* bottom */}
        {px(c,3,14,10,1)}
      </svg>
    ),

    // ── code / laptop ──
    code: (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        {/* screen */}
        {px(c,2,2,12,9)}{px(c,3,3,10,7)}
        {/* base */}
        {px(c,1,11,14,2)}{px(c,5,11,6,1)}
        {/* brackets on screen */}
        {px(c,4,5,1,3)}{px(c,5,5,1,1)}{px(c,5,7,1,1)}
        {px(c,10,5,1,3)}{px(c,9,5,1,1)}{px(c,9,7,1,1)}
        {/* slash */}
        {px(c,7,5,1,1)}{px(c,8,6,1,1)}{px(c,7,7,1,1)}
      </svg>
    ),

    // ── money / finance ──
    money: (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        {/* coin stack */}
        {px(c,4,11,8,1)}{px(c,3,12,10,1)}{px(c,3,13,10,1)}{px(c,4,14,8,1)}
        {/* coin 2 */}
        {px(c,4,8,8,1)}{px(c,3,9,10,2)}{px(c,4,11,8,1)}
        {/* dollar */}
        {px(c,7,3,2,1)}{px(c,6,4,4,1)}{px(c,5,5,6,1)}{px(c,6,6,4,1)}{px(c,5,7,6,1)}{px(c,6,8,4,1)}{px(c,7,9,2,1)}
        {px(c,8,2,1,9)}
      </svg>
    ),

    // ── music ──
    music: (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        {/* note stem */}
        {px(c,8,2,1,9)}{px(c,11,2,1,7)}
        {/* beam */}
        {px(c,8,2,4,2)}
        {/* note head 1 */}
        {px(c,6,10,3,2)}{px(c,7,9,2,1)}{px(c,7,12,2,1)}
        {/* note head 2 */}
        {px(c,9,8,3,2)}{px(c,10,7,2,1)}{px(c,10,10,2,1)}
      </svg>
    ),

    // ── idea / lightbulb ──
    idea: (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        {/* bulb */}
        {px(c,6,1,4,1)}{px(c,4,2,8,1)}{px(c,3,3,10,1)}{px(c,3,4,10,3)}{px(c,4,7,8,1)}{px(c,5,8,6,1)}
        {/* neck */}
        {px(c,5,9,6,1)}{px(c,5,10,6,1)}
        {/* base */}
        {px(c,6,11,4,1)}{px(c,7,12,2,2)}
        {/* rays */}
        {px(c,1,4,1,1)}{px(c,14,4,1,1)}{px(c,1,7,1,1)}{px(c,14,7,1,1)}
        {px(c,2,2,1,1)}{px(c,13,2,1,1)}
      </svg>
    ),

    // ── tools ──
    tools: (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        {/* wrench handle */}
        {px(c,2,12,8,2)}{px(c,9,10,1,2)}
        {/* wrench head */}
        {px(c,9,8,2,1)}{px(c,10,7,2,1)}{px(c,12,7,1,3)}{px(c,10,10,2,1)}{px(c,9,9,2,2)}
        {/* screwdriver */}
        {px(c,11,2,2,8)}{px(c,10,10,4,1)}{px(c,11,11,2,2)}{px(c,10,2,1,1)}{px(c,13,2,1,1)}
      </svg>
    ),

    // ── shopping ──
    shopping: (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        {/* bag body */}
        {px(c,3,5,10,8)}{px(c,4,4,8,1)}
        {/* bag outline */}
        {px(c,3,5,1,8)}{px(c,12,5,1,8)}{px(c,3,13,10,1)}
        {/* handles */}
        {px(c,5,2,2,3)}{px(c,9,2,2,3)}
        {/* stripe */}
        {px(c,5,8,6,2)}
      </svg>
    ),

    // ── travel / suitcase ──
    travel: (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        {/* handle */}
        {px(c,6,1,4,1)}{px(c,5,2,1,2)}{px(c,10,2,1,2)}
        {/* body */}
        {px(c,2,4,12,9)}
        {/* stripes */}
        {px(c,7,4,2,9)}
        {/* wheels */}
        {px(c,3,13,2,2)}{px(c,11,13,2,2)}
        {/* lock */}
        {px(c,7,7,2,3)}
      </svg>
    ),

    // ── health / heart ──
    health: (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        {px(c,3,3,4,2)}{px(c,9,3,4,2)}
        {px(c,2,5,5,3)}{px(c,9,5,5,3)}
        {px(c,2,8,12,2)}{px(c,3,10,10,2)}
        {px(c,4,12,8,1)}{px(c,5,13,6,1)}{px(c,6,14,4,1)}{px(c,7,15,2,1)}
      </svg>
    ),

    // ── pet / paw ──
    pet: (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        {/* paw pads */}
        {px(c,3,4,3,3)}{px(c,7,2,3,3)}{px(c,11,4,3,3)}
        {px(c,5,9,7,4)}{px(c,4,10,9,3)}{px(c,5,13,6,1)}
        {/* toes on main pad */}
        {px(c,3,8,2,2)}{px(c,12,8,2,2)}
      </svg>
    ),

    // ── garden / leaf ──
    garden: (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        {/* stem */}
        {px(c,8,8,1,6)}{px(c,6,10,2,1)}{px(c,9,12,2,1)}
        {/* leaf */}
        {px(c,8,2,1,1)}{px(c,7,3,3,1)}{px(c,6,4,5,1)}{px(c,5,5,7,1)}{px(c,5,6,7,2)}{px(c,6,8,5,1)}{px(c,7,9,3,1)}
      </svg>
    ),

    // ── game / controller ──
    game: (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        {/* body */}
        {px(c,3,5,10,6)}{px(c,2,6,12,4)}{px(c,1,7,2,2)}{px(c,13,7,2,2)}
        {/* dpad */}
        {px(c,4,7,1,3)}{px(c,5,8,3,1)}{px(c,4,8,4,1)}
        {/* buttons */}
        {px(c,10,7,2,1)}{px(c,10,9,2,1)}{px(c,9,8,1,1)}{px(c,12,8,1,1)}
        {/* handles */}
        {px(c,2,9,1,2)}{px(c,13,9,1,2)}{px(c,3,11,1,1)}{px(c,12,11,1,1)}
      </svg>
    ),

    // ── flag ──
    flag: (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        {/* pole */}
        {px(c,3,1,1,14)}
        {/* flag */}
        {px(c,4,2,9,1)}{px(c,4,2,1,5)}{px(c,12,2,1,5)}{px(c,4,7,9,1)}
        {px(c,5,3,6,3)}{px(c,11,3,1,3)}
      </svg>
    ),

    // ── box ──
    box: (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        {/* body */}
        {px(c,2,5,12,8)}{px(c,2,13,12,1)}
        {/* lid */}
        {px(c,2,3,12,1)}{px(c,2,4,12,1)}
        {/* tape */}
        {px(c,7,3,2,4)}
        {/* sides */}
        {px(c,2,4,1,9)}{px(c,13,4,1,9)}
      </svg>
    ),
  }

  const el = icons[id]
  if (el) return el

  // fallback: generic grid of dots
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      {[3,7,11].flatMap(x => [3,7,11].map(y => px(c,x,y,2,2)))}
    </svg>
  )
}
