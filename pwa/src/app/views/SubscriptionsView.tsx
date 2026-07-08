import { useEffect, useState, useCallback } from 'react'
import { getDb } from '../../db'
import { nextBillingDate } from '../../lib/nextBilling'
import { monthlyEquivalentUSD, convertFromUSD } from '../../lib/currency'
import TagInput from '../components/TagInput'

interface Sub {
  id: string; name: string; amount: string; currency: string; cycle: string
  start_date: string; tags: string[]; notes: string; active: boolean
}

const CURRENCIES = ['USD','EUR','GBP','VND','JPY','SGD']
const CYCLES = ['monthly','yearly','weekly','one-time']
const DISPLAY_CURRENCIES = ['USD','EUR','GBP','VND','JPY','SGD']

function fmt(usd: number, display: string) {
  const amt = convertFromUSD(usd, display)
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: display, maximumFractionDigits: 0 }).format(amt)
}

export default function SubscriptionsView() {
  const [subs, setSubs] = useState<Sub[]>([])
  const [display, setDisplay] = useState('USD')
  const [editing, setEditing] = useState<Sub | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [ef, setEf] = useState({ name:'', amount:'', currency:'USD', cycle:'monthly', start_date:'', notes:'', tags: [] as string[], active: true })

  const load = useCallback(async () => {
    const db = await getDb()
    const res = await db.query<Sub>('SELECT * FROM subscriptions ORDER BY active DESC, name ASC')
    setSubs(res.rows)
  }, [])

  useEffect(() => { load() }, [load])

  const totalUSD = subs.filter(s => s.active).reduce((acc, s) => acc + monthlyEquivalentUSD(parseFloat(s.amount), s.currency, s.cycle), 0)

  function openNew() {
    const today = new Date().toISOString().slice(0, 10)
    setEf({ name:'', amount:'', currency:'USD', cycle:'monthly', start_date: today, notes:'', tags:[], active:true })
    setEditing({} as Sub); setIsNew(true)
  }

  function openEdit(s: Sub) {
    setEf({ name:s.name, amount:String(s.amount), currency:s.currency, cycle:s.cycle, start_date:s.start_date, notes:s.notes, tags:s.tags??[], active:s.active })
    setEditing(s); setIsNew(false)
  }

  async function save() {
    const db = await getDb()
    const amt = parseFloat(ef.amount) || 0
    if (isNew) {
      await db.query('INSERT INTO subscriptions (name,amount,currency,cycle,start_date,tags,notes,active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [ef.name, amt, ef.currency, ef.cycle, ef.start_date, ef.tags, ef.notes, ef.active])
    } else {
      await db.query('UPDATE subscriptions SET name=$1,amount=$2,currency=$3,cycle=$4,start_date=$5,tags=$6,notes=$7,active=$8,updated_at=now() WHERE id=$9',
        [ef.name, amt, ef.currency, ef.cycle, ef.start_date, ef.tags, ef.notes, ef.active, editing!.id])
    }
    setEditing(null); await load()
  }

  async function deleteSub() {
    if (!editing?.id) return
    const db = await getDb()
    await db.query('DELETE FROM subscriptions WHERE id=$1', [editing.id])
    setEditing(null); await load()
  }

  if (editing !== null) {
    return (
      <div className="flex flex-col h-full bg-[#0f2020]">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-[#0d1f1f]">
          <button onClick={() => setEditing(null)} className="text-white/50 hover:text-white mr-1">←</button>
          <span className="font-semibold flex-1">{isNew ? 'New Subscription' : 'Edit Subscription'}</span>
          <button onClick={save} className="text-xs bg-[#b4e645] text-[#0f2020] font-semibold px-3 py-1 rounded-full">Save</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          <input value={ef.name} onChange={e => setEf(p=>({...p,name:e.target.value}))} placeholder="Name (e.g. Netflix)" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none" />
          <div className="flex gap-2">
            <input value={ef.amount} onChange={e => setEf(p=>({...p,amount:e.target.value}))} placeholder="Amount" type="number" min="0" step="0.01" className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none" />
            <select value={ef.currency} onChange={e => setEf(p=>({...p,currency:e.target.value}))} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none">
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <select value={ef.cycle} onChange={e => setEf(p=>({...p,cycle:e.target.value}))} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none">
              {CYCLES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
            </select>
            <input type="date" value={ef.start_date} onChange={e => setEf(p=>({...p,start_date:e.target.value}))} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none" />
          </div>
          <textarea value={ef.notes} onChange={e => setEf(p=>({...p,notes:e.target.value}))} placeholder="Notes" rows={2} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none resize-none" />
          <TagInput tags={ef.tags} onChange={t => setEf(p=>({...p,tags:t}))} />
          <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
            <input type="checkbox" checked={ef.active} onChange={e => setEf(p=>({...p,active:e.target.checked}))} className="accent-[#b4e645]" />
            Active
          </label>
          {!isNew && <button onClick={deleteSub} className="text-red-400 text-sm text-left">Delete subscription</button>}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[#0f2020]">
      <div className="px-4 pt-4 pb-3 border-b border-white/10 bg-[#0d1f1f]">
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-bold text-lg">Subscriptions</h1>
          <button onClick={openNew} className="bg-[#b4e645] text-[#0f2020] font-bold px-4 py-1.5 rounded-full text-sm">+ New</button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-[#b4e645]">{fmt(totalUSD, display)}</span>
          <span className="text-white/40 text-sm">/mo</span>
          <select value={display} onChange={e => setDisplay(e.target.value)} className="ml-auto bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none">
            {DISPLAY_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {subs.length === 0 ? (
          <div className="text-center text-white/30 py-16 text-sm">No subscriptions yet</div>
        ) : subs.map(s => (
          <button key={s.id} onClick={() => openEdit(s)} className="w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${s.active ? 'bg-[#b4e645]' : 'bg-white/20'}`} />
                <span className={`font-medium text-sm ${!s.active && 'opacity-40'}`}>{s.name}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">{new Intl.NumberFormat('en-US', { style:'currency', currency:s.currency, maximumFractionDigits:2 }).format(parseFloat(s.amount))}</div>
                <div className="text-xs text-white/40">{s.cycle}</div>
              </div>
            </div>
            {s.active && s.cycle !== 'one-time' && (
              <div className="text-xs text-white/30 mt-0.5 ml-4">Next: {nextBillingDate(s.start_date, s.cycle as 'monthly')}</div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
