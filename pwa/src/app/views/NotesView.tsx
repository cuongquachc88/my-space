import { useEffect, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { getDb } from '../../db'
import { renderMarkdown } from '../../lib/renderMarkdown'
import { safeHtml } from '../../lib/safeHtml'
import { ACCENT } from '../../design/tokens'
import GlassCard from '../../design/GlassCard'
import GlassInput from '../../design/GlassInput'
import PillButton from '../../design/PillButton'
import { BentoGrid, BentoCell } from '../../design/BentoGrid'
import ViewHeader from '../ViewHeader'
import { IconNotes, IconTrash } from '../../design/icons'
import SwipeToDelete from '../../design/SwipeToDelete'
import TagInput from '../components/TagInput'
import { useIsDesktop } from '../useIsDesktop'
import DesktopNotesView from './desktop/DesktopNotesView'

interface Note { id: string; title: string; content: string; tags: string[]; image_data: string; updated_at: string }
const parseImages = (raw: string) => { try { return JSON.parse(raw ?? '[]') } catch { return [] } }
const accent = ACCENT.notes

export default function NotesView() {
  const isDesktop = useIsDesktop()
  if (isDesktop) return <DesktopNotesView />
  const [notes, setNotes] = useState<Note[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  // Detail screen state
  const [selected, setSelected] = useState<Note | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
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
    // Mount first, then trigger slide-in
    setTimeout(() => setDetailVisible(true), 10)
  }

  function goBack() {
    setDetailVisible(false)
    setTimeout(() => setSelected(null), 560)
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
      goBack()
    } catch (e) { console.error('[notes] save failed:', e) }
    finally { setSaving(false) }
  }

  async function remove() {
    if (!selected) return
    const db = await getDb()
    await db.query('DELETE FROM notes WHERE id=$1', [selected.id])
    await load(query, activeTag)
    goBack()
  }

  async function deleteNote(n: Note) {
    const db = await getDb()
    await db.query('DELETE FROM notes WHERE id=$1', [n.id])
    if (selected?.id === n.id) goBack()
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
    <div style={{ position: 'relative', overflow: 'hidden' }}>

      {/* ── List screen ── */}
      <div>
        <ViewHeader
          title="Notes" icon={<IconNotes size={22} accent={accent} filled />}
          accent={accent} stats={`${notes.length} notes`}
          action="+ New" onAction={create}
        />
        <BentoGrid>
          {allTags.length > 0 && (
            <BentoCell span="full">
              <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: 18, padding: '14px 16px', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
                <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 11, color: '#8e8e93', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Tags</span>
                {allTags.map(tag => (
                  <button key={tag} onClick={() => { const next = activeTag === tag ? null : tag; setActiveTag(next); load(query, next) }}
                    style={{ padding: '5px 12px', borderRadius: 100, border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: 500,
                      background: activeTag === tag ? accent : `${accent}18`, color: activeTag === tag ? 'white' : accent }}>
                    #{tag}
                  </button>
                ))}
              </div>
            </BentoCell>
          )}
          <BentoCell span="full">
            <GlassCard>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>

                <GlassInput value={query} onChange={search} placeholder="Search notes…" />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {notes.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#4a4a6a', padding: 24, fontFamily: 'Inter, sans-serif', fontSize: 14 }}>No notes yet. Create one!</div>
                  )}
                  {notes.map(n => (
                    <SwipeToDelete key={n.id} onDelete={() => deleteNote(n)}>
                      <div style={{ position: 'relative' }}>
                        <button onClick={() => openNote(n)}
                          style={{
                            width: '100%', textAlign: 'left', padding: '12px 48px 12px 14px', borderRadius: 12, cursor: 'pointer',
                            background: 'rgba(255,255,255,0.5)',
                            border: '1.5px solid rgba(255,255,255,0.5)',
                            transition: 'background 150ms',
                          }}>
                          <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 14, color: '#1a1a2e', marginBottom: 2 }}>{n.title || 'Untitled'}</div>
                          <div style={{ fontSize: 12, color: '#4a4a6a' }}>{new Date(n.updated_at).toLocaleDateString()}</div>
                          {(n.tags ?? []).length > 0 && (
                            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 4 }}>
                              {(n.tags ?? []).map(t => (
                                <span key={t} style={{ fontSize: 10, fontFamily: 'Inter, sans-serif', color: accent, background: `${accent}14`, borderRadius: 100, padding: '1px 6px' }}>#{t}</span>
                              ))}
                            </div>
                          )}
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); deleteNote(n) }}
                          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
      </div>

      {/* ── Detail screen — portal to body so fixed works through backdrop-filter parents ── */}
      {selected && createPortal(
        <div style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: 'linear-gradient(160deg, #f0f2ff 0%, #e8eeff 50%, #dde3ff 100%)',
          overflowY: 'auto',
          transform: detailVisible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 550ms cubic-bezier(0.22,1,0.36,1)',
        }}>
          {/* Hero header — colored zone with nav + title */}
          <div style={{ background: `linear-gradient(145deg, ${accent} 0%, #6366f1 60%, #818cf8 100%)`, paddingBottom: 24, position: 'relative', overflow: 'hidden' }}>
            {/* Subtle orb texture */}
            <div style={{ position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', top: -60, right: -40, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', bottom: -20, left: 20, pointerEvents: 'none' }} />
            {/* Nav row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'calc(env(safe-area-inset-top) + 14px) 20px 10px', position: 'relative' }}>
              <button onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.92)', padding: 0 }}>
                <svg width="8" height="13" viewBox="0 0 8 13" fill="none">
                  <path d="M7 1L1.5 6.5L7 12" stroke="rgba(255,255,255,0.92)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Notes
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={save} disabled={saving} style={{
                  padding: '8px 22px', borderRadius: 100, border: '1.5px solid rgba(255,255,255,0.5)', cursor: saving ? 'not-allowed' : 'pointer',
                  background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                  color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13, opacity: saving ? 0.6 : 1,
                }}>{saving ? 'Saving…' : 'Save'}</button>
                <button onClick={remove} style={{ width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconTrash size={15} accent="rgba(255,255,255,0.85)" />
                </button>
              </div>
            </div>
            {/* Title inside hero */}
            <div style={{ padding: '8px 20px 0', position: 'relative' }}>
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 28, color: '#fff', background: 'transparent', border: 'none', outline: 'none', width: '100%', letterSpacing: '-0.02em', lineHeight: 1.2 }}
                placeholder="Untitled"
              />
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
                {new Date(selected.updated_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Content area */}
          <div style={{ padding: '20px 20px 80px' }}>

            {/* Tags box */}
            <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: 18, padding: '14px 16px', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', marginBottom: 16 }}>
              <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 11, color: '#8e8e93', letterSpacing: '0.07em', textTransform: 'uppercase', flexShrink: 0 }}>Tags</span>
              <TagInput tags={editTags} onChange={setEditTags} flat />
            </div>

            {/* Edit/Preview pill */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.4)', borderRadius: 100, padding: 3, gap: 2, marginTop: 16, marginBottom: 16, width: 'fit-content', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)' }}>
              {(['Edit', 'Preview'] as const).map(m => (
                <button key={m} onClick={() => setPreview(m === 'Preview')}
                  style={{ padding: '6px 20px', borderRadius: 100, border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600,
                    background: (m === 'Preview') === preview ? '#fff' : 'transparent',
                    color: (m === 'Preview') === preview ? accent : '#4a4a6a',
                    boxShadow: (m === 'Preview') === preview ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 180ms',
                  }}>
                  {m}
                </button>
              ))}
            </div>

            {/* Content */}
            {preview ? (
              <div className="prose" style={{ minHeight: 200 }} dangerouslySetInnerHTML={{ __html: safeHtml(renderMarkdown(editContent)) }} />
            ) : (
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                autoFocus
                style={{ fontFamily: 'Inter, sans-serif', fontSize: 15, color: '#1a1a2e', background: 'rgba(255,255,255,0.65)', border: 'none', borderRadius: 16, padding: '16px 14px', minHeight: 'calc(100dvh - 420px)', resize: 'none', outline: 'none', width: '100%', boxSizing: 'border-box', lineHeight: 1.75, boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.05)' }}
                placeholder="Write in Markdown…"
              />
            )}

            {/* Images */}
            {editImages.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                {editImages.map((img, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img src={img} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10 }} />
                    <button onClick={() => setEditImages(prev => prev.filter((_, j) => j !== i))}
                      style={{ position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: '50%', background: '#ef4444', border: 'none', color: 'white', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                  </div>
                ))}
              </div>
            )}

            {/* + Image */}
            <div style={{ marginTop: 16 }}>
              <button onClick={() => fileRef.current?.click()} style={{
                padding: '9px 18px', borderRadius: 100, border: '1.5px solid rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, color: '#4a4a6a',
              }}>+ Image</button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={addImage} />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
