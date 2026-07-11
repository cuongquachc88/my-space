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

interface TodoList { id: string; name: string; color: string; icon: string }
interface TodoTask { id: string; list_id: string; title: string; note: string; priority: 'low'|'medium'|'high'; due_date: string|null; recurrence: string; done: boolean; tags: string[]; created_at: string }

const COLORS = [
  '#7c6af7','#6366f1',
  '#3b82f6','#06b6d4',
  '#10b981','#84cc16',
  '#f59e0b','#f97316',
  '#ef4444','#ec4899',
  '#8b5cf6','#d946ef',
]

const accent = ACCENT.todo

export default function TodoView() {
  const isDesktop = useIsDesktop()
  if (isDesktop) return <DesktopTodoView />
  const [lists, setLists] = useState<TodoList[]>([])
  const [activeList, setActiveList] = useState<TodoList | null>(null)
  const [tasks, setTasks] = useState<TodoTask[]>([])
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [allTags, setAllTags] = useState<string[]>([])
  const [showNewList, setShowNewList] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListColor, setNewListColor] = useState(COLORS[0])
  const [newTaskTitle, setNewTaskTitle] = useState('')

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

  async function createList() {
    if (!newListName.trim()) return
    const db = await getDb()
    await db.query('INSERT INTO todo_lists (name,color) VALUES ($1,$2)', [newListName, newListColor])
    setNewListName(''); setShowNewList(false); await loadLists()
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
    await loadTasks(activeList!.id)
    closeTaskDetail()
  }

  async function deleteTask(id: string) {
    const db = await getDb()
    await db.query('DELETE FROM todo_tasks WHERE id=$1', [id])
    await loadTasks(activeList!.id)
    closeTaskDetail()
  }

  const listColor = activeList?.color ?? accent

  return (
    <div>
      <ViewHeader
        title="Todo" icon={<IconTodo size={22} accent={accent} filled />}
        accent={accent} stats={`${lists.length} lists`}
        action="+ List" onAction={() => setShowNewList(true)}
      />
      <BentoGrid>
        <BentoCell span="1">
          <GlassCard style={{ height: '100%' }}>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 13, color: '#8e8e93', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Lists</div>
              {showNewList && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '16px', background: 'rgba(255,255,255,0.5)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.7)' }}>
                  <GlassInput value={newListName} onChange={setNewListName} placeholder="List name" autoFocus />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
                    {COLORS.map(c => (
                      <button key={c} onClick={() => setNewListColor(c)} style={{
                        width: '100%', aspectRatio: '1', borderRadius: 10,
                        background: c, border: 'none', cursor: 'pointer',
                        boxShadow: newListColor === c ? `0 0 0 3px #fff, 0 0 0 5px ${c}` : `0 2px 6px ${c}60`,
                        transform: newListColor === c ? 'scale(1.15)' : 'scale(1)',
                        transition: 'transform 150ms, box-shadow 150ms',
                      }} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                    <PillButton onClick={createList} accent={accent}>Create</PillButton>
                    <PillButton variant="ghost" onClick={() => setShowNewList(false)}>Cancel</PillButton>
                  </div>
                </div>
              )}
              {lists.map(l => (
                <button key={l.id} onClick={() => setActiveList(l)}
                  style={{ textAlign: 'left', padding: '11px 14px', borderRadius: 12, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                    background: activeList?.id === l.id ? `${l.color}18` : 'rgba(255,255,255,0.45)',
                    boxShadow: activeList?.id === l.id ? `0 0 0 1.5px ${l.color}50` : 'none',
                    transition: 'background 150ms, box-shadow 150ms' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: l.color, flexShrink: 0, boxShadow: `0 2px 6px ${l.color}80` }} />
                  <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 14, color: '#1a1a2e', flex: 1 }}>{l.name}</span>
                </button>
              ))}
            </div>
          </GlassCard>
        </BentoCell>

        <BentoCell span="2">
          <GlassCard style={{ height: '100%' }}>
            <div style={{ padding: 16 }}>
              {!activeList ? (
                <div style={{ textAlign: 'center', color: '#4a4a6a', padding: 32, fontFamily: 'Inter, sans-serif' }}>Select a list</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: activeList.color, boxShadow: `0 2px 6px ${activeList.color}80` }} />
                      <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 18, color: '#1a1a2e' }}>{activeList.name}</div>
                    </div>
                    <PillButton variant="ghost" onClick={() => deleteList(activeList.id)} style={{ color: '#ef4444', fontSize: 12 }}>Delete list</PillButton>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <GlassInput value={newTaskTitle} onChange={setNewTaskTitle} placeholder="New task…" />
                    <PillButton onClick={addTask} accent={accent}>Add</PillButton>
                  </div>
                  {allTags.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {allTags.map(tag => (
                        <button key={tag} onClick={() => setActiveTag(activeTag === tag ? null : tag)} style={{
                          padding: '4px 10px', borderRadius: 100, border: 'none', cursor: 'pointer',
                          fontSize: 12, fontFamily: 'Inter, sans-serif',
                          background: activeTag === tag ? listColor : `${listColor}18`,
                          color: activeTag === tag ? '#fff' : listColor,
                        }}>#{tag}</button>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {tasks.map(t => (
                      <div key={t.id} style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button onClick={() => toggleDone(t)} style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${activeList.color}`, background: t.done ? activeList.color : 'transparent', cursor: 'pointer', flexShrink: 0 }} />
                        <div onClick={() => openTaskDetail(t)} style={{ flex: 1, cursor: 'pointer', minWidth: 0 }}>
                          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#1a1a2e', textDecoration: t.done ? 'line-through' : 'none', opacity: t.done ? 0.5 : 1 }}>{t.title}</div>
                          {(t.tags ?? []).length > 0 && (
                            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 3 }}>
                              {(t.tags ?? []).map(tag => (
                                <span key={tag} style={{ fontSize: 10, fontFamily: 'Inter, sans-serif', color: listColor, background: `${listColor}14`, borderRadius: 100, padding: '1px 6px' }}>#{tag}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <span style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', color: t.priority === 'high' ? '#ef4444' : t.priority === 'medium' ? '#f59e0b' : '#94a3b8', flexShrink: 0 }}>{t.priority}</span>
                      </div>
                    ))}
                    {tasks.length === 0 && <div style={{ textAlign: 'center', color: '#4a4a6a', padding: 16, fontFamily: 'Inter, sans-serif', fontSize: 14 }}>No tasks yet</div>}
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </BentoCell>
      </BentoGrid>

      {/* ── Task detail push screen ── */}
      {showTaskDetail && editingTask && createPortal(
        <div style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: 'linear-gradient(160deg, #f0f2ff 0%, #e8eeff 50%, #dde3ff 100%)',
          overflowY: 'auto',
          transform: taskDetailVisible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 550ms cubic-bezier(0.22,1,0.36,1)',
        }}>
          {/* Hero header */}
          <div style={{ background: `linear-gradient(145deg, ${listColor} 0%, ${accent} 60%, #818cf8 100%)`, paddingBottom: 24, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', top: -60, right: -40, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', bottom: -20, left: 20, pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'calc(env(safe-area-inset-top) + 14px) 20px 10px', position: 'relative' }}>
              <button onClick={closeTaskDetail} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.92)', padding: 0 }}>
                <svg width="8" height="13" viewBox="0 0 8 13" fill="none">
                  <path d="M7 1L1.5 6.5L7 12" stroke="rgba(255,255,255,0.92)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {activeList?.name ?? 'Todo'}
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={saveTask} style={{
                  padding: '8px 22px', borderRadius: 100, border: '1.5px solid rgba(255,255,255,0.5)', cursor: 'pointer',
                  background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                  color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13,
                }}>Save</button>
                <button onClick={() => deleteTask(editingTask.id)} style={{ width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconTrash size={15} accent="rgba(255,255,255,0.85)" />
                </button>
              </div>
            </div>
            <div style={{ padding: '8px 20px 0', position: 'relative' }}>
              <input
                value={tf.title}
                onChange={e => setTf(p => ({ ...p, title: e.target.value }))}
                style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 26, color: '#fff', background: 'transparent', border: 'none', outline: 'none', width: '100%', letterSpacing: '-0.02em', lineHeight: 1.2 }}
                placeholder="Task title"
                autoFocus
              />
              {/* Priority badge in hero */}
              <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                {(['low','medium','high'] as const).map(p => (
                  <button key={p} onClick={() => setTf(prev => ({ ...prev, priority: p }))} style={{
                    padding: '4px 12px', borderRadius: 100, border: tf.priority === p ? '1.5px solid rgba(255,255,255,0.8)' : '1.5px solid rgba(255,255,255,0.3)',
                    background: tf.priority === p ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.9)', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                  }}>{p.charAt(0).toUpperCase()+p.slice(1)}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          <div style={{ padding: '20px 20px 80px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <GlassInput value={tf.note} onChange={v => setTf(p => ({ ...p, note: v }))} placeholder="Note (optional)" />
              <TagInput tags={tf.tags} onChange={v => setTf(p => ({ ...p, tags: v }))} />

              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: '#4a4a6a', marginBottom: 6, fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>Recurrence</div>
                  <select value={tf.recurrence} onChange={e => setTf(p => ({ ...p, recurrence: e.target.value }))}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1.5px solid rgba(255,255,255,0.6)', borderRadius: 14, padding: '12px 16px', fontSize: 15, color: '#1a1a2e', outline: 'none', cursor: 'pointer' }}>
                    <option value="none">None</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: '#4a4a6a', marginBottom: 6, fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>Due date</div>
                  <input type="date" value={tf.due_date} onChange={e => setTf(p => ({ ...p, due_date: e.target.value }))}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1.5px solid rgba(255,255,255,0.6)', borderRadius: 14, padding: '12px 16px', fontSize: 15, color: '#1a1a2e', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
