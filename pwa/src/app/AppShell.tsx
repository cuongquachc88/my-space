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
          <div className="block md:hidden" style={{ marginBottom: 20 }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.25) 100%)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.6)',
              borderRadius: 24,
              padding: '20px 20px 16px',
              boxShadow: '0 4px 24px rgba(124,106,247,0.10)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: 'linear-gradient(135deg, #7c6af7, #3b82f6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, boxShadow: '0 4px 12px rgba(124,106,247,0.35)',
                }}>
                  <span style={{ fontSize: 20 }}>✦</span>
                </div>
                <div>
                  <div style={{
                    fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 22,
                    background: 'linear-gradient(135deg, #7c6af7, #3b82f6)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                    letterSpacing: '-0.02em', lineHeight: 1.1,
                  }}>My SPACE</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
                    Private · Offline · Yours
                  </div>
                </div>
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
