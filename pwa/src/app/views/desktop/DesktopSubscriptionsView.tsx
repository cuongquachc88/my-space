import { useEffect, useState, useCallback } from 'react'
import { getDb } from '../../../db'
import { monthlyEquivalentUSD, convertFromUSD } from '../../../lib/currency'
import TagInput from '../../components/TagInput'
import { ACCENT } from '../../../design/tokens'
import { IconSubs, IconTrash } from '../../../design/icons'

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

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.6)', border: '1.5px solid rgba(255,255,255,0.7)',
  borderRadius: 12, padding: '10px 14px', fontSize: 14, color: '#1a1a2e',
  fontFamily: 'Inter, sans-serif', outline: 'none',
}

export default function DesktopSubscriptionsView() {
  const [subs, setSubs] = useState<Sub[]>([])
  const [display, setDisplay] = useState('USD')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Sub | null>(null)
  const [ef, setEf] = useState({ name:'', amount:'', currency:'USD', cycle:'monthly', start_date:'', notes:'', tags: [] as string[], active: true })

  const load = useCallback(async () => {
    const db = await getDb()
    const res = await db.query<Sub>('SELECT * FROM subscriptions ORDER BY active DESC, name ASC')
    setSubs(res.rows)
  }, [])

  useEffect(() => { load() }, [load])

  const totalUSD = subs.filter(s => s.active).reduce((acc, s) => acc + monthlyEquivalentUSD(parseFloat(s.amount), s.currency, s.cycle), 0)
  const yearlyUSD = totalUSD * 12
  const activeCount = subs.filter(s => s.active).length

  function openNew() {
    const today = new Date().toISOString().slice(0, 10)
    setEf({ name:'', amount:'', currency:'USD', cycle:'monthly', start_date: today, notes:'', tags:[], active:true })
    setEditing(null); setModalOpen(true)
  }

  function openEdit(s: Sub) {
    setEf({ name:s.name, amount:String(s.amount), currency:s.currency, cycle:s.cycle, start_date:s.start_date, notes:s.notes, tags:s.tags??[], active:s.active })
    setEditing(s); setModalOpen(true)
  }

  async function save() {
    const db = await getDb()
    const amt = parseFloat(ef.amount) || 0
    try {
      if (!editing) {
        await db.query('INSERT INTO subscriptions (name,amount,currency,cycle,start_date,tags,notes,active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
          [ef.name, amt, ef.currency, ef.cycle, ef.start_date, ef.tags, ef.notes, ef.active])
      } else {
        await db.query('UPDATE subscriptions SET name=$1,amount=$2,currency=$3,cycle=$4,start_date=$5,tags=$6,notes=$7,active=$8,updated_at=now() WHERE id=$9',
          [ef.name, amt, ef.currency, ef.cycle, ef.start_date, ef.tags, ef.notes, ef.active, editing.id])
      }
      await load(); setModalOpen(false); setEditing(null)
    } catch (e) { console.error('[subs] save failed:', e) }
  }

  async function deleteSub(id: string) {
    const db = await getDb()
    await db.query('DELETE FROM subscriptions WHERE id=$1', [id])
    await load()
    if (editing?.id === id) { setModalOpen(false); setEditing(null) }
  }

  const CYCLE_LABEL: Record<string, string> = { monthly: '/mo', yearly: '/yr', weekly: '/wk', 'one-time': 'once' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: `${accent}18`, border: `1.5px solid ${accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconSubs size={20} accent={accent} filled />
          </div>
          <div>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 22, color: '#1a1a2e', letterSpacing: '-0.02em', lineHeight: 1 }}>Subscriptions</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{activeCount} active</div>
          </div>
        </div>
        <button onClick={openNew} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '9px 18px', borderRadius: 100,
          background: `linear-gradient(135deg, ${accent} 0%, #ec4899 100%)`,
          border: 'none', cursor: 'pointer', color: '#fff',
          fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13,
          boxShadow: `0 4px 14px ${accent}40`,
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
          Add subscription
        </button>
      </div>

      {/* ── Summary cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {/* Monthly total */}
        <div style={{ background: 'rgba(255,255,255,0.55)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.7)', padding: '20px 20px 16px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: `${accent}10`, pointerEvents: 'none' }} />
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Monthly</div>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 28, color: accent, letterSpacing: '-0.02em', lineHeight: 1 }}>{fmt(totalUSD, display)}</div>
          <div style={{ marginTop: 10 }}>
            <select value={display} onChange={e => setDisplay(e.target.value)} style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: '#94a3b8', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              {DISPLAY_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        {/* Yearly */}
        <div style={{ background: 'rgba(255,255,255,0.55)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.7)', padding: '20px 20px 16px' }}>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Yearly</div>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 28, color: '#1a1a2e', letterSpacing: '-0.02em', lineHeight: 1 }}>{fmt(yearlyUSD, display)}</div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#94a3b8', marginTop: 10 }}>per year total</div>
        </div>
        {/* Active / Total */}
        <div style={{ background: 'rgba(255,255,255,0.55)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.7)', padding: '20px 20px 16px' }}>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Active / Total</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 28, color: '#34d399', letterSpacing: '-0.02em', lineHeight: 1 }}>{activeCount}</span>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 16, color: '#94a3b8' }}>/ {subs.length}</span>
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#94a3b8', marginTop: 10 }}>subscriptions</div>
        </div>
      </div>

      {/* ── Table ── */}
      {subs.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: 48, fontFamily: 'Inter, sans-serif', fontSize: 14 }}>No subscriptions yet. Click <strong>Add subscription</strong> to start.</div>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.45)', borderRadius: 16, overflowX: 'auto' }}>
          <div style={{ minWidth: 680 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 80px 90px 90px 120px 90px', gap: 12, padding: '10px 20px', borderBottom: '1px solid rgba(124,106,247,0.08)', background: 'rgba(255,255,255,0.3)' }}>
            {['Name', 'Amount', 'Cycle', 'Currency', 'Since', ''].map(h => (
              <div key={h} style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</div>
            ))}
          </div>
          {subs.map((s, i) => (
            <div key={s.id} style={{
              display: 'grid', gridTemplateColumns: '1.5fr 80px 90px 90px 120px 90px', gap: 12,
              padding: '12px 20px', alignItems: 'center',
              borderTop: i > 0 ? '1px solid rgba(124,106,247,0.06)' : 'none',
              opacity: s.active ? 1 : 0.45,
              transition: 'background 120ms',
              background: 'transparent',
            }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.5)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.active ? accent : '#94a3b8', flexShrink: 0 }} />
                <div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 14, color: '#1a1a2e' }}>{s.name}</div>
                  {(s.tags ?? []).length > 0 && (
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 2 }}>
                      {(s.tags ?? []).map(t => <span key={t} style={{ fontSize: 10, background: `${accent}12`, color: accent, borderRadius: 100, padding: '1px 6px', fontFamily: 'Inter, sans-serif' }}>#{t}</span>)}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13, color: '#1a1a2e' }}>
                {new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(parseFloat(s.amount))}
              </div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#4a4a6a' }}>{s.cycle}</div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#4a4a6a' }}>{s.currency}</div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#94a3b8' }}>{s.start_date || '—'}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => openEdit(s)} style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)', cursor: 'pointer', background: 'transparent', color: '#4a4a6a', fontFamily: 'Inter, sans-serif', fontSize: 12 }}>Edit</button>
                <button onClick={() => deleteSub(s.id)} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.07)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconTrash size={13} accent="#ef4444" />
                </button>
              </div>
            </div>
          ))}
          </div>
        </div>
      )}

      {/* ── Modal ── */}
      {modalOpen && (
        <div onClick={() => { setModalOpen(false); setEditing(null) }} style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(15,15,35,0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32,
          animation: 'fadeIn 120ms ease',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 520,
            background: 'rgba(245,246,255,0.97)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            borderRadius: 24,
            boxShadow: '0 40px 100px rgba(15,15,35,0.32), 0 8px 24px rgba(15,15,35,0.12)', overflow: 'hidden',
            animation: 'slideUp 200ms cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <div style={{ background: `linear-gradient(135deg, ${accent} 0%, #ec4899 100%)`, padding: '20px 24px 16px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', top: -40, right: -20, pointerEvents: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{editing ? 'Edit subscription' : 'New subscription'}</span>
                <button onClick={() => { setModalOpen(false); setEditing(null) }} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
              <input value={ef.name} onChange={e => setEf(p => ({ ...p, name: e.target.value }))}
                style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 22, color: '#fff', background: 'transparent', border: 'none', outline: 'none', width: '100%', letterSpacing: '-0.02em' }}
                placeholder="Service name" autoFocus />
            </div>
            <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: '#4a4a6a', marginBottom: 6 }}>Amount</label>
                  <input type="number" value={ef.amount} onChange={e => setEf(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: '#4a4a6a', marginBottom: 6 }}>Currency</label>
                  <select value={ef.currency} onChange={e => setEf(p => ({ ...p, currency: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: '#4a4a6a', marginBottom: 6 }}>Billing cycle</label>
                  <select value={ef.cycle} onChange={e => setEf(p => ({ ...p, cycle: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                    {CYCLES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: '#4a4a6a', marginBottom: 6 }}>Start date</label>
                  <input type="date" value={ef.start_date} onChange={e => setEf(p => ({ ...p, start_date: e.target.value }))} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: '#4a4a6a', marginBottom: 6 }}>Notes</label>
                <input value={ef.notes} onChange={e => setEf(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" style={inputStyle} />
              </div>
              <TagInput tags={ef.tags} onChange={t => setEf(p => ({ ...p, tags: t }))} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#1a1a2e', cursor: 'pointer' }}>
                <input type="checkbox" checked={ef.active} onChange={e => setEf(p => ({ ...p, active: e.target.checked }))} style={{ width: 16, height: 16, accentColor: accent }} />
                Active subscription
              </label>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={save} style={{
                  flex: 1, padding: '11px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: `linear-gradient(135deg, ${accent} 0%, #ec4899 100%)`,
                  color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 14,
                }}>Save</button>
                {editing && (
                  <button onClick={() => deleteSub(editing.id)} style={{ padding: '11px 16px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.08)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconTrash size={16} accent="#ef4444" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(16px) scale(0.98); opacity: 0 } to { transform: translateY(0) scale(1); opacity: 1 } }
      `}</style>
    </div>
  )
}
