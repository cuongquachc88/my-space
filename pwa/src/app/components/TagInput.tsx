import { useState, KeyboardEvent } from 'react'

interface Props {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

export default function TagInput({ tags, onChange, placeholder = 'Add tag…' }: Props) {
  const [input, setInput] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')

  const add = () => {
    const t = input.trim().toLowerCase()
    if (t && !tags.includes(t)) onChange([...tags, t])
    setInput('')
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() }
    if (e.key === 'Backspace' && input === '' && tags.length > 0) onChange(tags.slice(0, -1))
  }

  const startEdit = (t: string) => { setEditing(t); setEditVal(t) }

  const commitEdit = (old: string) => {
    const v = editVal.trim().toLowerCase()
    if (v && v !== old && !tags.includes(v)) {
      onChange(tags.map(t => t === old ? v : t))
    }
    setEditing(null)
  }

  const onEditKey = (e: KeyboardEvent<HTMLInputElement>, old: string) => {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit(old) }
    if (e.key === 'Escape') setEditing(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Tag list */}
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {tags.map(t => (
            <div key={t} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'rgba(124,106,247,0.1)',
              border: '1px solid rgba(124,106,247,0.2)',
              borderRadius: 100, padding: '4px 10px',
            }}>
              {editing === t ? (
                <input
                  autoFocus
                  value={editVal}
                  onChange={e => setEditVal(e.target.value)}
                  onKeyDown={e => onEditKey(e, t)}
                  onBlur={() => commitEdit(t)}
                  style={{
                    background: 'transparent', border: 'none', outline: 'none',
                    fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#7c6af7',
                    width: Math.max(editVal.length, 3) + 'ch',
                  }}
                />
              ) : (
                <span
                  onClick={() => startEdit(t)}
                  style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#7c6af7', cursor: 'text' }}>
                  #{t}
                </span>
              )}
              <button
                onClick={() => onChange(tags.filter(x => x !== t))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c6af7', fontSize: 14, lineHeight: 1, opacity: 0.5, padding: 0 }}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add input */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(0,0,0,0.04)', borderRadius: 10, padding: '6px 10px',
      }}>
        <span style={{ fontSize: 12, color: '#8e8e93' }}>#</span>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKey}
          onBlur={add}
          placeholder={placeholder}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#1a1a2e',
          }}
        />
      </div>
    </div>
  )
}
