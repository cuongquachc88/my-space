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
