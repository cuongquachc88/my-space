import { useEffect, useState, useCallback, useRef } from 'react'
import { getDb } from '../../../db'
import { renderMarkdown } from '../../../lib/renderMarkdown'
import { safeHtml } from '../../../lib/safeHtml'
import { ACCENT } from '../../../design/tokens'
import { IconNotes, IconTrash } from '../../../design/icons'
import TagInput from '../../components/TagInput'

interface Note { id: string; title: string; content: string; tags: string[]; image_data: string; updated_at: string }
const parseImages = (raw: string) => { try { return JSON.parse(raw ?? '[]') } catch { return [] } }
const accent = ACCENT.notes

type Layout = 'list' | 'card'

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
  const [layout, setLayout] = useState<Layout>('list')

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
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

  function openNote(n: Note) {
    setSelected(n)
    setEditTitle(n.title)
    setEditContent(n.content)
    setEditTags(n.tags ?? [])
    setEditImages(parseImages(n.image_data))
    setPreview(false)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setSelected(null)
  }

  async function create() {
    const db = await getDb()
    const res = await db.query<Note>('INSERT INTO notes (title, content) VALUES ($1, $2) RETURNING *', ['Untitled', ''])
    await load(query, activeTag)
    openNote(res.rows[0])
  }

  async function save() {
    if (!selected) return
    setSaving(true)
    try {
      const db = await getDb()
      await db.query('UPDATE notes SET title=$1, content=$2, tags=$3, image_data=$4, updated_at=now() WHERE id=$5',
        [editTitle, editContent, editTags, JSON.stringify(editImages), selected.id])
      await load(query, activeTag)
      closeModal()
    } catch (e) { console.error('[notes] save failed:', e) }
    finally { setSaving(false) }
  }

  async function remove() {
    if (!selected) return
    const db = await getDb()
    await db.query('DELETE FROM notes WHERE id=$1', [selected.id])
    await load(query, activeTag)
    closeModal()
  }

  async function deleteNote(n: Note) {
    const db = await getDb()
    await db.query('DELETE FROM notes WHERE id=$1', [n.id])
    await load(query, activeTag)
  }

  function addImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setEditImages(prev => [...prev, ev.target!.result as string])
    reader.readAsDataURL(file); e.target.value = ''
  }

  function search(q: string) { setQuery(q); load(q, activeTag) }
  function filterTag(tag: string) { const next = activeTag === tag ? null : tag; setActiveTag(next); load(query, next) }

  const LayoutIcon = ({ mode }: { mode: Layout }) => {
    if (mode === 'list') return (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1" y="2" width="13" height="2.5" rx="1.2" fill="currentColor" opacity=".85"/>
        <rect x="1" y="6.5" width="13" height="2.5" rx="1.2" fill="currentColor" opacity=".55"/>
        <rect x="1" y="11" width="9" height="2.5" rx="1.2" fill="currentColor" opacity=".35"/>
      </svg>
    )
    if (mode === 'card') return (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1" y="1" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity=".85"/>
        <rect x="8.5" y="1" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity=".55"/>
        <rect x="1" y="8.5" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity=".55"/>
        <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity=".35"/>
      </svg>
    )
    return null
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>

      {/* ── Page header toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: `${accent}18`, border: `1.5px solid ${accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconNotes size={20} accent={accent} filled />
          </div>
          <div>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 22, color: '#1a1a2e', letterSpacing: '-0.02em', lineHeight: 1 }}>Notes</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{notes.length} notes</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Layout switcher */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.5)', borderRadius: 10, padding: 3, gap: 1, border: '1px solid rgba(255,255,255,0.7)' }}>
            {(['list','card'] as Layout[]).map(m => (
              <button key={m} onClick={() => setLayout(m)} title={m} style={{
                width: 32, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: layout === m ? '#fff' : 'transparent',
                color: layout === m ? accent : '#94a3b8',
                boxShadow: layout === m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 150ms',
              }}>
                <LayoutIcon mode={m} />
              </button>
            ))}
          </div>
          {/* New button */}
          <button onClick={create} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '9px 18px', borderRadius: 100,
            background: `linear-gradient(135deg, ${accent} 0%, #6366f1 100%)`,
            border: 'none', cursor: 'pointer',
            color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13,
            boxShadow: `0 4px 14px ${accent}40`,
            transition: 'opacity 150ms',
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
            New note
          </button>
        </div>
      </div>

      {/* ── Search bar ── */}
      <div style={{ position: 'relative', marginBottom: allTags.length > 0 ? 8 : 16 }}>
        <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="15" height="15" viewBox="0 0 15 15" fill="none">
          <circle cx="6.5" cy="6.5" r="5" stroke="#94a3b8" strokeWidth="1.5"/>
          <path d="M10.5 10.5L13.5 13.5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input
          value={query}
          onChange={e => search(e.target.value)}
          placeholder="Search notes… (title or content)"
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.65)', border: '1.5px solid rgba(255,255,255,0.8)',
            borderRadius: 12, padding: '11px 14px 11px 40px',
            fontSize: 14, color: '#1a1a2e', fontFamily: 'Inter, sans-serif', outline: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        />
      </div>

      {/* ── Tags row — horizontally scrollable ── */}
      {allTags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10, marginBottom: 8, scrollbarWidth: 'none' }}>
          {allTags.map(tag => (
            <button key={tag} onClick={() => filterTag(tag)} style={{
              padding: '5px 11px', borderRadius: 100, border: 'none', cursor: 'pointer',
              fontSize: 12, fontFamily: 'Inter, sans-serif', flexShrink: 0,
              background: activeTag === tag ? accent : `${accent}14`,
              color: activeTag === tag ? '#fff' : accent,
              transition: 'all 150ms',
            }}>#{tag}</button>
          ))}
        </div>
      )}

      {/* ── Notes list / card / bento ── */}
      {notes.length === 0 && (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: 48, fontFamily: 'Inter, sans-serif', fontSize: 14 }}>
          No notes yet. Click <strong>New note</strong> to get started.
        </div>
      )}

      {layout === 'list' && notes.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.45)', borderRadius: 16, overflow: 'hidden' }}>
          {/* Header row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 100px 44px', gap: 12, padding: '8px 20px', background: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(124,106,247,0.08)' }}>
            {['Title', 'Tags', 'Updated', ''].map(h => (
              <div key={h} style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</div>
            ))}
          </div>
          {notes.map((n, i) => (
            <div key={n.id} onClick={() => openNote(n)} style={{
              display: 'grid', gridTemplateColumns: '1fr 160px 100px 44px', gap: 12,
              padding: '12px 20px', cursor: 'pointer',
              borderTop: i > 0 ? '1px solid rgba(124,106,247,0.06)' : 'none',
              background: 'transparent',
              transition: 'background 120ms',
              alignItems: 'center',
            }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.6)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 14, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title || 'Untitled'}</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', overflow: 'hidden' }}>
                {(n.tags ?? []).slice(0, 3).map(t => (
                  <span key={t} style={{ fontSize: 11, background: `${accent}14`, color: accent, borderRadius: 100, padding: '2px 7px', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>#{t}</span>
                ))}
              </div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#94a3b8' }}>{new Date(n.updated_at).toLocaleDateString()}</div>
              <button onClick={e => { e.stopPropagation(); deleteNote(n) }} style={{
                width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.7,
              }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '1'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '0.7'}>
                <IconTrash size={13} accent="#ef4444" />
              </button>
            </div>
          ))}
        </div>
      )}

      {layout === 'card' && notes.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {notes.map(n => (
            <div key={n.id} onClick={() => openNote(n)} style={{
              background: 'rgba(255,255,255,0.55)', border: '1.5px solid rgba(255,255,255,0.7)',
              borderRadius: 16, padding: '18px 16px', cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
              transition: 'transform 150ms, box-shadow 150ms',
              display: 'flex', flexDirection: 'column', gap: 8, minHeight: 120,
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(124,106,247,0.12)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 10px rgba(0,0,0,0.04)' }}
            >
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 15, color: '#1a1a2e', lineHeight: 1.3 }}>{n.title || 'Untitled'}</div>
              {n.content && <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#4a4a6a', lineHeight: 1.5, flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{n.content.replace(/[#*`>\-_]/g, '').trim()}</div>}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {(n.tags ?? []).slice(0, 2).map(t => (
                    <span key={t} style={{ fontSize: 11, background: `${accent}14`, color: accent, borderRadius: 100, padding: '2px 7px', fontFamily: 'Inter, sans-serif' }}>#{t}</span>
                  ))}
                </div>
                <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'Inter, sans-serif', flexShrink: 0 }}>{new Date(n.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Edit Modal ── */}
      {modalOpen && selected && (
        <div onClick={closeModal} style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(15,15,35,0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32,
          animation: 'fadeIn 120ms ease',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 780, maxHeight: '88vh',
            background: 'rgba(245,246,255,0.97)',
            backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            borderRadius: 24, boxShadow: '0 40px 100px rgba(15,15,35,0.32), 0 8px 24px rgba(15,15,35,0.12)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            animation: 'slideUp 200ms cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            {/* Modal header — colored gradient */}
            <div style={{
              background: `linear-gradient(135deg, ${accent} 0%, #6366f1 100%)`,
              padding: '20px 24px 16px', position: 'relative', overflow: 'hidden', flexShrink: 0,
            }}>
              <div style={{ position: 'absolute', width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', top: -60, right: -30, pointerEvents: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['Edit','Preview'] as const).map(m => (
                    <button key={m} onClick={() => setPreview(m === 'Preview')} style={{
                      padding: '5px 14px', borderRadius: 100, border: 'none', cursor: 'pointer',
                      fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600,
                      background: (m === 'Preview') === preview ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)',
                      color: (m === 'Preview') === preview ? accent : 'rgba(255,255,255,0.85)',
                      transition: 'all 150ms',
                    }}>{m}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button onClick={remove} style={{ width: 32, height: 32, borderRadius: 9, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconTrash size={14} accent="rgba(255,255,255,0.85)" />
                  </button>
                  <button onClick={save} disabled={saving} style={{
                    padding: '7px 20px', borderRadius: 100, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                    background: 'rgba(255,255,255,0.9)', color: accent,
                    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 13,
                    opacity: saving ? 0.7 : 1, transition: 'opacity 150ms',
                  }}>{saving ? 'Saving…' : 'Save'}</button>
                  <button onClick={closeModal} style={{ width: 32, height: 32, borderRadius: 9, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>✕</button>
                </div>
              </div>
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 24, color: '#fff', background: 'transparent', border: 'none', outline: 'none', width: '100%', letterSpacing: '-0.02em', lineHeight: 1.2 }}
                placeholder="Note title"
                autoFocus
              />
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>
                {new Date(selected.updated_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>

            {/* Modal body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <TagInput tags={editTags} onChange={setEditTags} />
              {preview ? (
                <div className="prose" style={{ minHeight: 200 }} dangerouslySetInnerHTML={{ __html: safeHtml(renderMarkdown(editContent)) }} />
              ) : (
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#1a1a2e', background: 'rgba(255,255,255,0.6)', border: '1.5px solid rgba(255,255,255,0.7)', borderRadius: 14, padding: '14px 12px', minHeight: 280, resize: 'vertical', outline: 'none', width: '100%', boxSizing: 'border-box', lineHeight: 1.75 }}
                  placeholder="Write in Markdown…"
                />
              )}
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
                alignSelf: 'flex-start', padding: '7px 16px', borderRadius: 100, border: '1.5px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: '#4a4a6a',
              }}>+ Image</button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={addImage} />
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
