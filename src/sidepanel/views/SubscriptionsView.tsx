import { useEffect, useState, useCallback } from 'react'
import type { Subscription } from '../../shared/messages'
import { TagInput } from '../components/TagInput'
import { nextBillingDate, type BillingCycle } from '../../lib/nextBilling'

interface Props {
  sendMsg: (type: string, payload?: unknown) => Promise<{ ok: boolean; data?: unknown; error?: string }>
}

const CYCLES: BillingCycle[] = ['monthly', 'yearly', 'weekly', 'one-time']
const CURRENCIES = ['USD', 'EUR', 'GBP', 'VND', 'JPY', 'SGD']

const CYCLE_LABELS: Record<string, string> = {
  monthly: '/mo', yearly: '/yr', weekly: '/wk', 'one-time': 'once'
}

function monthlyEquivalent(amount: number, cycle: string): number {
  if (cycle === 'monthly')  return amount
  if (cycle === 'yearly')   return amount / 12
  if (cycle === 'weekly')   return amount * 4.33
  return 0
}

function formatCurrency(amount: string | number, currency: string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(num)
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

const today = new Date().toISOString().slice(0, 10)

interface SubCardProps {
  sub: Subscription
  onDelete: (id: string) => void
}

function SubCard({ sub, onDelete }: SubCardProps) {
  const next = sub.cycle === 'one-time' ? sub.start_date : nextBillingDate(sub.start_date, sub.cycle as BillingCycle)
  const days = daysUntil(next)
  const urgentColor = days <= 3 ? '#f87171' : days <= 7 ? '#fb923c' : 'rgba(255,255,255,0.3)'

  return (
    <div className="glass-card p-3 flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>{sub.name}</span>
        <button onClick={() => onDelete(sub.id)} className="text-xs px-1.5 py-0.5 rounded"
          style={{ color: 'rgba(239,68,68,0.5)', border: '1px solid rgba(239,68,68,0.15)' }}>×</button>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono font-bold" style={{ color: '#34d399' }}>
          {formatCurrency(sub.amount, sub.currency)}
        </span>
        <span className="text-xs px-1.5 py-0.5 rounded-full"
          style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', color: 'rgba(52,211,153,0.7)', fontSize: '10px' }}>
          {CYCLE_LABELS[sub.cycle] ?? sub.cycle}
        </span>
      </div>
      {sub.cycle !== 'one-time' && (
        <span className="text-xs" style={{ color: urgentColor }}>
          Next: {next} ({days === 0 ? 'today' : days < 0 ? `${-days}d overdue` : `in ${days}d`})
        </span>
      )}
      {sub.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-0.5">
          {sub.tags.map(t => (
            <span key={t} className="text-xs px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(52,211,153,0.08)', color: 'rgba(52,211,153,0.6)', fontSize: '9px' }}>
              #{t}
            </span>
          ))}
        </div>
      )}
      {sub.notes && (
        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>{sub.notes}</p>
      )}
    </div>
  )
}

