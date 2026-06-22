import { useState, useEffect, useCallback } from 'react'
import type { TodoList, TodoTask } from '../../shared/messages'
import { IconPicker } from '../components/IconPicker'
import { PixelIcon } from '../components/icons'

interface Props {
  sendMsg: (type: string, payload?: unknown) => Promise<{ ok: boolean; data?: unknown; error?: string }>
}

type Priority = 'low' | 'medium' | 'high'
type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly'
type GroupMode = 'list' | 'date'

const LIST_COLORS = ['#38bdf8', '#818cf8', '#34d399', '#fb923c', '#f472b6', '#facc15', '#f87171', '#a78bfa']

const PRIORITY_COLOR: Record<Priority, string> = {
  low: '#34d399', medium: '#facc15', high: '#f87171',
}

const RECURRENCE_LABEL: Record<Recurrence, string> = {
  none: '—', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly',
}

const DATE_GROUP_ORDER = ['Overdue', 'Today', 'Tomorrow', 'This week', 'This month', 'Later', 'No due date']

function nextDueDate(due: string, rec: Recurrence): string {
  const d = new Date(due)
  if (rec === 'daily')   d.setDate(d.getDate() + 1)
  if (rec === 'weekly')  d.setDate(d.getDate() + 7)
  if (rec === 'monthly') d.setMonth(d.getMonth() + 1)
  return d.toISOString().slice(0, 10)
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff === 0)  return 'Today'
  if (diff === 1)  return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff < 0)   return `${Math.abs(diff)}d overdue`
  if (diff <= 7)  return `In ${diff}d`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function dueDateColor(iso: string | null): string {
  if (!iso) return 'rgba(255,255,255,0.3)'
  const d = new Date(iso + 'T00:00:00')
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff < 0)  return '#f87171'
  if (diff <= 1) return '#fb923c'
  if (diff <= 3) return '#facc15'
  return 'rgba(255,255,255,0.35)'
}

function dateGroupLabel(iso: string | null): string {
  if (!iso) return 'No due date'
  const d = new Date(iso + 'T00:00:00')
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff < 0)   return 'Overdue'
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff <= 7)  return 'This week'
  if (diff <= 30) return 'This month'
  return 'Later'
}

