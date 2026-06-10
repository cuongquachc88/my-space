import { describe, it, expect } from 'vitest'
import { generatePassword } from '../src/lib/generatePassword'

describe('generatePassword', () => {
  it('returns string of exact requested length', () => {
    expect(generatePassword({ length: 16, upper: true, lower: true, digits: true, symbols: false })).toHaveLength(16)
    expect(generatePassword({ length: 32, upper: true, lower: true, digits: false, symbols: false })).toHaveLength(32)
  })

  it('contains only lowercase when lower-only', () => {
    const pw = generatePassword({ length: 50, upper: false, lower: true, digits: false, symbols: false })
    expect(/^[a-z]+$/.test(pw)).toBe(true)
  })

  it('contains only uppercase when upper-only', () => {
    const pw = generatePassword({ length: 50, upper: true, lower: false, digits: false, symbols: false })
    expect(/^[A-Z]+$/.test(pw)).toBe(true)
  })

  it('contains only digits when digits-only', () => {
    const pw = generatePassword({ length: 50, upper: false, lower: false, digits: true, symbols: false })
    expect(/^[0-9]+$/.test(pw)).toBe(true)
  })

  it('guarantees at least one char from each enabled set', () => {
    for (let i = 0; i < 100; i++) {
      const pw = generatePassword({ length: 20, upper: true, lower: true, digits: true, symbols: true })
      expect(/[A-Z]/.test(pw)).toBe(true)
      expect(/[a-z]/.test(pw)).toBe(true)
      expect(/[0-9]/.test(pw)).toBe(true)
      expect(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(pw)).toBe(true)
    }
  })

  it('only contains symbol chars from the defined symbol set', () => {
    const pw = generatePassword({ length: 100, upper: false, lower: false, digits: false, symbols: true })
    expect(/^[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]+$/.test(pw)).toBe(true)
  })

  it('throws when no charset selected', () => {
    expect(() => generatePassword({ length: 16, upper: false, lower: false, digits: false, symbols: false })).toThrow('No character set selected')
  })

  it('throws when length is less than number of enabled sets', () => {
    // 4 sets enabled but length 3 — not enough room to guarantee one from each
    expect(() => generatePassword({ length: 3, upper: true, lower: true, digits: true, symbols: true })).toThrow('length (3) must be at least')
  })

  it('throws when length is zero or negative', () => {
    expect(() => generatePassword({ length: 0, upper: true, lower: false, digits: false, symbols: false })).toThrow('length must be a positive integer')
    expect(() => generatePassword({ length: -1, upper: true, lower: false, digits: false, symbols: false })).toThrow('length must be a positive integer')
  })

  it('works when length exactly equals number of enabled sets', () => {
    // length 2, 2 sets — each set contributes exactly 1 guaranteed char
    const pw = generatePassword({ length: 2, upper: true, lower: true, digits: false, symbols: false })
    expect(pw).toHaveLength(2)
    expect(/[A-Z]/.test(pw)).toBe(true)
    expect(/[a-z]/.test(pw)).toBe(true)
  })
})
