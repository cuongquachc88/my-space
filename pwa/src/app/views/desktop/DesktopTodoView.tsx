import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { getDb } from '../../../db'
import { ACCENT } from '../../../design/tokens'
import { IconTodo, IconTrash } from '../../../design/icons'
import TagInput from '../../components/TagInput'

interface TodoList { id: string; name: string; color: string; icon: string }
interface TodoTask { id: string; list_id: string; title: string; note: string; priority: 'low'|'medium'|'high'; due_date: string|null; recurrence: string; done: boolean; tags: string[]; created_at: string }

const COLORS = ['#7c6af7','#6366f1','#3b82f6','#06b6d4','#10b981','#84cc16','#f59e0b','#f97316','#ef4444','#ec4899','#8b5cf6','#d946ef']
const accent = ACCENT.todo

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.6)', border: '1.5px solid rgba(255,255,255,0.7)',
  borderRadius: 12, padding: '10px 14px', fontSize: 14, color: '#1a1a2e',
  fontFamily: 'Inter, sans-serif', outline: 'none',
}

const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' }
const PRIORITY_COLOR = { low: '#94a3b8', medium: '#f59e0b', high: '#ef4444' }
const PRIORITY_BG    = { low: 'rgba(148,163,184,0.12)', medium: 'rgba(245,158,11,0.12)', high: 'rgba(239,68,68,0.12)' }

