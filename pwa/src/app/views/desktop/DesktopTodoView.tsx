import { useEffect, useState, useCallback } from 'react'
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
  const [activeList, setActiveList] = useState<TodoList | null>(null)
  const [tasks, setTasks] = useState<TodoTask[]>([])
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [allTags, setAllTags] = useState<string[]>([])
  const [newTaskTitle, setNewTaskTitle] = useState('')

  // New list inline form
  const [showNewList, setShowNewList] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListColor, setNewListColor] = useState(COLORS[0])

  // Detail panel (col 3)
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
    setNewListName(''); setShowNewList(false); await loadLists()
  }

  async function deleteList(id: string) {
    const db = await getDb()
    await db.query('DELETE FROM todo_lists WHERE id=$1', [id])
    setActiveList(null); setEditingTask(null); await loadLists()
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

  function openDetail(t: TodoTask) {
    setEditingTask(t)
    setTf({ title: t.title, note: t.note, priority: t.priority, due_date: t.due_date ?? '', recurrence: t.recurrence, tags: t.tags ?? [] })
  }

  async function saveTask() {
    if (!editingTask) return
    const db = await getDb()
    await db.query('UPDATE todo_tasks SET title=$1,note=$2,priority=$3,due_date=$4,recurrence=$5,tags=$6,updated_at=now() WHERE id=$7',
      [tf.title, tf.note, tf.priority, tf.due_date || null, tf.recurrence, tf.tags, editingTask.id])
    await loadTasks(activeList!.id, activeTag)
    setEditingTask(null)
  }

  async function deleteTask(id: string) {
    const db = await getDb()
    await db.query('DELETE FROM todo_tasks WHERE id=$1', [id])
    await loadTasks(activeList!.id, activeTag)
    setEditingTask(null)
  }

  const listColor = activeList?.color ?? accent
  const done = tasks.filter(t => t.done).length
  const panelCols = editingTask ? '200px 1fr 300px' : activeList ? '200px 1fr' : '200px 1fr'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

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
        <button onClick={() => setShowNewList(v => !v)} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '9px 18px', borderRadius: 100,
          background: `linear-gradient(135deg, ${accent} 0%, #6366f1 100%)`,
          border: 'none', cursor: 'pointer', color: '#fff',
          fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13,
          boxShadow: `0 4px 14px ${accent}40`,
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
          New list
        </button>
      </div>

      {/* ── 3-column grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: panelCols, gap: 12, minHeight: 520, transition: 'grid-template-columns 250ms ease', alignItems: 'start' }}>

        {/* Col 1 — Lists */}
        <div style={{ background: 'rgba(255,255,255,0.45)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.7)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 12px 6px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 10, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Lists</div>

          {/* Inline new list form */}
          {showNewList && (
            <div style={{ margin: '0 8px 8px', padding: 12, background: 'rgba(255,255,255,0.7)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.8)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input value={newListName} onChange={e => setNewListName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') createList(); if (e.key === 'Escape') setShowNewList(false) }}
                placeholder="List name" autoFocus
                style={{ ...inputStyle, padding: '8px 12px', fontSize: 13 }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 5 }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setNewListColor(c)} style={{
                    width: '100%', aspectRatio: '1', borderRadius: 8, background: c, border: 'none', cursor: 'pointer',
                    boxShadow: newListColor === c ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : 'none',
                    transform: newListColor === c ? 'scale(1.1)' : 'scale(1)', transition: 'all 120ms',
                  }} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={createList} style={{ flex: 1, padding: '7px', borderRadius: 10, border: 'none', cursor: 'pointer', background: newListColor, color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 12 }}>Create</button>
                <button onClick={() => setShowNewList(false)} style={{ padding: '7px 12px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)', cursor: 'pointer', background: 'transparent', color: '#94a3b8', fontFamily: 'Inter, sans-serif', fontSize: 12 }}>Cancel</button>
              </div>
            </div>
          )}

          <div style={{ padding: '0 8px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {lists.length === 0 && !showNewList && <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#94a3b8', padding: '8px 4px' }}>No lists yet</div>}
            {lists.map(l => (
              <button key={l.id} onClick={() => { setActiveList(l); setEditingTask(null); setActiveTag(null) }} style={{
                textAlign: 'left', padding: '9px 10px', borderRadius: 10, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                background: activeList?.id === l.id ? `${l.color}18` : 'transparent',
                boxShadow: activeList?.id === l.id ? `inset 0 0 0 1.5px ${l.color}40` : 'none',
                transition: 'all 150ms',
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.color, flexShrink: 0, boxShadow: `0 2px 6px ${l.color}80` }} />
                <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: activeList?.id === l.id ? 600 : 400, fontSize: 13.5, color: activeList?.id === l.id ? l.color : '#1a1a2e', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Col 2 — Tasks */}
        <div style={{ background: 'rgba(255,255,255,0.45)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.7)', overflow: 'hidden' }}>
          {!activeList ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 8 }}>
              <div style={{ fontSize: 32, opacity: 0.2 }}>☑</div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#94a3b8' }}>Select a list</div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(124,106,247,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: activeList.color, boxShadow: `0 2px 8px ${activeList.color}80` }} />
                  <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 16, color: '#1a1a2e' }}>{activeList.name}</span>
                  {tasks.length > 0 && <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#94a3b8' }}>{done}/{tasks.length}</span>}
                </div>
                <button onClick={() => deleteList(activeList.id)} style={{ padding: '4px 8px', borderRadius: 7, border: '1px solid rgba(239,68,68,0.2)', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 11 }}>Delete</button>
              </div>

              {/* Progress */}
              {tasks.length > 0 && (
                <div style={{ height: 2, background: 'rgba(0,0,0,0.04)' }}>
                  <div style={{ height: '100%', background: activeList.color, width: `${(done / tasks.length) * 100}%`, transition: 'width 400ms ease' }} />
                </div>
              )}

              {/* Tag filter */}
              {allTags.length > 0 && (
                <div style={{ padding: '7px 16px', borderBottom: '1px solid rgba(124,106,247,0.06)', display: 'flex', gap: 5, flexWrap: 'wrap' }}>
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

              {/* Add task */}
              <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(124,106,247,0.06)', display: 'flex', gap: 7 }}>
                <input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addTask() }}
                  placeholder="Add a task…"
                  style={{ ...inputStyle, flex: 1, padding: '8px 12px', fontSize: 13 }} />
                <button onClick={addTask} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: listColor, color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13, flexShrink: 0 }}>Add</button>
              </div>

              {/* Task rows */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {tasks.length === 0 && <div style={{ textAlign: 'center', color: '#94a3b8', padding: 24, fontFamily: 'Inter, sans-serif', fontSize: 13 }}>No tasks yet</div>}
                {tasks.map((t, i) => (
                  <div key={t.id}
                    onClick={() => openDetail(t)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 9, padding: '10px 16px',
                      borderTop: i > 0 ? '1px solid rgba(124,106,247,0.06)' : 'none',
                      background: editingTask?.id === t.id ? `${listColor}0d` : t.done ? 'rgba(0,0,0,0.015)' : 'transparent',
                      cursor: 'pointer', transition: 'background 120ms',
                      boxShadow: editingTask?.id === t.id ? `inset 2px 0 0 ${listColor}` : 'none',
                    }}
                    onMouseEnter={e => { if (editingTask?.id !== t.id) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.5)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = editingTask?.id === t.id ? `${listColor}0d` : t.done ? 'rgba(0,0,0,0.015)' : 'transparent' }}
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

        {/* Col 3 — Detail panel */}
        {editingTask && (
          <div style={{ background: 'rgba(255,255,255,0.45)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.7)', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ background: `linear-gradient(135deg, ${listColor} 0%, ${accent} 100%)`, padding: '16px 16px 12px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', top: -30, right: -20, pointerEvents: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 5 }}>
                  {(['low','medium','high'] as const).map(p => (
                    <button key={p} onClick={() => setTf(prev => ({ ...prev, priority: p }))} style={{
                      padding: '3px 9px', borderRadius: 100, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600,
                      border: tf.priority === p ? '1.5px solid rgba(255,255,255,0.8)' : '1.5px solid rgba(255,255,255,0.25)',
                      background: tf.priority === p ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                      color: 'rgba(255,255,255,0.9)',
                    }}>{p.charAt(0).toUpperCase()+p.slice(1)}</button>
                  ))}
                </div>
                <button onClick={() => setEditingTask(null)} style={{ width: 24, height: 24, borderRadius: 7, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
              <input value={tf.title} onChange={e => setTf(p => ({ ...p, title: e.target.value }))}
                style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 18, color: '#fff', background: 'transparent', border: 'none', outline: 'none', width: '100%', letterSpacing: '-0.02em' }}
                placeholder="Task title" autoFocus />
            </div>

            {/* Body */}
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: '#4a4a6a', marginBottom: 5 }}>Note</label>
                <input value={tf.note} onChange={e => setTf(p => ({ ...p, note: e.target.value }))} placeholder="Optional note" style={{ ...inputStyle, fontSize: 13 }} />
              </div>
              <TagInput tags={tf.tags} onChange={v => setTf(p => ({ ...p, tags: v }))} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
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
              <div style={{ display: 'flex', gap: 7, marginTop: 4 }}>
                <button onClick={saveTask} style={{
                  flex: 1, padding: '10px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: `linear-gradient(135deg, ${listColor} 0%, ${accent} 100%)`,
                  color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 13,
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
        )}
      </div>
    </div>
  )
}