export function SubscriptionsView({ sendMsg }: Props) {
  const [subs, setSubs] = useState<Subscription[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const [newName, setNewName]         = useState('')
  const [newAmount, setNewAmount]     = useState('')
  const [newCurrency, setNewCurrency] = useState('USD')
  const [newCycle, setNewCycle]       = useState<BillingCycle>('monthly')
  const [newStart, setNewStart]       = useState(today)
  const [newTags, setNewTags]         = useState<string[]>([])
  const [newNotes, setNewNotes]       = useState('')

  const load = useCallback(async (q = '', tag?: string | null) => {
    const payload: Record<string, string> = {}
    if (q) payload.query = q
    if (tag) payload.tag = tag
    const res = await sendMsg('SUBS_LIST', Object.keys(payload).length ? payload : undefined)
    if (res.ok) {
      const list = res.data as Subscription[]
      setSubs(list)
      const tags = [...new Set(list.flatMap(s => s.tags ?? []))].sort()
      setAllTags(tags)
    }
  }, [sendMsg])

  useEffect(() => { load() }, [load])

  async function addSub() {
    const amount = parseFloat(newAmount)
    if (!newName || isNaN(amount)) return
    const res = await sendMsg('SUBS_CREATE', {
      name: newName, amount, currency: newCurrency,
      cycle: newCycle, start_date: newStart, tags: newTags, notes: newNotes
    })
    if (res.ok) {
      setNewName(''); setNewAmount(''); setNewCurrency('USD')
      setNewCycle('monthly'); setNewStart(today); setNewTags([]); setNewNotes('')
      await load(query, activeTag)
    }
  }

  async function deleteSub(id: string) {
    await sendMsg('SUBS_DELETE', { id })
    await load(query, activeTag)
  }

  function selectTag(tag: string) {
    const next = activeTag === tag ? null : tag
    setActiveTag(next)
    load(query, next)
  }

  const monthlySpend = subs.reduce((sum, s) => sum + monthlyEquivalent(parseFloat(s.amount), s.cycle), 0)

  const grouped: Record<string, Subscription[]> = {}
  const untagged: Subscription[] = []
  if (!activeTag) {
    for (const s of subs) {
      if (s.tags?.length) {
        const t = s.tags[0]
        grouped[t] = grouped[t] ?? []
        grouped[t].push(s)
      } else {
        untagged.push(s)
      }
    }
  }

  return (
    <div className="flex flex-col p-3 gap-3 overflow-y-auto" style={{ height: '100%' }}>
      <div className="rounded-[10px] px-3 py-2 flex justify-between items-center"
        style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
        <span className="text-xs" style={{ color: 'rgba(52,211,153,0.7)' }}>Recurring / month</span>
        <span className="text-xs font-mono font-bold" style={{ color: '#34d399' }}>
          ~${monthlySpend.toFixed(2)}
        </span>
      </div>

      <div className="flex items-center gap-2 rounded-[10px] px-3 py-2"
        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
          <circle cx="8" cy="8" r="5" stroke="rgba(255,255,255,0.35)" strokeWidth="1.6"/>
          <line x1="12" y1="12" x2="17" y2="17" stroke="rgba(255,255,255,0.35)" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
        <input className="bg-transparent text-xs outline-none flex-1" style={{ color: 'rgba(255,255,255,0.6)' }}
          placeholder="Search subscriptions..." value={query}
          onChange={e => { setQuery(e.target.value); load(e.target.value, activeTag) }} />
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {allTags.map(t => (
            <button key={t} onClick={() => selectTag(t)}
              className="px-2 py-0.5 rounded-full text-xs"
              style={activeTag === t
                ? { background: '#34d39922', border: '1px solid #34d39944', color: '#34d399' }
                : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)' }}>
              #{t}
            </button>
          ))}
        </div>
      )}

      {activeTag ? (
        subs.map(s => <SubCard key={s.id} sub={s} onDelete={deleteSub} />)
      ) : (
        <>
          {Object.entries(grouped).map(([tag, list]) => (
            <div key={tag} className="flex flex-col gap-2">
              <span className="text-xs px-1 font-semibold" style={{ color: '#34d399', fontSize: '10px' }}>#{tag}</span>
              {list.map(s => <SubCard key={s.id} sub={s} onDelete={deleteSub} />)}
            </div>
          ))}
          {untagged.map(s => <SubCard key={s.id} sub={s} onDelete={deleteSub} />)}
        </>
      )}

      {subs.length === 0 && (
        <p className="text-xs text-center py-4" style={{ color: 'rgba(255,255,255,0.2)' }}>No subscriptions yet</p>
      )}

      <div className="rounded-xl p-3 flex flex-col gap-2 mt-1"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.1)' }}>
        <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.25)' }}>Add subscription</p>

        <input className="rounded-lg px-3 py-2 text-xs outline-none"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
          placeholder="Name (e.g. Netflix)"
          value={newName} onChange={e => setNewName(e.target.value)} />

        <div className="flex gap-2">
          <input type="number" min="0" step="0.01"
            className="flex-1 rounded-lg px-3 py-2 text-xs outline-none"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
            placeholder="Amount"
            value={newAmount} onChange={e => setNewAmount(e.target.value)} />
          <select
            className="rounded-lg px-2 py-2 text-xs outline-none"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
            value={newCurrency} onChange={e => setNewCurrency(e.target.value)}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="flex gap-1">
          {CYCLES.map(c => (
            <button key={c} onClick={() => setNewCycle(c)}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold"
              style={newCycle === c
                ? { background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399' }
                : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)' }}>
              {c === 'one-time' ? 'once' : c.slice(0, 2)}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Start / billing date</span>
          <input type="date"
            className="rounded-lg px-3 py-2 text-xs outline-none"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', colorScheme: 'dark' }}
            value={newStart} onChange={e => setNewStart(e.target.value)} />
        </div>

        <div className="rounded-lg px-2 py-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <TagInput tags={newTags} accent="#34d399" onChange={setNewTags} />
        </div>

        <input className="rounded-lg px-3 py-2 text-xs outline-none"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
          placeholder="Notes (optional)"
          value={newNotes} onChange={e => setNewNotes(e.target.value)} />

        <button onClick={addSub}
          className="py-2 rounded-lg text-xs font-semibold"
          style={{ background: 'linear-gradient(135deg,#34d399,#10b981)', color: '#052e16' }}>
          Add Subscription
        </button>
      </div>
    </div>
  )
}
