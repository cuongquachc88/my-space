// pwa/src/app/views/ReportsView.tsx
import { useEffect, useState, useCallback, useRef } from 'react'
import { getDb } from '../../db'
import { toUSD, convertFromUSD } from '../../lib/currency'
import { ACCENT } from '../../design/tokens'
import GlassCard from '../../design/GlassCard'
import GlassInput from '../../design/GlassInput'
import PillButton from '../../design/PillButton'
import { BentoGrid, BentoCell } from '../../design/BentoGrid'
import ViewHeader from '../ViewHeader'
import { IconReports } from '../../design/icons'

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

const accent = ACCENT.reports

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
  const expectedTotal = subs.reduce((acc, s) => acc + expectedMonthlyUSD(s, curYear, curMonth), 0)
  const actualTotal = bills.filter(b => b.year === curYear && b.month === curMonth).reduce((acc, b) => acc + toUSD(parseFloat(b.amount), b.currency), 0)
  const delta = actualTotal - expectedTotal

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
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      ctx.fillRect(x - BAR_W - 2, H - PAD - expH, BAR_W, expH)
      ctx.fillStyle = m.actualUSD > m.expectedUSD * 1.05 ? 'rgba(248,113,113,0.7)' : `${accent}b0`
      ctx.fillRect(x + 2, H - PAD - actH, BAR_W, actH)
      ctx.fillStyle = 'rgba(74,74,106,0.6)'
      ctx.font = '10px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText(m.label, x, H - 4)
    })
  }, [months, maxVal])

  async function saveBill() {
    if (!editingBill || !billAmt) return
    const db = await getDb()
    try {
      await db.query(
        'INSERT INTO bills (sub_id,year,month,amount,currency,notes,updated_at) VALUES ($1,$2,$3,$4,$5,$6,now()) ON CONFLICT (sub_id,year,month) DO UPDATE SET amount=EXCLUDED.amount, currency=EXCLUDED.currency, notes=EXCLUDED.notes, updated_at=now()',
        [editingBill.sub.id, editingBill.year, editingBill.month, parseFloat(billAmt), billCurrency, billNotes]
      )
      setEditingBill(null); await load()
    } catch (e) { console.error('[reports] saveBill failed:', e) }
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

  return (
    <div>
      <ViewHeader
        title="Reports" icon={<IconReports size={22} accent={accent} filled />}
        accent={accent}
        stats={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            6-month overview
            <select value={display} onChange={e => setDisplay(e.target.value)}
              style={{ background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.6)', borderRadius: 8, padding: '2px 6px', fontSize: 12, color: '#1a1a2e', outline: 'none', cursor: 'pointer' }}>
              {DISPLAY_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </span>
        }
      />
      <BentoGrid>
        <BentoCell span="full">
          <GlassCard accentBar accent={accent}>
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
                <span style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'rgba(255,255,255,0.3)' }} />Expected
                </span>
                <span style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: accent }} />Actual
                </span>
              </div>
              <canvas ref={canvasRef} width={760} height={120} style={{ width: '100%', borderRadius: 8, background: 'rgba(255,255,255,0.2)' }} />
            </div>
          </GlassCard>
        </BentoCell>

        <BentoCell span="1">
          <GlassCard accentBar accent={accent}>
            <div style={{ padding: 20, textAlign: 'center' }}>
              <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 700, fontSize: 28, color: accent }}>{fmtUSD(actualTotal, display)}</div>
              <div style={{ fontSize: 13, color: '#4a4a6a', fontFamily: 'Satoshi, sans-serif', marginTop: 4 }}>This month</div>
            </div>
          </GlassCard>
        </BentoCell>

        <BentoCell span="1">
          <GlassCard>
            <div style={{ padding: 20, textAlign: 'center' }}>
              <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 700, fontSize: 28, color: '#1a1a2e' }}>{fmtUSD(expectedTotal, display)}</div>
              <div style={{ fontSize: 13, color: '#4a4a6a', fontFamily: 'Satoshi, sans-serif', marginTop: 4 }}>Expected</div>
            </div>
          </GlassCard>
        </BentoCell>

        <BentoCell span="1">
          <GlassCard>
            <div style={{ padding: 20, textAlign: 'center' }}>
              <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 700, fontSize: 28, color: delta > 0 ? '#ef4444' : '#34d399' }}>{delta >= 0 ? '+' : ''}{fmtUSD(Math.abs(delta), display)}</div>
              <div style={{ fontSize: 13, color: '#4a4a6a', fontFamily: 'Satoshi, sans-serif', marginTop: 4 }}>Delta</div>
            </div>
          </GlassCard>
        </BentoCell>

        <BentoCell span="full">
          <GlassCard>
            <div style={{ padding: 16 }}>
              <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: 14, color: '#1a1a2e', marginBottom: 10 }}>
                {MONTH_SHORT[curMonth-1]} {curYear}
              </div>
              {subs.length === 0 && <div style={{ color: '#4a4a6a', fontSize: 13, fontFamily: 'Satoshi, sans-serif' }}>No active subscriptions.</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {subs.map(s => {
                  const exp = expectedMonthlyUSD(s, curYear, curMonth)
                  const bill = bills.find(b => b.sub_id === s.id && b.year === curYear && b.month === curMonth)
                  const act = bill ? toUSD(parseFloat(bill.amount), bill.currency) : null
                  const over = act !== null && act > exp * 1.05
                  return (
                    <button key={s.id} onClick={() => openBill(s, curYear, curMonth)}
                      style={{ textAlign: 'left', padding: '8px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: editingBill?.sub.id === s.id ? `${accent}15` : 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 500, fontSize: 14, color: '#1a1a2e' }}>{s.name}</span>
                      <div style={{ textAlign: 'right', fontSize: 12, fontFamily: 'Satoshi, sans-serif' }}>
                        <div style={{ color: '#94a3b8' }}>Exp {fmtUSD(exp, display)}</div>
                        {act !== null
                          ? <div style={{ color: over ? '#ef4444' : '#34d399' }}>Act {fmtUSD(act, display)}</div>
                          : <div style={{ color: '#cbd5e1' }}>Not recorded</div>}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </GlassCard>
        </BentoCell>

        {editingBill && (
          <BentoCell span="full">
            <GlassCard accentBar accent={accent}>
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 700, fontSize: 18, color: '#1a1a2e' }}>
                  {editingBill.sub.name} — {MONTH_SHORT[editingBill.month-1]} {editingBill.year}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <GlassInput value={billAmt} onChange={setBillAmt} placeholder="Amount paid" type="number" />
                  <select value={billCurrency} onChange={e => setBillCurrency(e.target.value)}
                    style={{ background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.6)', borderRadius: 12, padding: '12px 16px', fontSize: 14, color: '#1a1a2e', outline: 'none', cursor: 'pointer' }}>
                    {DISPLAY_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <GlassInput value={billNotes} onChange={setBillNotes} placeholder="Notes" />
                <div style={{ display: 'flex', gap: 8 }}>
                  <PillButton onClick={saveBill} accent={accent}>Save</PillButton>
                  <PillButton variant="ghost" onClick={() => setEditingBill(null)}>Cancel</PillButton>
                  {editingBill.existing && <PillButton variant="ghost" onClick={deleteBill} style={{ color: '#ef4444' }}>Remove</PillButton>}
                </div>
              </div>
            </GlassCard>
          </BentoCell>
        )}
      </BentoGrid>
    </div>
  )
}
