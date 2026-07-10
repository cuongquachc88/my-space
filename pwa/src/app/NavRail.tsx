// pwa/src/app/NavRail.tsx
import { useState } from 'react'
import { IconNotes, IconVault, IconTodo, IconSubs, IconMaps, IconGen, IconReports, IconSync, IconSettings, IconAppShield, IconLock } from '../design/icons'
import { ACCENT } from '../design/tokens'

export type Tab = 'notes'|'vault'|'todo'|'subs'|'maps'|'gen'|'reports'|'sync'|'settings'

const TABS: { id: Tab; label: string; Icon: React.ComponentType<{ size?: number; accent?: string; filled?: boolean }> }[] = [
  { id: 'notes',    label: 'Notes',       Icon: IconNotes    },
  { id: 'vault',    label: 'Vault',       Icon: IconVault    },
  { id: 'todo',     label: 'Todo',        Icon: IconTodo     },
  { id: 'subs',     label: 'Subs',        Icon: IconSubs     },
  { id: 'maps',     label: 'Maps',        Icon: IconMaps     },
  { id: 'gen',      label: 'Generator',   Icon: IconGen      },
  { id: 'reports',  label: 'Reports',     Icon: IconReports  },
  { id: 'sync',     label: 'Sync',        Icon: IconSync     },
  { id: 'settings', label: 'Settings',    Icon: IconSettings },
]

interface Props { tab: Tab; onTab: (t: Tab) => void; onLogout: () => void }

export default function NavRail({ tab, onTab, onLogout }: Props) {
  const [hovered, setHovered] = useState(false)

  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'fixed', left: 0, top: 0, bottom: 0,
        width: hovered ? 200 : 56,
        transition: 'width 200ms ease',
        background: 'rgba(255,255,255,0.35)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRight: '1px solid rgba(255,255,255,0.5)',
        display: 'flex', flexDirection: 'column',
        zIndex: 20, overflow: 'hidden',
      }}
      className="safe-area-pt"
    >
      {/* Logo */}
      <div style={{ padding: '16px 12px 8px', display: 'flex', alignItems: 'center', gap: 10, minWidth: 200 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#7c6af7,#38bdf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <IconAppShield size={18} />
        </div>
        <span style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 700, fontSize: 16, color: '#1a1a2e', whiteSpace: 'nowrap', opacity: hovered ? 1 : 0, transition: 'opacity 150ms ease' }}>
          My <span style={{ color: '#7c6af7' }}>SPACE</span>
        </span>
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '8px 6px' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {TABS.filter(t => t.id !== 'settings').map(t => {
            const active = tab === t.id
            const accent = ACCENT[t.id]
            return (
              <button
                key={t.id}
                onClick={() => onTab(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 10px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: active ? `${accent}20` : 'transparent',
                  color: active ? accent : '#4a4a6a',
                  opacity: active ? 1 : 0.6,
                  transition: 'background 150ms, color 150ms, opacity 150ms',
                  minWidth: 0, whiteSpace: 'nowrap', width: '100%',
                }}
              >
                <t.Icon size={22} accent={accent} filled={active} />
                <span style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: active ? 600 : 400, fontSize: 14, opacity: hovered ? 1 : 0, transition: 'opacity 150ms ease' }}>
                  {t.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Settings pinned at bottom */}
        <div style={{ marginTop: 8 }}>
          {TABS.filter(t => t.id === 'settings').map(t => {
            const active = tab === t.id
            const accent = ACCENT[t.id]
            return (
              <button
                key={t.id}
                onClick={() => onTab(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 10px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: active ? `${accent}20` : 'transparent',
                  color: active ? accent : '#4a4a6a',
                  opacity: active ? 1 : 0.6,
                  transition: 'background 150ms, color 150ms, opacity 150ms',
                  minWidth: 0, whiteSpace: 'nowrap', width: '100%',
                }}
              >
                <t.Icon size={22} accent={accent} filled={active} />
                <span style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: active ? 600 : 400, fontSize: 14, opacity: hovered ? 1 : 0, transition: 'opacity 150ms ease' }}>
                  {t.label}
                </span>
              </button>
            )
          })}
          <button
            onClick={onLogout}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'transparent', color: '#ef4444', opacity: 0.7, width: '100%', marginTop: 4, transition: 'opacity 150ms' }}
          >
            <IconLock size={20} />
            <span style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 13, opacity: hovered ? 1 : 0, transition: 'opacity 150ms ease', whiteSpace: 'nowrap' }}>Lock</span>
          </button>
        </div>
      </nav>
    </aside>
  )
}

export { TABS }
