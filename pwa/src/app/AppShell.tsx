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
