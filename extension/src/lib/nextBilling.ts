export type BillingCycle = 'weekly' | 'monthly' | 'yearly' | 'one-time'

function toLocalIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function nextBillingDate(startDate: string, cycle: BillingCycle): string {
  if (cycle === 'one-time') return startDate

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let d = new Date(startDate + 'T00:00:00')

  for (let i = 0; i < 1000; i++) {
    if (d > today) return toLocalIso(d)
    d = advance(d, cycle)
  }

  return toLocalIso(d)
}

function advance(d: Date, cycle: BillingCycle): Date {
  const next = new Date(d)
  if (cycle === 'weekly') {
    next.setDate(next.getDate() + 7)
  } else if (cycle === 'monthly') {
    next.setMonth(next.getMonth() + 1)
  } else if (cycle === 'yearly') {
    next.setFullYear(next.getFullYear() + 1)
  }
  return next
}
