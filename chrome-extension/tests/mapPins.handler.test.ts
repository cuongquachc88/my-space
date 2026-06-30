import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryFS } from '@electric-sql/pglite'
import { initDb } from '../src/offscreen/db'
import { lockVault } from '../src/offscreen/crypto'
import { dispatch } from '../src/offscreen/handler'

type AnyReply = { ok: boolean; data?: unknown; error?: string }
function data<T>(r: AnyReply): T { return r.data as T }

async function makeStack(name = 'My Stack', color = '#fb923c') {
  return dispatch({ type: 'STACKS_CREATE', payload: { name, color } })
}

describe('handler — STACKS', () => {
  beforeEach(async () => { await initDb(new MemoryFS()); lockVault() })

  it('STACKS_CREATE returns ok with id, name, color', async () => {
    const r = await makeStack('Tokyo trip', '#34d399')
    expect(r.ok).toBe(true)
    expect(data<{ name: string }>(r).name).toBe('Tokyo trip')
    expect(data<{ color: string }>(r).color).toBe('#34d399')
    expect(data<{ id: string }>(r).id).toBeDefined()
  })

  it('STACKS_LIST returns created stacks', async () => {
    await makeStack('A')
    await makeStack('B')
    const r = await dispatch({ type: 'STACKS_LIST' })
    expect(r.ok).toBe(true)
    expect((r.data as unknown[]).length).toBe(2)
  })

  it('STACKS_LIST returns empty array when none exist', async () => {
    const r = await dispatch({ type: 'STACKS_LIST' })
    expect(r.ok).toBe(true)
    expect(r.data as unknown[]).toEqual([])
  })

  it('STACKS_UPDATE changes name', async () => {
    const created = await makeStack('Old')
    const id = data<{ id: string }>(created).id
    const r = await dispatch({ type: 'STACKS_UPDATE', payload: { id, name: 'Updated' } })
    expect(r.ok).toBe(true)
    expect(data<{ name: string }>(r).name).toBe('Updated')
  })

  it('STACKS_UPDATE changes color', async () => {
    const created = await makeStack('Name', '#fb923c')
    const id = data<{ id: string }>(created).id
    const r = await dispatch({ type: 'STACKS_UPDATE', payload: { id, color: '#818cf8' } })
    expect(data<{ color: string }>(r).color).toBe('#818cf8')
  })

  it('STACKS_DELETE removes stack', async () => {
    const created = await makeStack('Gone')
    const id = data<{ id: string }>(created).id
    const del = await dispatch({ type: 'STACKS_DELETE', payload: { id } })
    expect(del.ok).toBe(true)
    const list = await dispatch({ type: 'STACKS_LIST' })
    const stacks = data<Array<{ id: string }>>(list)
    expect(stacks.find(s => s.id === id)).toBeUndefined()
  })
})

