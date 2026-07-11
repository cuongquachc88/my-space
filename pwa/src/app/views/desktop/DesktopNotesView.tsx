import { useEffect, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { getDb } from '../../../db'
import { renderMarkdown } from '../../../lib/renderMarkdown'
import { safeHtml } from '../../../lib/safeHtml'
import { ACCENT } from '../../../design/tokens'
import { IconNotes, IconTrash } from '../../../design/icons'
import TagInput from '../../components/TagInput'

interface Note { id: string; title: string; content: string; tags: string[]; image_data: string; updated_at: string }
const parseImages = (raw: string) => { try { return JSON.parse(raw ?? '[]') } catch { return [] } }
const accent = ACCENT.notes

const NOTE_PALETTE = ['#6366f1','#f43f5e','#f59e0b','#10b981','#fb923c','#06b6d4','#8b5cf6','#ec4899','#3b82f6','#84cc16']
function noteColor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0
  return NOTE_PALETTE[Math.abs(h) % NOTE_PALETTE.length]
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.6)', border: '1.5px solid rgba(255,255,255,0.7)',
  borderRadius: 12, padding: '10px 14px', fontSize: 14, color: '#1a1a2e',
  fontFamily: 'Inter, sans-serif', outline: 'none',
  transition: 'border-color 150ms',
}

