// pwa/src/design/GlassInput.tsx
import React from 'react'

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
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        borderRadius: 12,
        padding: '12px 16px',
        fontSize: 15,
        fontFamily: 'Satoshi, sans-serif',
        color: 'var(--text-primary)',
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
