// pwa/src/app/AppShell.tsx
import { useState } from 'react'
import AppBackground from '../design/AppBackground'
import NavRail, { type Tab } from './NavRail'
import NavPill from './NavPill'
import NotesView from './views/NotesView'
import VaultView from './views/VaultView'
import TodoView from './views/TodoView'
import SubscriptionsView from './views/SubscriptionsView'
import MapView from './views/MapView'
import GeneratorView from './views/GeneratorView'
import ReportsView from './views/ReportsView'
import SyncView from './views/SyncView'
import SettingsView from './views/SettingsView'

interface Props { onLogout: () => void }

export default function AppShell({ onLogout }: Props) {
  const [tab, setTab] = useState<Tab>('notes')

  return (
    <div style={{ position: 'relative', minHeight: '100dvh' }}>
      <AppBackground />

      {/* Desktop side rail */}
      <div className="hidden md:block">
        <NavRail tab={tab} onTab={setTab} onLogout={onLogout} />
      </div>

      {/* Main content */}
      <main style={{
        position: 'relative', zIndex: 1,
        marginLeft: 0, paddingBottom: 96,
      }}
        className="md:ml-14"
      >
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '16px' }} className="md:p-6">

          {/* Mobile hero banner */}
          <div className="mobile-hero" style={{ marginBottom: 16 }}>
            <div style={{
              background: 'linear-gradient(135deg, #7c6af7 0%, #3b82f6 100%)',
              borderRadius: 24,
              padding: '20px 20px 22px',
              boxShadow: '0 8px 32px rgba(124,106,247,0.35)',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* decorative circles */}
              <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
              <div style={{ position: 'absolute', bottom: -30, right: 40, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18,
                  }}>✦</div>
                  <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 20, color: '#fff', letterSpacing: '-0.02em' }}>
                    My SPACE
                  </span>
                </div>
                <div style={{
                  background: 'rgba(255,255,255,0.2)', borderRadius: 100,
                  padding: '4px 10px',
                  fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#fff', fontWeight: 500,
                }}>
                  🔒 Encrypted
                </div>
              </div>

              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.4 }}>
                Your private space — notes, secrets, tasks & more.<br />
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Offline-first · No cloud · No tracking</span>
              </div>
            </div>
          </div>
          {tab === 'notes'    && <NotesView />}
          {tab === 'vault'    && <VaultView />}
          {tab === 'todo'     && <TodoView />}
          {tab === 'subs'     && <SubscriptionsView />}
          {tab === 'maps'     && <MapView />}
          {tab === 'gen'      && <GeneratorView />}
          {tab === 'reports'  && <ReportsView />}
          {tab === 'sync'     && <SyncView />}
          {tab === 'settings' && <SettingsView onLogout={onLogout} />}
        </div>
      </main>

      {/* Mobile bottom pill */}
      <div className="block md:hidden">
        <NavPill tab={tab} onTab={setTab} />
      </div>
    </div>
  )
}
