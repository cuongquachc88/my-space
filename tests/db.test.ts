import { describe, it, expect, beforeEach } from 'vitest'
import { initDb, createNote, listNotes, getNote, updateNote, deleteNote } from '../src/offscreen/db'

describe('db - notes', () => {
  beforeEach(async () => {
    await initDb()
  })

  it('createNote returns a note with id', async () => {
    const note = await createNote('Test title', 'Test content')
    expect(note.id).toBeDefined()
    expect(note.title).toBe('Test title')
    expect(note.content).toBe('Test content')
    expect(note.created_at).toBeDefined()
  })

  it('listNotes returns created notes', async () => {
    await createNote('A', '')
    await createNote('B', '')
    const notes = await listNotes()
    expect(notes.length).toBeGreaterThanOrEqual(2)
  })

  it('updateNote changes title and content', async () => {
    const note = await createNote('Old', 'Old content')
    const updated = await updateNote(note.id, { title: 'New', content: 'New content' })
    expect(updated.title).toBe('New')
    expect(updated.content).toBe('New content')
  })

  it('deleteNote removes the note', async () => {
    const note = await createNote('To delete', '')
    await deleteNote(note.id)
    await expect(getNote(note.id)).rejects.toThrow('not found')
  })

  it('listNotes filters by search query', async () => {
    await createNote('Shopping list', 'Milk eggs bread')
    await createNote('Work tasks', 'Write PR description')
    const results = await listNotes('shopping')
    expect(results.length).toBe(1)
    expect(results[0].title).toBe('Shopping list')
  })
})
