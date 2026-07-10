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
      {filled && <rect x="2" y="7" width="20" height="5" rx="2" fill={accent} fillOpacity="0.35" stroke="none" />}
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
      {filled && <polygon points="12,9 13.5,10.5 13.5,12.5 12,14 10.5,12.5 10.5,10.5" fill={accent} fillOpacity="0.4" stroke="none" />}
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
      {filled && <path d="M17 4 C20 7 20 17 12 18 C8 18 5 15 4 12" fill={accent} fillOpacity="0.25" stroke="none" />}
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
      {filled && <circle cx="12" cy="12" r="3" fill={accent} fillOpacity="0.28" stroke="none" />}
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2 L12 5 M12 19 L12 22 M2 12 L5 12 M19 12 L22 12 M4.9 4.9 L7 7 M17 17 L19.1 19.1 M19.1 4.9 L17 7 M7 17 L4.9 19.1" strokeWidth="1.5" />
    </Icon>
  )
}

export function IconTrash({ size = 24, accent = '#ef4444', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6 L18.1 19a2 2 0 0 1-2 1.9H7.9a2 2 0 0 1-2-1.9L5 6" />
      <path d="M10 11 L10 17" />
      <path d="M14 11 L14 17" />
      <path d="M9 6 L9 4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
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

export function IconStatusOffline({ size = 12, accent = '#34d399', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className}>
      {/* Outer ring — pulsing halo feel */}
      <circle cx="6" cy="6" r="5" fill={accent} fillOpacity="0.18" />
      {/* Inner filled dot */}
      <circle cx="6" cy="6" r="3" fill={accent} />
      {/* Tiny specular highlight */}
      <circle cx="5" cy="5" r="1" fill="white" fillOpacity="0.5" />
    </svg>
  )
}

export function IconStatusEncrypted({ size = 13, accent = '#7c6af7', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 13 15" fill="none" className={className}>
      {/* Lock body */}
      <rect x="1.5" y="6" width="10" height="8.5" rx="2" fill={accent} fillOpacity="0.18" stroke={accent} strokeWidth="1.4" />
      {/* Shackle arc */}
      <path d="M3.5 6 L3.5 4 C3.5 2.3 4.8 1 6.5 1 C8.2 1 9.5 2.3 9.5 4 L9.5 6"
        stroke={accent} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Keyhole circle */}
      <circle cx="6.5" cy="10" r="1.3" fill={accent} />
      {/* Keyhole stem */}
      <rect x="5.9" y="10.6" width="1.2" height="2" rx="0.5" fill={accent} />
    </svg>
  )
}

export function IconAppShield({ size = 24, accent = 'white', className }: IconProps) {
  const isWhite = accent === 'white' || accent === '#fff'
  const shieldFill = isWhite ? 'rgba(255,255,255,0.18)' : '#d97706'
  const shieldStroke = isWhite ? 'rgba(255,255,255,0.7)' : '#b45309'
  const innerFill = isWhite ? '#fff' : '#7c2d12'
  const innerBg = isWhite ? 'rgba(255,255,255,0.12)' : '#fbbf24'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Amber shield body */}
      <path d="M12 2.5 L19.5 6 L19.5 13 C19.5 17.2 16.2 20.5 12 22 C7.8 20.5 4.5 17.2 4.5 13 L4.5 6 Z"
        fill={shieldFill} stroke={shieldStroke} strokeWidth="1.5" strokeLinejoin="round" />
      {/* Inner circle bg */}
      <circle cx="12" cy="13" r="4" fill={innerBg} />
      {/* Lock shackle */}
      <path d="M9.5 13 L9.5 11.5 C9.5 10.1 10.7 9 12 9 C13.3 9 14.5 10.1 14.5 11.5 L14.5 13"
        stroke={innerFill} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Lock body */}
      <rect x="9" y="12.5" width="6" height="4.5" rx="1.2" fill={innerFill} />
      {/* Keyhole */}
      <circle cx="12" cy="14.2" r="0.9" fill={isWhite ? 'rgba(255,255,255,0.3)' : '#fbbf24'} />
    </svg>
  )
}
