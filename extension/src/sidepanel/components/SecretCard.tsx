import { useState, useRef, useEffect } from 'react'
import type { SecretMeta } from '../../shared/messages'

interface UpdateFields {
  label?: string
  value?: string
  url?: string
  description?: string
}

interface Props {
  secret: SecretMeta
  onReveal: (id: string) => Promise<string>
  onCopy: (id: string) => Promise<void>
  onDelete: (id: string) => void
  onUpdate: (id: string, fields: UpdateFields) => Promise<boolean>
}

const inputBase = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'white',
} as const

export function SecretCard({ secret, onReveal, onCopy, onDelete, onUpdate }: Props) {
  const [revealed, setRevealed] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editLabel, setEditLabel] = useState(secret.label)
  const [editValue, setEditValue] = useState('')
  const [editUrl, setEditUrl] = useState(secret.url)
  const [editDesc, setEditDesc] = useState(secret.description)
  const [saving, setSaving] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  async function handleReveal() {
    if (revealed) {
      if (timerRef.current) clearTimeout(timerRef.current)
      setRevealed(null)
      return
    }
    setLoading(true)
    try {
      const val = await onReveal(secret.id)
      setRevealed(val)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setRevealed(null), 30_000)
    } finally {
      setLoading(false)
    }
  }

  async function copyUrl() {
    if (!secret.url) return
    try { await navigator.clipboard.writeText(secret.url) } catch {}
    setCopiedField('url')
    setTimeout(() => setCopiedField(null), 1500)
  }

  function startEdit() {
    setEditLabel(secret.label)
    setEditUrl(secret.url)
    setEditDesc(secret.description)
    setEditValue('')
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
  }

  async function saveEdit() {
    if (!editLabel.trim()) return
    setSaving(true)
    try {
      const fields: UpdateFields = { label: editLabel.trim(), url: editUrl, description: editDesc }
      if (editValue) fields.value = editValue
      const ok = await onUpdate(secret.id, fields)
      if (ok) setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <div className="rounded-xl p-3 flex flex-col gap-2"
        style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.25)' }}>
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'rgba(251,191,36,0.7)' }}>
            Edit secret
          </span>
          <div className="flex gap-3">
            <button onClick={cancelEdit} disabled={saving} className="text-xs"
              style={{ color: 'rgba(255,255,255,0.35)' }}>
              Cancel
            </button>
            <button onClick={saveEdit} disabled={saving || !editLabel.trim()} className="text-xs font-semibold"
              style={{ color: saving ? 'rgba(255,255,255,0.2)' : 'rgba(251,191,36,0.8)' }}>
              {saving ? '...' : 'Save'}
            </button>
          </div>
        </div>
        <input className="rounded-lg px-3 py-2 text-xs outline-none"
          style={inputBase}
          placeholder="Label"
          value={editLabel}
          onChange={e => setEditLabel(e.target.value)}
          autoFocus />
        <input type="password" className="rounded-lg px-3 py-2 text-xs outline-none font-mono"
          style={inputBase}
          placeholder="New value (leave empty to keep current)"
          value={editValue}
          onChange={e => setEditValue(e.target.value)} />
        <input className="rounded-lg px-3 py-2 text-xs outline-none"
          style={inputBase}
          placeholder="URL"
          value={editUrl}
          onChange={e => setEditUrl(e.target.value)} />
        <input className="rounded-lg px-3 py-2 text-xs outline-none"
          style={inputBase}
          placeholder="Description"
          value={editDesc}
          onChange={e => setEditDesc(e.target.value)} />
      </div>
    )
  }

  return (
    <div className="rounded-xl p-3 flex flex-col gap-2"
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}>
      <div className="flex justify-between items-center">
        <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.87)' }}>
          {secret.label}
        </span>
        <div className="flex gap-3">
          <button onClick={handleReveal} className="text-xs" style={{ color: 'rgba(251,191,36,0.6)' }}>
            {loading ? '...' : revealed ? 'Hide' : 'Reveal'}
          </button>
          <button onClick={async () => { await onCopy(secret.id); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
            className="text-xs" style={{ color: copied ? 'rgba(110,231,183,0.8)' : 'rgba(251,191,36,0.6)', transition: 'color 150ms' }}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
          <button onClick={startEdit} className="text-xs" style={{ color: 'rgba(96,165,250,0.6)' }}>
            Edit
          </button>
          <button onClick={() => onDelete(secret.id)} className="text-xs" style={{ color: 'rgba(239,68,68,0.5)' }}>
            ✕
          </button>
        </div>
      </div>
      <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.25)', letterSpacing: '0.05em' }}>
        {revealed ?? '••••••••••••••••'}
      </p>
      {secret.url && (
        <div className="flex items-center gap-1.5">
          <a href={secret.url} target="_blank" rel="noopener noreferrer"
            className="text-xs truncate flex-1" style={{ color: 'rgba(96,165,250,0.7)', textDecoration: 'none' }}>
            {secret.url}
          </a>
          <button onClick={copyUrl} className="text-[10px] px-1.5 py-0.5 rounded shrink-0"
            style={{ color: copiedField === 'url' ? 'rgba(110,231,183,0.8)' : 'rgba(255,255,255,0.3)',
              border: '1px solid rgba(255,255,255,0.08)' }}>
            {copiedField === 'url' ? '✓' : 'copy'}
          </button>
        </div>
      )}
      {secret.description && (
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>
          {secret.description}
        </p>
      )}
      {secret.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {secret.tags.map(t => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(251,191,36,0.1)', color: 'rgba(251,191,36,0.7)', border: '1px solid rgba(251,191,36,0.2)' }}>
              #{t}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
