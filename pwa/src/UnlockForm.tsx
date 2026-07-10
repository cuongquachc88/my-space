// pwa/src/UnlockForm.tsx
import { useState } from 'react'
import AppBackground from './design/AppBackground'
import GlassCard from './design/GlassCard'
import GlassInput from './design/GlassInput'
import PillButton from './design/PillButton'
import { IconAppShield, IconLock } from './design/icons'
import { unlock } from './crypto'

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

export default function UnlockForm({ onUnlocked }: Props) {
  const [firstTime] = useState(isFirstTime)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [exiting, setExiting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (firstTime && password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 4) { setError('Password must be at least 4 characters.'); return }
    setLoading(true)
    try {
      const salt = getSalt()
      await unlock(password, salt)
      setExiting(true)
      setTimeout(onUnlocked, 280)
    } catch {
      setError('Incorrect password.')
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <AppBackground />
      <GlassCard
        style={{
          position: 'relative', zIndex: 1,
          width: '100%', maxWidth: 360, padding: 32,
          transform: exiting ? 'scale(0.95)' : 'scale(1)',
          opacity: exiting ? 0 : 1,
          transition: 'transform 250ms ease, opacity 250ms ease',
        }}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'linear-gradient(135deg, #7c6af7, #38bdf8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(124,106,247,0.3)',
          }}>
            <IconAppShield size={28} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 24, color: '#1a1a2e', letterSpacing: '-0.01em' }}>
              My <span style={{ color: '#7c6af7' }}>SPACE</span>
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#4a4a6a', marginTop: 4 }}>
              {firstTime ? 'Create your master password' : 'Enter your master password'}
            </div>
          </div>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <GlassInput
              value={password}
              onChange={setPassword}
              placeholder="Master password"
              type="password"
              autoFocus
            />
            {firstTime && (
              <GlassInput
                value={confirm}
                onChange={setConfirm}
                placeholder="Confirm password"
                type="password"
              />
            )}
            {error && (
              <div style={{ fontSize: 13, color: '#ef4444', textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
                {error}
              </div>
            )}
          </div>
          <PillButton type="submit" disabled={loading} className="w-full">
            <IconLock size={16} />
            {loading ? 'Unlocking…' : firstTime ? 'Create & Enter' : 'Unlock'}
          </PillButton>
        </form>
      </GlassCard>
    </div>
  )
}
