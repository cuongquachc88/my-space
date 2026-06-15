import { useState, useEffect, useCallback, useRef } from 'react'
import type { Subscription, Bill } from '../../shared/messages'
import { toUSD, convertFromUSD } from '../../lib/currency'

interface Props {
  sendMsg: (type: string, payload?: unknown) => Promise<{ ok: boolean; data?: unknown; error?: string }>
  onBack?: () => void
}

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const CURRENCIES = ['USD', 'EUR', 'GBP', 'VND', 'JPY', 'SGD']

function formatCurrency(usd: number, displayCurrency: string): string {
  const amount = convertFromUSD(usd, displayCurrency)
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: displayCurrency, maximumFractionDigits: 0 }).format(amount)
}

function formatNative(amount: string | number, currency: string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(num)
}

function expectedMonthlyUSD(sub: Subscription, year: number, month: number): number {
  const start = new Date(sub.start_date + 'T00:00:00')
  const startYM = start.getFullYear() * 12 + start.getMonth()
  const curYM = year * 12 + (month - 1)
  if (startYM > curYM) return 0
  const amt = parseFloat(sub.amount)
  switch (sub.cycle) {
    case 'monthly':  return toUSD(amt, sub.currency)
    case 'weekly':   return toUSD(amt, sub.currency) * 4.33
    case 'yearly':   return toUSD(amt, sub.currency) / 12
    case 'one-time': return start.getFullYear() === year && start.getMonth() === (month - 1) ? toUSD(amt, sub.currency) : 0
    default: return 0
  }
}

interface SubBillRow {
  sub: Subscription
  bill: Bill | null
  expectedUSD: number
}

interface MonthPoint {
  year: number
  month: number
  label: string
  expectedUSD: number
  actualUSD: number
}

