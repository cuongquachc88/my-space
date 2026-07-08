import { useEffect, useState, useCallback, useRef } from 'react'
import type { Note } from '../../shared/messages'
import { NoteCard } from '../components/NoteCard'
import { TagInput } from '../components/TagInput'
import { renderMarkdown } from '../../lib/renderMarkdown'

interface Props {
  sendMsg: (type: string, payload?: unknown) => Promise<{ ok: boolean; data?: unknown; error?: string }>
}

function parseImages(raw: string | undefined): string[] {
  try { return JSON.parse(raw ?? '[]') } catch { return [] }
}

export function NotesView({ sendMsg }: Props) {
  const [notes, setNotes] = useState<Note[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Note | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editTags, setEditTags] = useState<string[]>([])
  const [editImages, setEditImages] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async (q = '', tag?: string | null) => {
    const payload: Record<string, string> = {}
    if (q) payload.query = q
    if (tag) payload.tag = tag
    const res = await sendMsg('NOTES_LIST', Object.keys(payload).length ? payload : undefined)
    if (res.ok) setNotes(res.data as Note[])
  }, [sendMsg])

  const loadTags = useCallback(async () => {
    const res = await sendMsg('NOTES_TAGS')
    if (res.ok) setAllTags(res.data as string[])
  }, [sendMsg])

  useEffect(() => { load(); loadTags() }, [load, loadTags])

  function selectNote(note: Note) {
    setSelected(note)
    setEditTitle(note.title)
    setEditContent(note.content)
    setEditTags(note.tags ?? [])
    setEditImages(parseImages(note.image_data))
    setPreviewMode(false)
  }

  async function save(overrides?: { tags?: string[]; images?: string[] }) {
    if (!selected) return
    setSaving(true)
    try {
      const tags = overrides?.tags ?? editTags
      const images = overrides?.images ?? editImages
      await sendMsg('NOTES_UPDATE', {
        id: selected.id,
        title: editTitle,
        content: editContent,
        tags,
        image_data: JSON.stringify(images),
      })
      await load(query, activeTag)
      await loadTags()
    } finally {
      setSaving(false)
    }
  }

  async function createNote() {
    const res = await sendMsg('NOTES_CREATE', { title: 'New note', content: '', tags: [], image_data: '[]' })
    if (res.ok) {
      await load(query, activeTag)
      await loadTags()
      selectNote(res.data as Note)
    }
  }

  async function deleteNote(id: string) {
    await sendMsg('NOTES_DELETE', { id })
    setSelected(null)
    setPreviewMode(false)
    await load(query, activeTag)
    await loadTags()
  }

  function selectTag(tag: string) {
    const next = activeTag === tag ? null : tag
    setActiveTag(next)
    load(query, next)
  }

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    const readers = files.map(file => new Promise<string>(resolve => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(file)
    }))
    Promise.all(readers).then(dataUrls => {
      const next = [...editImages, ...dataUrls]
      setEditImages(next)
      save({ images: next })
    })
    // Reset input so same file can be picked again
    e.target.value = ''
  }

  function removeImage(idx: number) {
    const next = editImages.filter((_, i) => i !== idx)
    setEditImages(next)
    save({ images: next })
  }

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* List pane */}
      <div className="flex flex-col shrink-0 border-r p-2 gap-2 overflow-y-auto"
        style={{ width: '38%', minWidth: '120px', maxWidth: '200px', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2 rounded-[10px] px-2 py-1.5"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <svg width="10" height="10" viewBox="0 0 20 20" fill="none">
            <circle cx="8" cy="8" r="5" stroke="rgba(255,255,255,0.35)" strokeWidth="1.6"/>
            <line x1="12" y1="12" x2="17" y2="17" stroke="rgba(255,255,255,0.35)" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          <input className="bg-transparent text-xs outline-none flex-1" style={{ color: 'rgba(255,255,255,0.6)' }}
            placeholder="Search..." value={query}
            onChange={e => { setQuery(e.target.value); load(e.target.value, activeTag) }} />
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-xs tracking-widest uppercase px-1" style={{ color: 'rgba(255,255,255,0.2)', fontSize: '9px' }}>Tags</span>
            <div className="flex flex-wrap gap-1">
              {allTags.map(t => (
                <button key={t} onClick={() => selectTag(t)}
                  className="px-2 py-0.5 rounded-full text-xs"
                  style={activeTag === t
                    ? { background: '#818cf822', border: '1px solid #818cf844', color: '#818cf8' }
                    : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center px-1">
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>Notes</span>
          <button onClick={createNote} className="text-xs font-semibold px-2 py-1 rounded-md"
            style={{ background: 'linear-gradient(135deg,#818cf8,#6366f1)', color: 'white' }}>+</button>
        </div>

        {activeTag ? (
          notes.map(n => (
            <NoteCard key={n.id} note={n} active={selected?.id === n.id} onClick={() => selectNote(n)} />
          ))
        ) : (
          (() => {
            const grouped: Record<string, Note[]> = {}
            const untagged: Note[] = []
            for (const n of notes) {
              if (n.tags?.length) {
                const t = n.tags[0]
                grouped[t] = grouped[t] ?? []
                grouped[t].push(n)
              } else {
                untagged.push(n)
              }
            }
            return (
              <>
                {Object.entries(grouped).map(([tag, ns]) => (
                  <div key={tag} className="flex flex-col gap-1">
                    <span className="text-xs px-1" style={{ color: '#818cf8', fontSize: '10px' }}>#{tag}</span>
                    {ns.map(n => <NoteCard key={n.id} note={n} active={selected?.id === n.id} onClick={() => selectNote(n)} />)}
                  </div>
                ))}
                {untagged.map(n => <NoteCard key={n.id} note={n} active={selected?.id === n.id} onClick={() => selectNote(n)} />)}
              </>
            )
          })()
        )}

        {notes.length === 0 && (
          <p className="text-xs text-center py-8" style={{ color: 'rgba(255,255,255,0.2)' }}>No notes yet</p>
        )}
      </div>

      {/* Editor pane */}
      {selected ? (
        <div className="flex flex-col flex-1 p-3 gap-2 overflow-hidden">
          {/* Title row + preview toggle */}
          <div className="flex items-center gap-2">
            <input className="bg-transparent text-sm font-semibold outline-none flex-1"
              style={{ color: 'rgba(255,255,255,0.87)' }}
              value={editTitle} onChange={e => setEditTitle(e.target.value)}
              onBlur={() => save()} placeholder="Title" />
            <button
              onClick={() => setPreviewMode(p => !p)}
              className="text-xs px-2 py-1 rounded-md shrink-0"
              style={previewMode
                ? { background: 'rgba(129,140,248,0.15)', border: '1px solid rgba(129,140,248,0.3)', color: '#818cf8' }
                : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}
            >
              {previewMode ? 'Edit' : 'Preview'}
            </button>
          </div>

          <div className="rounded-lg px-2 py-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <TagInput tags={editTags} accent="#818cf8"
              onChange={tags => { setEditTags(tags); save({ tags }) }} />
          </div>

          {/* Image toolbar */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-md"
              style={{ background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.25)', color: '#818cf8' }}
            >
              <svg width="11" height="11" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.6"/>
                <circle cx="7" cy="9" r="1.5" fill="currentColor"/>
                <path d="M2 14l4-4 3 3 3-3 6 6" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
              </svg>
              Add image
            </button>
            {editImages.length > 0 && (
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {editImages.length} image{editImages.length > 1 ? 's' : ''}
              </span>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImagePick}
            />
          </div>

          {/* Image strip */}
          {editImages.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {editImages.map((src, idx) => (
                <div key={idx} className="relative shrink-0">
                  <img
                    src={src}
                    alt=""
                    style={{
                      width: 64, height: 64,
                      objectFit: 'cover',
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  />
                  <button
                    onClick={() => removeImage(idx)}
                    style={{
                      position: 'absolute', top: 2, right: 2,
                      width: 16, height: 16,
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.75)',
                      color: 'white',
                      fontSize: 10,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: 'none', cursor: 'pointer',
                      lineHeight: 1,
                    }}
                  >×</button>
                </div>
              ))}
            </div>
          )}

          {previewMode ? (
            <div
              className="flex-1 overflow-y-auto text-xs leading-relaxed prose-dark"
              style={{ color: 'rgba(255,255,255,0.7)' }}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(editContent || '_Nothing to preview_') }}
            />
          ) : (
            <textarea className="flex-1 bg-transparent text-xs outline-none resize-none leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.55)' }}
              value={editContent} onChange={e => setEditContent(e.target.value)}
              onBlur={() => save()} placeholder="Start writing... (supports Markdown)" />
          )}

          <div className="flex justify-between items-center">
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
              {saving ? 'Saving...' : 'Auto-saved'}
            </span>
            <button onClick={() => deleteNote(selected.id)} className="text-xs px-2 py-1 rounded-md"
              style={{ color: 'rgba(239,68,68,0.7)', border: '1px solid rgba(239,68,68,0.2)' }}>
              Delete
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>Select a note</p>
        </div>
      )}
    </div>
  )
}
