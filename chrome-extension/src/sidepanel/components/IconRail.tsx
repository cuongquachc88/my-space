import type React from 'react'
import { NotesIcon, KeyvaultIcon, SyncIcon, SettingsIcon, GeneratorIcon, SubscriptionsIcon } from './icons'

export type View = 'notes' | 'keyvault' | 'generator' | 'subscriptions' | 'reports' | 'sync' | 'settings'

interface Props {
  active: View
  onChange: (v: View) => void
}

type IconComponent = (props: { active?: boolean; accentColor?: string; size?: number }) => React.ReactElement | null

const items: Array<{ view: View; Icon: IconComponent; accent: string }> = [
  { view: 'notes',         Icon: NotesIcon,         accent: '#818cf8' },
  { view: 'keyvault',      Icon: KeyvaultIcon,      accent: '#f59e0b' },
  { view: 'generator',     Icon: GeneratorIcon,     accent: '#a78bfa' },
  { view: 'subscriptions', Icon: SubscriptionsIcon, accent: '#34d399' },
]

const bottomItems: Array<{ view: View; Icon: IconComponent; accent: string }> = [
  { view: 'sync',     Icon: SyncIcon,     accent: '#60a5fa' },
  { view: 'settings', Icon: SettingsIcon, accent: '#60a5fa' },
]

export function IconRail({ active, onChange }: Props) {
  const btn = (view: View, Icon: IconComponent, accent: string) => (
    <button
      key={view}
      onClick={() => onChange(view)}
      className="w-8 h-8 flex items-center justify-center rounded-[10px] transition-all duration-150"
      style={active === view ? {
        background: `${accent}22`,
        boxShadow: `0 0 12px ${accent}44`,
      } : {}}
      title={view}
    >
      <Icon active={active === view} accentColor={accent} size={20} />
    </button>
  )

  return (
    <div
      className="flex flex-col items-center py-4 gap-2 border-r"
      style={{
        width: '48px',
        background: 'rgba(255,255,255,0.03)',
        borderColor: 'rgba(255,255,255,0.07)',
        minHeight: '100%',
      }}
    >
      {items.map(({ view, Icon, accent }) => btn(view, Icon, accent))}
      <div className="flex-1" />
      {bottomItems.map(({ view, Icon, accent }) => btn(view, Icon, accent))}
    </div>
  )
}
