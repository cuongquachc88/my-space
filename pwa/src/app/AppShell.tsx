// pwa/src/app/AppShell.tsx
import { useState } from 'react'
import AppBackground from '../design/AppBackground'
import { IconAppShield, IconStatusOffline, IconStatusEncrypted } from '../design/icons'
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

const VIEW = ({ tab, onLogout }: { tab: Tab; onLogout: () => void }) => (
  <>
    {tab === 'notes'    && <NotesView />}
    {tab === 'vault'    && <VaultView />}
    {tab === 'todo'     && <TodoView />}
    {tab === 'subs'     && <SubscriptionsView />}
    {tab === 'maps'     && <MapView />}
    {tab === 'gen'      && <GeneratorView />}
    {tab === 'reports'  && <ReportsView />}
    {tab === 'sync'     && <SyncView />}
    {tab === 'settings' && <SettingsView onLogout={onLogout} />}
  </>
)

export default function AppShell({ onLogout }: Props) {
  const [tab, setTab] = useState<Tab>(() => {
    // If returning from OAuth redirect, go straight to Sync tab
    if (localStorage.getItem('drive_token') && !localStorage.getItem('oauth_state')) {
      return 'sync'
    }
    return 'notes'
  })
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div style={{ position: 'relative', minHeight: '100dvh' }}>
      <AppBackground />

      {/* ── MOBILE layout (< sm) ── */}
      <div className="block sm:hidden" style={{ position: 'relative', zIndex: 1 }}>
        {/* Hero banner */}
        <div style={{
          background: 'linear-gradient(145deg, #6d5ce7 0%, #7c6af7 55%, #3b82f6 100%)',
          padding: '21px 22px 43px',
          overflow: 'hidden', position: 'relative',
        }}>
          <div style={{ position: 'absolute', top: -40, right: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 10, right: 60, width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -20, left: -40, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: 20, right: 20, width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.07, pointerEvents: 'none' }} xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.5" fill="white" /></pattern></defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <IconAppShield size={20} accent="#fff" />
              </div>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 16, color: '#fff', letterSpacing: '-0.01em' }}>My SPACE</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 100, padding: '5px 12px' }}>
              <svg width="11" height="13" viewBox="0 0 11 13" fill="none">
                <rect x="1" y="5.5" width="9" height="7" rx="1.5" fill="rgba(255,255,255,0.9)" />
                <path d="M2.5 5.5 V3.5 C2.5 2.1 3.6 1 5 1 C6.4 1 7.5 2.1 7.5 3.5 V5.5" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              </svg>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#fff', fontWeight: 600 }}>Privacy First</span>
            </div>
          </div>
          <div style={{ fontFamily: 'Montserrat, sans-serif', lineHeight: 1.2 }}>
            <div style={{ fontWeight: 800, fontSize: 24, color: 'rgba(255,255,255,0.7)', letterSpacing: '-0.02em' }}>Your private</div>
            <div style={{ fontWeight: 300, fontSize: 20, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.01em' }}>digital space</div>
          </div>
        </div>

        {/* Content sheet lifts over hero */}
        <div style={{
          background: 'rgba(201,214,255,0.55)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          padding: '16px 16px 100px',
          marginTop: -28,
          position: 'relative', zIndex: 2,
          boxShadow: '0 -2px 16px rgba(124,106,247,0.1)',
        }}>
          <VIEW tab={tab} onLogout={onLogout} />
        </div>

        {/* Bottom pill nav */}
        <NavPill tab={tab} onTab={setTab} />
      </div>

      {/* ── DESKTOP layout (≥ sm) ── */}
      <div className="hidden sm:block" style={{ position: 'relative', zIndex: 1 }}>
        {/* Sidebar — fixed, collapsible */}
        <NavRail tab={tab} onTab={setTab} onLogout={onLogout} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(c => !c)} />

        {/* Main area — offset matches sidebar width */}
        <div style={{ marginLeft: sidebarCollapsed ? 60 : 220, transition: 'margin-left 220ms cubic-bezier(0.4,0,0.2,1)', display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>

          {/* Top bar — thin, clean */}
          <div style={{
            height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 28px', flexShrink: 0,
            background: 'rgba(255,255,255,0.75)',
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(124,106,247,0.1)',
            position: 'sticky', top: 0, zIndex: 10,
          }}>
            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#94a3b8' }}>My SPACE</span>
              <span style={{ color: '#cbd5e1', fontSize: 14 }}>/</span>
              <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 14, color: '#1a1a2e', textTransform: 'capitalize' }}>{tab}</span>
            </div>
            {/* Status pills */}
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 100, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
                <IconStatusOffline size={10} accent="#34d399" />
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#4a4a6a', fontWeight: 500 }}>Offline</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 100, background: 'rgba(124,106,247,0.08)', border: '1px solid rgba(124,106,247,0.15)' }}>
                <IconStatusEncrypted size={12} accent="#7c6af7" />
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#4a4a6a', fontWeight: 500 }}>Encrypted</span>
              </div>
            </div>
          </div>

          {/* Page content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px 48px', width: '100%' }}>
            <VIEW tab={tab} onLogout={onLogout} />
          </div>
        </div>
      </div>
    </div>
  )
}
