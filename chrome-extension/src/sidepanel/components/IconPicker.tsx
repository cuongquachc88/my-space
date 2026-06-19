import { useState } from 'react'
import { PixelIcon } from './icons'

export const ICONS: Array<{ id: string; label: string }> = [
  // Places – daily life
  { id: 'home',        label: 'Home'        },
  { id: 'work',        label: 'Work'        },
  { id: 'school',      label: 'School'      },
  { id: 'hospital',    label: 'Hospital'    },
  { id: 'market',      label: 'Market'      },
  { id: 'gym',         label: 'Gym'         },
  { id: 'park',        label: 'Park'        },
  { id: 'bank',        label: 'Bank'        },
  // Food & drink
  { id: 'restaurant',  label: 'Restaurant'  },
  { id: 'cafe',        label: 'Café'        },
  { id: 'hotel',       label: 'Hotel'       },
  { id: 'airport',     label: 'Airport'     },
  { id: 'shopping',    label: 'Shopping'    },
  { id: 'travel',      label: 'Travel'      },
  // Tasks & productivity
  { id: 'star',        label: 'Starred'     },
  { id: 'flag',        label: 'Flagged'     },
  { id: 'inbox',       label: 'Inbox'       },
  { id: 'calendar',    label: 'Calendar'    },
  { id: 'book',        label: 'Study'       },
  { id: 'code',        label: 'Dev'         },
  { id: 'money',       label: 'Finance'     },
  { id: 'health',      label: 'Health'      },
  { id: 'music',       label: 'Music'       },
  { id: 'game',        label: 'Games'       },
  { id: 'idea',        label: 'Ideas'       },
  { id: 'pin',         label: 'Pin'         },
  { id: 'box',         label: 'Box'         },
  { id: 'tools',       label: 'Tools'       },
  { id: 'pet',         label: 'Pets'        },
  { id: 'garden',      label: 'Garden'      },
]

interface Props {
  value: string
  onChange: (id: string) => void
  accentColor?: string
}

export function IconPicker({ value, onChange, accentColor = 'rgba(255,255,255,0.7)' }: Props) {
  const [search, setSearch] = useState('')
  const filtered = search
    ? ICONS.filter(i => i.label.toLowerCase().includes(search.toLowerCase()))
    : ICONS

  return (
    <div className="flex flex-col gap-2">
      <input
        className="w-full rounded-[8px] px-2 py-1.5 text-xs outline-none"
        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}
        placeholder="Search icons…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <div className="grid gap-1 p-1.5 rounded-[8px] overflow-y-auto"
        style={{ gridTemplateColumns: 'repeat(7, 1fr)', maxHeight: '148px', background: 'rgba(255,255,255,0.03)' }}>
        {filtered.map(icon => (
          <button
            key={icon.id}
            type="button"
            title={icon.label}
            onClick={() => onChange(icon.id)}
            className="flex items-center justify-center rounded-[7px] transition-all"
            style={{
              height: '32px',
              background: value === icon.id ? 'rgba(255,255,255,0.12)' : 'transparent',
              boxShadow: value === icon.id ? `0 0 0 1.5px ${accentColor}` : 'none',
              transform: value === icon.id ? 'scale(1.12)' : 'scale(1)',
            }}>
            <PixelIcon
              id={icon.id}
              color={value === icon.id ? accentColor : 'rgba(255,255,255,0.4)'}
              size={16}
            />
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-7 text-center text-[10px] py-2" style={{ color: 'rgba(255,255,255,0.3)' }}>No match</p>
        )}
      </div>
    </div>
  )
}
