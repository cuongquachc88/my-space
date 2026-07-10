import { useState, useCallback } from 'react'
import SplashScreen from './SplashScreen'
import UnlockForm from './UnlockForm'
import AppShell from './app/AppShell'
import { lock } from './crypto'

type Screen = 'splash' | 'unlock' | 'app'

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash')

  const handleLock = useCallback(() => {
    lock()
    setScreen('unlock')
  }, [])

  if (screen === 'splash') return <SplashScreen onDone={() => setScreen('unlock')} />
  if (screen === 'unlock') return <UnlockForm onUnlocked={() => setScreen('app')} />
  return <AppShell onLogout={handleLock} />
}