export default function DesktopTodoView() {
  const [lists, setLists] = useState<TodoList[]>([])
  const [listQuery, setListQuery] = useState('')
  const [activeList, setActiveList] = useState<TodoList | null>(null)
  const [tasks, setTasks] = useState<TodoTask[]>([])
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [allTags, setAllTags] = useState<string[]>([])
  const [newTaskTitle, setNewTaskTitle] = useState('')

  const [showNewList, setShowNewList] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListColor, setNewListColor] = useState(COLORS[0])

  const [showEditList, setShowEditList] = useState(false)
  const [editListName, setEditListName] = useState('')
  const [editListColor, setEditListColor] = useState(COLORS[0])

  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TodoTask | null>(null)
  const [tf, setTf] = useState({ title: '', note: '', priority: 'medium' as 'low'|'medium'|'high', due_date: '', recurrence: 'none', tags: [] as string[] })

  const loadLists = useCallback(async () => {
    const db = await getDb()
    const res = await db.query<TodoList>('SELECT * FROM todo_lists ORDER BY created_at ASC')
    setLists(res.rows)
  }, [])

  const loadTasks = useCallback(async (listId: string, tag?: string | null) => {
    const db = await getDb()
    const res = await db.query<TodoTask>(
      tag
        ? 'SELECT * FROM todo_tasks WHERE list_id=$1 AND $2=ANY(tags) ORDER BY done ASC, created_at DESC'
        : 'SELECT * FROM todo_tasks WHERE list_id=$1 ORDER BY done ASC, created_at DESC',
      tag ? [listId, tag] : [listId]
    )
    setTasks(res.rows)
    setAllTags([...new Set(res.rows.flatMap(t => t.tags ?? []))].sort())
  }, [])

  useEffect(() => { loadLists() }, [loadLists])
  useEffect(() => { if (activeList) loadTasks(activeList.id, activeTag) }, [activeList, activeTag, loadTasks])

  async function createList() {
    if (!newListName.trim()) return
    const db = await getDb()
    await db.query('INSERT INTO todo_lists (name,color) VALUES ($1,$2)', [newListName, newListColor])
    setNewListName(''); setNewListColor(COLORS[0]); setShowNewList(false); await loadLists()
  }

  async function deleteList(id: string) {
    const db = await getDb()
    await db.query('DELETE FROM todo_lists WHERE id=$1', [id])
    setActiveList(null); await loadLists()
  }

  function openEditList() {
    if (!activeList) return
    setEditListName(activeList.name)
    setEditListColor(activeList.color)
    setShowEditList(true)
  }

  async function saveEditList() {
    if (!activeList || !editListName.trim()) return
    const db = await getDb()
    await db.query('UPDATE todo_lists SET name=$1, color=$2 WHERE id=$3', [editListName, editListColor, activeList.id])
    setShowEditList(false)
    await loadLists()
    setActiveList(l => l ? { ...l, name: editListName, color: editListColor } : l)
  }

  async function addTask() {
    if (!newTaskTitle.trim() || !activeList) return
    const db = await getDb()
    await db.query('INSERT INTO todo_tasks (list_id,title,note,priority,due_date,recurrence) VALUES ($1,$2,$3,$4,$5,$6)',
      [activeList.id, newTaskTitle, '', 'medium', null, 'none'])
    setNewTaskTitle(''); await loadTasks(activeList.id, activeTag)
  }

  async function toggleDone(t: TodoTask) {
    const db = await getDb()
    await db.query('UPDATE todo_tasks SET done=$1, updated_at=now() WHERE id=$2', [!t.done, t.id])
    await loadTasks(activeList!.id, activeTag)
  }

  function openEditTask(t: TodoTask) {
    setTf({ title: t.title, note: t.note, priority: t.priority, due_date: t.due_date ?? '', recurrence: t.recurrence, tags: t.tags ?? [] })
    setEditingTask(t)
    setTaskModalOpen(true)
  }

  async function saveTask() {
    if (!editingTask) return
    const db = await getDb()
    await db.query('UPDATE todo_tasks SET title=$1,note=$2,priority=$3,due_date=$4,recurrence=$5,tags=$6,updated_at=now() WHERE id=$7',
      [tf.title, tf.note, tf.priority, tf.due_date || null, tf.recurrence, tf.tags, editingTask.id])
    await loadTasks(activeList!.id, activeTag)
    setTaskModalOpen(false)
    setEditingTask(null)
  }

  async function deleteTask(id: string) {
    const db = await getDb()
    await db.query('DELETE FROM todo_tasks WHERE id=$1', [id])
    await loadTasks(activeList!.id, activeTag)
    setTaskModalOpen(false)
    setEditingTask(null)
  }

  const listColor = activeList?.color ?? accent
  const done = tasks.filter(t => t.done).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: `${accent}18`, border: `1.5px solid ${accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconTodo size={20} accent={accent} filled />
          </div>
          <div>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 22, color: '#1a1a2e', letterSpacing: '-0.02em', lineHeight: 1 }}>Todo</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{lists.length} lists</div>
          </div>
        </div>
        <button onClick={() => setShowNewList(true)} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '9px 18px', borderRadius: 100,
          background: `linear-gradient(135deg, ${accent} 0%, #6366f1 60%, #818cf8 100%)`,
          border: 'none', cursor: 'pointer', color: '#fff',
          fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13,
          boxShadow: `0 4px 14px ${accent}40`,
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
          New list
        </button>
      </div>

      {/* ── 2-column layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '264px 1fr', gap: 12, alignItems: 'stretch', height: 'calc(100vh - 180px)' }}>

        {/* ── Col 1: Lists sidebar ── */}
        <div style={{ background: 'rgba(255,255,255,0.45)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.7)', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.035, pointerEvents: 'none', zIndex: 0 }} xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="hatch-todo" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M-1 1l2-2M0 8l8-8M7 9l2-2" stroke={accent} strokeWidth="1"/></pattern></defs>
            <rect width="100%" height="100%" fill="url(#hatch-todo)" />
          </svg>
          <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid rgba(124,106,247,0.06)', flexShrink: 0, position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="13" height="13" viewBox="0 0 15 15" fill="none">
                <circle cx="6.5" cy="6.5" r="5" stroke="#94a3b8" strokeWidth="1.5"/>
                <path d="M10.5 10.5L13.5 13.5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input value={listQuery} onChange={e => setListQuery(e.target.value)} placeholder="Search lists…"
                style={{ ...inputStyle, padding: '8px 10px 8px 30px', fontSize: 13, borderRadius: 10 }} />
            </div>
          </div>

          <div style={{ overflowY: 'auto', flex: 1, height: 0, padding: '4px 0 12px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {lists.length === 0 && <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#94a3b8', padding: '8px 14px' }}>No lists yet</div>}
            {lists.filter(l => l.name.toLowerCase().includes(listQuery.toLowerCase())).map(l => {
              const isActive = activeList?.id === l.id
              return (
                <div key={l.id} onClick={() => { setActiveList(l); setActiveTag(null) }} style={{
                  padding: '13px 16px', cursor: 'pointer',
                  background: isActive ? `linear-gradient(135deg, ${l.color}28 0%, #6366f118 100%)` : 'transparent',
                  transition: 'background 120ms', display: 'flex', alignItems: 'center', gap: 10,
                  borderLeft: isActive ? `2px solid ${l.color}` : '2px solid transparent',
                }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.5)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isActive ? `linear-gradient(135deg, ${l.color}28 0%, #6366f118 100%)` : 'transparent' }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
                  <span style={{
                    fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 14,
                    color: '#1a1a2e', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{l.name}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Col 2: Tasks panel ── */}
        <div style={{ background: 'rgba(255,255,255,0.45)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.7)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {!activeList ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 8 }}>
              <div style={{ fontSize: 32, opacity: 0.2 }}>☑</div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#94a3b8' }}>Select a list</div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{
                padding: '10px 16px', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: `linear-gradient(135deg, ${listColor} 0%, #6366f1 60%, #818cf8 100%)`,
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', top: -50, right: -20, pointerEvents: 'none' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
                  <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 16, color: '#fff' }}>{activeList.name}</span>
                  {tasks.length > 0 && <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{done}/{tasks.length}</span>}
                </div>
                <div style={{ display: 'flex', gap: 8, position: 'relative' }}>
                  <button onClick={openEditList} style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '4px 12px', borderRadius: 100,
                    border: '1.5px solid rgba(255,255,255,0.7)',
                    background: 'rgba(255,255,255,0.22)', color: '#fff',
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700,
                  }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M7 1.5L8.5 3 3.5 8H2V6.5L7 1.5Z" stroke="white" strokeWidth="1.2" strokeLinejoin="round"/></svg>
                    Edit list
                  </button>
                  <button onClick={() => deleteList(activeList.id)} style={{
                    padding: '4px 10px', borderRadius: 100,
                    border: '1px solid rgba(255,255,255,0.3)',
                    background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)',
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600,
                  }}>Delete</button>
                  <button onClick={addTask} style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 100,
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(230,225,255,0.95) 100%)',
                    border: 'none', cursor: 'pointer', color: listColor,
                    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    Add task
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              {tasks.length > 0 && (
                <div style={{ height: 2, background: 'rgba(0,0,0,0.04)', flexShrink: 0 }}>
                  <div style={{ height: '100%', background: listColor, width: `${(done / tasks.length) * 100}%`, transition: 'width 400ms ease' }} />
                </div>
              )}

              {/* Add task inline */}
              <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(124,106,247,0.06)', display: 'flex', gap: 7, flexShrink: 0 }}>
                <input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addTask() }}
                  placeholder="Quick add a task…"
                  style={{ ...inputStyle, flex: 1, padding: '8px 12px', fontSize: 13 }} />
                <button onClick={addTask} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: listColor, color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13, flexShrink: 0 }}>Add</button>
              </div>

              {/* Tag filter */}
              {allTags.length > 0 && (
                <div style={{ padding: '7px 16px', borderBottom: '1px solid rgba(124,106,247,0.06)', display: 'flex', gap: 5, flexWrap: 'wrap', flexShrink: 0 }}>
                  {allTags.map(tag => (
                    <button key={tag} onClick={() => setActiveTag(activeTag === tag ? null : tag)} style={{
                      padding: '3px 9px', borderRadius: 100, border: 'none', cursor: 'pointer',
                      fontSize: 11, fontFamily: 'Inter, sans-serif',
                      background: activeTag === tag ? listColor : `${listColor}14`,
                      color: activeTag === tag ? '#fff' : listColor, transition: 'all 150ms',
                    }}>#{tag}</button>
                  ))}
                </div>
              )}

              {/* Task rows */}
              <div style={{ overflowY: 'auto', flex: 1, height: 0 }}>
                {tasks.length === 0 && <div style={{ textAlign: 'center', color: '#94a3b8', padding: 32, fontFamily: 'Inter, sans-serif', fontSize: 13 }}>No tasks yet</div>}
                {tasks.map((t, i) => (
                  <div key={t.id}
                    onClick={() => openEditTask(t)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px',
                      borderTop: i > 0 ? '1px solid rgba(124,106,247,0.06)' : 'none',
                      background: 'transparent', cursor: 'pointer', transition: 'background 120ms',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.5)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <button onClick={e => { e.stopPropagation(); toggleDone(t) }} style={{
                      width: 18, height: 18, borderRadius: 5, border: `2px solid ${activeList.color}`,
                      background: t.done ? activeList.color : 'transparent',
                      cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {t.done && <svg width="9" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#1a1a2e', textDecoration: t.done ? 'line-through' : 'none', opacity: t.done ? 0.45 : 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                      {(t.tags ?? []).length > 0 && (
                        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 2 }}>
                          {(t.tags ?? []).map(tag => <span key={tag} style={{ fontSize: 10, color: listColor, background: `${listColor}14`, borderRadius: 100, padding: '1px 5px', fontFamily: 'Inter, sans-serif' }}>#{tag}</span>)}
                        </div>
                      )}
                    </div>
                    {t.due_date && <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'Inter, sans-serif', flexShrink: 0 }}>{new Date(t.due_date).toLocaleDateString()}</span>}
                    <span style={{ fontSize: 10, fontFamily: 'Inter, sans-serif', fontWeight: 600, padding: '2px 7px', borderRadius: 100, background: PRIORITY_BG[t.priority], color: PRIORITY_COLOR[t.priority], flexShrink: 0 }}>{t.priority}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── New list modal ── */}
      {showNewList && createPortal(
        <div onClick={e => { if (e.target === e.currentTarget) setShowNewList(false) }} style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(20,20,40,0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: '44vw', maxWidth: 480,
            background: 'linear-gradient(160deg, #f4f3ff 0%, #eef0ff 100%)',
            borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: '0 32px 80px rgba(0,0,0,0.28)',
          }}>
            <div style={{
              background: `linear-gradient(135deg, ${newListColor} 0%, #6366f1 60%, #818cf8 100%)`,
              padding: '14px 18px 18px', position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', top: -60, right: -30, pointerEvents: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, position: 'relative' }}>
                <button onClick={() => setShowNewList(false)} style={{
                  display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', padding: 0,
                }}>
                  <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M6 1L1 6L6 11" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Cancel
                </button>
                <button onClick={createList} style={{
                  padding: '6px 18px', borderRadius: 100, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(230,225,255,0.95) 100%)',
                  color: newListColor, fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 13,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}>Create</button>
              </div>
              <input value={newListName} onChange={e => setNewListName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') createList(); if (e.key === 'Escape') setShowNewList(false) }}
                autoFocus placeholder="List name"
                style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 22, color: '#fff', background: 'transparent', border: 'none', outline: 'none', width: '100%', letterSpacing: '-0.02em', lineHeight: 1.2, padding: 0, position: 'relative' }} />
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4, position: 'relative' }}>Pick a color below</div>
            </div>
            <div style={{ padding: '18px 20px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setNewListColor(c)} style={{
                    width: '100%', aspectRatio: '1', borderRadius: 12, background: c, border: 'none', cursor: 'pointer',
                    boxShadow: newListColor === c ? `0 0 0 3px #fff, 0 0 0 5px ${c}` : 'none',
                    transform: newListColor === c ? 'scale(1.1)' : 'scale(1)', transition: 'all 120ms',
                  }} />
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Edit list modal ── */}
      {showEditList && activeList && createPortal(
        <div onClick={e => { if (e.target === e.currentTarget) setShowEditList(false) }} style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(20,20,40,0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: '44vw', maxWidth: 480,
            background: 'linear-gradient(160deg, #f4f3ff 0%, #eef0ff 100%)',
            borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: '0 32px 80px rgba(0,0,0,0.28)',
          }}>
            <div style={{
              background: `linear-gradient(135deg, ${editListColor} 0%, #6366f1 60%, #818cf8 100%)`,
              padding: '14px 18px 18px', position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', top: -60, right: -30, pointerEvents: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, position: 'relative' }}>
                <button onClick={() => setShowEditList(false)} style={{
                  display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', padding: 0,
                }}>
                  <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M6 1L1 6L6 11" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Cancel
                </button>
                <button onClick={saveEditList} style={{
                  padding: '6px 18px', borderRadius: 100, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(230,225,255,0.95) 100%)',
                  color: editListColor, fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 13,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}>Save</button>
              </div>
              <input value={editListName} onChange={e => setEditListName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveEditList(); if (e.key === 'Escape') setShowEditList(false) }}
                autoFocus placeholder="List name"
                style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 22, color: '#fff', background: 'transparent', border: 'none', outline: 'none', width: '100%', letterSpacing: '-0.02em', lineHeight: 1.2, padding: 0, position: 'relative' }} />
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4, position: 'relative' }}>Pick a color below</div>
            </div>
            <div style={{ padding: '18px 20px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setEditListColor(c)} style={{
                    width: '100%', aspectRatio: '1', borderRadius: 12, background: c, border: 'none', cursor: 'pointer',
                    boxShadow: editListColor === c ? `0 0 0 3px #fff, 0 0 0 5px ${c}` : 'none',
                    transform: editListColor === c ? 'scale(1.1)' : 'scale(1)', transition: 'all 120ms',
                  }} />
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Task modal (edit) ── */}
      {taskModalOpen && editingTask && createPortal(
        <div onClick={e => { if (e.target === e.currentTarget) setTaskModalOpen(false) }} style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(20,20,40,0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: '52vw', maxWidth: 560, maxHeight: '88vh',
            background: 'linear-gradient(160deg, #f4f3ff 0%, #eef0ff 100%)',
            borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: '0 32px 80px rgba(0,0,0,0.28)',
          }}>
            {/* Header */}
            <div style={{
              background: `linear-gradient(135deg, ${listColor} 0%, #6366f1 60%, #818cf8 100%)`,
              padding: '14px 18px 18px', flexShrink: 0, position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', top: -60, right: -30, pointerEvents: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, position: 'relative' }}>
                <button onClick={() => setTaskModalOpen(false)} style={{
                  display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', padding: 0,
                }}>
                  <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M6 1L1 6L6 11" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Cancel
                </button>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['low','medium','high'] as const).map(p => (
                    <button key={p} onClick={() => setTf(prev => ({ ...prev, priority: p }))} style={{
                      padding: '3px 10px', borderRadius: 100, cursor: 'pointer',
                      fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600,
                      border: tf.priority === p ? '1.5px solid rgba(255,255,255,0.8)' : '1.5px solid rgba(255,255,255,0.25)',
                      background: tf.priority === p ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                      color: 'rgba(255,255,255,0.9)',
                    }}>{p.charAt(0).toUpperCase()+p.slice(1)}</button>
                  ))}
                </div>
              </div>
              <input value={tf.title} onChange={e => setTf(p => ({ ...p, title: e.target.value }))} autoFocus
                style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 22, color: '#fff', background: 'transparent', border: 'none', outline: 'none', width: '100%', letterSpacing: '-0.02em', lineHeight: 1.2, padding: 0, position: 'relative' }}
                placeholder="Task title" />
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4, position: 'relative' }}>
                Edit task · {activeList?.name}
              </div>
            </div>

            {/* Body */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '16px 20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: '#4a4a6a', marginBottom: 5 }}>Note</label>
                <input value={tf.note} onChange={e => setTf(p => ({ ...p, note: e.target.value }))} placeholder="Optional note" style={{ ...inputStyle, fontSize: 13 }} />
              </div>
              <TagInput tags={tf.tags} onChange={v => setTf(p => ({ ...p, tags: v }))} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: '#4a4a6a', marginBottom: 5 }}>Due date</label>
                  <input type="date" value={tf.due_date} onChange={e => setTf(p => ({ ...p, due_date: e.target.value }))} style={{ ...inputStyle, fontSize: 12, padding: '8px 10px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: '#4a4a6a', marginBottom: 5 }}>Recurrence</label>
                  <select value={tf.recurrence} onChange={e => setTf(p => ({ ...p, recurrence: e.target.value }))} style={{ ...selectStyle, fontSize: 12, padding: '8px 10px' }}>
                    <option value="none">None</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={saveTask} style={{
                  flex: 1, padding: '10px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: `linear-gradient(135deg, ${listColor} 0%, #6366f1 60%, #818cf8 100%)`,
                  color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 13,
                  boxShadow: `0 4px 14px ${listColor}40`,
                }}>Save</button>
                <button onClick={() => deleteTask(editingTask.id)} style={{
                  padding: '10px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <IconTrash size={15} accent="#ef4444" />
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
