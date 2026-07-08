import { useEffect, useState, useCallback, useRef } from 'react'
import { getDb } from '../../db'
import { toUSD, convertFromUSD } from '../../lib/currency'

interface Sub { id: string; name: string; amount: string; currency: string; cycle: string; start_date: string; active: boolean }
interface Bill { sub_id: string; year: number; month: number; amount: string; currency: string; notes: string }
interface MonthPoint { year: number; month: number; label: string; expectedUSD: number; actualUSD: number }

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DISPLAY_CURRENCIES = ['USD','EUR','GBP','VND','JPY','SGD']

function fmtUSD(usd: number, currency: string) {
  const amt = convertFromUSD(usd, currency)
  return new Intl.NumberFormat('en-US', { style:'currency', currency, maximumFractionDigits:0 }).format(amt)
}

function expectedMonthlyUSD(sub: Sub, year: number, month: number): number {
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

function getLast6Months(): MonthPoint[] {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return { year: d.getFullYear(), month: d.getMonth() + 1, label: MONTH_SHORT[d.getMonth()], expectedUSD: 0, actualUSD: 0 }
  })
}

export default function ReportsView() {
  const [subs, setSubs] = useState<Sub[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [display, setDisplay] = useState('USD')
  const [editingBill, setEditingBill] = useState<{ sub: Sub; year: number; month: number; existing: Bill | null } | null>(null)
  const [billAmt, setBillAmt] = useState('')
  const [billCurrency, setBillCurrency] = useState('USD')
  const [billNotes, setBillNotes] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const now = new Date()
  const curYear = now.getFullYear(), curMonth = now.getMonth() + 1

  const load = useCallback(async () => {
    const db = await getDb()
    const subsRes = await db.query<Sub>('SELECT * FROM subscriptions WHERE active=true ORDER BY name ASC')
    const billsRes = await db.query<Bill>('SELECT * FROM bills ORDER BY year DESC, month DESC')
    setSubs(subsRes.rows)
    setBills(billsRes.rows)
  }, [])

  useEffect(() => { load() }, [load])

  const months = getLast6Months().map(m => {
    const expectedUSD = subs.reduce((acc, s) => acc + expectedMonthlyUSD(s, m.year, m.month), 0)
    const monthBills = bills.filter(b => b.year === m.year && b.month === m.month)
    const actualUSD = monthBills.reduce((acc, b) => acc + toUSD(parseFloat(b.amount), b.currency), 0)
    return { ...m, expectedUSD, actualUSD }
  })

  const maxVal = Math.max(...months.map(m => Math.max(m.expectedUSD, m.actualUSD)), 1)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width, H = canvas.height
    const BAR_W = Math.floor(W / months.length / 3)
    const PAD = 24

    ctx.clearRect(0, 0, W, H)

    months.forEach((m, i) => {
      const x = Math.floor(i * (W / months.length) + (W / months.length) / 2)
      const expH = Math.floor((m.expectedUSD / maxVal) * (H - PAD * 2))
      const actH = Math.floor((m.actualUSD / maxVal) * (H - PAD * 2))

      // Expected bar
      ctx.fillStyle = 'rgba(255,255,255,0.1)'
      ctx.fillRect(x - BAR_W - 2, H - PAD - expH, BAR_W, expH)

      // Actual bar
      ctx.fillStyle = m.actualUSD > m.expectedUSD * 1.05 ? 'rgba(248,113,113,0.7)' : 'rgba(180,230,69,0.7)'
      ctx.fillRect(x + 2, H - PAD - actH, BAR_W, actH)

      // Label
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.font = '10px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText(m.label, x, H - 4)
    })
  }, [months, maxVal])

  async function saveBill() {
    if (!editingBill || !billAmt) return
    const db = await getDb()
    await db.query(
      'INSERT INTO bills (sub_id,year,month,amount,currency,notes,updated_at) VALUES ($1,$2,$3,$4,$5,$6,now()) ON CONFLICT (sub_id,year,month) DO UPDATE SET amount=EXCLUDED.amount, currency=EXCLUDED.currency, notes=EXCLUDED.notes, updated_at=now()',
      [editingBill.sub.id, editingBill.year, editingBill.month, parseFloat(billAmt), billCurrency, billNotes]
    )
    setEditingBill(null); await load()
  }

  async function deleteBill() {
    if (!editingBill?.existing) return
    const db = await getDb()
    await db.query('DELETE FROM bills WHERE sub_id=$1 AND year=$2 AND month=$3', [editingBill.sub.id, editingBill.year, editingBill.month])
    setEditingBill(null); await load()
  }

  function openBill(sub: Sub, year: number, month: number) {
    const existing = bills.find(b => b.sub_id === sub.id && b.year === year && b.month === month) ?? null
    setEditingBill({ sub, year, month, existing })
    setBillAmt(existing ? String(existing.amount) : String(sub.amount))
    setBillCurrency(existing ? existing.currency : sub.currency)
    setBillNotes(existing?.notes ?? '')
  }

  if (editingBill) {
    const { sub, year, month } = editingBill
    return (
      <div className="flex flex-col h-full bg-[#0f2020]">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-[#0d1f1f]">
          <button onClick={() => setEditingBill(null)} className="text-white/50 hover:text-white mr-1">←</button>
          <span className="font-semibold flex-1">{sub.name} — {MONTH_SHORT[month-1]} {year}</span>
          <button onClick={saveBill} className="text-xs bg-[#b4e645] text-[#0f2020] font-semibold px-3 py-1 rounded-full">Save</button>
        </div>
        <div className="flex-1 p-4 flex flex-col gap-3">
          <div className="flex gap-2">
            <input value={billAmt} onChange={e => setBillAmt(e.target.value)} placeholder="Amount paid" type="number" min="0" step="0.01" className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none" />
            <select value={billCurrency} onChange={e => setBillCurrency(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none">
              {DISPLAY_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <textarea value={billNotes} onChange={e => setBillNotes(e.target.value)} placeholder="Notes" rows={2} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none resize-none" />
          {editingBill.existing && <button onClick={deleteBill} className="text-red-400 text-sm text-left">Remove bill record</button>}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[#0f2020]">
      <div className="px-4 pt-4 pb-3 border-b border-white/10 bg-[#0d1f1f]">
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-bold text-lg">Reports</h1>
          <select value={display} onChange={e => setDisplay(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none">
            {DISPLAY_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="text-xs text-white/40 flex gap-4">
          <span><span className="inline-block w-2 h-2 rounded-sm bg-white/20 mr-1" />Expected</span>
          <span><span className="inline-block w-2 h-2 rounded-sm bg-[#b4e645]/70 mr-1" />Actual</span>
        </div>
      </div>

      {/* Chart */}
      <div className="px-4 pt-4">
        <canvas ref={canvasRef} width={340} height={120} className="w-full rounded-lg bg-[#152a2a]" />
      </div>

      {/* Per-subscription breakdown for current month */}
      <div className="flex-1 overflow-y-auto mt-4">
        <div className="px-4 py-2 text-xs text-white/40 font-semibold uppercase tracking-wider">
          {MONTH_SHORT[curMonth-1]} {curYear}
        </div>
        {subs.length === 0 ? (
          <div className="text-center text-white/30 py-8 text-sm">No active subscriptions</div>
        ) : subs.map(s => {
          const exp = expectedMonthlyUSD(s, curYear, curMonth)
          const bill = bills.find(b => b.sub_id === s.id && b.year === curYear && b.month === curMonth)
          const act = bill ? toUSD(parseFloat(bill.amount), bill.currency) : null
          const over = act !== null && act > exp * 1.05
          return (
            <button key={s.id} onClick={() => openBill(s, curYear, curMonth)} className="w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{s.name}</span>
                <div className="text-right text-xs">
                  <div className="text-white/40">Exp {fmtUSD(exp, display)}</div>
                  {act !== null ? (
                    <div className={over ? 'text-red-400' : 'text-[#b4e645]'}>Act {fmtUSD(act, display)}</div>
                  ) : (
                    <div className="text-white/20">Not recorded</div>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
