import { useState } from 'react'
import LandingPage from './landing/LandingPage'
import AppShell from './app/AppShell'

type Screen = 'landing' | 'app'

export default function App() {
  const [screen, setScreen] = useState<Screen>('landing')

  if (screen === 'app') return <AppShell onLogout={() => setScreen('landing')} />
  return <LandingPage onEnter={() => setScreen('app')} />
}
