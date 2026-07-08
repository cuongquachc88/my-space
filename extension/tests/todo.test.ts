import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryFS } from '@electric-sql/pglite'
import { initDb, createTodoList, listTodoLists, updateTodoList, deleteTodoList, createTodoTask, listTodoTasks, updateTodoTask, deleteTodoTask } from '../src/offscreen/db'
import { lockVault } from '../src/offscreen/crypto'
import { dispatch } from '../src/offscreen/handler'

type AnyReply = { ok: boolean; data?: unknown; error?: string }
function data<T>(r: AnyReply): T { return r.data as T }

// ── DB layer ─────────────────────────────────────────────────────────────────

describe('db - todo_lists', () => {
  beforeEach(async () => { await initDb(new MemoryFS()) })

  it('createTodoList returns list with id, name, color', async () => {
    const l = await createTodoList('Work', '#38bdf8')
    expect(l.id).toBeDefined()
    expect(l.name).toBe('Work')
    expect(l.color).toBe('#38bdf8')
    expect(l.created_at).toBeDefined()
  })

  it('listTodoLists returns all created lists', async () => {
    await createTodoList('A', '#38bdf8')
    await createTodoList('B', '#34d399')
    const lists = await listTodoLists()
    expect(lists.length).toBe(2)
  })

  it('listTodoLists returns empty when none exist', async () => {
    expect(await listTodoLists()).toEqual([])
  })

  it('updateTodoList changes name', async () => {
    const l = await createTodoList('Old', '#38bdf8')
    const updated = await updateTodoList(l.id, { name: 'New' })
    expect(updated.name).toBe('New')
  })

  it('updateTodoList changes color', async () => {
    const l = await createTodoList('Name', '#38bdf8')
    const updated = await updateTodoList(l.id, { color: '#f87171' })
    expect(updated.color).toBe('#f87171')
  })

  it('updateTodoList with no fields throws', async () => {
    const l = await createTodoList('X', '#000')
    await expect(updateTodoList(l.id, {})).rejects.toThrow()
  })

  it('updateTodoList unknown id throws', async () => {
    await expect(updateTodoList('ghost', { name: 'X' })).rejects.toThrow('not found')
  })

  it('deleteTodoList removes the list', async () => {
    const l = await createTodoList('Gone', '#000')
    await deleteTodoList(l.id)
    const lists = await listTodoLists()
    expect(lists.find(x => x.id === l.id)).toBeUndefined()
  })
})

