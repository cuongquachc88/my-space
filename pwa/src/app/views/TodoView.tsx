import { useEffect, useState, useCallback } from 'react'
import { getDb } from '../../db'

interface TodoList { id: string; name: string; color: string; icon: string }
interface TodoTask { id: string; list_id: string; title: string; note: string; priority: 'low'|'medium'|'high'; due_date: string|null; recurrence: string; done: boolean; created_at: string }

const COLORS = ['#818cf8','#34d399','#f59e0b','#f87171','#60a5fa','#a78bfa','#fb923c','#e879f9']
const PRIORITY_COLOR: Record<string, string> = { high:'text-red-400', medium:'text-yellow-400', low:'text-blue-400' }

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

  if (editingTask) {
    return (
      <div className="flex flex-col h-full bg-[#0f2020]">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-[#0d1f1f]">
          <button onClick={() => setEditingTask(null)} className="text-white/50 hover:text-white mr-1">←</button>
          <span className="font-semibold flex-1">Edit Task</span>
          <button onClick={saveTask} className="text-xs bg-[#b4e645] text-[#0f2020] font-semibold px-3 py-1 rounded-full">Save</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          <input value={tf.title} onChange={e => setTf(p=>({...p,title:e.target.value}))} placeholder="Task title" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none" />
          <textarea value={tf.note} onChange={e => setTf(p=>({...p,note:e.target.value}))} placeholder="Note" rows={3} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none resize-none" />
          <div className="flex gap-2">
            <div className="flex-1">
              <div className="text-xs text-white/40 mb-1">Priority</div>
              <select value={tf.priority} onChange={e => setTf(p=>({...p,priority:e.target.value as 'low'|'medium'|'high'}))} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="flex-1">
              <div className="text-xs text-white/40 mb-1">Recurrence</div>
              <select value={tf.recurrence} onChange={e => setTf(p=>({...p,recurrence:e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none">
                <option value="none">None</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
          <div>
            <div className="text-xs text-white/40 mb-1">Due date</div>
            <input type="date" value={tf.due_date} onChange={e => setTf(p=>({...p,due_date:e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none" />
          </div>
          <button onClick={() => deleteTask(editingTask.id)} className="text-red-400 text-sm text-left mt-2">Delete task</button>
        </div>
      </div>
    )
  }

  if (activeList) {
    const done = tasks.filter(t => t.done)
    const pending = tasks.filter(t => !t.done)
    return (
      <div className="flex flex-col h-full bg-[#0f2020]">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-[#0d1f1f]">
          <button onClick={() => setActiveList(null)} className="text-white/50 hover:text-white mr-1">←</button>
          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: activeList.color }} />
          <span className="font-semibold flex-1">{activeList.name}</span>
          <button onClick={() => deleteList(activeList.id)} className="text-white/30 hover:text-red-400 text-xs">Delete list</button>
        </div>
        <div className="px-4 py-3 border-b border-white/10 flex gap-2">
          <input
            value={newTaskTitle}
            onChange={e => setNewTaskTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()}
            placeholder="Add task…"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none"
          />
          <button onClick={addTask} className="bg-[#b4e645] text-[#0f2020] font-bold px-4 py-2 rounded-lg text-sm">Add</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {pending.map(t => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 group">
              <button onClick={() => toggleDone(t)} className="w-5 h-5 rounded-full border-2 border-white/30 shrink-0 hover:border-[#b4e645] transition-colors" />
              <div className="flex-1 min-w-0" onClick={() => { setEditingTask(t); setTf({ title:t.title, note:t.note, priority:t.priority, due_date:t.due_date??'', recurrence:t.recurrence }) }}>
                <div className="text-sm cursor-pointer hover:text-[#b4e645]">{t.title}</div>
                {t.due_date && <div className="text-xs text-white/40">{t.due_date}</div>}
              </div>
              <span className={`text-xs ${PRIORITY_COLOR[t.priority]} shrink-0`}>{t.priority}</span>
              {t.recurrence !== 'none' && <span className="text-xs text-white/30 shrink-0">↺</span>}
            </div>
          ))}
          {done.length > 0 && (
            <div className="px-4 py-2 text-xs text-white/30 mt-2">Completed ({done.length})</div>
          )}
          {done.map(t => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 opacity-40">
              <button onClick={() => toggleDone(t)} className="w-5 h-5 rounded-full border-2 border-[#b4e645] bg-[#b4e645]/20 shrink-0 flex items-center justify-center text-[#b4e645] text-xs">✓</button>
              <span className="text-sm line-through flex-1">{t.title}</span>
            </div>
          ))}
          {tasks.length === 0 && <div className="text-center text-white/30 py-12 text-sm">No tasks yet</div>}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[#0f2020]">
      <div className="px-4 pt-4 pb-3 border-b border-white/10 bg-[#0d1f1f]">
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-lg">Todo</h1>
          <button onClick={() => setShowNewList(true)} className="bg-[#b4e645] text-[#0f2020] font-bold px-4 py-1.5 rounded-full text-sm">+ List</button>
        </div>
      </div>

      {showNewList && (
        <div className="px-4 py-3 border-b border-white/10 bg-[#152a2a] flex flex-col gap-2">
          <input value={newListName} onChange={e => setNewListName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createList()} placeholder="List name" autoFocus className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none" />
          <div className="flex gap-1.5">
            {COLORS.map(c => <button key={c} onClick={() => setNewListColor(c)} className={`w-6 h-6 rounded-full border-2 transition-all ${newListColor===c ? 'border-white scale-125' : 'border-transparent'}`} style={{ background:c }} />)}
          </div>
          <div className="flex gap-2">
            <button onClick={createList} className="bg-[#b4e645] text-[#0f2020] font-semibold px-4 py-1.5 rounded-full text-sm">Create</button>
            <button onClick={() => setShowNewList(false)} className="text-white/40 text-sm px-3">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {lists.length === 0 ? (
          <div className="text-center text-white/30 py-16 text-sm">No lists yet — create one above</div>
        ) : lists.map(l => (
          <button key={l.id} onClick={() => setActiveList(l)} className="w-full text-left px-4 py-4 border-b border-white/5 hover:bg-white/5 transition-colors flex items-center gap-3">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background:l.color }} />
            <span className="font-medium">{l.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
