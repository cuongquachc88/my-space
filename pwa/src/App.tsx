import { useState, useCallback, useEffect, useRef } from 'react'
import SplashScreen from './SplashScreen'
import UnlockForm from './UnlockForm'
import AppShell from './app/AppShell'
import { lock } from './crypto'

type Screen = 'splash' | 'unlock' | 'app'

const IDLE_MS = 5 * 60 * 1000 // 5 minutes

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash')
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doLock = useCallback(() => {
    lock()
    setScreen('unlock')
  }, [])

  const resetIdle = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(doLock, IDLE_MS)
  }, [doLock])

  const enterApp = useCallback(() => {
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

  if (screen === 'splash') return <SplashScreen onDone={() => setScreen('unlock')} />
  if (screen === 'unlock') return <UnlockForm onUnlocked={enterApp} />
  return <AppShell onLogout={doLock} />
}
