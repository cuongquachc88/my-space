import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { getDb } from '../../db'
import { monthlyEquivalentUSD, convertFromUSD } from '../../lib/currency'
import TagInput from '../components/TagInput'
import { ACCENT } from '../../design/tokens'
import GlassCard from '../../design/GlassCard'
import GlassInput from '../../design/GlassInput'
import PillButton from '../../design/PillButton'
import { BentoGrid, BentoCell } from '../../design/BentoGrid'
import ViewHeader from '../ViewHeader'
import { IconSubs, IconTrash } from '../../design/icons'
import SwipeToDelete from '../../design/SwipeToDelete'
import { useIsDesktop } from '../useIsDesktop'
import DesktopSubscriptionsView from './desktop/DesktopSubscriptionsView'

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
  const isDesktop = useIsDesktop()
  if (isDesktop) return <DesktopSubscriptionsView />
  const [subs, setSubs] = useState<Sub[]>([])
  const [display, setDisplay] = useState('USD')
  const [editing, setEditing] = useState<Sub | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [detailVisible, setDetailVisible] = useState(false)
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
    setEditing(null); setIsNew(true)
    setShowDetail(true)
    setTimeout(() => setDetailVisible(true), 10)
  }

  function openEdit(s: Sub) {
    setEf({ name:s.name, amount:String(s.amount), currency:s.currency, cycle:s.cycle, start_date:s.start_date, notes:s.notes, tags:s.tags??[], active:s.active })
    setEditing(s); setIsNew(false)
    setShowDetail(true)
    setTimeout(() => setDetailVisible(true), 10)
  }

  function goBack() {
    setDetailVisible(false)
    setTimeout(() => setShowDetail(false), 560)
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
      await load()
      goBack()
    } catch (e) { console.error('[subs] save failed:', e) }
  }

  async function deleteSub() {
    if (!editing?.id) return
    const db = await getDb()
    await db.query('DELETE FROM subscriptions WHERE id=$1', [editing.id])
    await load()
    goBack()
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
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 32, color: accent, letterSpacing: '-0.02em' }}>{fmt(totalUSD, display)}</div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#4a4a6a', marginTop: 4 }}>Monthly total</div>
              <select value={display} onChange={e => setDisplay(e.target.value)}
                style={{ marginTop: 12, background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.6)', borderRadius: 8, padding: '4px 8px', fontSize: 12, color: '#1a1a2e', outline: 'none', cursor: 'pointer' }}>
                {DISPLAY_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </GlassCard>
        </BentoCell>

        <BentoCell span="2">
          <GlassCard style={{ height: '100%' }}>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {subs.length === 0 && <div style={{ textAlign: 'center', color: '#4a4a6a', padding: 24, fontFamily: 'Inter, sans-serif', fontSize: 14 }}>No subscriptions yet.</div>}
              {subs.map(s => (
                <SwipeToDelete key={s.id} onDelete={async () => {
                  const db = await getDb()
                  await db.query('DELETE FROM subscriptions WHERE id=$1', [s.id])
                  await load()
                }}>
                  <button onClick={() => openEdit(s)}
                    style={{ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 10, opacity: s.active ? 1 : 0.5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.active ? accent : '#94a3b8', flexShrink: 0 }} />
                    <span style={{ flex: 1, fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 14, color: '#1a1a2e' }}>{s.name}</span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>
                        {new Intl.NumberFormat('en-US', { style:'currency', currency:s.currency, maximumFractionDigits:2 }).format(parseFloat(s.amount))}
                      </div>
                      <div style={{ fontSize: 11, color: '#4a4a6a' }}>{s.cycle}</div>
                    </div>
                  </button>
                </SwipeToDelete>
              ))}
            </div>
          </GlassCard>
        </BentoCell>
      </BentoGrid>

      {/* ── Detail screen — portal to body ── */}
      {showDetail && createPortal(
        <div style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: 'linear-gradient(160deg, #f0f2ff 0%, #e8eeff 50%, #dde3ff 100%)',
          overflowY: 'auto',
          transform: detailVisible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 550ms cubic-bezier(0.22,1,0.36,1)',
        }}>
          {/* Hero header */}
          <div style={{ background: `linear-gradient(145deg, ${accent} 0%, #ec4899 60%, #f472b6 100%)`, paddingBottom: 24, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', top: -60, right: -40, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', bottom: -20, left: 20, pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'calc(env(safe-area-inset-top) + 14px) 20px 10px', position: 'relative' }}>
              <button onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.92)', padding: 0 }}>
                <svg width="8" height="13" viewBox="0 0 8 13" fill="none">
                  <path d="M7 1L1.5 6.5L7 12" stroke="rgba(255,255,255,0.92)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Subscriptions
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={save} style={{
                  padding: '8px 22px', borderRadius: 100, border: '1.5px solid rgba(255,255,255,0.5)', cursor: 'pointer',
                  background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                  color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13,
                }}>Save</button>
                {!isNew && (
                  <button onClick={deleteSub} style={{ width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconTrash size={15} accent="rgba(255,255,255,0.85)" />
                  </button>
                )}
              </div>
            </div>
            <div style={{ padding: '8px 20px 0', position: 'relative' }}>
              <input
                value={ef.name}
                onChange={e => setEf(p => ({ ...p, name: e.target.value }))}
                style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 26, color: '#fff', background: 'transparent', border: 'none', outline: 'none', width: '100%', letterSpacing: '-0.02em', lineHeight: 1.2 }}
                placeholder={isNew ? 'New subscription' : 'Subscription name'}
                autoFocus
              />
            </div>
          </div>

          {/* Content */}
          <div style={{ padding: '20px 20px 80px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <GlassInput value={ef.amount} onChange={v => setEf(p => ({ ...p, amount: v }))} placeholder="Amount" type="number" />
                <select value={ef.currency} onChange={e => setEf(p => ({ ...p, currency: e.target.value }))}
                  style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1.5px solid rgba(255,255,255,0.6)', borderRadius: 14, padding: '12px 16px', fontSize: 15, color: '#1a1a2e', outline: 'none', cursor: 'pointer' }}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={ef.cycle} onChange={e => setEf(p => ({ ...p, cycle: e.target.value }))}
                  style={{ flex: 1, background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1.5px solid rgba(255,255,255,0.6)', borderRadius: 14, padding: '12px 16px', fontSize: 15, color: '#1a1a2e', outline: 'none', cursor: 'pointer' }}>
                  {CYCLES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                </select>
                <input type="date" value={ef.start_date} onChange={e => setEf(p => ({ ...p, start_date: e.target.value }))}
                  style={{ flex: 1, background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1.5px solid rgba(255,255,255,0.6)', borderRadius: 14, padding: '12px 16px', fontSize: 15, color: '#1a1a2e', outline: 'none' }} />
              </div>
              <GlassInput value={ef.notes} onChange={v => setEf(p => ({ ...p, notes: v }))} placeholder="Notes (optional)" />
              <TagInput tags={ef.tags} onChange={t => setEf(p => ({ ...p, tags: t }))} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#1a1a2e', cursor: 'pointer', padding: '4px 0' }}>
                <input type="checkbox" checked={ef.active} onChange={e => setEf(p => ({ ...p, active: e.target.checked }))} style={{ width: 18, height: 18, accentColor: accent }} />
                Active
              </label>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
