import React from 'react'
import GlassCard from '../design/GlassCard'
import PillButton from '../design/PillButton'

interface Props {
  title: string
  icon: React.ReactNode
  accent: string
  stats?: React.ReactNode
  action?: string
  onAction?: () => void
}

export default function ViewHeader({ title, icon, accent, stats, action, onAction }: Props) {
  return (
    <GlassCard style={{ marginBottom: 12 }}>
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 24, letterSpacing: '-0.01em', lineHeight: 1.2, background: `linear-gradient(135deg, ${accent}, ${accent}99)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{title}</div>
          {stats && <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#4a4a6a', marginTop: 2 }}>{stats}</div>}
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
