import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { getDb } from '../../../db'
import { ACCENT } from '../../../design/tokens'
import { IconMaps, IconTrash } from '../../../design/icons'

interface MapStack { id: string; name: string; color: string; icon: string }
interface MapPin { id: string; stack_id: string; label: string; lat: number; lng: number; url: string; note: string; priority: string; category: string; rating: number; review_note: string; created_at: string }

const COLORS = ['#fb923c','#f59e0b','#34d399','#60a5fa','#818cf8','#a78bfa','#f87171','#f472b6']
const PRIORITIES = ['none','low','medium','high']
const accent = ACCENT.maps

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.6)', border: '1.5px solid rgba(255,255,255,0.7)',
  borderRadius: 12, padding: '10px 14px', fontSize: 14, color: '#1a1a2e',
  fontFamily: 'Inter, sans-serif', outline: 'none',
}

const PRIORITY_COLOR: Record<string, string> = { none: '#94a3b8', low: '#94a3b8', medium: '#f59e0b', high: '#ef4444' }

export default function DesktopMapView() {
  const [stacks, setStacks] = useState<MapStack[]>([])
  const [stackQuery, setStackQuery] = useState('')
  const [activeStack, setActiveStack] = useState<MapStack | null>(null)
  const [pins, setPins] = useState<MapPin[]>([])

  const [showNewStack, setShowNewStack] = useState(false)
  const [newStackName, setNewStackName] = useState('')
  const [newStackColor, setNewStackColor] = useState(COLORS[0])

  const [showEditStack, setShowEditStack] = useState(false)
  const [editStackName, setEditStackName] = useState('')
  const [editStackColor, setEditStackColor] = useState(COLORS[0])

  const [pinModalOpen, setPinModalOpen] = useState(false)
  const [editingPin, setEditingPin] = useState<MapPin | null>(null)
  const [pf, setPf] = useState({ label:'', lat:'', lng:'', url:'', note:'', priority:'none', category:'', rating:'0', review_note:'' })

  const loadStacks = useCallback(async () => {
    const db = await getDb()
    const res = await db.query<MapStack>('SELECT * FROM map_stacks ORDER BY created_at ASC')
    setStacks(res.rows)
  }, [])

  const loadPins = useCallback(async (stackId: string) => {
    const db = await getDb()
    const res = await db.query<MapPin>('SELECT * FROM map_pins WHERE stack_id=$1 ORDER BY created_at DESC', [stackId])
    setPins(res.rows)
  }, [])

  useEffect(() => { loadStacks() }, [loadStacks])
  useEffect(() => { if (activeStack) loadPins(activeStack.id) }, [activeStack, loadPins])

  async function createStack() {
    if (!newStackName.trim()) return
    const db = await getDb()
    await db.query('INSERT INTO map_stacks (name,color) VALUES ($1,$2)', [newStackName, newStackColor])
    setNewStackName(''); setShowNewStack(false); await loadStacks()
  }

  async function deleteStack(id: string) {
    const db = await getDb()
    await db.query('DELETE FROM map_stacks WHERE id=$1', [id])
    setActiveStack(null); await loadStacks()
  }

  function openEditStack() {
    if (!activeStack) return
    setEditStackName(activeStack.name)
    setEditStackColor(activeStack.color)
    setShowEditStack(true)
  }

  async function saveEditStack() {
    if (!activeStack || !editStackName.trim()) return
    const db = await getDb()
    await db.query('UPDATE map_stacks SET name=$1, color=$2 WHERE id=$3', [editStackName, editStackColor, activeStack.id])
    setShowEditStack(false)
    await loadStacks()
    setActiveStack(s => s ? { ...s, name: editStackName, color: editStackColor } : s)
  }

  function openNewPin() {
    setPf({ label:'', lat:'', lng:'', url:'', note:'', priority:'none', category:'', rating:'0', review_note:'' })
    setEditingPin(null)
    setPinModalOpen(true)
  }

  function openEditPin(p: MapPin) {
    setPf({ label:p.label, lat:String(p.lat), lng:String(p.lng), url:p.url, note:p.note, priority:p.priority, category:p.category, rating:String(p.rating), review_note:p.review_note })
    setEditingPin(p)
    setPinModalOpen(true)
  }

  async function savePin() {
    if (!pf.label.trim() || !pf.lat || !pf.lng) return
    const db = await getDb()
    const lat = parseFloat(pf.lat), lng = parseFloat(pf.lng)
    try {
      if (!editingPin) {
        await db.query('INSERT INTO map_pins (stack_id,label,lat,lng,url,note,priority,category,rating,review_note) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
          [activeStack!.id, pf.label, lat, lng, pf.url, pf.note, pf.priority, pf.category, parseInt(pf.rating), pf.review_note])
      } else {
        await db.query('UPDATE map_pins SET label=$1,lat=$2,lng=$3,url=$4,note=$5,priority=$6,category=$7,rating=$8,review_note=$9 WHERE id=$10',
          [pf.label, lat, lng, pf.url, pf.note, pf.priority, pf.category, parseInt(pf.rating), pf.review_note, editingPin.id])
      }
      await loadPins(activeStack!.id)
      setPinModalOpen(false)
      setEditingPin(null)
    } catch (e) { console.error('[maps] savePin failed:', e) }
  }

  async function deletePin(id: string) {
    const db = await getDb()
    await db.query('DELETE FROM map_pins WHERE id=$1', [id])
    await loadPins(activeStack!.id)
    setPinModalOpen(false)
    setEditingPin(null)
  }

  function openMaps(p: MapPin) {
    const fallback = `https://www.google.com/maps?q=${p.lat},${p.lng}`
    if (p.url) {
      try {
        const u = new URL(p.url)
        if (u.protocol === 'http:' || u.protocol === 'https:') { window.open(p.url, '_blank', 'noopener,noreferrer'); return }
      } catch { /* fall through */ }
    }
    window.open(fallback, '_blank', 'noopener,noreferrer')
  }

  const stackColor = activeStack?.color ?? accent

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: `${accent}18`, border: `1.5px solid ${accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconMaps size={20} accent={accent} filled />
          </div>
          <div>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 22, color: '#1a1a2e', letterSpacing: '-0.02em', lineHeight: 1 }}>Maps</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{stacks.length} stacks · {pins.length} pins</div>
          </div>
        </div>
        <button onClick={() => setShowNewStack(true)} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '9px 18px', borderRadius: 100,
          background: `linear-gradient(135deg, ${accent} 0%, #6366f1 60%, #818cf8 100%)`,
          border: 'none', cursor: 'pointer', color: '#fff',
          fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13,
          boxShadow: `0 4px 14px ${accent}40`,
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
          New stack
        </button>
      </div>

      {/* ── 2-column layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '264px 1fr', gap: 12, alignItems: 'stretch', height: 'calc(100vh - 180px)' }}>

        {/* ── Col 1: Stacks sidebar ── */}
        <div style={{ background: 'rgba(255,255,255,0.45)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.7)', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.035, pointerEvents: 'none', zIndex: 0 }} xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="hatch-maps" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M-1 1l2-2M0 8l8-8M7 9l2-2" stroke={accent} strokeWidth="1"/></pattern></defs>
            <rect width="100%" height="100%" fill="url(#hatch-maps)" />
          </svg>
          <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid rgba(124,106,247,0.06)', flexShrink: 0, position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="13" height="13" viewBox="0 0 15 15" fill="none">
                <circle cx="6.5" cy="6.5" r="5" stroke="#94a3b8" strokeWidth="1.5"/>
                <path d="M10.5 10.5L13.5 13.5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input value={stackQuery} onChange={e => setStackQuery(e.target.value)} placeholder="Search stacks…"
                style={{ ...inputStyle, padding: '8px 10px 8px 30px', fontSize: 13, borderRadius: 10 }} />
            </div>
          </div>

          <div style={{ overflowY: 'auto', flex: 1, height: 0, padding: '4px 0 12px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {stacks.length === 0 && <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#94a3b8', padding: '8px 14px' }}>No stacks yet</div>}
            {stacks.filter(s => s.name.toLowerCase().includes(stackQuery.toLowerCase())).map(s => {
              const isActive = activeStack?.id === s.id
              return (
                <div key={s.id} onClick={() => setActiveStack(s)} style={{
                  padding: '13px 16px', cursor: 'pointer',
                  background: isActive ? `linear-gradient(135deg, ${s.color}28 0%, #6366f118 100%)` : 'transparent',
                  transition: 'background 120ms', display: 'flex', alignItems: 'center', gap: 10,
                  borderLeft: isActive ? `2px solid ${s.color}` : '2px solid transparent',
                }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.5)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isActive ? `linear-gradient(135deg, ${s.color}28 0%, #6366f118 100%)` : 'transparent' }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                  <span style={{
                    fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 14,
                    color: '#1a1a2e', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{s.name}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Col 2: Pins panel ── */}
        <div style={{ background: 'rgba(255,255,255,0.45)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.7)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {!activeStack ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 8 }}>
              <div style={{ fontSize: 32, opacity: 0.2 }}>📍</div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#94a3b8' }}>Select a stack</div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{
                padding: '10px 16px', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: `linear-gradient(135deg, ${stackColor} 0%, #6366f1 60%, #818cf8 100%)`,
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', top: -50, right: -20, pointerEvents: 'none' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
                  <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 16, color: '#fff' }}>{activeStack.name}</span>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{pins.length} pins</span>
                </div>
                <div style={{ display: 'flex', gap: 8, position: 'relative' }}>
                  <button onClick={openEditStack} style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '4px 12px', borderRadius: 100,
                    border: '1.5px solid rgba(255,255,255,0.7)',
                    background: 'rgba(255,255,255,0.22)', color: '#fff',
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700,
                  }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M7 1.5L8.5 3 3.5 8H2V6.5L7 1.5Z" stroke="white" strokeWidth="1.2" strokeLinejoin="round"/></svg>
                    Edit stack
                  </button>
                  <button onClick={() => deleteStack(activeStack.id)} style={{
                    padding: '4px 10px', borderRadius: 100,
                    border: '1px solid rgba(255,255,255,0.3)',
                    background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)',
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600,
                  }}>Delete</button>
                  <button onClick={openNewPin} style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 100,
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(230,225,255,0.95) 100%)',
                    border: 'none', cursor: 'pointer', color: stackColor,
                    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    Add pin
                  </button>
                </div>
              </div>

              {/* Pin rows */}
              <div style={{ overflowY: 'auto', flex: 1, height: 0 }}>
                {pins.length === 0 && <div style={{ textAlign: 'center', color: '#94a3b8', padding: 32, fontFamily: 'Inter, sans-serif', fontSize: 13 }}>No pins yet — click Add pin</div>}
                {pins.map((p, i) => (
                  <div key={p.id}
                    onClick={() => openEditPin(p)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px',
                      borderTop: i > 0 ? '1px solid rgba(124,106,247,0.06)' : 'none',
                      background: 'transparent', cursor: 'pointer', transition: 'background 120ms',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.5)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.label}</div>
                      {p.category && <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'Inter, sans-serif' }}>{p.category}</div>}
                    </div>
                    {p.rating > 0 && <span style={{ fontSize: 11, color: '#f59e0b', flexShrink: 0 }}>{'★'.repeat(p.rating)}</span>}
                    <span style={{ fontSize: 10, fontWeight: 600, color: PRIORITY_COLOR[p.priority] ?? '#94a3b8', fontFamily: 'Inter, sans-serif', flexShrink: 0 }}>{p.priority !== 'none' ? p.priority : ''}</span>
                    <button onClick={e => { e.stopPropagation(); openMaps(p) }} style={{ padding: '4px 8px', borderRadius: 7, border: '1px solid rgba(0,0,0,0.08)', cursor: 'pointer', background: 'transparent', color: '#4a4a6a', fontFamily: 'Inter, sans-serif', fontSize: 11, flexShrink: 0 }}>Open</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── New stack modal ── */}
      {showNewStack && createPortal(
        <div onClick={e => { if (e.target === e.currentTarget) setShowNewStack(false) }} style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(20,20,40,0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: '44vw', maxWidth: 480,
            background: 'linear-gradient(160deg, #f4f3ff 0%, #eef0ff 100%)',
            borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: '0 32px 80px rgba(0,0,0,0.28)',
          }}>
            <div style={{
              background: `linear-gradient(135deg, ${newStackColor} 0%, #6366f1 60%, #818cf8 100%)`,
              padding: '14px 18px 18px', position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', top: -60, right: -30, pointerEvents: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, position: 'relative' }}>
                <button onClick={() => setShowNewStack(false)} style={{
                  display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', padding: 0,
                }}>
                  <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M6 1L1 6L6 11" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Cancel
                </button>
                <button onClick={createStack} style={{
                  padding: '6px 18px', borderRadius: 100, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(230,225,255,0.95) 100%)',
                  color: newStackColor, fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 13,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}>Create</button>
              </div>
              <input value={newStackName} onChange={e => setNewStackName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') createStack(); if (e.key === 'Escape') setShowNewStack(false) }}
                autoFocus placeholder="Stack name"
                style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 22, color: '#fff', background: 'transparent', border: 'none', outline: 'none', width: '100%', letterSpacing: '-0.02em', lineHeight: 1.2, padding: 0, position: 'relative' }} />
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4, position: 'relative' }}>Pick a color below</div>
            </div>
            <div style={{ padding: '18px 20px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setNewStackColor(c)} style={{
                    width: '100%', aspectRatio: '1', borderRadius: 12, background: c, border: 'none', cursor: 'pointer',
                    boxShadow: newStackColor === c ? `0 0 0 3px #fff, 0 0 0 5px ${c}` : 'none',
                    transform: newStackColor === c ? 'scale(1.1)' : 'scale(1)', transition: 'all 120ms',
                  }} />
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Edit stack modal ── */}
      {showEditStack && activeStack && createPortal(
        <div onClick={e => { if (e.target === e.currentTarget) setShowEditStack(false) }} style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(20,20,40,0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: '44vw', maxWidth: 480,
            background: 'linear-gradient(160deg, #f4f3ff 0%, #eef0ff 100%)',
            borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: '0 32px 80px rgba(0,0,0,0.28)',
          }}>
            <div style={{
              background: `linear-gradient(135deg, ${editStackColor} 0%, #6366f1 60%, #818cf8 100%)`,
              padding: '14px 18px 18px', position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', top: -60, right: -30, pointerEvents: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, position: 'relative' }}>
                <button onClick={() => setShowEditStack(false)} style={{
                  display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', padding: 0,
                }}>
                  <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M6 1L1 6L6 11" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Cancel
                </button>
                <button onClick={saveEditStack} style={{
                  padding: '6px 18px', borderRadius: 100, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(230,225,255,0.95) 100%)',
                  color: editStackColor, fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 13,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}>Save</button>
              </div>
              <input value={editStackName} onChange={e => setEditStackName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveEditStack(); if (e.key === 'Escape') setShowEditStack(false) }}
                autoFocus placeholder="Stack name"
                style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 22, color: '#fff', background: 'transparent', border: 'none', outline: 'none', width: '100%', letterSpacing: '-0.02em', lineHeight: 1.2, padding: 0, position: 'relative' }} />
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4, position: 'relative' }}>Pick a color below</div>
            </div>
            <div style={{ padding: '18px 20px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setEditStackColor(c)} style={{
                    width: '100%', aspectRatio: '1', borderRadius: 12, background: c, border: 'none', cursor: 'pointer',
                    boxShadow: editStackColor === c ? `0 0 0 3px #fff, 0 0 0 5px ${c}` : 'none',
                    transform: editStackColor === c ? 'scale(1.1)' : 'scale(1)', transition: 'all 120ms',
                  }} />
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Pin modal (new + edit) ── */}
      {pinModalOpen && activeStack && createPortal(
        <div onClick={e => { if (e.target === e.currentTarget) setPinModalOpen(false) }} style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(20,20,40,0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: '56vw', maxWidth: 620, maxHeight: '88vh',
            background: 'linear-gradient(160deg, #f4f3ff 0%, #eef0ff 100%)',
            borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: '0 32px 80px rgba(0,0,0,0.28)',
          }}>
            {/* Header */}
            <div style={{
              background: `linear-gradient(135deg, ${stackColor} 0%, #6366f1 60%, #818cf8 100%)`,
              padding: '14px 18px 18px', flexShrink: 0, position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', top: -60, right: -30, pointerEvents: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, position: 'relative' }}>
                <button onClick={() => setPinModalOpen(false)} style={{
                  display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', padding: 0,
                }}>
                  <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M6 1L1 6L6 11" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Cancel
                </button>
                <button onClick={savePin} style={{
                  padding: '6px 18px', borderRadius: 100, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(230,225,255,0.95) 100%)',
                  color: stackColor, fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 13,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}>Save</button>
              </div>
              <input value={pf.label} onChange={e => setPf(p => ({ ...p, label: e.target.value }))} autoFocus
                style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 22, color: '#fff', background: 'transparent', border: 'none', outline: 'none', width: '100%', letterSpacing: '-0.02em', lineHeight: 1.2, padding: 0, position: 'relative' }}
                placeholder="Pin label" />
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4, position: 'relative' }}>
                {editingPin ? 'Edit pin' : 'New pin'} · {activeStack.name}
              </div>
            </div>

            {/* Body */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '16px 20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: '#4a4a6a', marginBottom: 5 }}>Latitude *</label>
                  <input type="number" value={pf.lat} onChange={e => setPf(p => ({ ...p, lat: e.target.value }))} placeholder="0.0000" style={{ ...inputStyle, fontSize: 12, padding: '8px 10px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: '#4a4a6a', marginBottom: 5 }}>Longitude *</label>
                  <input type="number" value={pf.lng} onChange={e => setPf(p => ({ ...p, lng: e.target.value }))} placeholder="0.0000" style={{ ...inputStyle, fontSize: 12, padding: '8px 10px' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: '#4a4a6a', marginBottom: 5 }}>Category</label>
                <input value={pf.category} onChange={e => setPf(p => ({ ...p, category: e.target.value }))} placeholder="Restaurant, Hotel…" style={{ ...inputStyle, fontSize: 13 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: '#4a4a6a', marginBottom: 5 }}>Map URL</label>
                <input value={pf.url} onChange={e => setPf(p => ({ ...p, url: e.target.value }))} placeholder="https://maps.google.com/..." style={{ ...inputStyle, fontSize: 13 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: '#4a4a6a', marginBottom: 5 }}>Note</label>
                <input value={pf.note} onChange={e => setPf(p => ({ ...p, note: e.target.value }))} placeholder="Notes about this place" style={{ ...inputStyle, fontSize: 13 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: '#4a4a6a', marginBottom: 5 }}>Priority</label>
                  <select value={pf.priority} onChange={e => setPf(p => ({ ...p, priority: e.target.value }))} style={{ ...inputStyle, fontSize: 12, padding: '8px 10px', cursor: 'pointer' }}>
                    {PRIORITIES.map(pr => <option key={pr} value={pr}>{pr.charAt(0).toUpperCase()+pr.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: '#4a4a6a', marginBottom: 5 }}>Rating (0–5)</label>
                  <input type="number" min="0" max="5" value={pf.rating} onChange={e => setPf(p => ({ ...p, rating: String(Math.min(5, Math.max(0, +e.target.value))) }))} style={{ ...inputStyle, fontSize: 12, padding: '8px 10px' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: '#4a4a6a', marginBottom: 5 }}>Review note</label>
                <input value={pf.review_note} onChange={e => setPf(p => ({ ...p, review_note: e.target.value }))} placeholder="Your review" style={{ ...inputStyle, fontSize: 13 }} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={savePin} style={{
                  flex: 1, padding: '10px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: `linear-gradient(135deg, ${stackColor} 0%, #6366f1 60%, #818cf8 100%)`,
                  color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 13,
                  boxShadow: `0 4px 14px ${stackColor}40`,
                }}>Save</button>
                {editingPin && (
                  <button onClick={() => deletePin(editingPin.id)} style={{ padding: '10px 14px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.08)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconTrash size={15} accent="#ef4444" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
