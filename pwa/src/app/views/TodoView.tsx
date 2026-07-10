import { useEffect, useState, useCallback } from 'react'
import { getDb } from '../../db'
import { ACCENT } from '../../design/tokens'
import GlassCard from '../../design/GlassCard'
import GlassInput from '../../design/GlassInput'
import PillButton from '../../design/PillButton'
import { BentoGrid, BentoCell } from '../../design/BentoGrid'
import ViewHeader from '../ViewHeader'
import { IconTodo } from '../../design/icons'

interface TodoList { id: string; name: string; color: string; icon: string }
interface TodoTask { id: string; list_id: string; title: string; note: string; priority: 'low'|'medium'|'high'; due_date: string|null; recurrence: string; done: boolean; created_at: string }

const COLORS = ['#818cf8','#34d399','#f59e0b','#f87171','#60a5fa','#a78bfa','#fb923c','#e879f9']

export default function TodoView() {
  const [lists, setLists] = useState<TodoList[]>([])
  const [activeList, setActiveList] = useState<TodoList | null>(null)
  const [tasks, setTasks] = useState<TodoTask[]>([])
  const [showNewList, setShowNewList] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListColor, setNewListColor] = useState(COLORS[0])
  const [editingTask, setEditingTask] = useState<TodoTask | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [tf, setTf] = useState({ title:'', note:'', priority:'medium' as 'low'|'medium'|'high', due_date:'', recurrence:'none' })

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

  async function saveTask() {
    if (!editingTask) return
    const db = await getDb()
    await db.query('UPDATE todo_tasks SET title=$1,note=$2,priority=$3,due_date=$4,recurrence=$5,updated_at=now() WHERE id=$6',
      [tf.title, tf.note, tf.priority, tf.due_date || null, tf.recurrence, editingTask.id])
    setEditingTask(null); await loadTasks(activeList!.id)
  }

  async function deleteTask(id: string) {
    const db = await getDb()
    await db.query('DELETE FROM todo_tasks WHERE id=$1', [id])
    setEditingTask(null); await loadTasks(activeList!.id)
  }

  return (
    <div>
      <ViewHeader
        title="Todo" icon={<IconTodo size={22} accent={ACCENT.todo} filled />}
        accent={ACCENT.todo} stats={`${lists.length} lists`}
        action="+ List" onAction={() => setShowNewList(true)}
      />
      <BentoGrid>
        <BentoCell span="1">
          <GlassCard style={{ height: '100%' }}>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, fontSize: 14, color: '#1a1a2e', marginBottom: 4 }}>Lists</div>
              {showNewList && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                  <GlassInput value={newListName} onChange={setNewListName} placeholder="List name" autoFocus />
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {COLORS.map(c => (
                      <button key={c} onClick={() => setNewListColor(c)}
                        style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: newListColor === c ? '2px solid #1a1a2e' : '2px solid transparent', cursor: 'pointer' }} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <PillButton onClick={createList} accent={ACCENT.todo}>Create</PillButton>
                    <PillButton variant="ghost" onClick={() => setShowNewList(false)}>Cancel</PillButton>
                  </div>
                </div>
              )}
              {lists.map(l => (
                <button key={l.id} onClick={() => setActiveList(l)}
                  style={{ textAlign: 'left', padding: '8px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                    background: activeList?.id === l.id ? `${l.color}20` : 'rgba(255,255,255,0.4)', borderLeft: `3px solid ${l.color}` }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
                  <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 14, color: '#1a1a2e' }}>{l.name}</span>
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
                    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 18, color: '#1a1a2e' }}>{activeList.name}</div>
                    <PillButton variant="ghost" onClick={() => deleteList(activeList.id)} style={{ color: '#ef4444', fontSize: 12 }}>Delete list</PillButton>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <GlassInput value={newTaskTitle} onChange={setNewTaskTitle} placeholder="New task…" />
                    <PillButton onClick={addTask} accent={ACCENT.todo}>Add</PillButton>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
                    {tasks.map(t => (
                      <div key={t.id} style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button onClick={() => toggleDone(t)} style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${ACCENT.todo}`, background: t.done ? ACCENT.todo : 'transparent', cursor: 'pointer', flexShrink: 0 }} />
                        <span
                          onClick={() => { setEditingTask(t); setTf({ title: t.title, note: t.note, priority: t.priority, due_date: t.due_date ?? '', recurrence: t.recurrence }) }}
                          style={{ flex: 1, fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#1a1a2e', textDecoration: t.done ? 'line-through' : 'none', opacity: t.done ? 0.5 : 1, cursor: 'pointer' }}>{t.title}</span>
                        <span style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', color: t.priority === 'high' ? '#ef4444' : t.priority === 'medium' ? '#f59e0b' : '#94a3b8' }}>{t.priority}</span>
                        <PillButton variant="ghost" onClick={() => deleteTask(t.id)}>×</PillButton>
                      </div>
                    ))}
                    {tasks.length === 0 && <div style={{ textAlign: 'center', color: '#4a4a6a', padding: 16, fontFamily: 'Inter, sans-serif', fontSize: 14 }}>No tasks yet</div>}
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </BentoCell>

        {editingTask !== null && (
          <BentoCell span="full">
            <GlassCard accentBar accent={ACCENT.todo}>
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 18, color: '#1a1a2e' }}>Edit Task</div>
                <GlassInput value={tf.title} onChange={v => setTf(p => ({ ...p, title: v }))} placeholder="Task title" />
                <GlassInput value={tf.note} onChange={v => setTf(p => ({ ...p, note: v }))} placeholder="Note" />
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: '#4a4a6a', marginBottom: 4, fontFamily: 'Inter, sans-serif' }}>Priority</div>
                    <select value={tf.priority} onChange={e => setTf(p => ({ ...p, priority: e.target.value as 'low'|'medium'|'high' }))}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.6)', borderRadius: 12, padding: '12px 16px', fontSize: 15, color: '#1a1a2e', outline: 'none', cursor: 'pointer' }}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: '#4a4a6a', marginBottom: 4, fontFamily: 'Inter, sans-serif' }}>Recurrence</div>
                    <select value={tf.recurrence} onChange={e => setTf(p => ({ ...p, recurrence: e.target.value }))}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.6)', borderRadius: 12, padding: '12px 16px', fontSize: 15, color: '#1a1a2e', outline: 'none', cursor: 'pointer' }}>
                      <option value="none">None</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#4a4a6a', marginBottom: 4, fontFamily: 'Inter, sans-serif' }}>Due date</div>
                  <input type="date" value={tf.due_date} onChange={e => setTf(p => ({ ...p, due_date: e.target.value }))}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.6)', borderRadius: 12, padding: '12px 16px', fontSize: 15, color: '#1a1a2e', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <PillButton onClick={saveTask} accent={ACCENT.todo}>Save</PillButton>
                  <PillButton variant="ghost" onClick={() => setEditingTask(null)}>Cancel</PillButton>
                  <PillButton variant="ghost" onClick={() => deleteTask(editingTask.id)} style={{ color: '#ef4444' }}>Delete</PillButton>
                </div>
              </div>
            </GlassCard>
          </BentoCell>
        )}
      </BentoGrid>
    </div>
  )
}
