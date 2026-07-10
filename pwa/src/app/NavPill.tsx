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
            position: 'fixed', bottom: 76, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            borderRadius: 20, border: '1px solid rgba(255,255,255,0.7)',
            padding: '12px 16px', display: 'flex', gap: 8, zIndex: 31,
            boxShadow: '0 -2px 24px rgba(124,106,247,0.12), 0 4px 16px rgba(0,0,0,0.08)',
          }}
        >
          {OVERFLOW.map(t => {
            const Ic = ICON_MAP[t]
            const accent = ACCENT[t]
            const active = tab === t
            return (
              <button key={t} onClick={() => { onTab(t); setOverflowOpen(false) }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 12px', borderRadius: 12, border: 'none', cursor: 'pointer', background: active ? `${accent}20` : 'transparent', color: active ? accent : '#8e8e93', transition: 'opacity 150ms' }}>
                <Ic size={22} accent={accent} filled={active} />
                <span style={{ fontSize: 11, fontFamily: 'Inter, sans-serif' }}>{LABEL_MAP[t]}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Full-width bottom tab bar */}
      <div
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid rgba(255,255,255,0.5)',
          padding: '8px 0 env(safe-area-inset-bottom)',
          display: 'flex', alignItems: 'stretch',
          zIndex: 20,
        }}
      >
        {PRIMARY.map(t => {
          const Ic = ICON_MAP[t]
          const accent = ACCENT[t]
          const active = tab === t
          return (
            <button key={t} onClick={() => onTab(t)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 3, padding: '4px 0', border: 'none', cursor: 'pointer', background: 'transparent',
                color: active ? accent : '#8e8e93', transition: 'color 150ms',
              }}>
              <Ic size={24} accent={active ? accent : '#8e8e93'} filled={active} />
              <span style={{ fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: active ? 600 : 400, lineHeight: 1 }}>{LABEL_MAP[t]}</span>
            </button>
          )
        })}
        {/* overflow more */}
        <button onClick={() => setOverflowOpen(o => !o)}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 3, padding: '4px 0', border: 'none', cursor: 'pointer', background: 'transparent',
            color: OVERFLOW.includes(tab) ? '#7c6af7' : '#8e8e93', transition: 'color 150ms',
          }}>
          {/* 2×2 grid icon */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="7" height="7" rx="2" fill="currentColor" opacity="0.9"/>
            <rect x="14" y="3" width="7" height="7" rx="2" fill="currentColor" opacity="0.9"/>
            <rect x="3" y="14" width="7" height="7" rx="2" fill="currentColor" opacity="0.9"/>
            <rect x="14" y="14" width="7" height="7" rx="2" fill="currentColor" opacity={overflowOpen ? '0.9' : '0.4'}/>
          </svg>
          <span style={{ fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: OVERFLOW.includes(tab) ? 600 : 400, lineHeight: 1 }}>More</span>
        </button>
      </div>
    </>
  )
}