function DualBarChart({ points, displayCurrency }: { points: MonthPoint[]; displayCurrency: string }) {
  const maxUSD = Math.max(...points.flatMap(p => [p.expectedUSD, p.actualUSD]), 0.01)
  const chartH = 60
  const barW = 9
  const gap = 2
  const groupW = barW * 2 + gap + 6
  const totalW = points.length * groupW - 6

  return (
    <div className="rounded-[10px] p-3 flex flex-col gap-1.5"
      style={{ background: 'rgba(244,114,182,0.05)', border: '1px solid rgba(244,114,182,0.15)' }}>
      <div className="flex items-center gap-3">
        <span style={{ color: 'rgba(244,114,182,0.5)', fontSize: '10px', letterSpacing: '0.05em' }}>6-MONTH</span>
        <div className="flex items-center gap-2">
          <span style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(244,114,182,0.35)', display: 'inline-block' }} />
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>expected</span>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: '#f472b6', display: 'inline-block' }} />
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>actual</span>
        </div>
      </div>
      <svg width="100%" viewBox={`0 0 ${totalW} ${chartH + 18}`} style={{ overflow: 'visible' }}>
        {points.map((p, i) => {
          const x = i * groupW
          const expH = Math.max(p.expectedUSD / maxUSD * chartH, p.expectedUSD > 0 ? 3 : 0)
          const actH = Math.max(p.actualUSD / maxUSD * chartH, p.actualUSD > 0 ? 3 : 0)
          const now = new Date()
          const isCurrent = p.year === now.getFullYear() && p.month === (now.getMonth() + 1)
          return (
            <g key={`${p.year}-${p.month}`}>
              <rect x={x} y={chartH - expH} width={barW} height={expH} rx="2"
                fill={isCurrent ? 'rgba(244,114,182,0.45)' : 'rgba(244,114,182,0.15)'} />
              <rect x={x + barW + gap} y={chartH - actH} width={barW} height={actH} rx="2"
                fill={isCurrent ? '#f472b6' : 'rgba(244,114,182,0.3)'} />
              {isCurrent && p.actualUSD > 0 && (
                <text x={x + barW + gap / 2} y={chartH - Math.max(expH, actH) - 4}
                  textAnchor="middle" fontSize="7" fill="rgba(244,114,182,0.9)">
                  {formatCurrency(p.actualUSD, displayCurrency)}
                </text>
              )}
              <text x={x + barW + gap / 2} y={chartH + 13}
                textAnchor="middle" fontSize="8"
                fontWeight={isCurrent ? '700' : '400'}
                fill={isCurrent ? 'rgba(244,114,182,0.9)' : 'rgba(255,255,255,0.25)'}>
                {p.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

interface SubRowProps {
  row: SubBillRow
  year: number
  month: number
  displayCurrency: string
  sendMsg: Props['sendMsg']
  onRefresh: () => void
}

function SubRow({ row, year, month, displayCurrency, sendMsg, onRefresh }: SubRowProps) {
  const { sub, bill, expectedUSD } = row
  const [expanded, setExpanded] = useState(false)
  const [amount, setAmount] = useState(bill?.amount ?? sub.amount)
  const [currency, setCurrency] = useState(bill?.currency ?? sub.currency)
  const [notes, setNotes] = useState(bill?.notes ?? '')
  const [images, setImages] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // sync local state when bill changes (month navigation)
  useEffect(() => {
    setAmount(bill?.amount ?? sub.amount)
    setCurrency(bill?.currency ?? sub.currency)
    setNotes(bill?.notes ?? '')
    setImages([])
    setExpanded(false)
  }, [bill, sub.amount, sub.currency, year, month])

  async function pickImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    const dataUrls = await Promise.all(files.map(f => new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = ev => resolve(ev.target!.result as string)
      reader.readAsDataURL(f)
    })))
    setImages(prev => [...prev, ...dataUrls])
    e.target.value = ''
  }

  async function save() {
    const amt = parseFloat(amount as string)
    if (isNaN(amt) || amt < 0) return
    setSaving(true)
    await sendMsg('BILLS_UPSERT', {
      sub_id: sub.id, year, month, amount: amt, currency,
      notes: images.length > 0 ? `${notes}||img:${JSON.stringify(images)}` : notes,
    })
    setSaving(false)
    setExpanded(false)
    onRefresh()
  }

  async function deleteBill() {
    setSaving(true)
    await sendMsg('BILLS_DELETE', { sub_id: sub.id, year, month })
    setSaving(false)
    setExpanded(false)
    onRefresh()
  }

  const actualUSD = bill ? toUSD(parseFloat(bill.amount), bill.currency) : null
  const diff = actualUSD !== null ? actualUSD - expectedUSD : null
  const billNotes = bill?.notes?.split('||img:')[0] ?? ''
  const billImages: string[] = (() => {
    try {
      const imgPart = bill?.notes?.split('||img:')[1]
      return imgPart ? JSON.parse(imgPart) : []
    } catch { return [] }
  })()

  return (
    <div className="glass-card flex flex-col" style={{ opacity: sub.active ? 1 : 0.5 }}>
      {/* Row header */}
      <div className="p-3 flex items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {!sub.active && (
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.06)', borderRadius: 3, padding: '0 4px' }}>paused</span>
            )}
            <span className="text-xs font-semibold truncate" style={{ color: 'rgba(255,255,255,0.8)' }}>{sub.name}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
              exp: {formatCurrency(expectedUSD, displayCurrency)}
            </span>
            {actualUSD !== null && (
              <>
                <span style={{ color: 'rgba(255,255,255,0.15)' }}>→</span>
                <span style={{ fontSize: 10, color: '#f472b6', fontWeight: 600 }}>
                  {formatNative(bill!.amount, bill!.currency)}
                </span>
                {diff !== null && Math.abs(diff) > 0.5 && (
                  <span style={{
                    fontSize: 9, borderRadius: 3, padding: '0 4px',
                    color: diff > 0 ? 'rgba(248,113,113,0.8)' : 'rgba(52,211,153,0.8)',
                    background: diff > 0 ? 'rgba(248,113,113,0.1)' : 'rgba(52,211,153,0.1)',
                  }}>
                    {diff > 0 ? '+' : ''}{formatCurrency(diff, displayCurrency)}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-xs px-2 py-1 rounded-lg flex-shrink-0"
          style={bill
            ? { color: '#f472b6', background: 'rgba(244,114,182,0.1)', border: '1px solid rgba(244,114,182,0.25)' }
            : { color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          {bill ? 'edit' : '+ bill'}
        </button>
      </div>

      {/* Stored bill images */}
      {billImages.length > 0 && !expanded && (
        <div className="flex gap-1.5 px-3 pb-2.5 flex-wrap">
          {billImages.map((src, idx) => (
            <img key={idx} src={src} alt="receipt"
              style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid rgba(244,114,182,0.2)' }} />
          ))}
        </div>
      )}
      {billNotes && !expanded && (
        <p className="px-3 pb-2.5 text-xs" style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>{billNotes}</p>
      )}

      {/* Inline editor */}
      {expanded && (
        <div className="flex flex-col gap-2 px-3 pb-3 pt-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ height: 8 }} />
          <div className="flex gap-2">
            <input
              type="number" min="0" step="0.01"
              className="flex-1 rounded-lg px-3 py-2 text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
              placeholder="Amount paid"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              autoFocus
            />
            <select
              className="rounded-lg px-2 py-2 text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
              value={currency} onChange={e => setCurrency(e.target.value)}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <input
            className="rounded-lg px-3 py-2 text-xs outline-none"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
            placeholder="Notes (optional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />

          {/* Image picker */}
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
            onChange={pickImages} />
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.45)' }}>
              <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="7" cy="9" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M2 14l4-4 3 3 3-3 6 6" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
              </svg>
              Add receipt
            </button>
            {images.map((src, idx) => (
              <div key={idx} style={{ position: 'relative' }}>
                <img src={src} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid rgba(244,114,182,0.3)' }} />
                <button
                  onClick={() => setImages(imgs => imgs.filter((_, i) => i !== idx))}
                  style={{
                    position: 'absolute', top: -5, right: -5, width: 16, height: 16,
                    background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '50%', color: 'rgba(255,255,255,0.6)', fontSize: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                  }}>×</button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            {bill && (
              <button onClick={deleteBill} disabled={saving}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'rgba(239,68,68,0.65)' }}>
                Delete
              </button>
            )}
            <button onClick={save} disabled={saving}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: 'linear-gradient(135deg,#f472b6,#ec4899)', color: '#fff' }}>
              {saving ? 'Saving…' : bill ? 'Update' : 'Save Bill'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function ReportsView({ sendMsg, onBack }: Props) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [subs, setSubs] = useState<Subscription[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [allBills, setAllBills] = useState<Bill[]>([])
  const [displayCurrency, setDisplayCurrency] = useState('USD')

  const load = useCallback(async (y: number, m: number) => {
    const [subsRes, billsRes, allBillsRes] = await Promise.all([
      sendMsg('SUBS_LIST'),
      sendMsg('BILLS_LIST_MONTH', { year: y, month: m }),
      sendMsg('BILLS_GET_ALL'),
    ])
    if (subsRes.ok) setSubs(subsRes.data as Subscription[])
    if (billsRes.ok) setBills(billsRes.data as Bill[])
    if (allBillsRes.ok) setAllBills(allBillsRes.data as Bill[])
  }, [sendMsg])

  useEffect(() => { load(year, month) }, [load, year, month])

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (year === now.getFullYear() && month === now.getMonth() + 1) return
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const activeSubs = subs.filter(s => s.active)
  const billMap = new Map(bills.map(b => [b.sub_id, b]))

  const rows: SubBillRow[] = subs.map(sub => ({
    sub,
    bill: billMap.get(sub.id) ?? null,
    expectedUSD: sub.active ? expectedMonthlyUSD(sub, year, month) : 0,
  }))

  const totalExpectedUSD = rows.reduce((s, r) => s + r.expectedUSD, 0)
  const totalActualUSD = rows.reduce((s, r) => r.bill ? s + toUSD(parseFloat(r.bill.amount), r.bill.currency) : s, 0)
  const recordedCount = rows.filter(r => r.bill !== null).length

  const chartPoints: MonthPoint[] = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const py = d.getFullYear()
    const pm = d.getMonth() + 1
    const expUSD = activeSubs.reduce((s, sub) => s + expectedMonthlyUSD(sub, py, pm), 0)
    const actBills = allBills.filter(b => b.year === py && b.month === pm)
    const actUSD = actBills.reduce((s, b) => s + toUSD(parseFloat(b.amount), b.currency), 0)
    return { year: py, month: pm, label: MONTH_SHORT[pm - 1], expectedUSD: expUSD, actualUSD: actUSD }
  })

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

  return (
    <div className="flex flex-col p-3 gap-3 overflow-y-auto" style={{ height: '100%' }}>
      {/* Back button */}
      {onBack && (
        <div className="flex items-center gap-2">
          <button onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-semibold"
            style={{ color: '#f472b6', background: 'rgba(244,114,182,0.08)', border: '1px solid rgba(244,114,182,0.18)', borderRadius: 8, padding: '4px 10px' }}>
            ← Back
          </button>
          <span className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.8)' }}>Reports & Bills</span>
        </div>
      )}
      {/* Month navigator */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth}
          className="w-7 h-7 flex items-center justify-center rounded-lg"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>
          ‹
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.85)' }}>
            {MONTH_SHORT[month - 1]} {year}
          </span>
          {isCurrentMonth && (
            <span style={{ fontSize: 9, color: '#f472b6', background: 'rgba(244,114,182,0.12)', borderRadius: 4, padding: '1px 5px' }}>
              this month
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <select
            className="rounded-md px-1.5 py-1 text-xs outline-none"
            style={{ background: 'rgba(244,114,182,0.1)', border: '1px solid rgba(244,114,182,0.2)', color: '#f472b6', fontSize: 10 }}
            value={displayCurrency} onChange={e => setDisplayCurrency(e.target.value)}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={nextMonth} disabled={isCurrentMonth}
            className="w-7 h-7 flex items-center justify-center rounded-lg"
            style={{ background: 'rgba(255,255,255,0.06)', color: isCurrentMonth ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.5)', fontSize: 16 }}>
            ›
          </button>
        </div>
      </div>

      {/* Summary card */}
      <div className="rounded-[12px] px-3 py-3 flex gap-3"
        style={{ background: 'rgba(244,114,182,0.07)', border: '1px solid rgba(244,114,182,0.2)' }}>
        <div className="flex flex-col gap-0.5 flex-1">
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em' }}>EXPECTED</span>
          <span className="text-sm font-mono font-bold" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {formatCurrency(totalExpectedUSD, displayCurrency)}
          </span>
        </div>
        <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
        <div className="flex flex-col gap-0.5 flex-1">
          <span style={{ fontSize: 9, color: 'rgba(244,114,182,0.5)', letterSpacing: '0.05em' }}>ACTUAL</span>
          <span className="text-sm font-mono font-bold" style={{ color: '#f472b6' }}>
            {totalActualUSD > 0 ? formatCurrency(totalActualUSD, displayCurrency) : '—'}
          </span>
        </div>
        <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
        <div className="flex flex-col gap-0.5 flex-1 items-end">
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em' }}>RECORDED</span>
          <span className="text-sm font-mono font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {recordedCount}/{activeSubs.length}
          </span>
        </div>
      </div>

      {/* 6-month chart */}
      {subs.length > 0 && <DualBarChart points={chartPoints} displayCurrency={displayCurrency} />}

      {/* Active subs */}
      {rows.filter(r => r.sub.active).length > 0 && (
        <div className="flex flex-col gap-2">
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.05em' }}>ACTIVE</span>
          {rows.filter(r => r.sub.active).map(row => (
            <SubRow key={row.sub.id} row={row} year={year} month={month}
              displayCurrency={displayCurrency} sendMsg={sendMsg}
              onRefresh={() => load(year, month)} />
          ))}
        </div>
      )}

      {/* Paused subs */}
      {rows.filter(r => !r.sub.active).length > 0 && (
        <div className="flex flex-col gap-2">
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)', letterSpacing: '0.05em' }}>PAUSED</span>
          {rows.filter(r => !r.sub.active).map(row => (
            <SubRow key={row.sub.id} row={row} year={year} month={month}
              displayCurrency={displayCurrency} sendMsg={sendMsg}
              onRefresh={() => load(year, month)} />
          ))}
        </div>
      )}

      {subs.length === 0 && (
        <p className="text-xs text-center py-8" style={{ color: 'rgba(255,255,255,0.2)' }}>
          No subscriptions — add some in Subs
        </p>
      )}
    </div>
  )
}
