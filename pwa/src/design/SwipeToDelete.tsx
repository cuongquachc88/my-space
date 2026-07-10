// pwa/src/design/SwipeToDelete.tsx
import React, { useRef, useState } from 'react'
import { IconTrash } from './icons'

interface Props {
  onDelete: () => void
  children: React.ReactNode
}

const THRESHOLD = 72

export default function SwipeToDelete({ onDelete, children }: Props) {
  const [offset, setOffset] = useState(0)
  const [deleting, setDeleting] = useState(false)
  const startX = useRef<number | null>(null)
  const startY = useRef<number | null>(null)
  const locked = useRef(false)

  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    locked.current = false
  }

  function onTouchMove(e: React.TouchEvent) {
    if (startX.current === null || startY.current === null) return
    const dx = e.touches[0].clientX - startX.current
    const dy = e.touches[0].clientY - startY.current

    if (!locked.current) {
      if (Math.abs(dy) > Math.abs(dx) + 4) {
        locked.current = true; return
      }
      if (Math.abs(dx) > 6) locked.current = false
    }

    if (locked.current) return
    if (dx < 0) {
      e.preventDefault()
      setOffset(Math.max(dx, -THRESHOLD - 20))
    } else if (dx > 0 && offset < 0) {
      e.preventDefault()
      setOffset(Math.min(0, offset + dx))
    }
  }

  function onTouchEnd() {
    if (offset < -THRESHOLD) {
      setDeleting(true)
      setTimeout(() => { setOffset(0); setDeleting(false); onDelete() }, 300)
    } else {
      setOffset(0)
    }
    startX.current = null
    startY.current = null
  }

  const revealed = offset < -8

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 12 }}>
      {/* Red delete background */}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0,
        width: THRESHOLD,
        background: deleting ? '#dc2626' : '#ef4444',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 12,
        opacity: revealed ? 1 : 0,
        transition: 'opacity 150ms, background 200ms',
      }}>
        <IconTrash size={18} accent="#fff" />
      </div>

      {/* Swipeable content */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: `translateX(${deleting ? -THRESHOLD - 20 : offset}px)`,
          transition: deleting ? 'transform 300ms ease' : offset === 0 ? 'transform 200ms ease' : 'none',
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  )
}
