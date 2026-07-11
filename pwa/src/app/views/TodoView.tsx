import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { getDb } from '../../db'
import { ACCENT } from '../../design/tokens'
import GlassCard from '../../design/GlassCard'
import GlassInput from '../../design/GlassInput'
import PillButton from '../../design/PillButton'
import { BentoGrid, BentoCell } from '../../design/BentoGrid'
import ViewHeader from '../ViewHeader'
import { IconTodo, IconTrash } from '../../design/icons'
import TagInput from '../components/TagInput'
import { useIsDesktop } from '../useIsDesktop'
import DesktopTodoView from './desktop/DesktopTodoView'
import AppBackground from '../../design/AppBackground'

interface TodoList { id: string; name: string; color: string; icon: string }
interface TodoTask { id: string; list_id: string; title: string; note: string; priority: 'low'|'medium'|'high'; due_date: string|null; recurrence: string; done: boolean; tags: string[]; created_at: string }

const COLORS = [
  '#7c6af7','#6366f1','#3b82f6','#06b6d4',
  '#10b981','#84cc16','#f59e0b','#f97316',
  '#ef4444','#ec4899','#8b5cf6','#d946ef',
]

const accent = ACCENT.todo

// Returns white or dark text based on bg luminance
function contrastColor(hex: string): string {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return (r*0.299 + g*0.587 + b*0.114) > 150 ? '#1a1a2e' : '#ffffff'
}

