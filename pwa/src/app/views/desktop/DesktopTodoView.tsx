import { useEffect, useState, useCallback } from 'react'
import { getDb } from '../../../db'
import { ACCENT } from '../../../design/tokens'
import { IconTodo, IconTrash } from '../../../design/icons'

interface TodoList { id: string; name: string; color: string; icon: string }
interface TodoTask { id: string; list_id: string; title: string; note: string; priority: 'low'|'medium'|'high'; due_date: string|null; recurrence: string; done: boolean; created_at: string }

const COLORS = ['#7c6af7','#6366f1','#3b82f6','#06b6d4','#10b981','#84cc16','#f59e0b','#f97316','#ef4444','#ec4899','#8b5cf6','#d946ef']
const accent = ACCENT.todo

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.6)', border: '1.5px solid rgba(255,255,255,0.7)',
  borderRadius: 12, padding: '10px 14px', fontSize: 14, color: '#1a1a2e',
  fontFamily: 'Inter, sans-serif', outline: 'none',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
}

const PRIORITY_COLOR = { low: '#94a3b8', medium: '#f59e0b', high: '#ef4444' }
const PRIORITY_BG   = { low: 'rgba(148,163,184,0.12)', medium: 'rgba(245,158,11,0.12)', high: 'rgba(239,68,68,0.12)' }

