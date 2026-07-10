import { useEffect, useState, useCallback } from 'react'
import { getDb } from '../../db'
import { monthlyEquivalentUSD, convertFromUSD } from '../../lib/currency'
import TagInput from '../components/TagInput'
import { ACCENT } from '../../design/tokens'
import GlassCard from '../../design/GlassCard'
import GlassInput from '../../design/GlassInput'
import PillButton from '../../design/PillButton'
import { BentoGrid, BentoCell } from '../../design/BentoGrid'
import ViewHeader from '../ViewHeader'
import { IconSubs } from '../../design/icons'

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

const accent = ACCENT.subs

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
    try {
      if (isNew) {
        await db.query('INSERT INTO subscriptions (name,amount,currency,cycle,start_date,tags,notes,active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
          [ef.name, amt, ef.currency, ef.cycle, ef.start_date, ef.tags, ef.notes, ef.active])
      } else {
        await db.query('UPDATE subscriptions SET name=$1,amount=$2,currency=$3,cycle=$4,start_date=$5,tags=$6,notes=$7,active=$8,updated_at=now() WHERE id=$9',
          [ef.name, amt, ef.currency, ef.cycle, ef.start_date, ef.tags, ef.notes, ef.active, editing!.id])
      }
      setEditing(null); await load()
    } catch (e) { console.error('[subs] save failed:', e) }
  }

  async function deleteSub() {
    if (!editing?.id) return
    const db = await getDb()
    await db.query('DELETE FROM subscriptions WHERE id=$1', [editing.id])
    setEditing(null); await load()
  }

  return (
    <div>
      <ViewHeader
        title="Subscriptions" icon={<IconSubs size={22} accent={accent} filled />}
        accent={accent} stats={`${subs.filter(s => s.active).length} active`}
        action="+ Add" onAction={openNew}
      />
      <BentoGrid>
        <BentoCell span="1">
          <GlassCard accentBar accent={accent} style={{ height: '100%' }}>
            <div style={{ padding: 20, textAlign: 'center' }}>
              <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 700, fontSize: 36, color: accent }}>{fmt(totalUSD, display)}</div>
              <div style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 13, color: '#4a4a6a', marginTop: 4 }}>Monthly total</div>
              <select value={display} onChange={e => setDisplay(e.target.value)}
                style={{ marginTop: 12, background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.6)', borderRadius: 8, padding: '4px 8px', fontSize: 12, color: '#1a1a2e', outline: 'none', cursor: 'pointer' }}>
                {DISPLAY_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </GlassCard>
        </BentoCell>

        <BentoCell span="2">
          <GlassCard style={{ height: '100%' }}>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 340, overflowY: 'auto' }}>
              {subs.length === 0 && <div style={{ textAlign: 'center', color: '#4a4a6a', padding: 24, fontFamily: 'Satoshi, sans-serif', fontSize: 14 }}>No subscriptions yet.</div>}
              {subs.map(s => (
                <button key={s.id} onClick={() => openEdit(s)}
                  style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 12, border: 'none', cursor: 'pointer', background: editing?.id === s.id ? `${accent}18` : 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 10, opacity: s.active ? 1 : 0.5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.active ? accent : '#94a3b8', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontFamily: 'Satoshi, sans-serif', fontWeight: 500, fontSize: 14, color: '#1a1a2e' }}>{s.name}</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>
                      {new Intl.NumberFormat('en-US', { style:'currency', currency:s.currency, maximumFractionDigits:2 }).format(parseFloat(s.amount))}
                    </div>
                    <div style={{ fontSize: 11, color: '#4a4a6a' }}>{s.cycle}</div>
                  </div>
                </button>
              ))}
            </div>
          </GlassCard>
        </BentoCell>

        {editing !== null && (
          <BentoCell span="full">
            <GlassCard accentBar accent={accent}>
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 700, fontSize: 18, color: '#1a1a2e' }}>{isNew ? 'New Subscription' : 'Edit Subscription'}</div>
                <GlassInput value={ef.name} onChange={v => setEf(p=>({...p,name:v}))} placeholder="Name (e.g. Netflix)" />
                <div style={{ display: 'flex', gap: 8 }}>
                  <GlassInput value={ef.amount} onChange={v => setEf(p=>({...p,amount:v}))} placeholder="Amount" type="number" />
                  <select value={ef.currency} onChange={e => setEf(p=>({...p,currency:e.target.value}))}
                    style={{ background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.6)', borderRadius: 12, padding: '12px 16px', fontSize: 15, color: '#1a1a2e', outline: 'none', cursor: 'pointer' }}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select value={ef.cycle} onChange={e => setEf(p=>({...p,cycle:e.target.value}))}
                    style={{ flex: 1, background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.6)', borderRadius: 12, padding: '12px 16px', fontSize: 15, color: '#1a1a2e', outline: 'none', cursor: 'pointer' }}>
                    {CYCLES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                  </select>
                  <input type="date" value={ef.start_date} onChange={e => setEf(p=>({...p,start_date:e.target.value}))}
                    style={{ flex: 1, background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.6)', borderRadius: 12, padding: '12px 16px', fontSize: 15, color: '#1a1a2e', outline: 'none' }} />
                </div>
                <GlassInput value={ef.notes} onChange={v => setEf(p=>({...p,notes:v}))} placeholder="Notes (optional)" />
                <TagInput tags={ef.tags} onChange={t => setEf(p=>({...p,tags:t}))} />
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Satoshi, sans-serif', fontSize: 14, color: '#1a1a2e', cursor: 'pointer' }}>
                  <input type="checkbox" checked={ef.active} onChange={e => setEf(p=>({...p,active:e.target.checked}))} />
                  Active
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <PillButton onClick={save} accent={accent}>Save</PillButton>
                  <PillButton variant="ghost" onClick={() => setEditing(null)}>Cancel</PillButton>
                  {!isNew && <PillButton variant="ghost" onClick={deleteSub} style={{ color: '#ef4444' }}>Delete</PillButton>}
                </div>
              </div>
            </GlassCard>
          </BentoCell>
        )}
      </BentoGrid>
    </div>
  )
}