export default function TodoView() {
  const isDesktop = useIsDesktop()
  if (isDesktop) return <DesktopTodoView />

  const [lists, setLists] = useState<TodoList[]>([])
  const [tasks, setTasks] = useState<TodoTask[]>([])
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [allTags, setAllTags] = useState<string[]>([])
  const [showNewList, setShowNewList] = useState(false)
  const [newListVisible, setNewListVisible] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListColor, setNewListColor] = useState(COLORS[0])
  const [editingList, setEditingList] = useState<TodoList | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')

  // Screen stack: null = list screen, TodoList = task screen
  const [activeList, setActiveList] = useState<TodoList | null>(null)
  const [listScreenVisible, setListScreenVisible] = useState(false)

  // Task detail push screen
  const [editingTask, setEditingTask] = useState<TodoTask | null>(null)
  const [showTaskDetail, setShowTaskDetail] = useState(false)
  const [taskDetailVisible, setTaskDetailVisible] = useState(false)
  const [tf, setTf] = useState({ title:'', note:'', priority:'medium' as 'low'|'medium'|'high', due_date:'', recurrence:'none', tags: [] as string[] })

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

  function openList(l: TodoList) {
    setActiveList(l); setActiveTag(null)
    setListScreenVisible(false)
    setTimeout(() => setListScreenVisible(true), 10)
  }

  function closeList() {
    setListScreenVisible(false)
    setTimeout(() => { setActiveList(null); setTasks([]) }, 560)
  }

  async function createList() {
    if (!newListName.trim()) return
    const db = await getDb()
    await db.query('INSERT INTO todo_lists (name,color) VALUES ($1,$2)', [newListName, newListColor])
    setNewListName(''); await loadLists()
  }

  async function updateList() {
    if (!newListName.trim() || !editingList) return
    const db = await getDb()
    await db.query('UPDATE todo_lists SET name=$1,color=$2 WHERE id=$3', [newListName, newListColor, editingList.id])
    if (activeList?.id === editingList.id) setActiveList({ ...editingList, name: newListName, color: newListColor })
    setEditingList(null); await loadLists()
  }

  async function deleteList(id: string) {
    const db = await getDb()
    await db.query('DELETE FROM todo_lists WHERE id=$1', [id])
    closeList(); await loadLists()
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

  function openTaskDetail(t: TodoTask) {
    setEditingTask(t)
    setTf({ title: t.title, note: t.note, priority: t.priority, due_date: t.due_date ?? '', recurrence: t.recurrence, tags: t.tags ?? [] })
    setShowTaskDetail(true)
    setTimeout(() => setTaskDetailVisible(true), 10)
  }

  function closeTaskDetail() {
    setTaskDetailVisible(false)
    setTimeout(() => { setShowTaskDetail(false); setEditingTask(null) }, 560)
  }

  async function saveTask() {
    if (!editingTask) return
    const db = await getDb()
    await db.query('UPDATE todo_tasks SET title=$1,note=$2,priority=$3,due_date=$4,recurrence=$5,tags=$6,updated_at=now() WHERE id=$7',
      [tf.title, tf.note, tf.priority, tf.due_date || null, tf.recurrence, tf.tags, editingTask.id])
    await loadTasks(activeList!.id, activeTag)
    closeTaskDetail()
  }

  async function deleteTask(id: string) {
    const db = await getDb()
    await db.query('DELETE FROM todo_tasks WHERE id=$1', [id])
    await loadTasks(activeList!.id, activeTag)
    closeTaskDetail()
  }

  const listColor = activeList?.color ?? accent
  const listTextColor = activeList ? contrastColor(activeList.color) : '#fff'
  const done = tasks.filter(t => t.done).length

  return (
    <div>
      <ViewHeader
        title="Todo" icon={<IconTodo size={22} accent={accent} filled />}
        accent={accent} stats={`${lists.length} lists`}
        action="+ List" onAction={() => { setNewListName(''); setNewListColor(COLORS[0]); setShowNewList(true); setTimeout(() => setNewListVisible(true), 10) }}
      />
      <BentoGrid>
        <BentoCell span="full">
          <GlassCard>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* List items — full background color card */}
              {lists.length === 0 && (
                <div style={{ textAlign: 'center', color: '#4a4a6a', padding: '20px 0', fontFamily: 'Inter, sans-serif', fontSize: 14 }}>No lists yet</div>
              )}
              {lists.map(l => {
                const fg = contrastColor(l.color)
                return (
                  <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button onClick={() => openList(l)} style={{
                      display: 'flex', alignItems: 'center', gap: 10, flex: 1,
                      padding: '14px 16px', borderRadius: 14, border: 'none', cursor: 'pointer',
                      background: l.color, boxShadow: `0 4px 14px ${l.color}50`,
                      transition: 'transform 120ms, box-shadow 120ms',
                    }}>
                      <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 15, color: fg, flex: 1, textAlign: 'left' }}>{l.name}</span>
                      <svg width="7" height="12" viewBox="0 0 7 12" fill="none" style={{ opacity: 0.6 }}>
                        <path d="M1 1l5 5-5 5" stroke={fg} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <button onClick={() => { setEditingList(l); setNewListName(l.name); setNewListColor(l.color); setShowNewList(true); setTimeout(() => setNewListVisible(true), 10) }} style={{
                      alignSelf: 'stretch', minWidth: 52, borderRadius: 14, border: 'none', cursor: 'pointer', flexShrink: 0,
                      background: l.color, boxShadow: `0 4px 14px ${l.color}50`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={contrastColor(l.color)} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85 }}>
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  </div>
                )
              })}
            </div>
          </GlassCard>
        </BentoCell>
      </BentoGrid>

      {/* ── Task list push screen ── */}
      {activeList && createPortal(
        <div style={{
          position: 'fixed', inset: 0, zIndex: 400,
          background: 'linear-gradient(160deg, #f0f2ff 0%, #e8eeff 50%, #dde3ff 100%)',
          overflowY: 'auto',
          transform: listScreenVisible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 550ms cubic-bezier(0.22,1,0.36,1)',
        }}>
          <AppBackground />
          {/* Header */}
          <div style={{ background: `linear-gradient(145deg, ${listColor} 0%, ${listColor}cc 100%)`, paddingBottom: 20, position: 'relative', overflow: 'hidden', zIndex: 1 }}>
            <div style={{ position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', top: -60, right: -40, pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'calc(env(safe-area-inset-top) + 14px) 20px 10px', position: 'relative' }}>
              <button onClick={closeList} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 600, color: listTextColor, opacity: 0.9, padding: 0 }}>
                <svg width="8" height="13" viewBox="0 0 8 13" fill="none">
                  <path d="M7 1L1.5 6.5L7 12" stroke={listTextColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Todo
              </button>
              <button onClick={() => deleteList(activeList.id)} style={{ width: 34, height: 34, borderRadius: 10, border: 'none', cursor: 'pointer', background: 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconTrash size={15} accent={listTextColor} />
              </button>
            </div>
            <div style={{ padding: '4px 20px 0', position: 'relative' }}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 28, color: listTextColor, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{activeList.name}</div>
              {tasks.length > 0 && (
                <div style={{ marginTop: 6, fontSize: 13, fontFamily: 'Inter, sans-serif', color: listTextColor, opacity: 0.7 }}>{done}/{tasks.length} done</div>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {tasks.length > 0 && (
            <div style={{ height: 3, background: 'rgba(0,0,0,0.06)', position: 'relative', zIndex: 1 }}>
              <div style={{ height: '100%', background: listColor, width: `${(done/tasks.length)*100}%`, transition: 'width 400ms ease' }} />
            </div>
          )}

          {/* Content */}
          <div style={{ padding: '16px 16px 80px', display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', zIndex: 1 }}>
            {/* Add task */}
            <div style={{ display: 'flex', gap: 8 }}>
              <GlassInput value={newTaskTitle} onChange={setNewTaskTitle} placeholder="New task…" />
              <PillButton onClick={addTask} accent={listColor}>Add</PillButton>
            </div>

            {/* Tag filter */}
            {allTags.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {allTags.map(tag => (
                  <button key={tag} onClick={() => setActiveTag(activeTag === tag ? null : tag)} style={{
                    padding: '4px 10px', borderRadius: 100, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontFamily: 'Inter, sans-serif',
                    background: activeTag === tag ? listColor : `${listColor}18`,
                    color: activeTag === tag ? listTextColor : listColor,
                  }}>#{tag}</button>
                ))}
              </div>
            )}

            {/* Task rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tasks.length === 0 && (
                <div style={{ textAlign: 'center', color: '#4a4a6a', padding: '20px 0', fontFamily: 'Inter, sans-serif', fontSize: 14 }}>No tasks yet</div>
              )}
              {tasks.map(t => {
                const rowBg = t.done ? `${listColor}18` : `${listColor}28`
                const textOpacity = t.done ? 0.45 : 1
                const priorityColors: Record<string, string> = { high: '#ef4444', medium: '#f59e0b', low: '#94a3b8' }
                return (
                  <div key={t.id} style={{
                    borderRadius: 16,
                    background: rowBg,
                    border: `1.5px solid ${listColor}30`,
                    overflow: 'hidden',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px' }}>
                      <button onClick={() => toggleDone(t)} style={{
                        width: 24, height: 24, borderRadius: 8, border: `2px solid ${t.done ? listColor : listColor + '80'}`,
                        background: t.done ? listColor : 'transparent', cursor: 'pointer', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 200ms',
                      }}>
                        {t.done && <svg width="11" height="9" viewBox="0 0 11 9" fill="none"><path d="M1 4.5L4 7.5L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </button>
                      <div onClick={() => openTaskDetail(t)} style={{ flex: 1, cursor: 'pointer', minWidth: 0 }}>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 500, color: '#1a1a2e', textDecoration: t.done ? 'line-through' : 'none', opacity: textOpacity, lineHeight: 1.3 }}>{t.title}</div>
                        {(t.tags ?? []).length > 0 && (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5 }}>
                            {(t.tags ?? []).map(tag => (
                              <span key={tag} style={{ fontSize: 10, fontFamily: 'Inter, sans-serif', color: listColor, background: `${listColor}20`, borderRadius: 100, padding: '2px 7px', fontWeight: 600 }}>#{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        {t.priority !== 'medium' && (
                          <span style={{
                            fontSize: 10, fontFamily: 'Inter, sans-serif', fontWeight: 700,
                            color: priorityColors[t.priority],
                            background: `${priorityColors[t.priority]}18`,
                            borderRadius: 100, padding: '3px 8px', letterSpacing: '0.04em', textTransform: 'uppercase',
                          }}>{t.priority}</span>
                        )}
                        <svg width="6" height="11" viewBox="0 0 6 11" fill="none" style={{ opacity: 0.3 }}>
                          <path d="M1 1l4 4.5L1 10" stroke={listColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Task detail push screen ── */}
      {showTaskDetail && editingTask && createPortal(
        <div style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: 'linear-gradient(160deg, #f0f2ff 0%, #e8eeff 50%, #dde3ff 100%)',
          overflowY: 'auto',
          transform: taskDetailVisible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 550ms cubic-bezier(0.22,1,0.36,1)',
        }}>
          <div style={{ background: `linear-gradient(145deg, ${listColor} 0%, ${accent} 60%, #818cf8 100%)`, paddingBottom: 24, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', top: -60, right: -40, pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'calc(env(safe-area-inset-top) + 14px) 20px 10px', position: 'relative' }}>
              <button onClick={closeTaskDetail} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.92)', padding: 0 }}>
                <svg width="8" height="13" viewBox="0 0 8 13" fill="none">
                  <path d="M7 1L1.5 6.5L7 12" stroke="rgba(255,255,255,0.92)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {activeList?.name ?? 'Todo'}
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={saveTask} style={{ padding: '8px 22px', borderRadius: 100, border: '1.5px solid rgba(255,255,255,0.5)', cursor: 'pointer', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13 }}>Save</button>
                <button onClick={() => deleteTask(editingTask.id)} style={{ width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconTrash size={15} accent="rgba(255,255,255,0.85)" />
                </button>
              </div>
            </div>
            <div style={{ padding: '8px 20px 0', position: 'relative' }}>
              <input value={tf.title} onChange={e => setTf(p => ({ ...p, title: e.target.value }))}
                style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 26, color: '#fff', background: 'transparent', border: 'none', outline: 'none', width: '100%', letterSpacing: '-0.02em', lineHeight: 1.2 }}
                placeholder="Task title" autoFocus />
              <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                {(['low','medium','high'] as const).map(p => (
                  <button key={p} onClick={() => setTf(prev => ({ ...prev, priority: p }))} style={{
                    padding: '4px 12px', borderRadius: 100,
                    border: tf.priority === p ? '1.5px solid rgba(255,255,255,0.8)' : '1.5px solid rgba(255,255,255,0.3)',
                    background: tf.priority === p ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.9)', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}>{p.charAt(0).toUpperCase()+p.slice(1)}</button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ padding: '20px 20px 80px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <GlassInput value={tf.note} onChange={v => setTf(p => ({ ...p, note: v }))} placeholder="Note (optional)" />
            <TagInput tags={tf.tags} onChange={v => setTf(p => ({ ...p, tags: v }))} />
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#4a4a6a', marginBottom: 6, fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>Recurrence</div>
                <select value={tf.recurrence} onChange={e => setTf(p => ({ ...p, recurrence: e.target.value }))}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.55)', border: '1.5px solid rgba(255,255,255,0.6)', borderRadius: 14, padding: '12px 16px', fontSize: 15, color: '#1a1a2e', outline: 'none', cursor: 'pointer' }}>
                  <option value="none">None</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#4a4a6a', marginBottom: 6, fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>Due date</div>
                <input type="date" value={tf.due_date} onChange={e => setTf(p => ({ ...p, due_date: e.target.value }))}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.55)', border: '1.5px solid rgba(255,255,255,0.6)', borderRadius: 14, padding: '12px 16px', fontSize: 15, color: '#1a1a2e', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Create list push screen ── */}
      {showNewList && createPortal(
        <div style={{
          position: 'fixed', inset: 0, zIndex: 600,
          background: 'linear-gradient(160deg, #f0f2ff 0%, #e8eeff 50%, #dde3ff 100%)',
          overflowY: 'auto',
          transform: newListVisible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 550ms cubic-bezier(0.22,1,0.36,1)',
        }}>
          <AppBackground />
          <div style={{ background: `linear-gradient(145deg, ${newListColor} 0%, ${newListColor}cc 100%)`, paddingBottom: 28, position: 'relative', overflow: 'hidden', zIndex: 1 }}>
            <div style={{ position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', top: -60, right: -40, pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'center', padding: 'calc(env(safe-area-inset-top) + 14px) 20px 10px', position: 'relative' }}>
              <button onClick={() => { setNewListVisible(false); setTimeout(() => { setShowNewList(false); setEditingList(null) }, 560) }} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 600, color: contrastColor(newListColor), opacity: 0.9, padding: 0 }}>
                <svg width="8" height="13" viewBox="0 0 8 13" fill="none">
                  <path d="M7 1L1.5 6.5L7 12" stroke={contrastColor(newListColor)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Todo
              </button>
            </div>
            <div style={{ padding: '8px 20px 0', position: 'relative' }}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 28, color: contrastColor(newListColor), letterSpacing: '-0.02em', opacity: newListName ? 1 : 0.4 }}>
                {newListName || (editingList ? 'Edit List' : 'New List')}
              </div>
            </div>
          </div>
          <div style={{ padding: '24px 20px 80px', display: 'flex', flexDirection: 'column', gap: 20, position: 'relative', zIndex: 1 }}>
            <GlassInput value={newListName} onChange={setNewListName} placeholder="List name" autoFocus />
            <div>
              <div style={{ fontSize: 12, color: '#4a4a6a', marginBottom: 10, fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Color</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setNewListColor(c)} style={{
                    width: '100%', aspectRatio: '1', borderRadius: 12, background: c, border: 'none', cursor: 'pointer',
                    boxShadow: newListColor === c ? `0 0 0 3px #fff, 0 0 0 5px ${c}` : `0 3px 8px ${c}60`,
                    transform: newListColor === c ? 'scale(1.15)' : 'scale(1)',
                    transition: 'transform 150ms, box-shadow 150ms',
                  }} />
                ))}
              </div>
            </div>
            <PillButton onClick={async () => {
              if (editingList) { await updateList() } else { await createList() }
              setNewListVisible(false); setTimeout(() => { setShowNewList(false); setEditingList(null) }, 560)
            }} accent={newListColor}>{editingList ? 'Save' : 'Create List'}</PillButton>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
