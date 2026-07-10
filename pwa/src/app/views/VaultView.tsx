import { useEffect, useState, useCallback } from 'react'
import { getDb } from '../../db'
import { encrypt, decrypt } from '../../crypto'
import { ACCENT } from '../../design/tokens'
import GlassCard from '../../design/GlassCard'
import GlassInput from '../../design/GlassInput'
import PillButton from '../../design/PillButton'
import { BentoGrid, BentoCell } from '../../design/BentoGrid'
import ViewHeader from '../ViewHeader'
import { IconVault } from '../../design/icons'
import TagInput from '../components/TagInput'

interface SecretMeta { id: string; label: string; tags: string[]; url: string; description: string; updated_at: string }

const accent = ACCENT.vault

export default function VaultView() {
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
  const [showAdd, setShowAdd] = useState(false)

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
    setEditing(null); setEditLabel(''); setEditValue(''); setEditTags([]); setEditUrl(''); setEditDesc(''); setShowAdd(true)
  }

  function startEdit(s: SecretMeta) {
    setEditing(s); setEditLabel(s.label); setEditValue(''); setEditTags(s.tags ?? []); setEditUrl(s.url ?? ''); setEditDesc(s.description ?? ''); setShowAdd(true)
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
      setShowAdd(false); setEditing(null); await load()
    } catch (e) { console.error('[vault] save failed:', e) }
    finally { setSaving(false) }
  }

  async function reveal(s: SecretMeta) {
    if (revealId === s.id) { setRevealId(null); setRevealValue(''); return }
    try {
      const db = await getDb()
      const row = await db.query<{ ciphertext: string; iv: string }>('SELECT ciphertext,iv FROM secrets WHERE id=$1', [s.id])
      if (row.rows[0]) {
        const val = await decrypt(row.rows[0].ciphertext, row.rows[0].iv)
        setRevealId(s.id); setRevealValue(val)
      }
    } catch (e) { console.error('[vault] reveal failed:', e) }
  }

  async function deleteSecret(id: string) {
    try {
      const db = await getDb()
      await db.query('DELETE FROM secrets WHERE id=$1', [id])
      if (revealId === id) { setRevealId(null); setRevealValue('') }
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
        <BentoCell span="2">
          <GlassCard style={{ height: '100%' }}>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <GlassInput value={query} onChange={v => { setQuery(v) }} placeholder="Search secrets…" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 340, overflowY: 'auto' }}>
                {secrets.length === 0 && <div style={{ textAlign: 'center', color: '#4a4a6a', padding: 24, fontFamily: 'Satoshi, sans-serif', fontSize: 14 }}>No secrets yet.</div>}
                {secrets.map(s => (
                  <div key={s.id} style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.4)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 600, fontSize: 14, color: '#1a1a2e' }}>{s.label}</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <PillButton variant="secondary" accent={accent} onClick={() => reveal(s)}>{revealId === s.id ? 'Hide' : 'Reveal'}</PillButton>
                        <PillButton variant="ghost" onClick={() => startEdit(s)}>Edit</PillButton>
                        <PillButton variant="ghost" onClick={() => deleteSecret(s.id)}>Delete</PillButton>
                      </div>
                    </div>
                    {revealId === s.id && (
                      <div style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 13, background: `${accent}15`, borderRadius: 8, padding: '6px 10px', color: '#1a1a2e', wordBreak: 'break-all' }}>{revealValue}</div>
                    )}
                    {s.url && <div style={{ fontSize: 12, color: '#4a4a6a' }}>{s.url}</div>}
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </BentoCell>

        <BentoCell span="1">
          <GlassCard style={{ height: '100%' }}>
            <div style={{ padding: 16 }}>
              <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: 14, color: '#1a1a2e', marginBottom: 10 }}>Tags</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {allTags.map(tag => (
                  <button key={tag} onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                    style={{ padding: '4px 10px', borderRadius: 100, border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'Satoshi, sans-serif', background: activeTag === tag ? accent : `${accent}18`, color: activeTag === tag ? 'white' : accent }}>
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          </GlassCard>
        </BentoCell>

        {showAdd && (
          <BentoCell span="full">
            <GlassCard accentBar accent={accent}>
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 700, fontSize: 18, color: '#1a1a2e' }}>
                  {editing ? 'Edit Secret' : 'New Secret'}
                </div>
                <GlassInput value={editLabel} onChange={setEditLabel} placeholder="Label (e.g. Gmail password)" />
                <GlassInput value={editValue} onChange={setEditValue} placeholder={editing ? "New value (leave blank to keep existing)" : "Secret value"} type="password" />
                <GlassInput value={editUrl} onChange={setEditUrl} placeholder="URL (optional)" />
                <GlassInput value={editDesc} onChange={setEditDesc} placeholder="Description (optional)" />
                <TagInput tags={editTags} onChange={setEditTags} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <PillButton onClick={saveSecret} accent={accent} disabled={saving}>{saving ? 'Saving…' : 'Save'}</PillButton>
                  <PillButton variant="ghost" onClick={() => setShowAdd(false)}>Cancel</PillButton>
                </div>
              </div>
            </GlassCard>
          </BentoCell>
        )}
      </BentoGrid>
    </div>
  )
}
