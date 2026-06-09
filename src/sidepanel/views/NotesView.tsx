import { useEffect, useState, useCallback } from 'react'
import type { Note } from '../../shared/messages'
import { NoteCard } from '../components/NoteCard'

interface Props {
  sendMsg: (type: string, payload?: unknown) => Promise<{ ok: boolean; data?: unknown; error?: string }>
}

export function NotesView({ sendMsg }: Props) {
  const [notes, setNotes] = useState<Note[]>([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Note | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async (q = '') => {
    const res = await sendMsg('NOTES_LIST', q ? { query: q } : undefined)
    if (res.ok) setNotes(res.data as Note[])
  }, [sendMsg])

  useEffect(() => { load() }, [load])

  function selectNote(note: Note) {
    setSelected(note)
    setEditTitle(note.title)
    setEditContent(note.content)
  }

  async function save() {
    if (!selected) return
    setSaving(true)
    await sendMsg('NOTES_UPDATE', { id: selected.id, title: editTitle, content: editContent })
    await load(query)
    setSaving(false)
  }

  async function createNote() {
    const res = await sendMsg('NOTES_CREATE', { title: 'New note', content: '' })
    if (res.ok) {
      await load(query)
      selectNote(res.data as Note)
    }
  }

  async function deleteNote(id: string) {
    await sendMsg('NOTES_DELETE', { id })
    setSelected(null)
    await load(query)
  }

  return (
    <div className="flex h-screen">
      {/* List pane */}
      <div className="flex flex-col w-44 shrink-0 border-r p-2 gap-2 overflow-y-auto"
        style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        {/* Search */}
        <div className="flex items-center gap-2 rounded-[10px] px-3 py-2"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
            <circle cx="8" cy="8" r="5" stroke="rgba(255,255,255,0.35)" strokeWidth="1.6"/>
            <line x1="12" y1="12" x2="17" y2="17" stroke="rgba(255,255,255,0.35)" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          <input
            className="bg-transparent text-xs outline-none flex-1"
            style={{ color: 'rgba(255,255,255,0.6)' }}
            placeholder="Search notes..."
            value={query}
            onChange={e => { setQuery(e.target.value); load(e.target.value) }}
          />
        </div>
        {/* Header */}
        <div className="flex justify-between items-center px-1">
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Notes
          </span>
          <button onClick={createNote}
            className="text-xs font-semibold px-2 py-1 rounded-md"
            style={{ background: 'linear-gradient(135deg,#818cf8,#6366f1)', color: 'white' }}>
            + New
          </button>
        </div>
        {/* Cards */}
        {notes.map(n => (
          <NoteCard key={n.id} note={n} active={selected?.id === n.id} onClick={() => selectNote(n)} />
        ))}
        {notes.length === 0 && (
          <p className="text-xs text-center py-8" style={{ color: 'rgba(255,255,255,0.2)' }}>No notes yet</p>
        )}
      </div>

      {/* Editor pane */}
      {selected ? (
        <div className="flex flex-col flex-1 p-3 gap-2 overflow-hidden">
          <input
            className="bg-transparent text-sm font-semibold outline-none"
            style={{ color: 'rgba(255,255,255,0.87)' }}
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onBlur={save}
            placeholder="Title"
          />
          <textarea
            className="flex-1 bg-transparent text-xs outline-none resize-none leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.55)' }}
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            onBlur={save}
            placeholder="Start writing..."
          />
          <div className="flex justify-between items-center">
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
              {saving ? 'Saving...' : 'Auto-saved'}
            </span>
            <button onClick={() => deleteNote(selected.id)}
              className="text-xs px-2 py-1 rounded-md"
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
