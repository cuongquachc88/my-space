// pwa/src/design/BentoGrid.tsx
import React from 'react'

interface GridProps {
  children: React.ReactNode
  className?: string
}

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
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
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
