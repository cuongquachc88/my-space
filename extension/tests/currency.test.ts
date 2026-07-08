import { describe, it, expect } from 'vitest'
import { toUSD, monthlyEquivalentUSD, convertFromUSD, TO_USD, FROM_USD } from '../src/lib/currency'

describe('toUSD', () => {
  it('USD stays the same', () => {
    expect(toUSD(100, 'USD')).toBe(100)
  })

  it('EUR converts correctly', () => {
    expect(toUSD(100, 'EUR')).toBeCloseTo(108, 1)
  })

  it('VND converts correctly (small rate)', () => {
    expect(toUSD(1_000_000, 'VND')).toBeCloseTo(39, 0)
  })

  it('unknown currency falls back to 1 (treated as USD)', () => {
    expect(toUSD(50, 'XYZ')).toBe(50)
  })

  it('zero amount stays zero', () => {
    expect(toUSD(0, 'EUR')).toBe(0)
  })
})

describe('monthlyEquivalentUSD', () => {
  it('monthly cycle returns full amount in USD', () => {
    expect(monthlyEquivalentUSD(10, 'USD', 'monthly')).toBeCloseTo(10)
  })

  it('yearly cycle divides by 12', () => {
    expect(monthlyEquivalentUSD(120, 'USD', 'yearly')).toBeCloseTo(10)
  })

  it('weekly cycle multiplies by 4.33', () => {
    expect(monthlyEquivalentUSD(10, 'USD', 'weekly')).toBeCloseTo(43.3, 0)
  })

  it('one-time returns 0', () => {
    expect(monthlyEquivalentUSD(99, 'USD', 'one-time')).toBe(0)
  })

  it('converts non-USD currency before cycle math', () => {
    // 120 EUR/year = 120 * 1.08 / 12 = 10.8 USD/month
    expect(monthlyEquivalentUSD(120, 'EUR', 'yearly')).toBeCloseTo(10.8, 1)
  })

  it('VND monthly converts to tiny USD amount', () => {
    const result = monthlyEquivalentUSD(500_000, 'VND', 'monthly')
    expect(result).toBeCloseTo(500_000 * 0.000039, 5)
  })

  it('unknown cycle returns 0', () => {
    expect(monthlyEquivalentUSD(10, 'USD', 'quarterly')).toBe(0)
  })
})

describe('convertFromUSD', () => {
  it('USD stays the same', () => {
    expect(convertFromUSD(100, 'USD')).toBeCloseTo(100)
  })

  it('converts USD to VND', () => {
    expect(convertFromUSD(1, 'VND')).toBeCloseTo(1 / 0.000039, 0)
  })

  it('round-trip USD → EUR → USD is approximately equal', () => {
    const original = 100
    const inEUR = convertFromUSD(toUSD(original, 'USD'), 'EUR')
    const backToUSD = toUSD(inEUR, 'EUR')
    expect(backToUSD).toBeCloseTo(original, 1)
  })

  it('unknown currency falls back (same as USD)', () => {
    expect(convertFromUSD(100, 'XYZ')).toBeCloseTo(100)
  })
})

describe('FROM_USD is inverse of TO_USD', () => {
  it('all supported currencies round-trip within 0.1%', () => {
    for (const [currency, rate] of Object.entries(TO_USD)) {
      const roundTrip = rate * FROM_USD[currency]
      expect(roundTrip).toBeCloseTo(1, 6)
    }
  })
})
