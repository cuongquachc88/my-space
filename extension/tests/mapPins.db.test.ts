import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryFS } from '@electric-sql/pglite'
import {
  initDb,
  createMapStack, listMapStacks, updateMapStack, deleteMapStack,
  createMapPin, listMapPins, updateMapPin, deleteMapPin,
} from '../src/offscreen/db'

describe('db - map_stacks', () => {
  beforeEach(async () => {
    await initDb(new MemoryFS())
  })

  it('createMapStack returns stack with id, name and color', async () => {
    const s = await createMapStack('Tokyo trip', '#fb923c')
    expect(s.id).toBeDefined()
    expect(s.name).toBe('Tokyo trip')
    expect(s.color).toBe('#fb923c')
    expect(s.created_at).toBeDefined()
  })

  it('listMapStacks returns all created stacks', async () => {
    await createMapStack('A', '#fb923c')
    await createMapStack('B', '#34d399')
    const list = await listMapStacks()
    expect(list.length).toBe(2)
  })

  it('listMapStacks includes all created stacks by name', async () => {
    await createMapStack('First', '#fb923c')
    await createMapStack('Second', '#34d399')
    const list = await listMapStacks()
    const names = list.map(s => s.name)
    expect(names).toContain('First')
    expect(names).toContain('Second')
  })

  it('updateMapStack changes name', async () => {
    const s = await createMapStack('Old', '#fb923c')
    const updated = await updateMapStack(s.id, { name: 'New name' })
    expect(updated.name).toBe('New name')
    expect(updated.color).toBe('#fb923c')
  })

  it('updateMapStack changes color', async () => {
    const s = await createMapStack('Name', '#fb923c')
    const updated = await updateMapStack(s.id, { color: '#818cf8' })
    expect(updated.color).toBe('#818cf8')
    expect(updated.name).toBe('Name')
  })

  it('updateMapStack with no fields throws', async () => {
    const s = await createMapStack('Name', '#000')
    await expect(updateMapStack(s.id, {})).rejects.toThrow()
  })

  it('updateMapStack unknown id throws', async () => {
    await expect(updateMapStack('no-such-id', { name: 'X' })).rejects.toThrow('not found')
  })

  it('deleteMapStack removes the stack', async () => {
    const s = await createMapStack('Gone', '#fb923c')
    await deleteMapStack(s.id)
    const list = await listMapStacks()
    expect(list.find(x => x.id === s.id)).toBeUndefined()
  })

  it('listMapStacks returns empty list when none exist', async () => {
    const list = await listMapStacks()
    expect(list).toEqual([])
  })
})

describe('db - map_pins', () => {
  beforeEach(async () => {
    await initDb(new MemoryFS())
  })

  async function makeStack(name = 'Stack') {
    return createMapStack(name, '#fb923c')
  }

  it('createMapPin returns pin with id and coords', async () => {
    const stack = await makeStack()
    const pin = await createMapPin(stack.id, 'Shibuya', 35.6595, 139.7004, 'https://maps.google.com', 'crossing')
    expect(pin.id).toBeDefined()
    expect(pin.stack_id).toBe(stack.id)
    expect(pin.label).toBe('Shibuya')
    expect(pin.lat).toBeCloseTo(35.6595)
    expect(pin.lng).toBeCloseTo(139.7004)
    expect(pin.url).toBe('https://maps.google.com')
    expect(pin.note).toBe('crossing')
  })

  it('listMapPins returns pins for the given stack', async () => {
    const s = await makeStack()
    await createMapPin(s.id, 'A', 1, 2, '', '')
    await createMapPin(s.id, 'B', 3, 4, '', '')
    const pins = await listMapPins(s.id)
    expect(pins.length).toBe(2)
  })

  it('listMapPins only returns pins for the requested stack', async () => {
    const s1 = await makeStack('S1')
    const s2 = await makeStack('S2')
    await createMapPin(s1.id, 'For S1', 1, 2, '', '')
    await createMapPin(s2.id, 'For S2', 3, 4, '', '')
    const pins = await listMapPins(s1.id)
    expect(pins.length).toBe(1)
    expect(pins[0].label).toBe('For S1')
  })

  it('listMapPins includes all created pins by label', async () => {
    const s = await makeStack()
    await createMapPin(s.id, 'First', 1, 1, '', '')
    await createMapPin(s.id, 'Second', 2, 2, '', '')
    const pins = await listMapPins(s.id)
    const labels = pins.map(p => p.label)
    expect(labels).toContain('First')
    expect(labels).toContain('Second')
  })

  it('listMapPins returns empty when stack has no pins', async () => {
    const s = await makeStack()
    const pins = await listMapPins(s.id)
    expect(pins).toEqual([])
  })

  it('updateMapPin changes label', async () => {
    const s = await makeStack()
    const pin = await createMapPin(s.id, 'Old label', 1, 2, '', '')
    const updated = await updateMapPin(pin.id, { label: 'New label' })
    expect(updated.label).toBe('New label')
  })

  it('updateMapPin changes note', async () => {
    const s = await makeStack()
    const pin = await createMapPin(s.id, 'Label', 1, 2, '', 'old note')
    const updated = await updateMapPin(pin.id, { note: 'new note' })
    expect(updated.note).toBe('new note')
  })

  it('updateMapPin preserves coords', async () => {
    const s = await makeStack()
    const pin = await createMapPin(s.id, 'L', 35.6, 139.7, '', '')
    const updated = await updateMapPin(pin.id, { label: 'Updated' })
    expect(updated.lat).toBeCloseTo(35.6)
    expect(updated.lng).toBeCloseTo(139.7)
  })

  it('updateMapPin with no fields throws', async () => {
    const s = await makeStack()
    const pin = await createMapPin(s.id, 'L', 1, 2, '', '')
    await expect(updateMapPin(pin.id, {})).rejects.toThrow()
  })

  it('updateMapPin unknown id throws', async () => {
    await expect(updateMapPin('no-such-id', { label: 'X' })).rejects.toThrow('not found')
  })

  it('deleteMapPin removes the pin', async () => {
    const s = await makeStack()
    const pin = await createMapPin(s.id, 'ToDelete', 1, 2, '', '')
    await deleteMapPin(pin.id)
    const pins = await listMapPins(s.id)
    expect(pins.find(p => p.id === pin.id)).toBeUndefined()
  })

  it('deleteMapStack cascades and removes all its pins', async () => {
    const s = await makeStack()
    await createMapPin(s.id, 'Pin 1', 1, 1, '', '')
    await createMapPin(s.id, 'Pin 2', 2, 2, '', '')
    await deleteMapStack(s.id)
    const pins = await listMapPins(s.id)
    expect(pins).toEqual([])
  })

  it('createMapPin stores empty url and note', async () => {
    const s = await makeStack()
    const pin = await createMapPin(s.id, 'Minimal', 0, 0, '', '')
    expect(pin.url).toBe('')
    expect(pin.note).toBe('')
  })

  it('coords are stored with high precision', async () => {
    const s = await makeStack()
    const lat = 35.68950123456
    const lng = 139.69171234567
    const pin = await createMapPin(s.id, 'Precise', lat, lng, '', '')
    expect(pin.lat).toBeCloseTo(lat, 5)
    expect(pin.lng).toBeCloseTo(lng, 5)
  })
})