export default function DesktopTodoView() {
  const [lists, setLists] = useState<TodoList[]>([])
  const [activeList, setActiveList] = useState<TodoList | null>(null)
  const [tasks, setTasks] = useState<TodoTask[]>([])
  const [newTaskTitle, setNewTaskTitle] = useState('')

  // New list modal
  const [listModalOpen, setListModalOpen] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListColor, setNewListColor] = useState(COLORS[0])

  // Task detail modal
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TodoTask | null>(null)
  const [tf, setTf] = useState({ title: '', note: '', priority: 'medium' as 'low'|'medium'|'high', due_date: '', recurrence: 'none' })

  const loadLists = useCallback(async () => {
    const db = await getDb()
    const res = await db.query<TodoList>('SELECT * FROM todo_lists ORDER BY created_at ASC')
    setLists(res.rows)
  }, [])

  const loadTasks = useCallback(async (listId: string) => {
    const db = await getDb()
    const res = await db.query<TodoTask>('SELECT * FROM todo_tasks WHERE list_id=$1 ORDER BY done ASC, created_at DESC', [listId])
    setTasks(res.rows)
  }, [])

  useEffect(() => { loadLists() }, [loadLists])
  useEffect(() => { if (activeList) loadTasks(activeList.id) }, [activeList, loadTasks])

  async function createList() {
    if (!newListName.trim()) return
    const db = await getDb()
    await db.query('INSERT INTO todo_lists (name,color) VALUES ($1,$2)', [newListName, newListColor])
    setNewListName(''); setListModalOpen(false); await loadLists()
  }

  async function deleteList(id: string) {
    const db = await getDb()
    await db.query('DELETE FROM todo_lists WHERE id=$1', [id])
    setActiveList(null); await loadLists()
  }

  async function addTask() {
    if (!newTaskTitle.trim() || !activeList) return
    const db = await getDb()
    await db.query('INSERT INTO todo_tasks (list_id,title,note,priority,due_date,recurrence) VALUES ($1,$2,$3,$4,$5,$6)',
      [activeList.id, newTaskTitle, '', 'medium', null, 'none'])
    setNewTaskTitle(''); await loadTasks(activeList.id)
  }

  async function toggleDone(t: TodoTask) {
    const db = await getDb()
    await db.query('UPDATE todo_tasks SET done=$1, updated_at=now() WHERE id=$2', [!t.done, t.id])
    await loadTasks(activeList!.id)
  }

  function openTaskEdit(t: TodoTask) {
    setEditingTask(t)
    setTf({ title: t.title, note: t.note, priority: t.priority, due_date: t.due_date ?? '', recurrence: t.recurrence })
    setTaskModalOpen(true)
  }

  async function saveTask() {
    if (!editingTask) return
    const db = await getDb()
    await db.query('UPDATE todo_tasks SET title=$1,note=$2,priority=$3,due_date=$4,recurrence=$5,updated_at=now() WHERE id=$6',
      [tf.title, tf.note, tf.priority, tf.due_date || null, tf.recurrence, editingTask.id])
    await loadTasks(activeList!.id)
    setTaskModalOpen(false); setEditingTask(null)
  }

  async function deleteTask(id: string) {
    const db = await getDb()
    await db.query('DELETE FROM todo_tasks WHERE id=$1', [id])
    await loadTasks(activeList!.id)
    setTaskModalOpen(false); setEditingTask(null)
  }

  const listColor = activeList?.color ?? accent
  const done = tasks.filter(t => t.done).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: `${accent}18`, border: `1.5px solid ${accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconTodo size={20} accent={accent} filled />
          </div>
          <div>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 22, color: '#1a1a2e', letterSpacing: '-0.02em', lineHeight: 1 }}>Todo</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{lists.length} lists</div>
          </div>
        </div>
        <button onClick={() => setListModalOpen(true)} style={{
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

      {/* ── Main split pane ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16, minHeight: 500 }}>

        {/* Sidebar — list picker */}
        <div style={{ background: 'rgba(255,255,255,0.45)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.7)', padding: 12, display: 'flex', flexDirection: 'column', gap: 4, alignSelf: 'start' }}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 10, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 8px', marginBottom: 4 }}>Lists</div>
          {lists.length === 0 && <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#94a3b8', padding: '8px 8px' }}>No lists yet</div>}
          {lists.map(l => (
            <button key={l.id} onClick={() => setActiveList(l)} style={{
              textAlign: 'left', padding: '9px 10px', borderRadius: 10, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              background: activeList?.id === l.id ? `${l.color}18` : 'transparent',
              boxShadow: activeList?.id === l.id ? `inset 0 0 0 1.5px ${l.color}40` : 'none',
              transition: 'all 150ms',
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.color, flexShrink: 0, boxShadow: `0 2px 6px ${l.color}80` }} />
              <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: activeList?.id === l.id ? 600 : 400, fontSize: 13.5, color: activeList?.id === l.id ? l.color : '#1a1a2e', flex: 1 }}>{l.name}</span>
            </button>
          ))}
        </div>

        {/* Task panel */}
        <div style={{ background: 'rgba(255,255,255,0.45)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.7)', overflow: 'hidden' }}>
          {!activeList ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 8 }}>
              <div style={{ fontSize: 32, opacity: 0.25 }}>☑</div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#94a3b8' }}>Select a list to see tasks</div>
            </div>
          ) : (
            <>
              {/* Panel header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(124,106,247,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: activeList.color, boxShadow: `0 2px 8px ${activeList.color}80` }} />
                  <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 18, color: '#1a1a2e' }}>{activeList.name}</span>
                  {tasks.length > 0 && <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#94a3b8' }}>{done}/{tasks.length} done</span>}
                </div>
                <button onClick={() => deleteList(activeList.id)} style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 12 }}>Delete list</button>
              </div>

              {/* Progress bar */}
              {tasks.length > 0 && (
                <div style={{ height: 3, background: 'rgba(0,0,0,0.04)' }}>
                  <div style={{ height: '100%', background: activeList.color, width: `${(done / tasks.length) * 100}%`, transition: 'width 400ms ease', borderRadius: 2 }} />
                </div>
              )}

              {/* Add task */}
              <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(124,106,247,0.06)', display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addTask() }}
                  placeholder="Add a task… (press Enter)"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button onClick={addTask} style={{
                  padding: '10px 18px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: listColor, color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13, flexShrink: 0,
                }}>Add</button>
              </div>

              {/* Task list */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {tasks.length === 0 && <div style={{ textAlign: 'center', color: '#94a3b8', padding: 24, fontFamily: 'Inter, sans-serif', fontSize: 14 }}>No tasks yet</div>}
                {tasks.map((t, i) => (
                  <div key={t.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px',
                    borderTop: i > 0 ? '1px solid rgba(124,106,247,0.06)' : 'none',
                    background: t.done ? 'rgba(0,0,0,0.015)' : 'transparent',
                    transition: 'background 150ms',
                  }}
                    onMouseEnter={e => { if (!t.done) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.5)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = t.done ? 'rgba(0,0,0,0.015)' : 'transparent' }}
                  >
                    <button onClick={() => toggleDone(t)} style={{
                      width: 20, height: 20, borderRadius: 6, border: `2px solid ${activeList.color}`,
                      background: t.done ? activeList.color : 'transparent',
                      cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {t.done && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </button>
                    <span onClick={() => openTaskEdit(t)} style={{ flex: 1, fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#1a1a2e', textDecoration: t.done ? 'line-through' : 'none', opacity: t.done ? 0.45 : 1, cursor: 'pointer' }}>{t.title}</span>
                    {t.due_date && <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'Inter, sans-serif', flexShrink: 0 }}>{new Date(t.due_date).toLocaleDateString()}</span>}
                    <span style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: PRIORITY_BG[t.priority], color: PRIORITY_COLOR[t.priority], flexShrink: 0 }}>{t.priority}</span>
                    <button onClick={() => openTaskEdit(t)} style={{ width: 26, height: 26, borderRadius: 7, border: 'none', cursor: 'pointer', background: 'rgba(0,0,0,0.04)', color: '#94a3b8', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⋯</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── New list modal ── */}
      {listModalOpen && (
        <div onClick={() => setListModalOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(15,15,35,0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32,
          animation: 'fadeIn 120ms ease',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 420,
            background: 'rgba(245,246,255,0.97)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            borderRadius: 24,
            boxShadow: '0 40px 100px rgba(15,15,35,0.32), 0 8px 24px rgba(15,15,35,0.12)', overflow: 'hidden',
            animation: 'slideUp 200ms cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <div style={{ background: `linear-gradient(135deg, ${accent} 0%, #6366f1 100%)`, padding: '20px 24px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>New list</span>
                <button onClick={() => setListModalOpen(false)} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
              <input value={newListName} onChange={e => setNewListName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') createList() }}
                style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 22, color: '#fff', background: 'transparent', border: 'none', outline: 'none', width: '100%', letterSpacing: '-0.02em' }}
                placeholder="List name" autoFocus />
            </div>
            <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: '#4a4a6a', marginBottom: 10 }}>Color</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setNewListColor(c)} style={{
                      width: '100%', aspectRatio: '1', borderRadius: 10, background: c, border: 'none', cursor: 'pointer',
                      boxShadow: newListColor === c ? `0 0 0 3px #fff, 0 0 0 5px ${c}` : `0 2px 6px ${c}60`,
                      transform: newListColor === c ? 'scale(1.15)' : 'scale(1)',
                      transition: 'transform 150ms, box-shadow 150ms',
                    }} />
                  ))}
                </div>
              </div>
              <button onClick={createList} style={{
                padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: newListColor, color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 14,
                boxShadow: `0 4px 14px ${newListColor}50`,
              }}>Create list</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Task detail modal ── */}
      {taskModalOpen && editingTask && (
        <div onClick={() => { setTaskModalOpen(false); setEditingTask(null) }} style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(15,15,35,0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32,
          animation: 'fadeIn 120ms ease',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 500,
            background: 'rgba(245,246,255,0.97)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            borderRadius: 24,
            boxShadow: '0 40px 100px rgba(15,15,35,0.32), 0 8px 24px rgba(15,15,35,0.12)', overflow: 'hidden',
            animation: 'slideUp 200ms cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <div style={{ background: `linear-gradient(135deg, ${listColor} 0%, ${accent} 100%)`, padding: '20px 24px 16px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', top: -40, right: -20, pointerEvents: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['low','medium','high'] as const).map(p => (
                    <button key={p} onClick={() => setTf(prev => ({ ...prev, priority: p }))} style={{
                      padding: '4px 11px', borderRadius: 100, border: tf.priority === p ? '1.5px solid rgba(255,255,255,0.8)' : '1.5px solid rgba(255,255,255,0.25)',
                      background: tf.priority === p ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                      color: 'rgba(255,255,255,0.9)', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}>{p.charAt(0).toUpperCase()+p.slice(1)}</button>
                  ))}
                </div>
                <button onClick={() => { setTaskModalOpen(false); setEditingTask(null) }} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
              <input value={tf.title} onChange={e => setTf(p => ({ ...p, title: e.target.value }))}
                style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 22, color: '#fff', background: 'transparent', border: 'none', outline: 'none', width: '100%', letterSpacing: '-0.02em' }}
                placeholder="Task title" autoFocus />
            </div>
            <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: '#4a4a6a', marginBottom: 6 }}>Note</label>
                <input value={tf.note} onChange={e => setTf(p => ({ ...p, note: e.target.value }))} placeholder="Optional note" style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: '#4a4a6a', marginBottom: 6 }}>Due date</label>
                  <input type="date" value={tf.due_date} onChange={e => setTf(p => ({ ...p, due_date: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: '#4a4a6a', marginBottom: 6 }}>Recurrence</label>
                  <select value={tf.recurrence} onChange={e => setTf(p => ({ ...p, recurrence: e.target.value }))} style={selectStyle}>
                    <option value="none">None</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={saveTask} style={{
                  flex: 1, padding: '11px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: `linear-gradient(135deg, ${listColor} 0%, ${accent} 100%)`,
                  color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 14,
                }}>Save changes</button>
                <button onClick={() => deleteTask(editingTask.id)} style={{
                  padding: '11px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <IconTrash size={16} accent="#ef4444" />
                </button>
              </div>
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