describe('handler — PINS', () => {
  beforeEach(async () => { await initDb(new MemoryFS()); lockVault() })

  async function mkStack() {
    const r = await makeStack()
    return data<{ id: string }>(r).id
  }

  it('PINS_CREATE returns ok with id and coords', async () => {
    const stackId = await mkStack()
    const r = await dispatch({
      type: 'PINS_CREATE',
      payload: { stack_id: stackId, label: 'Shibuya', lat: 35.6595, lng: 139.7004, url: 'https://maps.google.com', note: 'busy crossing' },
    })
    expect(r.ok).toBe(true)
    expect(data<{ id: string }>(r).id).toBeDefined()
    expect(data<{ label: string }>(r).label).toBe('Shibuya')
    expect(data<{ lat: number }>(r).lat).toBeCloseTo(35.6595)
    expect(data<{ lng: number }>(r).lng).toBeCloseTo(139.7004)
    expect(data<{ note: string }>(r).note).toBe('busy crossing')
  })

  it('PINS_LIST returns pins for the stack', async () => {
    const stackId = await mkStack()
    await dispatch({ type: 'PINS_CREATE', payload: { stack_id: stackId, label: 'A', lat: 1, lng: 2, url: '', note: '' } })
    await dispatch({ type: 'PINS_CREATE', payload: { stack_id: stackId, label: 'B', lat: 3, lng: 4, url: '', note: '' } })
    const r = await dispatch({ type: 'PINS_LIST', payload: { stack_id: stackId } })
    expect(r.ok).toBe(true)
    expect((r.data as unknown[]).length).toBe(2)
  })

  it('PINS_LIST returns empty when stack has no pins', async () => {
    const stackId = await mkStack()
    const r = await dispatch({ type: 'PINS_LIST', payload: { stack_id: stackId } })
    expect(r.ok).toBe(true)
    expect(r.data as unknown[]).toEqual([])
  })

  it('PINS_LIST isolates pins between stacks', async () => {
    const s1 = await mkStack()
    const s2 = await mkStack()
    await dispatch({ type: 'PINS_CREATE', payload: { stack_id: s1, label: 'In S1', lat: 1, lng: 1, url: '', note: '' } })
    await dispatch({ type: 'PINS_CREATE', payload: { stack_id: s2, label: 'In S2', lat: 2, lng: 2, url: '', note: '' } })
    const r = await dispatch({ type: 'PINS_LIST', payload: { stack_id: s1 } })
    const pins = data<Array<{ label: string }>>(r)
    expect(pins.length).toBe(1)
    expect(pins[0].label).toBe('In S1')
  })

  it('PINS_UPDATE changes label', async () => {
    const stackId = await mkStack()
    const created = await dispatch({ type: 'PINS_CREATE', payload: { stack_id: stackId, label: 'Old', lat: 0, lng: 0, url: '', note: '' } })
    const id = data<{ id: string }>(created).id
    const r = await dispatch({ type: 'PINS_UPDATE', payload: { id, label: 'New label' } })
    expect(r.ok).toBe(true)
    expect(data<{ label: string }>(r).label).toBe('New label')
  })

  it('PINS_UPDATE changes note', async () => {
    const stackId = await mkStack()
    const created = await dispatch({ type: 'PINS_CREATE', payload: { stack_id: stackId, label: 'L', lat: 0, lng: 0, url: '', note: 'old' } })
    const id = data<{ id: string }>(created).id
    const r = await dispatch({ type: 'PINS_UPDATE', payload: { id, note: 'updated note' } })
    expect(data<{ note: string }>(r).note).toBe('updated note')
  })

  it('PINS_DELETE removes the pin', async () => {
    const stackId = await mkStack()
    const created = await dispatch({ type: 'PINS_CREATE', payload: { stack_id: stackId, label: 'ToGo', lat: 0, lng: 0, url: '', note: '' } })
    const id = data<{ id: string }>(created).id
    const del = await dispatch({ type: 'PINS_DELETE', payload: { id } })
    expect(del.ok).toBe(true)
    const list = await dispatch({ type: 'PINS_LIST', payload: { stack_id: stackId } })
    const pins = data<Array<{ id: string }>>(list)
    expect(pins.find(p => p.id === id)).toBeUndefined()
  })

  it('STACKS_DELETE cascades and removes pins', async () => {
    const stackId = await mkStack()
    await dispatch({ type: 'PINS_CREATE', payload: { stack_id: stackId, label: 'Pin', lat: 1, lng: 1, url: '', note: '' } })
    await dispatch({ type: 'STACKS_DELETE', payload: { id: stackId } })
    const r = await dispatch({ type: 'PINS_LIST', payload: { stack_id: stackId } })
    expect((r.data as unknown[]).length).toBe(0)
  })

  it('multiple pins in a stack accumulate correctly', async () => {
    const stackId = await mkStack()
    for (let i = 0; i < 5; i++) {
      await dispatch({ type: 'PINS_CREATE', payload: { stack_id: stackId, label: `Pin ${i}`, lat: i, lng: i, url: '', note: '' } })
    }
    const r = await dispatch({ type: 'PINS_LIST', payload: { stack_id: stackId } })
    expect((r.data as unknown[]).length).toBe(5)
  })
})