export default function DesktopNotesView() {
  const [notes, setNotes] = useState<Note[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const [selected, setSelected] = useState<Note | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editTags, setEditTags] = useState<string[]>([])
  const [editImages, setEditImages] = useState<string[]>([])
  const [editOpen, setEditOpen] = useState(false)
  const [newNoteOpen, setNewNoteOpen] = useState(false)
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
  }

  function openNewNote() {
    setEditTitle('')
    setEditContent('')
    setEditTags([])
    setEditImages([])
    setNewNoteOpen(true)
  }

  async function createNote() {
    setSaving(true)
    try {
      const db = await getDb()
      const res = await db.query<Note>(
        'INSERT INTO notes (title, content, tags, image_data) VALUES ($1, $2, $3, $4) RETURNING *',
        [editTitle || 'Untitled', editContent, editTags, JSON.stringify(editImages)]
      )
      await load(query, activeTag)
      openNote(res.rows[0])
      setNewNoteOpen(false)
    } catch (e) { console.error('[notes] create failed:', e) }
    finally { setSaving(false) }
  }

  async function save() {
    if (!selected) return
    setSaving(true)
    try {
      const db = await getDb()
      await db.query('UPDATE notes SET title=$1, content=$2, tags=$3, image_data=$4, updated_at=now() WHERE id=$5',
        [editTitle, editContent, editTags, JSON.stringify(editImages), selected.id])
      await load(query, activeTag)
      // Refresh selected with updated data
      setSelected(s => s ? { ...s, title: editTitle, content: editContent, tags: editTags, image_data: JSON.stringify(editImages) } : s)
    } catch (e) { console.error('[notes] save failed:', e) }
    finally { setSaving(false) }
  }

  async function remove() {
    if (!selected) return
    const db = await getDb()
    await db.query('DELETE FROM notes WHERE id=$1', [selected.id])
    setSelected(null)
    await load(query, activeTag)
  }

  async function deleteNote(n: Note) {
    const db = await getDb()
    await db.query('DELETE FROM notes WHERE id=$1', [n.id])
    if (selected?.id === n.id) setSelected(null)
    await load(query, activeTag)
  }

  function addImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setEditImages(prev => [...prev, ev.target!.result as string])
    reader.readAsDataURL(file); e.target.value = ''
  }

  function filterTag(tag: string) { const next = activeTag === tag ? null : tag; setActiveTag(next); load(query, next) }

  const selectedColor = selected ? noteColor(selected.id) : accent

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: `${accent}18`, border: `1.5px solid ${accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconNotes size={20} accent={accent} filled />
          </div>
          <div>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 22, color: '#1a1a2e', letterSpacing: '-0.02em', lineHeight: 1 }}>Notes</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{notes.length} notes</div>
          </div>
        </div>
        <button onClick={openNewNote} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '9px 18px', borderRadius: 100,
          background: `linear-gradient(135deg, ${accent} 0%, #6366f1 60%, #818cf8 100%)`,
          border: 'none', cursor: 'pointer',
          color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13,
          boxShadow: `0 4px 14px ${accent}40`,
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
          New note
        </button>
      </div>

      {/* ── 2-column layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '264px 1fr', gap: 12, alignItems: 'stretch', height: 'calc(100vh - 180px)' }}>

        {/* ── Col 1: Sidebar — full height ── */}
        <div style={{ background: 'rgba(255,255,255,0.45)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.7)', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {/* Retro hatch texture */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.035, pointerEvents: 'none', zIndex: 0 }} xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="hatch-s" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M-1 1l2-2M0 8l8-8M7 9l2-2" stroke={accent} strokeWidth="1"/></pattern></defs>
            <rect width="100%" height="100%" fill="url(#hatch-s)" />
          </svg>

          {/* Search */}
          <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid rgba(124,106,247,0.06)', flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="13" height="13" viewBox="0 0 15 15" fill="none">
                <circle cx="6.5" cy="6.5" r="5" stroke="#94a3b8" strokeWidth="1.5"/>
                <path d="M10.5 10.5L13.5 13.5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                value={query}
                onChange={e => { setQuery(e.target.value); load(e.target.value, activeTag) }}
                placeholder="Search…"
                style={{ ...inputStyle, padding: '8px 10px 8px 30px', fontSize: 13, borderRadius: 10 }}
              />
            </div>
          </div>

          {/* Tags */}
          {allTags.length > 0 && (
            <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(124,106,247,0.06)', display: 'flex', gap: 5, flexWrap: 'wrap', flexShrink: 0 }}>
              {allTags.map(tag => (
                <button key={tag} onClick={() => filterTag(tag)} style={{
                  padding: '3px 9px', borderRadius: 100, border: 'none', cursor: 'pointer',
                  fontSize: 11, fontFamily: 'Inter, sans-serif',
                  background: activeTag === tag ? accent : `${accent}14`,
                  color: activeTag === tag ? '#fff' : accent,
                  transition: 'all 150ms',
                }}>#{tag}</button>
              ))}
            </div>
          )}

          {/* Note list — fixed height, scrolls when overflow */}
          <div style={{ overflowY: 'auto', height: 0, flex: 1, padding: '4px 0' }}>
            {notes.length === 0 && (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: 32, fontFamily: 'Inter, sans-serif', fontSize: 13 }}>No notes yet</div>
            )}
            {notes.map(n => {
              const nc = noteColor(n.id)
              return (
              <div key={n.id}
                onClick={() => openNote(n)}
                style={{
                  padding: '10px 12px', cursor: 'pointer', margin: '2px 0',
                  background: selected?.id === n.id
                    ? `linear-gradient(135deg, ${nc}28 0%, #6366f118 100%)`
                    : 'transparent',
                  transition: 'background 120ms',
                  position: 'relative',
                  borderLeft: selected?.id === n.id ? `2px solid ${nc}` : '2px solid transparent',
                }}
                onMouseEnter={e => { if (selected?.id !== n.id) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.5)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = selected?.id === n.id ? `linear-gradient(135deg, ${nc}28 0%, #6366f118 100%)` : 'transparent' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 1 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: nc, flexShrink: 0 }} />
                      <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title || 'Untitled'}</span>
                    </div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{new Date(n.updated_at).toLocaleDateString()}</div>
                    {(n.tags ?? []).length > 0 && (
                      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 4 }}>
                        {(n.tags ?? []).slice(0, 3).map(t => (
                          <span key={t} style={{ fontSize: 10, color: nc, background: `${nc}14`, borderRadius: 100, padding: '1px 6px', fontFamily: 'Inter, sans-serif' }}>#{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={e => { e.stopPropagation(); deleteNote(n) }} style={{
                    flexShrink: 0, width: 22, height: 22, borderRadius: 7, border: 'none', cursor: 'pointer',
                    background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5,
                  }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '0.5'}
                  >
                    <IconTrash size={11} accent="#ef4444" />
                  </button>
                </div>
              </div>
              )
            })}
          </div>
        </div>

        {/* ── Col 2: Preview panel ── */}
        <div style={{ background: 'rgba(255,255,255,0.45)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.7)', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {/* Retro hatch texture */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.025, pointerEvents: 'none', zIndex: 0 }} xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="hatch-p" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M-1 1l2-2M0 8l8-8M7 9l2-2" stroke={accent} strokeWidth="1"/></pattern></defs>
            <rect width="100%" height="100%" fill="url(#hatch-p)" />
          </svg>
          {!selected ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, flex: 1, padding: 40 }}>
              <div style={{ fontSize: 36, opacity: 0.15 }}>📝</div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#94a3b8' }}>Select a note to view</div>
            </div>
          ) : (
            <>
              {/* Preview toolbar — uses note's own color */}
              <div style={{
                background: `linear-gradient(135deg, ${selectedColor} 0%, #6366f1 60%, #818cf8 100%)`,
                padding: '10px 16px', position: 'relative', overflow: 'hidden', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', top: -50, right: -20, pointerEvents: 'none' }} />
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Preview</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button onClick={remove} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconTrash size={13} accent="rgba(255,255,255,0.85)" />
                  </button>
                  <button onClick={() => setEditOpen(true)} style={{
                    padding: '6px 18px', borderRadius: 100, border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(230,225,255,0.95) 100%)',
                    color: selectedColor, fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 13,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                  }}>Edit</button>
                </div>
              </div>

              {/* Title + meta + tags */}
              <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid rgba(124,106,247,0.08)', flexShrink: 0 }}>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 24, color: '#1a1a2e', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  {selected.title || 'Untitled'}
                </div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#94a3b8', marginTop: 5 }}>
                  {new Date(selected.updated_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                {(selected.tags ?? []).length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                    {(selected.tags ?? []).map(t => (
                      <span key={t} style={{ fontSize: 11, color: selectedColor, background: `${selectedColor}14`, borderRadius: 100, padding: '2px 8px', fontFamily: 'Inter, sans-serif' }}>#{t}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Markdown preview body */}
              <div style={{ overflowY: 'auto', flex: 1, padding: '16px 20px 24px' }}>
                {selected.content
                  ? <div className="prose" dangerouslySetInnerHTML={{ __html: safeHtml(renderMarkdown(selected.content)) }} />
                  : <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#94a3b8', fontStyle: 'italic' }}>No content yet. Click Edit to start writing.</div>
                }
                {parseImages(selected.image_data).length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
                    {parseImages(selected.image_data).map((img: string, i: number) => (
                      <img key={i} src={img} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10 }} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Edit modal ── */}
      {editOpen && selected && createPortal(
        <div
          onClick={e => { if (e.target === e.currentTarget) setEditOpen(false) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(20,20,40,0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div style={{
            width: '62vw', maxWidth: 740, maxHeight: '85vh',
            background: 'linear-gradient(160deg, #f4f3ff 0%, #eef0ff 100%)',
            borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: '0 32px 80px rgba(0,0,0,0.28)',
          }}>
            {/* Modal header — note's own color */}
            <div style={{
              background: `linear-gradient(135deg, ${selectedColor} 0%, #6366f1 60%, #818cf8 100%)`,
              padding: '14px 18px 18px', flexShrink: 0,
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', top: -60, right: -30, pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', bottom: -20, left: 20, pointerEvents: 'none' }} />
              {/* Nav row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, position: 'relative' }}>
                <button onClick={() => setEditOpen(false)} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600,
                  color: 'rgba(255,255,255,0.85)', padding: 0,
                }}>
                  <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M6 1L1 6L6 11" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Cancel
                </button>
                <button onClick={async () => { await save(); setEditOpen(false) }} disabled={saving} style={{
                  padding: '6px 18px', borderRadius: 100, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(230,225,255,0.95) 100%)',
                  color: selectedColor, fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 13,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)', opacity: saving ? 0.7 : 1,
                }}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
              {/* Title input in header */}
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                style={{
                  fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 22,
                  color: '#fff', background: 'transparent', border: 'none', outline: 'none',
                  width: '100%', letterSpacing: '-0.02em', lineHeight: 1.2, padding: 0,
                  position: 'relative',
                }}
                placeholder="Note title"
              />
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4, position: 'relative' }}>
                {new Date(selected.updated_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>

            {/* Modal body */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '16px 22px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <TagInput tags={editTags} onChange={setEditTags} />
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                autoFocus
                style={{
                  fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#1a1a2e',
                  background: 'rgba(255,255,255,0.65)', border: '1.5px solid rgba(255,255,255,0.8)',
                  borderRadius: 14, padding: '14px 12px', minHeight: 280, resize: 'vertical',
                  outline: 'none', width: '100%', boxSizing: 'border-box', lineHeight: 1.75,
                }}
                placeholder="Write in Markdown…"
              />
              {editImages.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {editImages.map((img, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      <img src={img} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10 }} />
                      <button onClick={() => setEditImages(prev => prev.filter((_, j) => j !== i))}
                        style={{ position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: '50%', background: '#ef4444', border: 'none', color: 'white', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => fileRef.current?.click()} style={{
                alignSelf: 'flex-start', padding: '7px 16px', borderRadius: 100,
                border: '1.5px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.6)',
                cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: '#4a4a6a',
              }}>+ Image</button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={addImage} />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── New note modal ── */}
      {newNoteOpen && createPortal(
        <div
          onClick={e => { if (e.target === e.currentTarget) setNewNoteOpen(false) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(20,20,40,0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div style={{
            width: '62vw', maxWidth: 740, maxHeight: '85vh',
            background: 'linear-gradient(160deg, #f4f3ff 0%, #eef0ff 100%)',
            borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: '0 32px 80px rgba(0,0,0,0.28)',
          }}>
            {/* Header */}
            <div style={{
              background: `linear-gradient(135deg, ${accent} 0%, #6366f1 60%, #818cf8 100%)`,
              padding: '14px 18px 18px', flexShrink: 0,
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', top: -60, right: -30, pointerEvents: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, position: 'relative' }}>
                <button onClick={() => setNewNoteOpen(false)} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600,
                  color: 'rgba(255,255,255,0.85)', padding: 0,
                }}>
                  <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M6 1L1 6L6 11" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Cancel
                </button>
                <button onClick={createNote} disabled={saving} style={{
                  padding: '6px 18px', borderRadius: 100, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(230,225,255,0.95) 100%)',
                  color: accent, fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 13,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)', opacity: saving ? 0.7 : 1,
                }}>{saving ? 'Creating…' : 'Create'}</button>
              </div>
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                autoFocus
                style={{
                  fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 22,
                  color: '#fff', background: 'transparent', border: 'none', outline: 'none',
                  width: '100%', letterSpacing: '-0.02em', lineHeight: 1.2, padding: 0, position: 'relative',
                }}
                placeholder="Note title"
              />
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4, position: 'relative' }}>New note</div>
            </div>

            {/* Body */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '16px 22px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <TagInput tags={editTags} onChange={setEditTags} />
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                style={{
                  fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#1a1a2e',
                  background: 'rgba(255,255,255,0.65)', border: '1.5px solid rgba(255,255,255,0.8)',
                  borderRadius: 14, padding: '14px 12px', minHeight: 280, resize: 'vertical',
                  outline: 'none', width: '100%', boxSizing: 'border-box', lineHeight: 1.75,
                }}
                placeholder="Write in Markdown…"
              />
              {editImages.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {editImages.map((img, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      <img src={img} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10 }} />
                      <button onClick={() => setEditImages(prev => prev.filter((_, j) => j !== i))}
                        style={{ position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: '50%', background: '#ef4444', border: 'none', color: 'white', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => fileRef.current?.click()} style={{
                alignSelf: 'flex-start', padding: '7px 16px', borderRadius: 100,
                border: '1.5px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.6)',
                cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: '#4a4a6a',
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
