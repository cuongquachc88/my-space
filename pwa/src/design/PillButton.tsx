// pwa/src/design/PillButton.tsx
import React from 'react'

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
