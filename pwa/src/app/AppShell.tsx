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
        {/* Mobile hero — edge-to-edge, outside the padded container */}
        <div className="mobile-hero">
          <div style={{
            background: 'linear-gradient(145deg, #6d5ce7 0%, #7c6af7 40%, #3b82f6 100%)',
            padding: '52px 24px 28px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* decorative blobs */}
            <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
            <div style={{ position: 'absolute', bottom: -50, left: -30, width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
            <div style={{ position: 'absolute', top: 20, right: 60, width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />

            {/* top row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 11,
                  background: 'rgba(255,255,255,0.18)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, border: '1px solid rgba(255,255,255,0.25)',
                }}>✦</div>
                <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 22, color: '#fff', letterSpacing: '-0.03em' }}>
                  My SPACE
                </span>
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: 100,
                padding: '5px 12px',
                fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: 600,
                letterSpacing: '0.01em',
              }}>
                🔒 Encrypted
              </div>
            </div>

            {/* tagline */}
            <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 26, color: '#fff', lineHeight: 1.25, letterSpacing: '-0.02em', marginBottom: 8 }}>
              Your private<br />digital space.
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.01em' }}>
              Offline · No cloud · No tracking
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '16px' }} className="md:p-6">
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
