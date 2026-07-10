import React from 'react'

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
    <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </div>
        <div>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 26, letterSpacing: '-0.03em', color: '#1a1a2e', lineHeight: 1.0 }}>{title}</div>
          {stats && <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#8e8e93', marginTop: 2 }}>{stats}</div>}
        </div>
      </div>
      {action && onAction && (
        <button onClick={onAction} style={{
          padding: '10px 20px', borderRadius: 100, border: 'none', cursor: 'pointer',
          background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
          color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 14,
          boxShadow: `0 4px 12px ${accent}40`,
        }}>
          {action}
        </button>
      )}
    </div>
  )
}
