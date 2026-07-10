// pwa/src/app/NavPill.tsx
import { useState } from 'react'
import { IconNotes, IconVault, IconTodo, IconSubs, IconMaps, IconGen, IconReports, IconSync, IconSettings } from '../design/icons'
import { ACCENT } from '../design/tokens'
import type { Tab } from './NavRail'

const PRIMARY: Tab[] = ['notes', 'vault', 'todo', 'subs', 'maps']
const OVERFLOW: Tab[] = ['gen', 'reports', 'sync', 'settings']
const ICON_MAP: Record<Tab, React.ComponentType<{ size?: number; accent?: string; filled?: boolean }>> = {
  notes: IconNotes, vault: IconVault, todo: IconTodo, subs: IconSubs, maps: IconMaps,
  gen: IconGen, reports: IconReports, sync: IconSync, settings: IconSettings,
}
const LABEL_MAP: Record<Tab, string> = {
  notes:'Notes', vault:'Vault', todo:'Todo', subs:'Subs', maps:'Maps',
  gen:'Gen', reports:'Reports', sync:'Sync', settings:'Settings',
}

interface Props { tab: Tab; onTab: (t: Tab) => void }

export default function NavPill({ tab, onTab }: Props) {
  const [overflowOpen, setOverflowOpen] = useState(false)

  return (
    <>
      {/* Overflow tray */}
      {overflowOpen && (
        <div
          style={{
            position: 'fixed', bottom: 88, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)',
            borderRadius: 20, border: '1px solid rgba(255,255,255,0.6)',
            padding: '12px 16px', display: 'flex', gap: 8, zIndex: 30,
            boxShadow: '0 4px 24px rgba(124,106,247,0.12)',
          }}
        >
          {OVERFLOW.map(t => {
            const Ic = ICON_MAP[t]
            const accent = ACCENT[t]
            const active = tab === t
            return (
              <button key={t} onClick={() => { onTab(t); setOverflowOpen(false) }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 12px', borderRadius: 12, border: 'none', cursor: 'pointer', background: active ? `${accent}20` : 'transparent', color: active ? accent : '#4a4a6a', opacity: active ? 1 : 0.6, transition: 'opacity 150ms' }}>
                <Ic size={22} accent={accent} filled={active} />
                <span style={{ fontSize: 11, fontFamily: 'Inter, sans-serif' }}>{LABEL_MAP[t]}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Pill nav */}
      <div
        className="safe-area-pb"
        style={{
          position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.6)', borderRadius: 100,
          padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 2,
          zIndex: 20, boxShadow: '0 4px 24px rgba(124,106,247,0.1)',
        }}
      >
        {PRIMARY.map(t => {
          const Ic = ICON_MAP[t]
          const accent = ACCENT[t]
          const active = tab === t
          return (
            <button key={t} onClick={() => onTab(t)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 12px', borderRadius: 80, border: 'none', cursor: 'pointer', background: active ? `${accent}20` : 'transparent', color: active ? accent : '#4a4a6a', opacity: active ? 1 : 0.6, transition: 'background 150ms, opacity 150ms' }}>
              <Ic size={22} accent={accent} filled={active} />
            </button>
          )
        })}
        {/* overflow */}
        <button onClick={() => setOverflowOpen(o => !o)}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 12px', borderRadius: 80, border: 'none', cursor: 'pointer', background: OVERFLOW.includes(tab) ? 'rgba(124,106,247,0.15)' : 'transparent', color: '#4a4a6a', fontSize: 18, fontWeight: 700, opacity: OVERFLOW.includes(tab) ? 1 : 0.6, transition: 'opacity 150ms' }}>
          ···
        </button>
      </div>
    </>
  )
}
