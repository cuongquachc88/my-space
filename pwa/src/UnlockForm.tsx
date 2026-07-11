import { useState } from 'react'
import AppBackground from './design/AppBackground'
import GlassCard from './design/GlassCard'
import { IconAppShield } from './design/icons'
import { unlock, saveVerifyToken, getKey } from './crypto'
import { useIsDesktop } from './app/useIsDesktop'

interface Props { onUnlocked: () => void }

const SALT_KEY = 'myspace_vault_salt'

function getSalt(): Uint8Array {
  const stored = localStorage.getItem(SALT_KEY)
  if (stored) return Uint8Array.from(atob(stored), c => c.charCodeAt(0))
  const s = crypto.getRandomValues(new Uint8Array(32))
  localStorage.setItem(SALT_KEY, btoa(Array.from(s, c => String.fromCharCode(c)).join('')))
  return s
}

const isFirstTime = () => !localStorage.getItem(SALT_KEY)

const PIN_DIGITS = [
  ['1','2','3'],
  ['4','5','6'],
  ['7','8','9'],
  ['','0','⌫'],
]

export default function UnlockForm({ onUnlocked }: Props) {
  const isDesktop = useIsDesktop()
  const [firstTime] = useState(isFirstTime)
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinStep, setPinStep] = useState<'enter'|'confirm'>('enter')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [pressedKey, setPressedKey] = useState<string | null>(null)

  async function doUnlock(value: string) {
    setError('')
    setLoading(true)
    try {
      const salt = getSalt()
      await unlock(value, salt)
      if (!localStorage.getItem('myspace_vault_verify')) {
        await saveVerifyToken(getKey())
      }
      setExiting(true)
      setTimeout(onUnlocked, 280)
    } catch {
      setError('Incorrect PIN.')
      setLoading(false)
    }
  }

  function handlePinKey(key: string) {
    if (loading) return
    const current = pinStep === 'confirm' ? confirmPin : pin
    const setter = pinStep === 'confirm' ? setConfirmPin : setPin

    if (key === '⌫') { setter(current.slice(0, -1)); setError(''); return }
    if (current.length >= 6) return
    const next = current + key
    setter(next)
    setError('')

    if (next.length === 6) {
      if (firstTime) {
        if (pinStep === 'enter') {
          setPinStep('confirm')
        } else {
          if (next !== pin) {
            setError('PINs do not match. Try again.')
            setConfirmPin('')
            setPinStep('enter')
            setPin('')
            return
          }
          doUnlock(next)
        }
      } else {
        doUnlock(next)
      }
    }
  }

  const displayPin = pinStep === 'confirm' ? confirmPin : pin

  const subtitle = firstTime
    ? (pinStep === 'confirm' ? 'Confirm your 6-digit PIN' : 'Create a 6-digit PIN')
    : 'Enter your PIN'

  const pinPad = (btnHeight: number) => (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      {/* Dots */}
      <div style={{ display: 'flex', gap: 12 }}>
        {Array.from({ length: 6 }, (_, i) => i < displayPin.length).map((filled, i) => (
          <div key={i} style={{
            width: 14, height: 14, borderRadius: '50%',
            background: filled ? '#7c6af7' : 'rgba(124,106,247,0.2)',
            border: `2px solid ${filled ? '#7c6af7' : 'rgba(124,106,247,0.3)'}`,
            transition: 'all 150ms',
          }} />
        ))}
      </div>

      {error && (
        <div style={{ fontSize: 13, color: '#ef4444', textAlign: 'center', fontFamily: 'Inter, sans-serif', marginTop: -8 }}>
          {error}
        </div>
      )}

      {/* Keypad */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, width: '100%', maxWidth: 240 }}>
        {PIN_DIGITS.flat().map((key, i) => (
          <button key={i}
            onPointerDown={() => { if (key && !loading) { setPressedKey(key); handlePinKey(key) } }}
            onPointerUp={() => setPressedKey(null)}
            onPointerLeave={() => setPressedKey(null)}
            disabled={!key || loading}
            style={{
              height: btnHeight, borderRadius: 16, border: '1px solid rgba(255,255,255,0.5)',
              background: pressedKey === key && key ? 'rgba(124,106,247,0.25)' : key ? 'rgba(255,255,255,0.5)' : 'transparent',
              cursor: key ? 'pointer' : 'default',
              fontFamily: 'Montserrat, sans-serif',
              fontSize: key === '⌫' ? 22 : 26, fontWeight: 600, color: '#1a1a2e',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transform: pressedKey === key && key ? 'scale(0.92)' : 'scale(1)',
              transition: 'background 80ms, transform 80ms',
              boxShadow: key ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
            }}>
            {key}
          </button>
        ))}
      </div>

      {loading && <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#7c6af7' }}>Unlocking…</div>}
    </div>
  )

  if (!isDesktop) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px',
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'scale(0.97)' : 'scale(1)',
        transition: 'opacity 250ms ease, transform 250ms ease',
      }}>
        <AppBackground />
        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg, #7c6af7, #38bdf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 24px rgba(124,106,247,0.35)' }}>
            <IconAppShield size={36} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 26, color: '#1a1a2e', letterSpacing: '-0.02em' }}>
              My <span style={{ color: '#7c6af7' }}>SPACE</span>
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#4a4a6a', marginTop: 4 }}>{subtitle}</div>
          </div>
          {pinPad(64)}
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <AppBackground />
      <GlassCard style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 360, padding: 28,
        transform: exiting ? 'scale(0.95)' : 'scale(1)',
        opacity: exiting ? 0 : 1,
        transition: 'transform 250ms ease, opacity 250ms ease',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #7c6af7, #38bdf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(124,106,247,0.3)' }}>
            <IconAppShield size={28} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 22, color: '#1a1a2e', letterSpacing: '-0.02em' }}>
              My <span style={{ color: '#7c6af7' }}>SPACE</span>
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#4a4a6a', marginTop: 4 }}>{subtitle}</div>
          </div>
          {pinPad(56)}
        </div>
      </GlassCard>
    </div>
  )
}