// ── Task row ─────────────────────────────────────────────────────────────────
function TaskRow({ task, accentColor, onToggle, onDelete, onUpdate }: {
  task: TodoTask
  accentColor: string
  onToggle: () => void
  onDelete: () => void
  onUpdate: (fields: Partial<TodoTask>) => void
}) {
  const [editing, setEditing]       = useState(false)
  const [expanded, setExpanded]     = useState(false)
  const [title, setTitle]           = useState(task.title)
  const [note, setNote]             = useState(task.note)
  const [priority, setPriority]     = useState<Priority>(task.priority)
  const [dueDate, setDueDate]       = useState(task.due_date ?? '')
  const [recurrence, setRecurrence] = useState<Recurrence>(task.recurrence)

  function save() {
    onUpdate({ title, note, priority, due_date: dueDate || null, recurrence })
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="rounded-[10px] p-3 flex flex-col gap-2 mb-1" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}>
        <input className="w-full rounded-[8px] px-2 py-1.5 text-xs outline-none"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}
          value={title} onChange={e => setTitle(e.target.value)} autoFocus />
        <textarea className="w-full rounded-[8px] px-2 py-1.5 text-xs outline-none resize-none"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}
          rows={2} placeholder="Note…" value={note} onChange={e => setNote(e.target.value)} />
        <div className="flex gap-1">
          {(['low', 'medium', 'high'] as Priority[]).map(p => (
            <button key={p} onClick={() => setPriority(p)}
              className="text-[10px] px-2 py-0.5 rounded-[5px] capitalize"
              style={{ background: priority === p ? `${PRIORITY_COLOR[p]}33` : 'rgba(255,255,255,0.06)', color: priority === p ? PRIORITY_COLOR[p] : 'rgba(255,255,255,0.4)', border: `1px solid ${priority === p ? PRIORITY_COLOR[p] + '55' : 'transparent'}` }}>
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
            className="text-xs rounded-[6px] px-2 py-1 outline-none flex-1"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', colorScheme: 'dark' }} />
          <select value={recurrence} onChange={e => setRecurrence(e.target.value as Recurrence)}
            className="text-xs rounded-[6px] px-2 py-1 outline-none"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}>
            {(['none', 'daily', 'weekly', 'monthly'] as Recurrence[]).map(r => (
              <option key={r} value={r}>{RECURRENCE_LABEL[r]}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setEditing(false)} className="text-xs px-2 py-1 rounded-[6px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Cancel</button>
          <button onClick={save} className="text-xs px-2 py-1 rounded-[6px] font-semibold" style={{ background: accentColor, color: '#0f172a' }}>Save</button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-[10px] mb-1 overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)', opacity: task.done ? 0.5 : 1 }}>
      {/* Main row — click body to expand actions */}
      <div className="flex items-center gap-2.5 px-3 py-2 cursor-pointer"
        onClick={() => setExpanded(v => !v)}>
        <button onClick={e => { e.stopPropagation(); onToggle() }}
          className="w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all"
          style={{ borderColor: task.done ? accentColor : 'rgba(255,255,255,0.2)', background: task.done ? accentColor : 'transparent' }}>
          {task.done && (
            <svg width="8" height="8" viewBox="0 0 8 8">
              <polyline points="1.5,4 3,5.5 6.5,2" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs leading-4" style={{ color: 'rgba(255,255,255,0.85)', textDecoration: task.done ? 'line-through' : 'none' }}>{task.title}</p>
          <div className="flex gap-2 items-center flex-wrap mt-0.5">
            <span className="text-[9px] px-1.5 rounded-full capitalize"
              style={{ background: `${PRIORITY_COLOR[task.priority]}22`, color: PRIORITY_COLOR[task.priority] }}>
              {task.priority}
            </span>
            {task.due_date && (
              <span className="text-[9px]" style={{ color: dueDateColor(task.due_date) }}>{formatDate(task.due_date)}</span>
            )}
            {task.recurrence !== 'none' && (
              <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>↻ {RECURRENCE_LABEL[task.recurrence]}</span>
            )}
          </div>
        </div>
        <span className="text-[10px] transition-transform shrink-0" style={{ color: 'rgba(255,255,255,0.2)', transform: expanded ? 'rotate(90deg)' : 'none' }}>›</span>
      </div>
      {/* Expanded action bar */}
      {expanded && !editing && (
        <div className="flex items-center gap-2 px-3 pb-2 pt-0">
          {task.note && <span className="text-[10px] flex-1 truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{task.note}</span>}
          {!task.note && <span className="flex-1" />}
          <button onClick={() => { setEditing(true); setExpanded(false) }}
            className="text-[10px] px-2 py-1 rounded-[6px]"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)' }}>Edit</button>
          <button onClick={onDelete}
            className="text-[10px] px-2 py-1 rounded-[6px]"
            style={{ background: 'rgba(239,68,68,0.12)', color: 'rgba(239,68,68,0.7)' }}>Delete</button>
        </div>
      )}
    </div>
  )
}

// ── Add task inline form ──────────────────────────────────────────────────────
function AddTaskForm({ accentColor, onAdd }: {
  accentColor: string
  onAdd: (t: { title: string; note: string; priority: Priority; due_date: string | null; recurrence: Recurrence }) => void
}) {
  const [open, setOpen]             = useState(false)
  const [title, setTitle]           = useState('')
  const [note, setNote]             = useState('')
  const [priority, setPriority]     = useState<Priority>('medium')
  const [dueDate, setDueDate]       = useState('')
  const [recurrence, setRecurrence] = useState<Recurrence>('none')

  function submit() {
    if (!title.trim()) return
    onAdd({ title: title.trim(), note: note.trim(), priority, due_date: dueDate || null, recurrence })
    setTitle(''); setNote(''); setPriority('medium'); setDueDate(''); setRecurrence('none')
    setOpen(false)
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="w-full text-left text-xs px-3 py-2 rounded-[10px]"
        style={{ color: 'rgba(255,255,255,0.3)', border: '1px dashed rgba(255,255,255,0.1)' }}>
        + Add task…
      </button>
    )
  }

  return (
    <div className="rounded-[10px] p-3 flex flex-col gap-2" style={{ background: `${accentColor}0d`, border: `1px solid ${accentColor}33` }}>
      <input className="w-full rounded-[8px] px-2 py-1.5 text-xs outline-none"
        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}
        placeholder="Task title" value={title} onChange={e => setTitle(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()} autoFocus />
      <textarea className="w-full rounded-[8px] px-2 py-1 text-xs outline-none resize-none"
        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}
        rows={1} placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} />
      <div className="flex gap-1">
        {(['low', 'medium', 'high'] as Priority[]).map(p => (
          <button key={p} onClick={() => setPriority(p)}
            className="text-[10px] px-2 py-0.5 rounded-[5px] capitalize"
            style={{ background: priority === p ? `${PRIORITY_COLOR[p]}33` : 'rgba(255,255,255,0.06)', color: priority === p ? PRIORITY_COLOR[p] : 'rgba(255,255,255,0.4)', border: `1px solid ${priority === p ? PRIORITY_COLOR[p] + '55' : 'transparent'}` }}>
            {p}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
          className="text-xs rounded-[6px] px-2 py-1 outline-none flex-1"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', colorScheme: 'dark' }} />
        <select value={recurrence} onChange={e => setRecurrence(e.target.value as Recurrence)}
          className="text-xs rounded-[6px] px-2 py-1 outline-none"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}>
          {(['none', 'daily', 'weekly', 'monthly'] as Recurrence[]).map(r => (
            <option key={r} value={r}>{RECURRENCE_LABEL[r]}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={() => setOpen(false)} className="text-xs px-2 py-1 rounded-[6px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Cancel</button>
        <button onClick={submit} className="text-xs px-2 py-1 rounded-[6px] font-semibold" style={{ background: accentColor, color: '#0f172a' }}>Add</button>
      </div>
    </div>
  )
}

// ── Task screen (drill-down) ──────────────────────────────────────────────────
function TaskScreen({ list, sendMsg, onBack }: {
  list: TodoList
  sendMsg: Props['sendMsg']
  onBack: () => void
}) {
  const [tasks, setTasks]         = useState<TodoTask[]>([])
  const [groupMode, setGroupMode] = useState<GroupMode>('date')
  const [showDone, setShowDone]   = useState(false)

  const load = useCallback(async () => {
    const res = await sendMsg('TODO_TASKS_LIST', { list_id: list.id })
    if (res.ok) setTasks(res.data as TodoTask[])
  }, [sendMsg, list.id])

  useEffect(() => { load() }, [load])

  async function addTask(fields: { title: string; note: string; priority: Priority; due_date: string | null; recurrence: Recurrence }) {
    await sendMsg('TODO_TASKS_CREATE', { list_id: list.id, ...fields })
    load()
  }

  async function toggleTask(task: TodoTask) {
    if (!task.done && task.recurrence !== 'none' && task.due_date) {
      await sendMsg('TODO_TASKS_UPDATE', { id: task.id, due_date: nextDueDate(task.due_date, task.recurrence) })
    } else {
      await sendMsg('TODO_TASKS_UPDATE', { id: task.id, done: !task.done })
    }
    load()
  }

  async function updateTask(id: string, fields: Partial<TodoTask>) {
    await sendMsg('TODO_TASKS_UPDATE', { id, ...fields })
    load()
  }

  async function deleteTask(id: string) {
    await sendMsg('TODO_TASKS_DELETE', { id })
    load()
  }

  const doneTasks    = tasks.filter(t => t.done)
  const visibleTasks = showDone ? tasks : tasks.filter(t => !t.done)

  function groupByDate(list: TodoTask[]): Record<string, TodoTask[]> {
    const groups: Record<string, TodoTask[]> = {}
    for (const t of list) {
      const label = dateGroupLabel(t.due_date)
      if (!groups[label]) groups[label] = []
      groups[label].push(t)
    }
    return groups
  }

  const grouped = groupByDate(visibleTasks)

  return (
    <div className="flex flex-col h-full" style={{ color: 'white' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <button onClick={onBack} className="text-xs px-2 py-1 rounded-[6px]"
          style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }}>←</button>
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: list.color }} />
        <span className="text-sm font-semibold flex-1 truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>{list.name}</span>
        <button onClick={() => setGroupMode(g => g === 'list' ? 'date' : 'list')}
          className="text-[10px] px-2 py-1 rounded-[6px]"
          style={{ background: groupMode === 'date' ? `${list.color}22` : 'rgba(255,255,255,0.07)', color: groupMode === 'date' ? list.color : 'rgba(255,255,255,0.45)' }}>
          {groupMode === 'list' ? 'By date' : 'By list'}
        </button>
        {doneTasks.length > 0 && (
          <button onClick={() => setShowDone(v => !v)}
            className="text-[10px] px-2 py-1 rounded-[6px]"
            style={{ background: showDone ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.07)', color: showDone ? '#34d399' : 'rgba(255,255,255,0.35)' }}>
            ✓ {doneTasks.length}
          </button>
        )}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {groupMode === 'list' ? (
          <>
            {visibleTasks.map(task => (
              <TaskRow key={task.id} task={task} accentColor={list.color}
                onToggle={() => toggleTask(task)}
                onDelete={() => deleteTask(task.id)}
                onUpdate={fields => updateTask(task.id, fields)} />
            ))}
            {visibleTasks.length === 0 && (
              <p className="text-xs text-center mt-8" style={{ color: 'rgba(255,255,255,0.2)' }}>
                {tasks.length === 0 ? 'No tasks yet' : 'All done!'}
              </p>
            )}
          </>
        ) : (
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
            {DATE_GROUP_ORDER.map(group => {
              const groupTasks = grouped[group]
              if (!groupTasks?.length) return null
              const isOverdue = group === 'Overdue'
              const isToday   = group === 'Today'
              const dotColor  = isOverdue ? '#f87171' : isToday ? list.color : 'rgba(255,255,255,0.2)'
              const labelColor = isOverdue ? '#f87171' : isToday ? list.color : 'rgba(255,255,255,0.4)'
              return (
                <div key={group} className="mb-3">
                  {/* Timeline date header */}
                  <div className="flex items-center gap-2 mb-2 relative">
                    <div className="w-10 flex items-center justify-center shrink-0 z-10">
                      <div className="w-2.5 h-2.5 rounded-full border-2"
                        style={{ background: isToday || isOverdue ? dotColor : '#0d1117', borderColor: dotColor, boxShadow: isToday ? `0 0 6px ${dotColor}88` : 'none' }} />
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ color: labelColor, background: `${dotColor}18`, border: `1px solid ${dotColor}30` }}>
                      {group}
                    </span>
                  </div>
                  {/* Tasks with left offset to align with timeline */}
                  <div className="pl-10">
                    {groupTasks.map(task => (
                      <TaskRow key={task.id} task={task} accentColor={list.color}
                        onToggle={() => toggleTask(task)}
                        onDelete={() => deleteTask(task.id)}
                        onUpdate={fields => updateTask(task.id, fields)} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add task */}
      <div className="px-3 pb-3">
        <AddTaskForm accentColor={list.color} onAdd={addTask} />
      </div>
    </div>
  )
}

// ── Lists screen ──────────────────────────────────────────────────────────────
export function TodoView({ sendMsg }: Props) {
  const [lists, setLists]           = useState<TodoList[]>([])
  const [activeList, setActiveList] = useState<TodoList | null>(null)
  const [creating, setCreating]     = useState(false)
  const [newName, setNewName]       = useState('')
  const [newColor, setNewColor]     = useState(LIST_COLORS[0])
  const [newIcon, setNewIcon]       = useState('inbox')

  const loadLists = useCallback(async () => {
    const res = await sendMsg('TODO_LISTS_LIST')
    if (res.ok) setLists(res.data as TodoList[])
  }, [sendMsg])

  useEffect(() => { loadLists() }, [loadLists])

  if (activeList) {
    return <TaskScreen list={activeList} sendMsg={sendMsg} onBack={() => { setActiveList(null); loadLists() }} />
  }

  async function createList() {
    if (!newName.trim()) return
    const res = await sendMsg('TODO_LISTS_CREATE', { name: newName.trim(), color: newColor, icon: newIcon })
    if (res.ok) {
      setNewName(''); setNewColor(LIST_COLORS[0]); setNewIcon('inbox'); setCreating(false)
      await loadLists()
      setActiveList(res.data as TodoList)
    }
  }

  async function deleteList(id: string) {
    await sendMsg('TODO_LISTS_DELETE', { id })
    loadLists()
  }

  return (
    <div className="flex flex-col h-full" style={{ color: 'white' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>To-Do</span>
        <button onClick={() => setCreating(v => !v)}
          className="text-xs px-2 py-1 rounded-[6px]"
          style={{ background: 'rgba(56,189,248,0.18)', color: '#38bdf8' }}>
          + List
        </button>
      </div>

      {/* New list form */}
      {creating && (
        <div className="mx-3 mt-2 p-3 rounded-[10px] flex flex-col gap-2.5"
          style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)' }}>
          <div className="flex gap-2 items-center">
            <div className="w-9 h-9 flex items-center justify-center rounded-[10px] shrink-0"
              style={{ background: `${newColor}22` }}>
              <PixelIcon id={newIcon} color={newColor} size={20} />
            </div>
            <input className="flex-1 rounded-[8px] px-2 py-1.5 text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}
              placeholder="List name" value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createList()} autoFocus />
          </div>
          <IconPicker value={newIcon} onChange={setNewIcon} accentColor={newColor} />
          <div className="flex items-center gap-2">
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Color</span>
            <div className="flex gap-2 flex-wrap">
              {LIST_COLORS.map(c => (
                <button key={c} onClick={() => setNewColor(c)}
                  className="w-5 h-5 rounded-full transition-all relative flex items-center justify-center shrink-0"
                  style={{ background: c, boxShadow: newColor === c ? `0 0 0 2px #0d1117, 0 0 0 3.5px ${c}` : 'none', transform: newColor === c ? 'scale(1.2)' : 'scale(1)' }}>
                  {newColor === c && <svg width="8" height="8" viewBox="0 0 10 10"><polyline points="2,5 4,7 8,3" stroke="#0d1117" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setCreating(false); setNewIcon('inbox') }} className="text-xs px-3 py-1.5 rounded-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Cancel</button>
            <button onClick={createList} className="text-xs px-3 py-1.5 rounded-[7px] font-semibold" style={{ background: 'rgba(56,189,248,0.12)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.35)' }}>Create</button>
          </div>
        </div>
      )}

      {/* List cards */}
      <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1.5">
        {lists.length === 0 && !creating && (
          <p className="text-xs text-center mt-8" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Create a list to get started
          </p>
        )}
        {lists.map(l => (
          <ListCard
            key={l.id}
            list={l}
            onOpen={() => setActiveList(l)}
            onRename={(name) => sendMsg('TODO_LISTS_UPDATE', { id: l.id, name }).then(() => loadLists())}
            onDelete={() => deleteList(l.id)}
          />
        ))}
      </div>
    </div>
  )
}

function ListCard({ list, onOpen, onRename, onDelete }: {
  list: TodoList
  onOpen: () => void
  onRename: (name: string, icon: string) => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(list.name)
  const [icon, setIcon] = useState(list.icon || 'inbox')

  function commitEdit() {
    if (name.trim()) onRename(name.trim(), icon)
    setEditing(false)
    setExpanded(false)
  }

  return (
    <div className="rounded-[12px] overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
      {editing ? (
        <div className="p-3 flex flex-col gap-2.5">
          <div className="flex gap-2 items-center">
            <div className="w-9 h-9 flex items-center justify-center rounded-[10px] shrink-0"
              style={{ background: `${list.color}22` }}>
              <PixelIcon id={icon} color={list.color} size={20} />
            </div>
            <input className="flex-1 text-sm outline-none bg-transparent font-medium"
              style={{ color: 'white' }}
              value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') { setEditing(false); setName(list.name); setIcon(list.icon || 'inbox') } }}
              autoFocus />
          </div>
          <IconPicker value={icon} onChange={setIcon} accentColor={list.color} />
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setEditing(false); setName(list.name); setIcon(list.icon || 'inbox') }}
              className="text-xs px-2 py-1 rounded-[6px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Cancel</button>
            <button onClick={commitEdit}
              className="text-xs px-3 py-1.5 rounded-[6px] font-semibold"
              style={{ background: 'rgba(56,189,248,0.12)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.35)' }}>Save</button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2.5 px-3 py-2.5">
            <div className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0"
              style={{ background: `${list.color}22` }}>
              <PixelIcon id={list.icon || 'inbox'} color={list.color} size={18} />
            </div>
            <button onClick={onOpen} className="flex-1 text-left min-w-0">
              <span className="text-sm font-medium truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>{list.name}</span>
            </button>
            <button onClick={() => setExpanded(v => !v)}
              className="w-7 h-7 flex items-center justify-center rounded-[7px] shrink-0 transition-all"
              style={{ color: expanded ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)', background: expanded ? 'rgba(255,255,255,0.08)' : 'transparent' }}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                <circle cx="4" cy="10" r="1.6" /><circle cx="10" cy="10" r="1.6" /><circle cx="16" cy="10" r="1.6" />
              </svg>
            </button>
            <button onClick={onOpen} className="w-6 h-6 flex items-center justify-center shrink-0"
              style={{ color: 'rgba(255,255,255,0.2)' }}>
              <span className="text-base">›</span>
            </button>
          </div>
          {expanded && (
            <div className="flex border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <button onClick={() => { setEditing(true); setExpanded(false) }}
                className="flex-1 text-[10px] py-1.5 text-center"
                style={{ color: 'rgba(255,255,255,0.4)' }}>Edit</button>
              <button onClick={onDelete}
                className="flex-1 text-[10px] py-1.5 text-center border-l"
                style={{ borderColor: 'rgba(255,255,255,0.06)', color: 'rgba(239,68,68,0.6)' }}>Delete</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
