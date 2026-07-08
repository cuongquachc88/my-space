import type { Note } from '../../shared/messages'

interface Props {
  note: Note
  active: boolean
  onClick: () => void
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(iso).toLocaleDateString()
}

export function NoteCard({ note, active, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl p-3 transition-all duration-150"
      style={{
        background: active ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
        border: active ? '1px solid rgba(129,140,248,0.4)' : '1px solid rgba(255,255,255,0.07)',
        boxShadow: active ? '0 4px 20px rgba(99,102,241,0.15)' : 'none',
      }}
    >
      <div className="flex justify-between items-start gap-2">
        <span className="text-sm font-semibold truncate" style={{ color: 'rgba(255,255,255,0.87)' }}>
          {note.title || 'Untitled'}
        </span>
        <span className="text-xs shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }}>
          {relativeTime(note.updated_at)}
        </span>
      </div>
      {note.content && (
        <p className="text-xs mt-1 line-clamp-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {note.content}
        </p>
      )}
    </button>
  )
}
