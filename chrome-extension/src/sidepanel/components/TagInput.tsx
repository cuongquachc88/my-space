import { useState } from 'react'

interface Props {
  tags: string[]
  onChange: (tags: string[]) => void
  accent?: string
}

export function TagInput({ tags, onChange, accent = '#818cf8' }: Props) {
  const [input, setInput] = useState('')

  function add() {
    const t = input.trim().toLowerCase()
    if (t && !tags.includes(t)) onChange([...tags, t])
    setInput('')
  }

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {tags.map(t => (
        <span key={t} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
          style={{ background: `${accent}22`, border: `1px solid ${accent}44`, color: accent }}>
          {t}
          <button onClick={() => onChange(tags.filter(x => x !== t))}
            style={{ color: accent, lineHeight: 1 }}>×</button>
        </span>
      ))}
      <input
        className="bg-transparent text-xs outline-none"
        style={{ color: 'rgba(255,255,255,0.5)', minWidth: '60px', flex: 1 }}
        placeholder="add tag..."
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } }}
        onBlur={add}
      />
    </div>
  )
}
