// pwa/src/app/NavRail.tsx
import { useState } from 'react'
import { IconNotes, IconVault, IconTodo, IconSubs, IconMaps, IconGen, IconReports, IconSync, IconSettings, IconAppShield, IconLock } from '../design/icons'
import { ACCENT } from '../design/tokens'

export type Tab = 'notes'|'vault'|'todo'|'subs'|'maps'|'gen'|'reports'|'sync'|'settings'

const NAV_GROUPS = [
  {
    label: 'Personal',
    tabs: [
      { id: 'notes'   as Tab, label: 'Notes',        Icon: IconNotes   },
      { id: 'vault'   as Tab, label: 'Vault',         Icon: IconVault   },
      { id: 'todo'    as Tab, label: 'Todo',          Icon: IconTodo    },
      { id: 'subs'    as Tab, label: 'Subscriptions', Icon: IconSubs    },
      { id: 'maps'    as Tab, label: 'Maps',          Icon: IconMaps    },
    ],
  },
  {
    label: 'Tools',
    tabs: [
      { id: 'gen'     as Tab, label: 'Generator',     Icon: IconGen     },
      { id: 'reports' as Tab, label: 'Reports',       Icon: IconReports },
      { id: 'sync'    as Tab, label: 'Sync',          Icon: IconSync    },
    ],
  },
]

interface Props {
  tab: Tab
  onTab: (t: Tab) => void
  onLogout: () => void
  collapsed: boolean
  onToggle: () => void
}

export default function NavRail({ tab, onTab, onLogout, collapsed, onToggle }: Props) {
  const W = collapsed ? 60 : 220

  return (
    <aside style={{
      position: 'fixed', left: 0, top: 0, bottom: 0, width: W,
      transition: 'width 220ms cubic-bezier(0.4,0,0.2,1)',
      background: 'rgba(255,255,255,0.78)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderRight: '1px solid rgba(124,106,247,0.1)',
      display: 'flex', flexDirection: 'column',
      zIndex: 20, overflow: 'hidden',
      boxShadow: '2px 0 16px rgba(124,106,247,0.06)',
    }}>
      {/* Logo + toggle */}
      <div style={{ padding: collapsed ? '18px 0' : '18px 16px', borderBottom: '1px solid rgba(124,106,247,0.08)', display: 'flex', alignItems: 'center', gap: 10, height: 64, boxSizing: 'border-box', flexShrink: 0 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#7c6af7,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(124,106,247,0.35)', marginLeft: collapsed ? 13 : 0 }}>
          <IconAppShield size={18} accent="#fff" />
        </div>
        {!collapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 14, color: '#1a1a2e', letterSpacing: '-0.01em', lineHeight: 1, whiteSpace: 'nowrap' }}>My SPACE</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#94a3b8', marginTop: 2, whiteSpace: 'nowrap' }}>Private · Offline-first</div>
          </div>
        )}
        {!collapsed && (
          <button onClick={onToggle} title="Collapse sidebar" style={{ width: 26, height: 26, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(124,106,247,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#94a3b8' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <button onClick={onToggle} title="Expand sidebar" style={{ margin: '8px auto 4px', width: 34, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(124,106,247,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: collapsed ? '8px 6px' : '8px 10px' }}>
        {NAV_GROUPS.map(group => (
          <div key={group.label} style={{ marginBottom: collapsed ? 12 : 20 }}>
            {!collapsed && (
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 10, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 8px', marginBottom: 4 }}>
                {group.label}
              </div>
            )}
            {collapsed && <div style={{ height: 1, background: 'rgba(124,106,247,0.08)', margin: '4px 4px 8px' }} />}
            {group.tabs.map(t => {
              const active = tab === t.id
              const accent = ACCENT[t.id]
              return (
                <button key={t.id} onClick={() => onTab(t.id)} title={collapsed ? t.label : undefined} style={{
                  display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10,
                  width: '100%', padding: collapsed ? '9px 0' : '8px 10px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: active ? `${accent}15` : 'transparent',
                  marginBottom: 2, transition: 'background 150ms',
                }}>
                  <t.Icon size={19} accent={active ? accent : '#94a3b8'} filled={active} />
                  {!collapsed && (
                    <>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: active ? 600 : 400, fontSize: 13.5, color: active ? accent : '#4a4a6a', whiteSpace: 'nowrap' }}>{t.label}</span>
                      {active && <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: accent, boxShadow: `0 0 6px ${accent}` }} />}
                    </>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: collapsed ? '8px 6px 12px' : '8px 10px 14px', borderTop: '1px solid rgba(124,106,247,0.08)' }}>
        <button onClick={() => onTab('settings')} title={collapsed ? 'Settings' : undefined} style={{
          display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10, justifyContent: collapsed ? 'center' : 'flex-start',
          width: '100%', padding: collapsed ? '9px 0' : '8px 10px', borderRadius: 10, border: 'none', cursor: 'pointer',
          background: tab === 'settings' ? `${ACCENT.settings}15` : 'transparent', marginBottom: 4, transition: 'background 150ms',
        }}>
          <IconSettings size={19} accent={tab === 'settings' ? ACCENT.settings : '#94a3b8'} filled={tab === 'settings'} />
          {!collapsed && <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: tab === 'settings' ? 600 : 400, fontSize: 13.5, color: tab === 'settings' ? ACCENT.settings : '#4a4a6a' }}>Settings</span>}
        </button>
        <button onClick={onLogout} title={collapsed ? 'Lock' : undefined} style={{
          display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10, justifyContent: collapsed ? 'center' : 'flex-start',
          width: '100%', padding: collapsed ? '9px 0' : '8px 10px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'transparent', transition: 'background 150ms',
        }}>
          <IconLock size={19} accent="#ef4444" />
          {!collapsed && <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13.5, color: '#ef4444', fontWeight: 500 }}>Lock</span>}
        </button>
      </div>
    </aside>
  )
}

export { NAV_GROUPS as TABS }