describe('db - todo_tasks', () => {
  beforeEach(async () => { await initDb(new MemoryFS()) })

  async function mkList() { return createTodoList('Test', '#38bdf8') }

  it('createTodoTask returns task with all fields', async () => {
    const l = await mkList()
    const t = await createTodoTask(l.id, 'Write tests', 'Important', 'high', '2026-07-01', 'none')
    expect(t.id).toBeDefined()
    expect(t.list_id).toBe(l.id)
    expect(t.title).toBe('Write tests')
    expect(t.note).toBe('Important')
    expect(t.priority).toBe('high')
    expect(t.due_date).toBe('2026-07-01')
    expect(t.recurrence).toBe('none')
    expect(t.done).toBe(false)
  })

  it('createTodoTask with null due_date stores null', async () => {
    const l = await mkList()
    const t = await createTodoTask(l.id, 'No deadline', '', 'low', null, 'none')
    expect(t.due_date).toBeNull()
  })

  it('listTodoTasks returns tasks for list', async () => {
    const l = await mkList()
    await createTodoTask(l.id, 'Task A', '', 'medium', null, 'none')
    await createTodoTask(l.id, 'Task B', '', 'medium', null, 'none')
    const tasks = await listTodoTasks(l.id)
    expect(tasks.length).toBe(2)
  })

  it('listTodoTasks returns empty when list has no tasks', async () => {
    const l = await mkList()
    expect(await listTodoTasks(l.id)).toEqual([])
  })

  it('listTodoTasks isolates tasks between lists', async () => {
    const l1 = await mkList()
    const l2 = await mkList()
    await createTodoTask(l1.id, 'For L1', '', 'medium', null, 'none')
    await createTodoTask(l2.id, 'For L2', '', 'medium', null, 'none')
    const tasks = await listTodoTasks(l1.id)
    expect(tasks.length).toBe(1)
    expect(tasks[0].title).toBe('For L1')
  })

  it('listTodoTasks sorts undone before done', async () => {
    const l = await mkList()
    await createTodoTask(l.id, 'Pending', '', 'medium', null, 'none')
    const done = await createTodoTask(l.id, 'Done', '', 'medium', null, 'none')
    await updateTodoTask(done.id, { done: true })
    const tasks = await listTodoTasks(l.id)
    expect(tasks[0].done).toBe(false)
    expect(tasks[tasks.length - 1].done).toBe(true)
  })

  it('updateTodoTask marks task as done', async () => {
    const l = await mkList()
    const t = await createTodoTask(l.id, 'Finish me', '', 'medium', null, 'none')
    const updated = await updateTodoTask(t.id, { done: true })
    expect(updated.done).toBe(true)
  })

  it('updateTodoTask changes title and note', async () => {
    const l = await mkList()
    const t = await createTodoTask(l.id, 'Old', 'old note', 'medium', null, 'none')
    const updated = await updateTodoTask(t.id, { title: 'New', note: 'new note' })
    expect(updated.title).toBe('New')
    expect(updated.note).toBe('new note')
  })

  it('updateTodoTask changes priority', async () => {
    const l = await mkList()
    const t = await createTodoTask(l.id, 'Task', '', 'low', null, 'none')
    const updated = await updateTodoTask(t.id, { priority: 'high' })
    expect(updated.priority).toBe('high')
  })

  it('updateTodoTask changes due_date', async () => {
    const l = await mkList()
    const t = await createTodoTask(l.id, 'Task', '', 'medium', null, 'none')
    const updated = await updateTodoTask(t.id, { due_date: '2026-12-31' })
    expect(updated.due_date).toBe('2026-12-31')
  })

  it('updateTodoTask changes recurrence', async () => {
    const l = await mkList()
    const t = await createTodoTask(l.id, 'Daily standup', '', 'medium', '2026-07-01', 'none')
    const updated = await updateTodoTask(t.id, { recurrence: 'daily' })
    expect(updated.recurrence).toBe('daily')
  })

  it('updateTodoTask with no fields throws', async () => {
    const l = await mkList()
    const t = await createTodoTask(l.id, 'Task', '', 'medium', null, 'none')
    await expect(updateTodoTask(t.id, {})).rejects.toThrow()
  })

  it('updateTodoTask unknown id throws', async () => {
    await expect(updateTodoTask('ghost', { done: true })).rejects.toThrow('not found')
  })

  it('deleteTodoTask removes the task', async () => {
    const l = await mkList()
    const t = await createTodoTask(l.id, 'Delete me', '', 'medium', null, 'none')
    await deleteTodoTask(t.id)
    const tasks = await listTodoTasks(l.id)
    expect(tasks.find(x => x.id === t.id)).toBeUndefined()
  })

  it('deleteTodoList cascades and removes its tasks', async () => {
    const l = await mkList()
    await createTodoTask(l.id, 'Task 1', '', 'medium', null, 'none')
    await createTodoTask(l.id, 'Task 2', '', 'medium', null, 'none')
    await deleteTodoList(l.id)
    const tasks = await listTodoTasks(l.id)
    expect(tasks).toEqual([])
  })
})

// ── Handler layer ─────────────────────────────────────────────────────────────

