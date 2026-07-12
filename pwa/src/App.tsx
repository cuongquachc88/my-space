import { useState, useCallback, useEffect, useRef } from 'react'
import SplashScreen from './SplashScreen'
import UnlockForm from './UnlockForm'
import AppShell from './app/AppShell'
import { lock } from './crypto'
import { resumeRedirectAuth } from './services/googleDrive'

type Screen = 'splash' | 'unlock' | 'app'

const IDLE_MS = 5 * 60 * 1000 // 5 minutes

// Fired after resumeRedirectAuth() successfully saves a token — lets SyncView
// update its connected state without reloading or prop drilling.
export const OAUTH_TOKEN_READY = 'oauth:token-ready'

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash')
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Mobile-browser OAuth uses a full-page redirect, so returning from Google
  // reboots the app from scratch onto the unlock screen. The redirect handoff
  // must be consumed HERE at the root — before the unlock gate — because
  // SyncView (the old handler) only mounts after unlock + selecting the Sync
  // tab, so its useEffect never ran on return. Token exchange needs only the
  // PKCE verifier in localStorage (survives reload), not an unlocked vault.
  useEffect(() => {
    resumeRedirectAuth().then(token => {
      if (token) window.dispatchEvent(new CustomEvent(OAUTH_TOKEN_READY))
    }).catch(err => {
      console.error('[oauth] redirect resume failed:', err)
    })
  }, [])

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
