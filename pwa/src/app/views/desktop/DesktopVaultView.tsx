import { useEffect, useState, useCallback } from 'react'
import { getDb } from '../../../db'
import { encrypt, decrypt } from '../../../crypto'
import { ACCENT } from '../../../design/tokens'
import { IconVault, IconTrash } from '../../../design/icons'
import TagInput from '../../components/TagInput'

interface SecretMeta { id: string; label: string; tags: string[]; url: string; description: string; updated_at: string }

const accent = ACCENT.vault

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.6)', border: '1.5px solid rgba(255,255,255,0.7)',
  borderRadius: 12, padding: '10px 14px', fontSize: 14, color: '#1a1a2e',
  fontFamily: 'Inter, sans-serif', outline: 'none',
}

export default function DesktopVaultView() {
  const [secrets, setSecrets] = useState<SecretMeta[]>([])
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [allTags, setAllTags] = useState<string[]>([])
  const [revealId, setRevealId] = useState<string | null>(null)
  const [revealValue, setRevealValue] = useState('')
  const [revealError, setRevealError] = useState<string | null>(null)

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SecretMeta | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editValue, setEditValue] = useState('')
  const [editTags, setEditTags] = useState<string[]>([])
  const [editUrl, setEditUrl] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const db = await getDb()
    const res = await db.query<SecretMeta>(
      query
        ? 'SELECT id,label,tags,url,description,updated_at FROM secrets WHERE label ILIKE $1 OR description ILIKE $1 ORDER BY updated_at DESC'
        : activeTag
          ? 'SELECT id,label,tags,url,description,updated_at FROM secrets WHERE $1=ANY(tags) ORDER BY updated_at DESC'
          : 'SELECT id,label,tags,url,description,updated_at FROM secrets ORDER BY updated_at DESC',
      query ? [`%${query}%`] : activeTag ? [activeTag] : []
    )
    setSecrets(res.rows)
    setAllTags([...new Set(res.rows.flatMap(s => s.tags ?? []))].sort())
  }, [query, activeTag])

  useEffect(() => { load() }, [load])

  function openNew() {
    setEditing(null)
    setEditLabel(''); setEditValue(''); setEditTags([]); setEditUrl(''); setEditDesc('')
    setModalOpen(true)
  }

  function openEdit(s: SecretMeta) {
    setEditing(s)
    setEditLabel(s.label); setEditValue(''); setEditTags(s.tags ?? []); setEditUrl(s.url ?? ''); setEditDesc(s.description ?? '')
    setModalOpen(true)
  }

  function closeModal() { setModalOpen(false); setEditing(null) }

  async function saveSecret() {
    if (!editLabel.trim()) return
    setSaving(true)
    try {
      const db = await getDb()
      if (editing) {
        if (editValue.trim()) {
          const { ciphertext, iv } = await encrypt(editValue)
          await db.query('UPDATE secrets SET label=$1,ciphertext=$2,iv=$3,tags=$4,url=$5,description=$6,updated_at=now() WHERE id=$7',
            [editLabel, ciphertext, iv, editTags, editUrl, editDesc, editing.id])
        } else {
          await db.query('UPDATE secrets SET label=$1,tags=$2,url=$3,description=$4,updated_at=now() WHERE id=$5',
            [editLabel, editTags, editUrl, editDesc, editing.id])
        }
      } else {
        if (!editValue.trim()) { setSaving(false); return }
        const { ciphertext, iv } = await encrypt(editValue)
        await db.query('INSERT INTO secrets (label,ciphertext,iv,tags,url,description) VALUES ($1,$2,$3,$4,$5,$6)',
          [editLabel, ciphertext, iv, editTags, editUrl, editDesc])
      }
      await load(); closeModal()
    } catch (e) { console.error('[vault] save failed:', e) }
    finally { setSaving(false) }
  }

  async function deleteSecret(id: string) {
    const db = await getDb()
    await db.query('DELETE FROM secrets WHERE id=$1', [id])
    if (revealId === id) { setRevealId(null); setRevealValue('') }
    if (editing?.id === id) closeModal()
    await load()
  }

  async function reveal(s: SecretMeta) {
    setRevealError(null)
    if (revealId === s.id) { setRevealId(null); setRevealValue(''); return }
    try {
      const db = await getDb()
      const row = await db.query<{ ciphertext: string; iv: string }>('SELECT ciphertext,iv FROM secrets WHERE id=$1', [s.id])
      if (row.rows[0]) {
        const val = await decrypt(row.rows[0].ciphertext, row.rows[0].iv)
        setRevealId(s.id); setRevealValue(val)
      }
    } catch (e) {
      console.error('[vault] reveal failed:', e)
      const msg = e instanceof Error ? e.message : String(e)
      setRevealError(msg.includes('locked') ? 'Vault is locked — unlock first' : 'Decryption failed')
    }
  }

  const PRIORITY_COLOR: Record<string, string> = { high: '#ef4444', medium: '#f59e0b', low: '#94a3b8' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: `${accent}18`, border: `1.5px solid ${accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconVault size={20} accent={accent} filled />
          </div>
          <div>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 22, color: '#1a1a2e', letterSpacing: '-0.02em', lineHeight: 1 }}>Vault</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{secrets.length} secrets</div>
          </div>
        </div>
        <button onClick={openNew} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '9px 18px', borderRadius: 100,
          background: `linear-gradient(135deg, ${accent} 0%, #6366f1 100%)`,
          border: 'none', cursor: 'pointer', color: '#fff',
          fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13,
          boxShadow: `0 4px 14px ${accent}40`,
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
          Add secret
        </button>
      </div>

      {/* ── Search ── */}
      <div style={{ position: 'relative', marginBottom: allTags.length > 0 ? 8 : 16 }}>
        <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="15" height="15" viewBox="0 0 15 15" fill="none">
          <circle cx="6.5" cy="6.5" r="5" stroke="#94a3b8" strokeWidth="1.5"/>
          <path d="M10.5 10.5L13.5 13.5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input value={query} onChange={e => { setQuery(e.target.value) }} placeholder="Search secrets…"
          style={{ ...inputStyle, paddingLeft: 40, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', width: '100%', boxSizing: 'border-box' }} />
      </div>

      {/* ── Tags row ── */}
      {allTags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10, marginBottom: 8, scrollbarWidth: 'none' }}>
          {allTags.map(tag => (
            <button key={tag} onClick={() => setActiveTag(activeTag === tag ? null : tag)} style={{
              padding: '5px 11px', borderRadius: 100, border: 'none', cursor: 'pointer',
              fontSize: 12, fontFamily: 'Inter, sans-serif', flexShrink: 0,
              background: activeTag === tag ? accent : `${accent}14`,
              color: activeTag === tag ? '#fff' : accent, transition: 'all 150ms',
            }}>#{tag}</button>
          ))}
        </div>
      )}

      {/* ── Reveal error ── */}
      {revealError && (
        <div style={{ marginBottom: 12, padding: '10px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontFamily: 'Inter, sans-serif', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {revealError}
          <button onClick={() => setRevealError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 16, lineHeight: 1 }}>✕</button>
        </div>
      )}

      {/* ── Table ── */}
      {secrets.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: 48, fontFamily: 'Inter, sans-serif', fontSize: 14 }}>No secrets yet. Click <strong>Add secret</strong> to start.</div>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.45)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 780 }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 140px 100px 160px', gap: 12, padding: '10px 20px', borderBottom: '1px solid rgba(124,106,247,0.08)', background: 'rgba(255,255,255,0.3)' }}>
            {['Label', 'Tags', 'URL', 'Updated', ''].map(h => (
              <div key={h} style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</div>
            ))}
          </div>
          {secrets.map((s, i) => (
            <div key={s.id} style={{ borderTop: i > 0 ? '1px solid rgba(124,106,247,0.06)' : 'none' }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '1.5fr 1fr 140px 100px 160px', gap: 12,
                padding: '12px 20px', alignItems: 'center',
                transition: 'background 120ms',
                background: 'transparent',
              }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.5)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 14, color: '#1a1a2e' }}>{s.label}</div>
                  {s.description && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{s.description}</div>}
                  {revealId === s.id && (
                    <div style={{ marginTop: 6, fontFamily: 'monospace', fontSize: 13, background: `${accent}12`, borderRadius: 8, padding: '5px 10px', color: '#1a1a2e', wordBreak: 'break-all', userSelect: 'all' }}>{revealValue}</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {(s.tags ?? []).map(t => <span key={t} style={{ fontSize: 11, background: `${accent}14`, color: accent, borderRadius: 100, padding: '2px 7px', fontFamily: 'Inter, sans-serif' }}>#{t}</span>)}
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'Inter, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.url || '—'}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'Inter, sans-serif' }}>{new Date(s.updated_at).toLocaleDateString()}</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                  <button onClick={e => { e.stopPropagation(); reveal(s) }} style={{
                    padding: '5px 10px', borderRadius: 8, border: `1px solid ${accent}30`, cursor: 'pointer',
                    background: revealId === s.id ? `${accent}18` : 'transparent',
                    color: accent, fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                  }}>{revealId === s.id ? 'Hide' : 'Reveal'}</button>
                  <button onClick={e => { e.stopPropagation(); openEdit(s) }} style={{
                    padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)', cursor: 'pointer',
                    background: 'transparent', color: '#4a4a6a', fontFamily: 'Inter, sans-serif', fontSize: 12, whiteSpace: 'nowrap',
                  }}>Edit</button>
                  <button onClick={e => { e.stopPropagation(); deleteSecret(s.id) }} style={{
                    width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: 'rgba(239,68,68,0.07)', color: '#ef4444',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <IconTrash size={13} accent="#ef4444" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          </div>
          </div>
        </div>
      )}

      {/* ── Modal ── */}
      {modalOpen && (
        <div onClick={closeModal} style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(15,15,35,0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32,
          animation: 'fadeIn 120ms ease',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 520,
            background: 'rgba(245,246,255,0.97)',
            backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            borderRadius: 24, boxShadow: '0 40px 100px rgba(15,15,35,0.32), 0 8px 24px rgba(15,15,35,0.12)',
            overflow: 'hidden',
            animation: 'slideUp 200ms cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            {/* Header */}
            <div style={{ background: `linear-gradient(135deg, ${accent} 0%, #6366f1 100%)`, padding: '20px 24px 16px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', top: -40, right: -20, pointerEvents: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{editing ? 'Edit secret' : 'New secret'}</span>
                <button onClick={closeModal} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
              <input
                value={editLabel}
                onChange={e => setEditLabel(e.target.value)}
                style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 22, color: '#fff', background: 'transparent', border: 'none', outline: 'none', width: '100%', letterSpacing: '-0.02em' }}
                placeholder={editing ? 'Secret label' : 'New secret name'}
                autoFocus
              />
            </div>
            {/* Body */}
            <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: '#4a4a6a', marginBottom: 6 }}>
                  {editing ? 'New value (leave blank to keep current)' : 'Secret value *'}
                </label>
                <input type="password" value={editValue} onChange={e => setEditValue(e.target.value)} placeholder="••••••••" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: '#4a4a6a', marginBottom: 6 }}>URL</label>
                <input value={editUrl} onChange={e => setEditUrl(e.target.value)} placeholder="https://example.com" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: '#4a4a6a', marginBottom: 6 }}>Description</label>
                <input value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Short description" style={inputStyle} />
              </div>
              <TagInput tags={editTags} onChange={setEditTags} />
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={saveSecret} disabled={saving} style={{
                  flex: 1, padding: '11px', borderRadius: 12, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                  background: `linear-gradient(135deg, ${accent} 0%, #6366f1 100%)`,
                  color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 14,
                  opacity: saving ? 0.7 : 1,
                }}>{saving ? 'Saving…' : 'Save'}</button>
                {editing && (
                  <button onClick={() => deleteSecret(editing.id)} style={{
                    padding: '11px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <IconTrash size={16} accent="#ef4444" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(16px) scale(0.98); opacity: 0 } to { transform: translateY(0) scale(1); opacity: 1 } }
      `}</style>
    </div>
  )
}