describe('handler — TODO_LISTS', () => {
  beforeEach(async () => { await initDb(new MemoryFS()); lockVault() })

  it('TODO_LISTS_CREATE returns ok with name and color', async () => {
    const r = await dispatch({ type: 'TODO_LISTS_CREATE', payload: { name: 'Work', color: '#38bdf8' } })
    expect(r.ok).toBe(true)
    expect(data<{ name: string }>(r).name).toBe('Work')
    expect(data<{ color: string }>(r).color).toBe('#38bdf8')
    expect(data<{ id: string }>(r).id).toBeDefined()
  })

  it('TODO_LISTS_LIST returns created lists', async () => {
    await dispatch({ type: 'TODO_LISTS_CREATE', payload: { name: 'A', color: '#000' } })
    await dispatch({ type: 'TODO_LISTS_CREATE', payload: { name: 'B', color: '#fff' } })
    const r = await dispatch({ type: 'TODO_LISTS_LIST' })
    expect(r.ok).toBe(true)
    expect((r.data as unknown[]).length).toBe(2)
  })

  it('TODO_LISTS_LIST returns empty array when none exist', async () => {
    const r = await dispatch({ type: 'TODO_LISTS_LIST' })
    expect(r.ok).toBe(true)
    expect(r.data as unknown[]).toEqual([])
  })

  it('TODO_LISTS_UPDATE changes name', async () => {
    const c = await dispatch({ type: 'TODO_LISTS_CREATE', payload: { name: 'Old', color: '#000' } })
    const id = data<{ id: string }>(c).id
    const r = await dispatch({ type: 'TODO_LISTS_UPDATE', payload: { id, name: 'New' } })
    expect(r.ok).toBe(true)
    expect(data<{ name: string }>(r).name).toBe('New')
  })

  it('TODO_LISTS_DELETE removes list', async () => {
    const c = await dispatch({ type: 'TODO_LISTS_CREATE', payload: { name: 'Gone', color: '#000' } })
    const id = data<{ id: string }>(c).id
    await dispatch({ type: 'TODO_LISTS_DELETE', payload: { id } })
    const r = await dispatch({ type: 'TODO_LISTS_LIST' })
    expect((r.data as unknown[]).length).toBe(0)
  })
})

