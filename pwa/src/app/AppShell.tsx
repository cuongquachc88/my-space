import { useState } from 'react'
import NotesView from './views/NotesView'
import VaultView from './views/VaultView'
import TodoView from './views/TodoView'
import SubscriptionsView from './views/SubscriptionsView'
import MapView from './views/MapView'
import GeneratorView from './views/GeneratorView'
import ReportsView from './views/ReportsView'
import SyncView from './views/SyncView'
import SettingsView from './views/SettingsView'

type Tab = 'notes' | 'vault' | 'todo' | 'subs' | 'maps' | 'gen' | 'reports' | 'sync' | 'settings'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'notes',    label: 'Notes',       icon: '📝' },
  { id: 'vault',    label: 'Vault',       icon: '🔐' },
  { id: 'todo',     label: 'Todo',        icon: '✅' },
  { id: 'subs',     label: 'Subs',        icon: '💳' },
  { id: 'maps',     label: 'Maps',        icon: '📍' },
  { id: 'gen',      label: 'Generator',   icon: '🔑' },
  { id: 'reports',  label: 'Reports',     icon: '📊' },
  { id: 'sync',     label: 'Sync',        icon: '☁️' },
  { id: 'settings', label: 'Settings',    icon: '⚙️' },
]

interface Props { onLogout: () => void }

export default function AppShell({ onLogout }: Props) {
  const [tab, setTab] = useState<Tab>('notes')

  const content = (
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

  return (
    <div className="flex h-screen bg-[#0f2020] overflow-hidden">
      {/* Desktop sidebar — hidden on mobile */}
      <aside className="hidden md:flex flex-col w-52 shrink-0 bg-[#0d1f1f] border-r border-white/10 py-4 safe-area-pt">
        <div className="px-4 mb-6">
          <span className="font-bold text-base tracking-tight">My <span className="text-[#b4e645]">SPACE</span></span>
        </div>
        <nav className="flex-1 flex flex-col gap-0.5 px-2">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left w-full ${
                tab === t.id
                  ? 'bg-[#b4e645]/15 text-[#b4e645] font-medium'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              <span className="text-base leading-none w-5 text-center">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0">
        <main className="flex-1 overflow-y-auto">
          {content}
        </main>

        {/* Mobile bottom nav — hidden on desktop */}
        <nav className="flex md:hidden bg-[#0d1f1f] border-t border-white/10 safe-area-pb">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors ${
                tab === t.id ? 'text-[#b4e645]' : 'text-white/40 hover:text-white/70'
              }`}
            >
              <span className="text-base leading-none">{t.icon}</span>
              <span className="leading-none hidden sm:block">{t.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
