import { useEffect, useState, useCallback, useRef } from 'react'
import { getDb } from '../../db'
import TagInput from '../components/TagInput'
import { renderMarkdown } from '../../lib/renderMarkdown'
import { safeHtml } from '../../lib/safeHtml'

interface Note { id: string; title: string; content: string; tags: string[]; image_data: string; updated_at: string }
const parseImages = (raw: string) => { try { return JSON.parse(raw ?? '[]') } catch { return [] } }

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
    const db = await getDb()
    const res = await db.query<Note>('INSERT INTO notes (title, content) VALUES ($1, $2) RETURNING *', ['Untitled', ''])
    await load(query, activeTag)
    select(res.rows[0])
  }

  async function save() {
    if (!selected) return
    setSaving(true)
    const db = await getDb()
    await db.query(
      'UPDATE notes SET title=$1, content=$2, tags=$3, image_data=$4, updated_at=now() WHERE id=$5',
      [editTitle, editContent, editTags, JSON.stringify(editImages), selected.id]
    )
    await load(query, activeTag)
    setSaving(false)
  }

  async function remove() {
    if (!selected) return
    const db = await getDb()
    await db.query('DELETE FROM notes WHERE id=$1', [selected.id])
    setSelected(null)
    await load(query, activeTag)
  }

  function addImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setEditImages(prev => [...prev, ev.target!.result as string])
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function search(q: string) { setQuery(q); load(q, activeTag) }
  function filterTag(t: string | null) { setActiveTag(t); load(query, t) }

  if (selected) {
    return (
      <div className="flex flex-col h-full bg-[#0f2020]">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-[#0d1f1f]">
          <button onClick={() => { setSelected(null); load(query, activeTag) }} className="text-white/50 hover:text-white mr-1">←</button>
          <input
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            className="flex-1 bg-transparent font-semibold text-white text-base outline-none placeholder-white/30"
            placeholder="Title"
          />
          <button onClick={() => setPreview(p => !p)} className={`text-xs px-2 py-1 rounded ${preview ? 'bg-[#b4e645] text-[#0f2020]' : 'text-white/50 border border-white/20'}`}>Preview</button>
          <button onClick={save} disabled={saving} className="text-xs bg-[#b4e645] text-[#0f2020] font-semibold px-3 py-1 rounded-full disabled:opacity-50">Save</button>
          <button onClick={remove} className="text-white/30 hover:text-red-400 text-xs px-2">Delete</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {preview ? (
            <div className="prose text-white/90 text-sm" dangerouslySetInnerHTML={{ __html: safeHtml(renderMarkdown(editContent)) }} />
          ) : (
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="flex-1 bg-transparent text-white/90 text-sm resize-none outline-none min-h-[200px] leading-relaxed"
              placeholder="Write in Markdown…"
            />
          )}
          <TagInput tags={editTags} onChange={setEditTags} />
          {editImages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {editImages.map((img, i) => (
                <div key={i} className="relative">
                  <img src={img} className="h-20 rounded-lg object-cover" alt="" />
                  <button onClick={() => setEditImages(imgs => imgs.filter((_, j) => j !== i))} className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 text-xs leading-none">&times;</button>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => fileRef.current?.click()} className="text-xs text-white/40 hover:text-[#b4e645] text-left">+ Add image</button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={addImage} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[#0f2020]">
      <div className="px-4 pt-4 pb-3 border-b border-white/10 bg-[#0d1f1f]">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-bold text-lg">Notes</h1>
          <button onClick={create} className="bg-[#b4e645] text-[#0f2020] font-bold px-4 py-1.5 rounded-full text-sm">+ New</button>
        </div>
        <input
          value={query}
          onChange={e => search(e.target.value)}
          placeholder="Search notes…"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#b4e645]/50"
        />
        {allTags.length > 0 && (
          <div className="flex gap-1.5 mt-2 flex-wrap">
            <button onClick={() => filterTag(null)} className={`text-xs px-2.5 py-1 rounded-full border ${!activeTag ? 'bg-[#b4e645] text-[#0f2020] border-transparent' : 'border-white/20 text-white/50'}`}>All</button>
            {allTags.map(t => (
              <button key={t} onClick={() => filterTag(t)} className={`text-xs px-2.5 py-1 rounded-full border ${activeTag === t ? 'bg-[#b4e645] text-[#0f2020] border-transparent' : 'border-white/20 text-white/50'}`}>{t}</button>
            ))}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {notes.length === 0 ? (
          <div className="text-center text-white/30 py-16 text-sm">No notes yet</div>
        ) : notes.map(n => (
          <button key={n.id} onClick={() => select(n)} className="w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors">
            <div className="font-medium text-sm truncate">{n.title || 'Untitled'}</div>
            <div className="text-white/40 text-xs truncate mt-0.5">{n.content?.slice(0, 80)}</div>
            {n.tags?.length > 0 && (
              <div className="flex gap-1 mt-1">
                {n.tags.slice(0, 3).map(t => <span key={t} className="text-xs text-[#b4e645]/70">#{t}</span>)}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
