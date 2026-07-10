// pwa/src/SplashScreen.tsx
import { useEffect, useState } from 'react'
import AppBackground from './design/AppBackground'
import { IconAppShield } from './design/icons'

interface Props { onDone: () => void }

export default function SplashScreen({ onDone }: Props) {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 600)
    const t2 = setTimeout(() => setPhase('out'), 1400)
    const t3 = setTimeout(() => onDone(), 1800)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  const opacity = phase === 'out' ? 0 : 1
  const iconScale = phase === 'in' ? 0.8 : 1

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, transition: 'opacity 400ms ease', opacity }}>
      <AppBackground />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 80, height: 80, borderRadius: 20,
          background: 'linear-gradient(135deg, #7c6af7, #38bdf8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: `scale(${iconScale})`,
          transition: 'transform 600ms cubic-bezier(0.34,1.56,0.64,1)',
          boxShadow: '0 8px 32px rgba(124,106,247,0.35)',
        }}>
          <IconAppShield size={48} />
        </div>
        <div style={{ textAlign: 'center', opacity: phase === 'in' ? 0 : 1, transition: 'opacity 400ms ease 300ms' }}>
          <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 700, fontSize: 32, color: '#1a1a2e', letterSpacing: '-0.02em' }}>
            My <span style={{ color: '#7c6af7' }}>SPACE</span>
          </div>
          <div style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 15, color: '#4a4a6a', marginTop: 4 }}>
            Your private space.
          </div>
        </div>
      </div>
    </div>
  )
}
