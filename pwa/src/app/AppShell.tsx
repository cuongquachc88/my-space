// pwa/src/app/AppShell.tsx
import { useState } from 'react'
import AppBackground from '../design/AppBackground'
import { IconAppShield } from '../design/icons'
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
      <div className="hidden sm:block">
        <NavRail tab={tab} onTab={setTab} onLogout={onLogout} />
      </div>

      {/* Main content */}
      <main style={{
        position: 'relative', zIndex: 1,
        marginLeft: 0, paddingBottom: 96,
      }}
        className="sm:ml-14"
      >
        {/* Mobile hero — edge-to-edge with rounded bottom corners */}
        <div className="mobile-hero">
          <div style={{
            background: 'linear-gradient(145deg, #6d5ce7 0%, #7c6af7 40%, #3b82f6 100%)',
            padding: '24px 20px 28px',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(124,106,247,0.3)',
          }}>
            <div style={{ position: 'absolute', top: -30, right: -20, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
            <div style={{ position: 'absolute', bottom: -30, left: -10, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'linear-gradient(135deg,rgba(255,255,255,0.25),rgba(255,255,255,0.1))',
                  border: '1px solid rgba(255,255,255,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <IconAppShield size={20} accent="#fff" />
                </div>
                <div>
                  <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 17, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>My SPACE</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>Offline · Encrypted · Private</div>
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 100, padding: '4px 10px', fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#fff', fontWeight: 600 }}>
                🔒 Secure
              </div>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '16px' }} className="sm:p-6">

          {/* Desktop hero strip */}
          <div className="hidden sm:block" style={{ marginBottom: 20 }}>
            <div style={{
              background: 'linear-gradient(135deg, #6d5ce7 0%, #7c6af7 50%, #3b82f6 100%)',
              borderRadius: 22,
              padding: '22px 28px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              position: 'relative', overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(124,106,247,0.32)',
            }}>
              <div style={{ position: 'absolute', top: -30, right: 80, width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
              <div style={{ position: 'absolute', bottom: -40, right: -10, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <IconAppShield size={24} accent="#fff" />
                </div>
                <div>
                  <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 20, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>My SPACE</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 3 }}>Your private digital space · Offline-first · No cloud · No tracking</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <div style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 100, padding: '6px 14px', fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#fff', fontWeight: 600 }}>🔒 Encrypted</div>
                <div style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 100, padding: '6px 14px', fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#fff', fontWeight: 600 }}>⚡ Offline</div>
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
      <div className="block sm:hidden">
        <NavPill tab={tab} onTab={setTab} />
      </div>
    </div>
  )
}
