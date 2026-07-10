import { useEffect, useState, useCallback, useRef } from 'react'
import { getDb } from '../../db'
import { renderMarkdown } from '../../lib/renderMarkdown'
import { safeHtml } from '../../lib/safeHtml'
import { ACCENT } from '../../design/tokens'
import GlassCard from '../../design/GlassCard'
import GlassInput from '../../design/GlassInput'
import PillButton from '../../design/PillButton'
import BottomSheet from '../../design/BottomSheet'
import { BentoGrid, BentoCell } from '../../design/BentoGrid'
import ViewHeader from '../ViewHeader'
import { IconNotes, IconTrash } from '../../design/icons'
import SwipeToDelete from '../../design/SwipeToDelete'
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
  const [sheetOpen, setSheetOpen] = useState(false)
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

  function openNote(n: Note) {
    setSelected(n)
    setEditTitle(n.title)
    setEditContent(n.content)
    setEditTags(n.tags ?? [])
    setEditImages(parseImages(n.image_data))
    setPreview(false)
    setSheetOpen(true)
  }

  function closeSheet() {
    setSheetOpen(false)
  }

  async function create() {
    try {
      const db = await getDb()
      const res = await db.query<Note>('INSERT INTO notes (title, content) VALUES ($1, $2) RETURNING *', ['Untitled', ''])
      await load(query, activeTag)
      openNote(res.rows[0])
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
      closeSheet()
    } catch (e) { console.error('[notes] save failed:', e) }
    finally { setSaving(false) }
  }

  async function remove() {
    if (!selected) return
    const db = await getDb()
    await db.query('DELETE FROM notes WHERE id=$1', [selected.id])
    setSelected(null)
    closeSheet()
    await load(query, activeTag)
  }

  async function deleteNote(n: Note) {
    const db = await getDb()
    await db.query('DELETE FROM notes WHERE id=$1', [n.id])
    if (selected?.id === n.id) { setSelected(null); closeSheet() }
    await load(query, activeTag)
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
        {/* Note list: tags + search + items */}
        <BentoCell span="full">
          <GlassCard>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* Tags row above search */}
              {allTags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {allTags.map(tag => (
                    <button key={tag} onClick={() => { const next = activeTag === tag ? null : tag; setActiveTag(next); setSelected(null); load(query, next) }}
                      style={{ padding: '4px 10px', borderRadius: 100, border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'Inter, sans-serif',
                        background: activeTag === tag ? accent : `${accent}18`, color: activeTag === tag ? 'white' : accent }}>
                      #{tag}
                    </button>
                  ))}
                </div>
              )}

              <GlassInput value={query} onChange={search} placeholder="Search notes…" />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 340, overflowY: 'auto' }}>
                {notes.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#4a4a6a', padding: 24, fontFamily: 'Inter, sans-serif', fontSize: 14 }}>No notes yet. Create one!</div>
                )}
                {notes.map(n => (
                  <SwipeToDelete key={n.id} onDelete={() => deleteNote(n)}>
                    <div style={{ position: 'relative' }}>
                      <button onClick={() => openNote(n)}
                        style={{
                          width: '100%', textAlign: 'left', padding: '10px 44px 10px 12px', borderRadius: 12, cursor: 'pointer',
                          background: selected?.id === n.id ? `${accent}18` : 'rgba(255,255,255,0.4)',
                          border: selected?.id === n.id ? `1.5px solid ${accent}80` : '1.5px solid rgba(255,255,255,0.5)',
                          transition: 'background 150ms, border-color 150ms',
                        }}>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 14, color: '#1a1a2e', marginBottom: 2 }}>{n.title || 'Untitled'}</div>
                        <div style={{ fontSize: 12, color: '#4a4a6a' }}>{new Date(n.updated_at).toLocaleDateString()}</div>
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); deleteNote(n) }}
                        style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <IconTrash size={14} accent="#ef4444" />
                      </button>
                    </div>
                  </SwipeToDelete>
                ))}
              </div>
            </div>
          </GlassCard>
        </BentoCell>
      </BentoGrid>

      {/* Bottom sheet editor */}
      <BottomSheet open={sheetOpen} onClose={closeSheet}>
        <div style={{ padding: '8px 20px 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <input
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: 22, color: '#1a1a2e', background: 'transparent', border: 'none', outline: 'none', flex: 1 }}
              placeholder="Title"
            />
            <button onClick={remove} style={{ width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconTrash size={17} accent="#ef4444" />
            </button>
          </div>

          <TagInput tags={editTags} onChange={setEditTags} />

          {/* Edit / Preview toggle */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.05)', borderRadius: 100, padding: 3, gap: 2, alignSelf: 'flex-start' }}>
            {(['Edit', 'Preview'] as const).map(m => (
              <button key={m} onClick={() => setPreview(m === 'Preview')}
                style={{ padding: '6px 18px', borderRadius: 100, border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600,
                  background: (m === 'Preview') === preview ? '#fff' : 'transparent',
                  color: (m === 'Preview') === preview ? '#1a1a2e' : '#4a4a6a',
                  boxShadow: (m === 'Preview') === preview ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 150ms',
                }}>
                {m}
              </button>
            ))}
          </div>

          {/* Content */}
          {preview ? (
            <div className="prose" style={{ minHeight: 160 }} dangerouslySetInnerHTML={{ __html: safeHtml(renderMarkdown(editContent)) }} />
          ) : (
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              autoFocus
              style={{ fontFamily: 'Inter, sans-serif', fontSize: 15, color: '#1a1a2e', background: 'rgba(255,255,255,0.5)', border: '1.5px solid rgba(0,0,0,0.08)', borderRadius: 14, padding: 14, minHeight: 200, resize: 'vertical', outline: 'none' }}
              placeholder="Write in Markdown…"
            />
          )}

          {/* Images */}
          {editImages.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {editImages.map((img, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={img} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} />
                  <button onClick={() => setEditImages(prev => prev.filter((_, j) => j !== i))}
                    style={{ position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: '50%', background: '#ef4444', border: 'none', color: 'white', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <PillButton onClick={save} accent={accent} disabled={saving}>{saving ? 'Saving…' : 'Save'}</PillButton>
            <PillButton variant="secondary" onClick={() => fileRef.current?.click()}>+ Image</PillButton>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={addImage} />
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}
