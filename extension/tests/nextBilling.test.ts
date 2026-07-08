import { describe, it, expect } from 'vitest'
import { nextBillingDate } from '../src/lib/nextBilling'

describe('nextBillingDate', () => {
  it('one-time returns start date unchanged', () => {
    expect(nextBillingDate('2025-01-15', 'one-time')).toBe('2025-01-15')
  })

  it('monthly: returns same day next month when start was in past', () => {
    const result = nextBillingDate('2020-01-15', 'monthly')
    const d = new Date(result)
    expect(d.getDate()).toBe(15)
    expect(d > new Date()).toBe(true)
  })

  it('yearly: returns same month/day next year when start was in past', () => {
    const result = nextBillingDate('2020-06-01', 'yearly')
    const d = new Date(result)
    expect(d.getMonth()).toBe(5) // June = index 5
    expect(d.getDate()).toBe(1)
    expect(d > new Date()).toBe(true)
  })

  it('weekly: returns a date 7 days after a past date, advances enough', () => {
    const result = nextBillingDate('2020-01-01', 'weekly')
    const d = new Date(result)
    expect(d > new Date()).toBe(true)
    const sevenDaysFromNow = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000)
    expect(d < sevenDaysFromNow).toBe(true)
  })

  it('monthly: future start date returns start date', () => {
    const future = new Date()
    future.setMonth(future.getMonth() + 2)
    const isoFuture = future.toISOString().slice(0, 10)
    expect(nextBillingDate(isoFuture, 'monthly')).toBe(isoFuture)
  })

  it('returns ISO date string format YYYY-MM-DD', () => {
    const result = nextBillingDate('2020-01-01', 'monthly')
    expect(/^\d{4}-\d{2}-\d{2}$/.test(result)).toBe(true)
  })
})
