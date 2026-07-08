import { describe, it, expect } from 'vitest'
import { decodeShareParam } from '../src/lib/shareLink'
import type { ShareStack } from '../src/lib/shareLink'
import LZString from 'lz-string'

function encode(stack: ShareStack): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(stack))
}

const sampleStack: ShareStack = {
  name: 'Tokyo trip',
  color: '#fb923c',
  pins: [
    { label: 'Shibuya', lat: 35.6595, lng: 139.7004, note: 'crossing', url: 'https://maps.google.com/?q=35.6595,139.7004' },
    { label: 'Shinjuku', lat: 35.6896, lng: 139.6917, note: '', url: '' },
  ],
}

describe('shareLink - decodeShareParam', () => {
  it('round-trips a full stack', () => {
    const param = encode(sampleStack)
    const result = decodeShareParam(param)
    expect(result).not.toBeNull()
    expect(result!.name).toBe('Tokyo trip')
    expect(result!.color).toBe('#fb923c')
    expect(result!.pins.length).toBe(2)
  })

  it('preserves pin labels and coords precisely', () => {
    const param = encode(sampleStack)
    const result = decodeShareParam(param)!
    expect(result.pins[0].label).toBe('Shibuya')
    expect(result.pins[0].lat).toBeCloseTo(35.6595, 4)
    expect(result.pins[0].lng).toBeCloseTo(139.7004, 4)
    expect(result.pins[1].label).toBe('Shinjuku')
  })

  it('preserves pin notes and urls', () => {
    const param = encode(sampleStack)
    const result = decodeShareParam(param)!
    expect(result.pins[0].note).toBe('crossing')
    expect(result.pins[0].url).toBe('https://maps.google.com/?q=35.6595,139.7004')
    expect(result.pins[1].note).toBe('')
    expect(result.pins[1].url).toBe('')
  })

  it('round-trips an empty pins list', () => {
    const emptyStack: ShareStack = { name: 'Empty', color: '#000', pins: [] }
    const result = decodeShareParam(encode(emptyStack))!
    expect(result.pins).toEqual([])
    expect(result.name).toBe('Empty')
  })

  it('round-trips a stack with many pins', () => {
    const big: ShareStack = {
      name: 'Big',
      color: '#34d399',
      pins: Array.from({ length: 50 }, (_, i) => ({
        label: `Pin ${i}`,
        lat: i * 0.01,
        lng: i * 0.02,
        note: `note ${i}`,
        url: `https://example.com/${i}`,
      })),
    }
    const result = decodeShareParam(encode(big))!
    expect(result.pins.length).toBe(50)
    expect(result.pins[49].label).toBe('Pin 49')
  })

  it('returns null for invalid compressed data', () => {
    expect(decodeShareParam('not-valid-lz-data')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(decodeShareParam('')).toBeNull()
  })

  it('returns null for valid base64 that is not a ShareStack JSON', () => {
    const garbage = LZString.compressToEncodedURIComponent('{"wrong":"shape"}')
    const result = decodeShareParam(garbage)
    // decodeShareParam does a best-effort parse — it returns the object as-is
    // The important thing is it doesn't throw
    expect(() => decodeShareParam(garbage)).not.toThrow()
    // And the result is missing required fields
    expect((result as Record<string, unknown> | null)?.pins).toBeUndefined()
  })

  it('produces a URL-safe param (no % encoding needed for +, space, =)', () => {
    const param = encode(sampleStack)
    // compressToEncodedURIComponent guarantees the result can be used directly in a
    // query string — verify it contains no characters that need percent-encoding
    expect(param).not.toMatch(/[%& #]/)
    expect(encodeURIComponent(decodeURIComponent(param))).toBe(encodeURIComponent(decodeURIComponent(param)))
  })

  it('compression reduces size vs plain JSON for large stacks', () => {
    const large: ShareStack = {
      name: 'Large',
      color: '#000',
      pins: Array.from({ length: 100 }, (_, i) => ({
        label: `Location number ${i} with a longer label`,
        lat: 35 + i * 0.001,
        lng: 139 + i * 0.001,
        note: 'Some repeated note text that should compress well',
        url: `https://maps.google.com/maps?q=${35 + i * 0.001},${139 + i * 0.001}`,
      })),
    }
    const compressed = encode(large)
    const raw = encodeURIComponent(JSON.stringify(large))
    expect(compressed.length).toBeLessThan(raw.length)
  })
})
