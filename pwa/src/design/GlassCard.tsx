// pwa/src/design/GlassCard.tsx
import React from 'react'

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
      {children}
    </div>
  )
}
