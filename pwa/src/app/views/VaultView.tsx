import { useEffect, useState, useCallback } from 'react'
import { getDb } from '../../db'
import { isLocked, unlock, lock, encrypt, decrypt } from '../../crypto'
import TagInput from '../components/TagInput'

interface SecretMeta { id: string; label: string; tags: string[]; url: string; description: string; updated_at: string }

export default function VaultView() {
  const [locked, setLocked] = useState(isLocked())
  const [password, setPassword] = useState('')
  const [saltHex, setSaltHex] = useState('')
  const [pwError, setPwError] = useState('')
  const [secrets, setSecrets] = useState<SecretMeta[]>([])
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [allTags, setAllTags] = useState<string[]>([])
  const [editing, setEditing] = useState<SecretMeta & { value?: string } | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editValue, setEditValue] = useState('')
  const [editTags, setEditTags] = useState<string[]>([])
  const [editUrl, setEditUrl] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [revealId, setRevealId] = useState<string | null>(null)
  const [revealValue, setRevealValue] = useState('')
  const [saving, setSaving] = useState(false)

  const SALT_KEY = 'myspace_vault_salt'

  function getSalt(): Uint8Array {
    const stored = localStorage.getItem(SALT_KEY)
    if (stored) return Uint8Array.from(atob(stored), c => c.charCodeAt(0))
    const s = crypto.getRandomValues(new Uint8Array(32))
    localStorage.setItem(SALT_KEY, btoa(Array.from(s, c => String.fromCharCode(c)).join('')))
    if (saltHex === '') setSaltHex(localStorage.getItem(SALT_KEY)!)
    return s
  }

  const load = useCallback(async () => {
    const db = await getDb()
    const res = await db.query<SecretMeta>('SELECT id, label, tags, url, description, updated_at FROM secrets ORDER BY updated_at DESC')
    const list = res.rows
    setSecrets(list)
    setAllTags([...new Set(list.flatMap(s => s.tags ?? []))].sort())
  }, [])

  async function tryUnlock() {
    try {
      setPwError('')
      await unlock(password, getSalt())
      setLocked(false)
      setPassword('')
      await load()
    } catch {
      setPwError('Wrong password')
    }
  }

  function doLock() { lock(); setLocked(true); setSecrets([]); setRevealId(null) }

  function openNew() {
    setEditing({ id: '', label: '', tags: [], url: '', description: '', updated_at: '' })
    setEditLabel(''); setEditValue(''); setEditTags([]); setEditUrl(''); setEditDesc('')
  }

  function openEdit(s: SecretMeta) {
    setEditing(s); setEditLabel(s.label); setEditValue(''); setEditTags(s.tags ?? [])
    setEditUrl(s.url ?? ''); setEditDesc(s.description ?? '')
  }

  async function saveSecret() {
    if (!editLabel.trim()) return
    setSaving(true)
    const db = await getDb()
    if (!editing!.id) {
      if (!editValue.trim()) { setSaving(false); return }
      const { ciphertext, iv } = await encrypt(editValue)
      await db.query('INSERT INTO secrets (label, ciphertext, iv, tags, url, description) VALUES ($1,$2,$3,$4,$5,$6)',
        [editLabel, ciphertext, iv, editTags, editUrl, editDesc])
    } else {
      if (editValue.trim()) {
        const { ciphertext, iv } = await encrypt(editValue)
        await db.query('UPDATE secrets SET label=$1, ciphertext=$2, iv=$3, tags=$4, url=$5, description=$6, updated_at=now() WHERE id=$7',
          [editLabel, ciphertext, iv, editTags, editUrl, editDesc, editing!.id])
      } else {
        await db.query('UPDATE secrets SET label=$1, tags=$2, url=$3, description=$4, updated_at=now() WHERE id=$5',
          [editLabel, editTags, editUrl, editDesc, editing!.id])
      }
    }
    setEditing(null)
    await load()
    setSaving(false)
  }

  async function deleteSecret(id: string) {
    const db = await getDb()
    await db.query('DELETE FROM secrets WHERE id=$1', [id])
    await load()
  }

  async function reveal(s: SecretMeta) {
    if (revealId === s.id) { setRevealId(null); setRevealValue(''); return }
    const db = await getDb()
    const row = await db.query<{ ciphertext: string; iv: string }>('SELECT ciphertext, iv FROM secrets WHERE id=$1', [s.id])
    const val = await decrypt(row.rows[0].ciphertext, row.rows[0].iv)
    setRevealId(s.id); setRevealValue(val)
  }

  const filtered = secrets.filter(s => {
    if (activeTag && !s.tags?.includes(activeTag)) return false
    if (query && !s.label.toLowerCase().includes(query.toLowerCase())) return false
    return true
  })

  if (locked) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6">
        <div className="text-4xl">🔐</div>
        <h2 className="font-bold text-lg">Vault Locked</h2>
        <p className="text-white/40 text-sm text-center">Enter your master password to unlock</p>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && tryUnlock()}
          placeholder="Master password"
          className="w-full max-w-sm bg-white/5 border border-white/20 rounded-lg px-4 py-2.5 text-white outline-none focus:border-[#b4e645]/50"
          autoFocus
        />
        {pwError && <p className="text-red-400 text-sm">{pwError}</p>}
        <button onClick={tryUnlock} className="bg-[#b4e645] text-[#0f2020] font-bold px-6 py-2.5 rounded-full">Unlock</button>
      </div>
    )
  }

  if (editing !== null) {
    return (
      <div className="flex flex-col h-full bg-[#0f2020]">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-[#0d1f1f]">
          <button onClick={() => setEditing(null)} className="text-white/50 hover:text-white mr-1">←</button>
          <span className="font-semibold flex-1">{editing.id ? 'Edit Secret' : 'New Secret'}</span>
          <button onClick={saveSecret} disabled={saving} className="text-xs bg-[#b4e645] text-[#0f2020] font-semibold px-3 py-1 rounded-full disabled:opacity-50">Save</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          <input value={editLabel} onChange={e => setEditLabel(e.target.value)} placeholder="Label (e.g. GitHub)" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none" />
          <input type="password" value={editValue} onChange={e => setEditValue(e.target.value)} placeholder={editing.id ? 'New value (leave blank to keep)' : 'Secret value'} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none" />
          <input value={editUrl} onChange={e => setEditUrl(e.target.value)} placeholder="URL (optional)" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none" />
          <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description (optional)" rows={2} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none resize-none" />
          <TagInput tags={editTags} onChange={setEditTags} />
          {editing.id && <button onClick={() => deleteSecret(editing.id).then(() => setEditing(null))} className="text-red-400 text-sm text-left">Delete secret</button>}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[#0f2020]">
      <div className="px-4 pt-4 pb-3 border-b border-white/10 bg-[#0d1f1f]">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-bold text-lg">Vault</h1>
          <div className="flex gap-2">
            <button onClick={openNew} className="bg-[#b4e645] text-[#0f2020] font-bold px-4 py-1.5 rounded-full text-sm">+ New</button>
            <button onClick={doLock} className="text-white/40 hover:text-white text-sm border border-white/20 px-3 py-1.5 rounded-full">Lock</button>
          </div>
        </div>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search secrets…" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#b4e645]/50" />
        {allTags.length > 0 && (
          <div className="flex gap-1.5 mt-2 flex-wrap">
            <button onClick={() => setActiveTag(null)} className={`text-xs px-2.5 py-1 rounded-full border ${!activeTag ? 'bg-[#b4e645] text-[#0f2020] border-transparent' : 'border-white/20 text-white/50'}`}>All</button>
            {allTags.map(t => <button key={t} onClick={() => setActiveTag(t)} className={`text-xs px-2.5 py-1 rounded-full border ${activeTag === t ? 'bg-[#b4e645] text-[#0f2020] border-transparent' : 'border-white/20 text-white/50'}`}>{t}</button>)}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center text-white/30 py-16 text-sm">No secrets yet</div>
        ) : filtered.map(s => (
          <div key={s.id} className="px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{s.label}</div>
                {s.url && <div className="text-white/30 text-xs truncate">{s.url}</div>}
                {revealId === s.id && <div className="mt-1 font-mono text-xs bg-white/5 px-2 py-1 rounded text-[#b4e645] break-all select-all">{revealValue}</div>}
              </div>
              <button onClick={() => reveal(s)} className="text-xs text-white/40 hover:text-[#b4e645] border border-white/10 px-2 py-1 rounded shrink-0">{revealId === s.id ? 'Hide' : 'Show'}</button>
              <button onClick={() => openEdit(s)} className="text-xs text-white/40 hover:text-white border border-white/10 px-2 py-1 rounded shrink-0">Edit</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
