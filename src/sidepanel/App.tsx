import { useState } from 'react'
import { IconRail, type View } from './components/IconRail'
import { NotesView } from './views/NotesView'
import { KeyvaultView } from './views/KeyvaultView'
import { SyncView } from './views/SyncView'
import { SettingsView } from './views/SettingsView'

export async function sendMsg(type: string, payload?: unknown): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  return chrome.runtime.sendMessage({ type, payload })
}

const glows: Record<View, string> = {
  notes:    'radial-gradient(ellipse 120px 80px at 60px -20px, rgba(99,102,241,0.2) 0%, transparent 70%)',
  keyvault: 'radial-gradient(ellipse 120px 80px at 60px -20px, rgba(245,158,11,0.18) 0%, transparent 70%)',
  sync:     'radial-gradient(ellipse 120px 80px at 60px -20px, rgba(59,130,246,0.18) 0%, transparent 70%)',
  settings: 'radial-gradient(ellipse 120px 80px at 60px -20px, rgba(59,130,246,0.18) 0%, transparent 70%)',
}

export default function App() {
  const [view, setView] = useState<View>('notes')

  return (
    <div className="flex min-h-screen relative" style={{ background: '#0d1117' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: glows[view] }} />
      <IconRail active={view} onChange={setView} />
      <div className="flex-1 overflow-hidden relative z-10">
        {view === 'notes'    && <NotesView sendMsg={sendMsg} />}
        {view === 'keyvault' && <KeyvaultView sendMsg={sendMsg} />}
        {view === 'sync'     && <SyncView sendMsg={sendMsg} />}
        {view === 'settings' && <SettingsView sendMsg={sendMsg} />}
      </div>
    </div>
  )
}
