// pwa/src/design/BottomSheet.tsx
import React, { useEffect, useState } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  maxHeight?: string
}

export default function BottomSheet({ open, onClose, children, maxHeight = '80dvh' }: Props) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      // Let the DOM paint the initial off-screen position first, then trigger slide
      const t = setTimeout(() => setVisible(true), 20)
      return () => clearTimeout(t)
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 400)
      return () => clearTimeout(t)
    }
  }, [open])

  if (!mounted) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: visible ? 'rgba(20,20,40,0.45)' : 'rgba(20,20,40,0)',
        backdropFilter: visible ? 'blur(4px)' : 'blur(0px)',
        WebkitBackdropFilter: visible ? 'blur(4px)' : 'blur(0px)',
        transition: 'background 300ms ease, backdrop-filter 300ms ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          maxHeight,
          background: 'rgba(248,248,255,0.90)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          boxShadow: '0 -8px 40px rgba(124,106,247,0.20), 0 -1px 0 rgba(255,255,255,0.6)',
          overflowY: 'auto',
          overflowX: 'hidden',
          boxSizing: 'border-box',
          paddingBottom: 'env(safe-area-inset-bottom)',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 420ms cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        {/* Handle row */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px 16px 6px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.12)' }} />
          <button onClick={onClose} style={{
            position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
            width: 30, height: 30, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: 'rgba(0,0,0,0.06)', color: '#4a4a6a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontFamily: 'Inter, sans-serif',
          }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
