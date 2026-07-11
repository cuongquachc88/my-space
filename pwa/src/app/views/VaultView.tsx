import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { getDb } from '../../db'
import { encrypt, decrypt } from '../../crypto'
import { ACCENT } from '../../design/tokens'
import GlassCard from '../../design/GlassCard'
import GlassInput from '../../design/GlassInput'
import PillButton from '../../design/PillButton'
import { BentoGrid, BentoCell } from '../../design/BentoGrid'
import ViewHeader from '../ViewHeader'
import { IconVault, IconTrash, IconCopy, IconCheck, IconEye } from '../../design/icons'
import TagInput from '../components/TagInput'
import { useIsDesktop } from '../useIsDesktop'
import DesktopVaultView from './desktop/DesktopVaultView'

interface SecretMeta { id: string; label: string; tags: string[]; url: string; description: string; updated_at: string }

const accent = ACCENT.vault

export default function VaultView() {
  const isDesktop = useIsDesktop()
  if (isDesktop) return <DesktopVaultView />
  const [secrets, setSecrets] = useState<SecretMeta[]>([])
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [allTags, setAllTags] = useState<string[]>([])
  const [editing, setEditing] = useState<SecretMeta | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editValue, setEditValue] = useState('')
  const [editTags, setEditTags] = useState<string[]>([])
  const [editUrl, setEditUrl] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [revealId, setRevealId] = useState<string | null>(null)
  const [revealValue, setRevealValue] = useState('')
  const [revealError, setRevealError] = useState('')
  const [saving, setSaving] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [detailVisible, setDetailVisible] = useState(false)

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

  function startNew() {
    setEditing(null)
    setEditLabel(''); setEditValue(''); setEditTags([]); setEditUrl(''); setEditDesc('')
    setShowAdd(true)
    setTimeout(() => setDetailVisible(true), 10)
  }

  function startEdit(s: SecretMeta) {
    setEditing(s)
    setEditLabel(s.label); setEditValue(''); setEditTags(s.tags ?? []); setEditUrl(s.url ?? ''); setEditDesc(s.description ?? '')
    setShowAdd(true)
    setTimeout(() => setDetailVisible(true), 10)
  }

  function goBack() {
    setDetailVisible(false)
    setTimeout(() => setShowAdd(false), 560)
  }

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
      await load()
      goBack()
    } catch (e) { console.error('[vault] save failed:', e) }
    finally { setSaving(false) }
  }

  async function copySecret(id: string, value: string) {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = value
      ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.focus(); ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function reveal(s: SecretMeta) {
    if (revealId === s.id) { setRevealId(null); setRevealValue(''); setRevealError(''); return }
    setRevealError('')
    try {
      const db = await getDb()
      const row = await db.query<{ ciphertext: string; iv: string }>('SELECT ciphertext,iv FROM secrets WHERE id=$1', [s.id])
      if (row.rows[0]) {
        const val = await decrypt(row.rows[0].ciphertext, row.rows[0].iv)
        setRevealId(s.id); setRevealValue(val)
      }
    } catch (e) {
      console.error('[vault] reveal failed:', e)
      setRevealError(String(e))
    }
  }

  async function deleteSecret(id: string) {
    try {
      const db = await getDb()
      await db.query('DELETE FROM secrets WHERE id=$1', [id])
      if (revealId === id) { setRevealId(null); setRevealValue('') }
      if (editing?.id === id) goBack()
      await load()
    } catch (e) { console.error('[vault] deleteSecret failed:', e) }
  }

  return (
    <div>
      <ViewHeader
        title="Vault" icon={<IconVault size={22} accent={accent} filled />}
        accent={accent} stats={`${secrets.length} secrets`}
        action="+ Add" onAction={startNew}
      />
      <BentoGrid>
        {/* Tags on top */}
        {allTags.length > 0 && (
          <BentoCell span="full">
            <GlassCard>
              <div style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 11, color: '#8e8e93', letterSpacing: '0.06em', textTransform: 'uppercase', marginRight: 4 }}>Tags</span>
                {allTags.map(tag => (
                  <button key={tag} onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                    style={{ padding: '4px 10px', borderRadius: 100, border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'Inter, sans-serif', background: activeTag === tag ? accent : `${accent}18`, color: activeTag === tag ? 'white' : accent }}>
                    #{tag}
                  </button>
                ))}
              </div>
            </GlassCard>
          </BentoCell>
        )}

        <BentoCell span="full">
          <GlassCard>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <GlassInput value={query} onChange={v => setQuery(v)} placeholder="Search secrets…" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {secrets.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#4a4a6a', padding: 24, fontFamily: 'Inter, sans-serif', fontSize: 14 }}>No secrets yet.</div>
                )}
                {secrets.map(s => (
                  <div key={s.id} style={{ borderRadius: 12, background: 'rgba(255,255,255,0.4)', display: 'flex', flexDirection: 'column', gap: 3, padding: '8px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13, color: '#1a1a2e', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button onClick={async () => {
                          const db = await getDb()
                          const row = await db.query<{ ciphertext: string; iv: string }>('SELECT ciphertext,iv FROM secrets WHERE id=$1', [s.id])
                          if (row.rows[0]) { const val = await decrypt(row.rows[0].ciphertext, row.rows[0].iv); await copySecret(s.id, val) }
                        }} style={{ width: 30, height: 30, borderRadius: 8, border: `1.5px solid ${copiedId === s.id ? '#10b981' : accent}`, background: copiedId === s.id ? '#10b981' : `${accent}10`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 150ms', flexShrink: 0 }}>
                          {copiedId === s.id ? <IconCheck size={14} accent="#fff" /> : <IconCopy size={14} accent={accent} />}
                        </button>
                        <button onClick={() => reveal(s)} style={{ width: 30, height: 30, borderRadius: 8, border: `1.5px solid ${revealId === s.id ? accent : 'rgba(0,0,0,0.12)'}`, background: revealId === s.id ? accent : `${accent}10`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 150ms', flexShrink: 0 }}>
                          <IconEye size={14} accent={revealId === s.id ? '#fff' : accent} off={revealId === s.id} />
                        </button>
                        <button onClick={() => startEdit(s)} style={{ padding: '4px 10px', borderRadius: 8, border: '1.5px solid rgba(0,0,0,0.12)', background: 'transparent', color: '#4a4a6a', fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                          Edit
                        </button>
                        <button onClick={() => deleteSecret(s.id)} style={{ width: 30, height: 30, borderRadius: 8, border: '1.5px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <IconTrash size={13} accent="#ef4444" />
                        </button>
                      </div>
                    </div>
                    {revealId === s.id && (
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, background: `${accent}15`, borderRadius: 8, padding: '5px 8px', color: '#1a1a2e', wordBreak: 'break-all' }}>{revealValue}</div>
                    )}
                    {(s.tags ?? []).length > 0 && (
                      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        {(s.tags ?? []).map(t => (
                          <span key={t} style={{ fontSize: 10, fontFamily: 'Inter, sans-serif', color: accent, background: `${accent}14`, borderRadius: 100, padding: '1px 6px' }}>#{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {revealError && <div style={{ fontSize: 11, color: '#ef4444', fontFamily: 'Inter, sans-serif', padding: '4px 2px', wordBreak: 'break-all' }}>Reveal error: {revealError}</div>}
            </div>
          </GlassCard>
        </BentoCell>
      </BentoGrid>

      {/* ── Detail screen — portal to body ── */}
      {showAdd && createPortal(
        <div style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: 'linear-gradient(160deg, #f0f2ff 0%, #e8eeff 50%, #dde3ff 100%)',
          overflowY: 'auto',
          transform: detailVisible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 550ms cubic-bezier(0.22,1,0.36,1)',
        }}>
          {/* Hero header */}
          <div style={{ background: `linear-gradient(145deg, ${accent} 0%, #6366f1 60%, #818cf8 100%)`, paddingBottom: 24, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', top: -60, right: -40, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', bottom: -20, left: 20, pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'calc(env(safe-area-inset-top) + 14px) 20px 10px', position: 'relative' }}>
              <button onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.92)', padding: 0 }}>
                <svg width="8" height="13" viewBox="0 0 8 13" fill="none">
                  <path d="M7 1L1.5 6.5L7 12" stroke="rgba(255,255,255,0.92)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Vault
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={saveSecret} disabled={saving} style={{
                  padding: '8px 22px', borderRadius: 100, border: '1.5px solid rgba(255,255,255,0.5)', cursor: saving ? 'not-allowed' : 'pointer',
                  background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                  color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13, opacity: saving ? 0.6 : 1,
                }}>{saving ? 'Saving…' : 'Save'}</button>
                {editing && (
                  <button onClick={() => deleteSecret(editing.id)} style={{ width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconTrash size={15} accent="rgba(255,255,255,0.85)" />
                  </button>
                )}
              </div>
            </div>
            <div style={{ padding: '8px 20px 0', position: 'relative' }}>
              <input
                value={editLabel}
                onChange={e => setEditLabel(e.target.value)}
                style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 26, color: '#fff', background: 'transparent', border: 'none', outline: 'none', width: '100%', letterSpacing: '-0.02em', lineHeight: 1.2 }}
                placeholder={editing ? 'Secret label' : 'New secret'}
                autoFocus
              />
            </div>
          </div>

          {/* Content */}
          <div style={{ padding: '20px 20px 80px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <GlassInput value={editValue} onChange={setEditValue} placeholder={editing ? 'New value (leave blank to keep)' : 'Secret value'} type="password" />
              <GlassInput value={editUrl} onChange={setEditUrl} placeholder="URL (optional)" />
              <GlassInput value={editDesc} onChange={setEditDesc} placeholder="Description (optional)" />
              <TagInput tags={editTags} onChange={setEditTags} />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
