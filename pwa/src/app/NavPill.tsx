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
      {/* Overflow tray — floats above the pill */}
      {overflowOpen && (
        <div style={{
          position: 'fixed', bottom: 88, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(201,214,255,0.22)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
          borderRadius: 20, border: '1px solid rgba(255,255,255,0.45)',
          padding: '12px 16px', display: 'flex', gap: 8, zIndex: 31,
          boxShadow: '0 -2px 24px rgba(124,106,247,0.2), 0 4px 20px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
        }}>
          {OVERFLOW.map(t => {
            const Ic = ICON_MAP[t]
            const accent = ACCENT[t]
            const active = tab === t
            return (
              <button key={t} onClick={() => { onTab(t); setOverflowOpen(false) }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 12px', borderRadius: 12, border: 'none', cursor: 'pointer', background: active ? `${accent}20` : 'transparent', color: active ? accent : '#4a4a6a', transition: 'opacity 150ms' }}>
                <Ic size={22} accent={accent} filled={active} />
                <span style={{ fontSize: 11, fontFamily: 'Inter, sans-serif' }}>{LABEL_MAP[t]}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Floating pill */}
      <div
        className="safe-area-pb"
        style={{
          position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(201,214,255,0.22)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
          border: '0.5px solid rgba(255,255,255,0.28)', borderTop: '0.3px solid rgba(255,255,255,0.5)', borderRadius: 100,
          padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 2,
          zIndex: 20, boxShadow: '0 8px 32px rgba(124,106,247,0.22), 0 2px 12px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.45)',
        }}
      >
        {PRIMARY.map(t => {
          const Ic = ICON_MAP[t]
          const accent = ACCENT[t]
          const active = tab === t
          return (
            <button key={t} onClick={() => { onTab(t); setOverflowOpen(false) }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 12px', borderRadius: 80, border: 'none', cursor: 'pointer', background: active ? `${accent}20` : 'transparent', color: active ? accent : '#4a4a6a', opacity: active ? 1 : 0.65, transition: 'background 150ms, opacity 150ms' }}>
              <Ic size={22} accent={accent} filled={active} />
            </button>
          )
        })}
        {/* More button */}
        <button onClick={() => setOverflowOpen(o => !o)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 12px', borderRadius: 80, border: 'none', cursor: 'pointer', background: OVERFLOW.includes(tab) ? 'rgba(124,106,247,0.15)' : 'transparent', opacity: overflowOpen || OVERFLOW.includes(tab) ? 1 : 0.65, transition: 'opacity 150ms' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="7" height="7" rx="2" fill={OVERFLOW.includes(tab) ? '#7c6af7' : '#4a4a6a'}/>
            <rect x="14" y="3" width="7" height="7" rx="2" fill={OVERFLOW.includes(tab) ? '#7c6af7' : '#4a4a6a'}/>
            <rect x="3" y="14" width="7" height="7" rx="2" fill={OVERFLOW.includes(tab) ? '#7c6af7' : '#4a4a6a'}/>
            <rect x="14" y="14" width="7" height="7" rx="2" fill={OVERFLOW.includes(tab) ? '#7c6af7' : '#4a4a6a'} opacity={overflowOpen ? 1 : 0.4}/>
          </svg>
        </button>
      </div>
    </>
  )
}
