import { useState, useRef, KeyboardEvent } from 'react'

interface Props {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  flat?: boolean  // render pills inline without the wrapper box (use inside a parent container)
}

const ACCENT = '#7c6af7'

export default function TagInput({ tags, onChange, placeholder = 'Add tag…', flat = false }: Props) {
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const add = () => {
    const t = input.trim().toLowerCase().replace(/^#/, '')
    if (t && !tags.includes(t)) onChange([...tags, t])
    setInput('')
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() }
    if (e.key === 'Backspace' && input === '' && tags.length > 0) onChange(tags.slice(0, -1))
  }

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      style={flat ? {
        display: 'contents',
      } : {
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6,
        padding: '8px 12px',
        background: focused ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.45)',
        border: `1.5px solid ${focused ? `${ACCENT}50` : 'rgba(255,255,255,0.6)'}`,
        borderRadius: 14,
        cursor: 'text',
        transition: 'background 150ms, border-color 150ms',
        minHeight: 42,
      }}
    >
      {/* Existing tags */}
      {tags.map(t => (
        <span key={t} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: `${ACCENT}14`,
          border: `1px solid ${ACCENT}30`,
          borderRadius: 100,
          padding: '3px 8px 3px 9px',
          fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600,
          color: ACCENT,
          userSelect: 'none',
        }}>
          #{t}
          <button
            onMouseDown={e => { e.preventDefault(); onChange(tags.filter(x => x !== t)) }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: ACCENT, opacity: 0.5, fontSize: 15, lineHeight: 1,
              padding: '0 1px', display: 'flex', alignItems: 'center',
            }}>×</button>
        </span>
      ))}

      {/* Inline input */}
      <input
        ref={inputRef}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={onKey}
        onBlur={() => { add(); setFocused(false) }}
        onFocus={() => setFocused(true)}
        placeholder={tags.length === 0 ? placeholder : ''}
        style={{
          flex: 1, minWidth: 80,
          background: 'transparent', border: 'none', outline: 'none',
          fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#1a1a2e',
        }}
      />
    </div>
  )
}
