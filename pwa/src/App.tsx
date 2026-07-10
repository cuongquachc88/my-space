import { useState, useCallback, useEffect, useRef } from 'react'
import SplashScreen from './SplashScreen'
import UnlockForm from './UnlockForm'
import AppShell from './app/AppShell'
import { lock, unlock } from './crypto'

type Screen = 'splash' | 'unlock' | 'app'

const IDLE_MS = 5 * 60 * 1000 // 5 minutes
const SESSION_PW_KEY = 'myspace_session_pw'  // sessionStorage — cleared on tab close
const SALT_KEY = 'myspace_vault_salt'

function getSalt(): Uint8Array | null {
  const stored = localStorage.getItem(SALT_KEY)
  if (!stored) return null
  return Uint8Array.from(atob(stored), c => c.charCodeAt(0))
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash')
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doLock = useCallback(() => {
    lock()
    sessionStorage.removeItem(SESSION_PW_KEY)
    setScreen('unlock')
  }, [])

  const resetIdle = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(doLock, IDLE_MS)
  }, [doLock])

  const enterApp = useCallback((pw: string) => {
    sessionStorage.setItem(SESSION_PW_KEY, pw)
    setScreen('app')
    resetIdle()
  }, [resetIdle])

  // Attach idle listeners when app is unlocked
  useEffect(() => {
    if (screen !== 'app') return
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll']
    events.forEach(e => window.addEventListener(e, resetIdle, { passive: true }))
    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdle))
      if (idleTimer.current) clearTimeout(idleTimer.current)
    }
  }, [screen, resetIdle])

  // On splash done: auto-unlock if session password still in sessionStorage (F5 / OAuth redirect)
  const handleSplashDone = useCallback(async () => {
    const pw = sessionStorage.getItem(SESSION_PW_KEY)
    const salt = getSalt()
    if (pw && salt) {
      try {
        await unlock(pw, salt)
        setScreen('app')
        resetIdle()
        return
      } catch {
        sessionStorage.removeItem(SESSION_PW_KEY)
      }
    }
    setScreen('unlock')
  }, [resetIdle])

  if (screen === 'splash') return <SplashScreen onDone={handleSplashDone} />
  if (screen === 'unlock') return <UnlockForm onUnlocked={enterApp} />
  return <AppShell onLogout={doLock} />
}
