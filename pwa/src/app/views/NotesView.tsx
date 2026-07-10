import { useEffect, useState, useCallback, useRef } from 'react'
import { getDb } from '../../db'
import { renderMarkdown } from '../../lib/renderMarkdown'
import { safeHtml } from '../../lib/safeHtml'
import { ACCENT } from '../../design/tokens'
import GlassCard from '../../design/GlassCard'
import GlassInput from '../../design/GlassInput'
import PillButton from '../../design/PillButton'
import { BentoGrid, BentoCell } from '../../design/BentoGrid'
import ViewHeader from '../ViewHeader'
import { IconNotes } from '../../design/icons'
import TagInput from '../components/TagInput'

interface Note { id: string; title: string; content: string; tags: string[]; image_data: string; updated_at: string }
const parseImages = (raw: string) => { try { return JSON.parse(raw ?? '[]') } catch { return [] } }
const accent = ACCENT.notes

export default function NotesView() {
  const [notes, setNotes] = useState<Note[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Note | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editTags, setEditTags] = useState<string[]>([])
  const [editImages, setEditImages] = useState<string[]>([])
  const [preview, setPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async (q = '', tag: string | null = null) => {
    const db = await getDb()
    let rows
    if (tag) rows = await db.query<Note>('SELECT * FROM notes WHERE $1 = ANY(tags) ORDER BY updated_at DESC', [tag])
    else if (q) rows = await db.query<Note>('SELECT * FROM notes WHERE title ILIKE $1 OR content ILIKE $1 ORDER BY updated_at DESC', [`%${q}%`])
    else rows = await db.query<Note>('SELECT * FROM notes ORDER BY updated_at DESC')
    const list = rows.rows
    setNotes(list)
    setAllTags([...new Set(list.flatMap(n => n.tags ?? []))].sort())
  }, [])

  useEffect(() => { load() }, [load])

  function select(n: Note) {
    setSelected(n); setEditTitle(n.title); setEditContent(n.content)
    setEditTags(n.tags ?? []); setEditImages(parseImages(n.image_data)); setPreview(false)
  }

  async function create() {
    try {
      const db = await getDb()
      const res = await db.query<Note>('INSERT INTO notes (title, content) VALUES ($1, $2) RETURNING *', ['Untitled', ''])
      await load(query, activeTag)
      select(res.rows[0])
    } catch (e) { console.error('[notes] create failed:', e) }
  }

  async function save() {
    if (!selected) return
    setSaving(true)
    try {
      const db = await getDb()
      await db.query('UPDATE notes SET title=$1, content=$2, tags=$3, image_data=$4, updated_at=now() WHERE id=$5',
        [editTitle, editContent, editTags, JSON.stringify(editImages), selected.id])
      await load(query, activeTag)
    } catch (e) { console.error('[notes] save failed:', e) }
    finally { setSaving(false) }
  }

  async function remove() {
    if (!selected) return
    const db = await getDb()
    await db.query('DELETE FROM notes WHERE id=$1', [selected.id])
    setSelected(null); await load(query, activeTag)
  }

  function addImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setEditImages(prev => [...prev, ev.target!.result as string])
    reader.readAsDataURL(file); e.target.value = ''
  }

  function search(q: string) { setQuery(q); load(q, activeTag) }

  return (
    <div>
      <ViewHeader
        title="Notes" icon={<IconNotes size={22} accent={accent} filled />}
        accent={accent} stats={`${notes.length} notes`}
        action="+ New" onAction={create}
      />
      <BentoGrid>
        {/* Note list + search */}
        <BentoCell span="2">
          <GlassCard style={{ height: '100%' }}>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <GlassInput value={query} onChange={search} placeholder="Search notes…" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
                {notes.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#4a4a6a', padding: 24, fontFamily: 'Inter, sans-serif', fontSize: 14 }}>No notes yet. Create one!</div>
                )}
                {notes.map(n => (
                  <button key={n.id} onClick={() => select(n)}
                    style={{
                      textAlign: 'left', padding: '10px 12px', borderRadius: 12, border: 'none', cursor: 'pointer',
                      background: selected?.id === n.id ? `${accent}18` : 'rgba(255,255,255,0.4)',
                      borderLeft: selected?.id === n.id ? `3px solid ${accent}` : '3px solid transparent',
                      transition: 'background 150ms',
                    }}>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 14, color: '#1a1a2e', marginBottom: 2 }}>{n.title || 'Untitled'}</div>
                    <div style={{ fontSize: 12, color: '#4a4a6a' }}>{new Date(n.updated_at).toLocaleDateString()}</div>
                  </button>
                ))}
              </div>
            </div>
          </GlassCard>
        </BentoCell>

        {/* Tag cloud */}
        <BentoCell span="1">
          <GlassCard style={{ height: '100%' }}>
            <div style={{ padding: 16 }}>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, fontSize: 14, color: '#1a1a2e', marginBottom: 10 }}>Tags</div>
              {allTags.length === 0 && <div style={{ fontSize: 13, color: '#4a4a6a', fontFamily: 'Inter, sans-serif' }}>No tags yet</div>}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {allTags.map(tag => (
                  <button key={tag} onClick={() => { const next = activeTag === tag ? null : tag; setActiveTag(next); setSelected(null); load(query, next) }}
                    style={{ padding: '4px 10px', borderRadius: 100, border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'Inter, sans-serif',
                      background: activeTag === tag ? accent : `${accent}18`, color: activeTag === tag ? 'white' : accent }}>
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          </GlassCard>
        </BentoCell>

        {/* Editor */}
        <BentoCell span="full">
          <GlassCard>
            <div style={{ padding: 20 }}>
              {!selected ? (
                <div style={{ textAlign: 'center', color: '#4a4a6a', padding: 32, fontFamily: 'Inter, sans-serif' }}>
                  Select a note or create a new one
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 22, color: '#1a1a2e', background: 'transparent', border: 'none', outline: 'none', width: '100%' }}
                    placeholder="Title" />
                  <TagInput tags={editTags} onChange={setEditTags} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <PillButton variant="secondary" onClick={() => setPreview(false)} accent={accent}>Edit</PillButton>
                    <PillButton variant="secondary" onClick={() => setPreview(true)} accent={accent}>Preview</PillButton>
                  </div>
                  {preview ? (
                    <div className="prose" dangerouslySetInnerHTML={{ __html: safeHtml(renderMarkdown(editContent)) }} />
                  ) : (
                    <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                      style={{ fontFamily: 'Inter, sans-serif', fontSize: 15, color: '#1a1a2e', background: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.6)', borderRadius: 12, padding: 12, minHeight: 180, resize: 'vertical', outline: 'none' }}
                      placeholder="Write in Markdown…" />
                  )}
                  {editImages.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {editImages.map((img, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                          <img src={img} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} />
                          <button onClick={() => setEditImages(prev => prev.filter((_, j) => j !== i))}
                            style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: '#ef4444', border: 'none', color: 'white', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <PillButton onClick={save} accent={accent} disabled={saving}>{saving ? 'Saving…' : 'Save'}</PillButton>
                    <PillButton variant="secondary" onClick={() => fileRef.current?.click()}>+ Image</PillButton>
                    <PillButton variant="ghost" onClick={remove}>Delete</PillButton>
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={addImage} />
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </BentoCell>
      </BentoGrid>
    </div>
  )
}