describe('handler — TODO_TASKS', () => {
  beforeEach(async () => { await initDb(new MemoryFS()); lockVault() })

  async function mkList() {
    const r = await dispatch({ type: 'TODO_LISTS_CREATE', payload: { name: 'List', color: '#38bdf8' } })
    return data<{ id: string }>(r).id
  }

  it('TODO_TASKS_CREATE returns ok with all fields', async () => {
    const listId = await mkList()
    const r = await dispatch({
      type: 'TODO_TASKS_CREATE',
      payload: { list_id: listId, title: 'Buy milk', note: 'full fat', priority: 'low', due_date: '2026-07-01', recurrence: 'weekly' },
    })
    expect(r.ok).toBe(true)
    expect(data<{ title: string }>(r).title).toBe('Buy milk')
    expect(data<{ priority: string }>(r).priority).toBe('low')
    expect(data<{ due_date: string }>(r).due_date).toBe('2026-07-01')
    expect(data<{ recurrence: string }>(r).recurrence).toBe('weekly')
    expect(data<{ done: boolean }>(r).done).toBe(false)
  })

  it('TODO_TASKS_LIST returns tasks for list', async () => {
    const listId = await mkList()
    await dispatch({ type: 'TODO_TASKS_CREATE', payload: { list_id: listId, title: 'A', note: '', priority: 'medium', due_date: null, recurrence: 'none' } })
    await dispatch({ type: 'TODO_TASKS_CREATE', payload: { list_id: listId, title: 'B', note: '', priority: 'medium', due_date: null, recurrence: 'none' } })
    const r = await dispatch({ type: 'TODO_TASKS_LIST', payload: { list_id: listId } })
    expect(r.ok).toBe(true)
    expect((r.data as unknown[]).length).toBe(2)
  })

  it('TODO_TASKS_LIST isolates tasks between lists', async () => {
    const l1 = await mkList()
    const l2 = await mkList()
    await dispatch({ type: 'TODO_TASKS_CREATE', payload: { list_id: l1, title: 'In L1', note: '', priority: 'medium', due_date: null, recurrence: 'none' } })
    await dispatch({ type: 'TODO_TASKS_CREATE', payload: { list_id: l2, title: 'In L2', note: '', priority: 'medium', due_date: null, recurrence: 'none' } })
    const r = await dispatch({ type: 'TODO_TASKS_LIST', payload: { list_id: l1 } })
    const tasks = data<Array<{ title: string }>>(r)
    expect(tasks.length).toBe(1)
    expect(tasks[0].title).toBe('In L1')
  })

  it('TODO_TASKS_UPDATE marks task done', async () => {
    const listId = await mkList()
    const c = await dispatch({ type: 'TODO_TASKS_CREATE', payload: { list_id: listId, title: 'Finish', note: '', priority: 'medium', due_date: null, recurrence: 'none' } })
    const id = data<{ id: string }>(c).id
    const r = await dispatch({ type: 'TODO_TASKS_UPDATE', payload: { id, done: true } })
    expect(r.ok).toBe(true)
    expect(data<{ done: boolean }>(r).done).toBe(true)
  })

  it('TODO_TASKS_UPDATE changes priority', async () => {
    const listId = await mkList()
    const c = await dispatch({ type: 'TODO_TASKS_CREATE', payload: { list_id: listId, title: 'T', note: '', priority: 'low', due_date: null, recurrence: 'none' } })
    const id = data<{ id: string }>(c).id
    const r = await dispatch({ type: 'TODO_TASKS_UPDATE', payload: { id, priority: 'high' } })
    expect(data<{ priority: string }>(r).priority).toBe('high')
  })

  it('TODO_TASKS_UPDATE changes due_date', async () => {
    const listId = await mkList()
    const c = await dispatch({ type: 'TODO_TASKS_CREATE', payload: { list_id: listId, title: 'T', note: '', priority: 'medium', due_date: null, recurrence: 'none' } })
    const id = data<{ id: string }>(c).id
    const r = await dispatch({ type: 'TODO_TASKS_UPDATE', payload: { id, due_date: '2026-12-25' } })
    expect(data<{ due_date: string }>(r).due_date).toBe('2026-12-25')
  })

  it('TODO_TASKS_DELETE removes task', async () => {
    const listId = await mkList()
    const c = await dispatch({ type: 'TODO_TASKS_CREATE', payload: { list_id: listId, title: 'Delete me', note: '', priority: 'medium', due_date: null, recurrence: 'none' } })
    const id = data<{ id: string }>(c).id
    await dispatch({ type: 'TODO_TASKS_DELETE', payload: { id } })
    const r = await dispatch({ type: 'TODO_TASKS_LIST', payload: { list_id: listId } })
    expect((r.data as unknown[]).length).toBe(0)
  })

  it('TODO_LISTS_DELETE cascades and removes tasks', async () => {
    const listId = await mkList()
    await dispatch({ type: 'TODO_TASKS_CREATE', payload: { list_id: listId, title: 'Task', note: '', priority: 'medium', due_date: null, recurrence: 'none' } })
    await dispatch({ type: 'TODO_LISTS_DELETE', payload: { id: listId } })
    const r = await dispatch({ type: 'TODO_TASKS_LIST', payload: { list_id: listId } })
    expect((r.data as unknown[]).length).toBe(0)
  })

  it('accumulates many tasks in a list', async () => {
    const listId = await mkList()
    for (let i = 0; i < 10; i++) {
      await dispatch({ type: 'TODO_TASKS_CREATE', payload: { list_id: listId, title: `Task ${i}`, note: '', priority: 'medium', due_date: null, recurrence: 'none' } })
    }
    const r = await dispatch({ type: 'TODO_TASKS_LIST', payload: { list_id: listId } })
    expect((r.data as unknown[]).length).toBe(10)
  })
})
