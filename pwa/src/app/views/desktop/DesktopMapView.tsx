import { useEffect, useState, useCallback } from 'react'
import { getDb } from '../../../db'
import { ACCENT } from '../../../design/tokens'
import { IconMaps, IconTrash } from '../../../design/icons'

interface MapStack { id: string; name: string; color: string; icon: string }
interface MapPin { id: string; stack_id: string; label: string; lat: number; lng: number; url: string; note: string; priority: string; category: string; rating: number; review_note: string; created_at: string }

const COLORS = ['#34d399','#818cf8','#f59e0b','#f87171','#60a5fa','#a78bfa','#fb923c']
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
  const [activeStack, setActiveStack] = useState<MapStack | null>(null)
  const [pins, setPins] = useState<MapPin[]>([])

  // Inline new stack form
  const [showNewStack, setShowNewStack] = useState(false)
  const [newStackName, setNewStackName] = useState('')
  const [newStackColor, setNewStackColor] = useState(COLORS[0])

  // Detail panel (col 3) — null = closed, 'new' = new pin form, pin object = edit
  const [editingPin, setEditingPin] = useState<MapPin | 'new' | null>(null)
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
    setActiveStack(null); setEditingPin(null); await loadStacks()
  }

  function openNewPin() {
    setPf({ label:'', lat:'', lng:'', url:'', note:'', priority:'none', category:'', rating:'0', review_note:'' })
    setEditingPin('new')
  }

  function openEditPin(p: MapPin) {
    setPf({ label:p.label, lat:String(p.lat), lng:String(p.lng), url:p.url, note:p.note, priority:p.priority, category:p.category, rating:String(p.rating), review_note:p.review_note })
    setEditingPin(p)
  }

  async function savePin() {
    if (!pf.label.trim() || !pf.lat || !pf.lng) return
    const db = await getDb()
    const lat = parseFloat(pf.lat), lng = parseFloat(pf.lng)
    try {
      if (editingPin === 'new') {
        await db.query('INSERT INTO map_pins (stack_id,label,lat,lng,url,note,priority,category,rating,review_note) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
          [activeStack!.id, pf.label, lat, lng, pf.url, pf.note, pf.priority, pf.category, parseInt(pf.rating), pf.review_note])
      } else if (editingPin) {
        await db.query('UPDATE map_pins SET label=$1,lat=$2,lng=$3,url=$4,note=$5,priority=$6,category=$7,rating=$8,review_note=$9 WHERE id=$10',
          [pf.label, lat, lng, pf.url, pf.note, pf.priority, pf.category, parseInt(pf.rating), pf.review_note, editingPin.id])
      }
      await loadPins(activeStack!.id)
      setEditingPin(null)
    } catch (e) { console.error('[maps] savePin failed:', e) }
  }

  async function deletePin(id: string) {
    const db = await getDb()
    await db.query('DELETE FROM map_pins WHERE id=$1', [id])
    await loadPins(activeStack!.id)
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
  const isEditing = editingPin !== null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

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
        <button onClick={() => setShowNewStack(v => !v)} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '9px 18px', borderRadius: 100,
          background: `linear-gradient(135deg, ${accent} 0%, #34d399 100%)`,
          border: 'none', cursor: 'pointer', color: '#fff',
          fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13,
          boxShadow: `0 4px 14px ${accent}40`,
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
          New stack
        </button>
      </div>

      {/* ── 3-column grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isEditing ? '200px 1fr 320px' : '200px 1fr', gap: 12, minHeight: 520, transition: 'grid-template-columns 250ms ease', alignItems: 'start' }}>

        {/* Col 1 — Stacks */}
        <div style={{ background: 'rgba(255,255,255,0.45)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.7)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 12px 6px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 10, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Stacks</div>

          {/* Inline new stack form */}
          {showNewStack && (
            <div style={{ margin: '0 8px 8px', padding: 12, background: 'rgba(255,255,255,0.7)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.8)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input value={newStackName} onChange={e => setNewStackName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') createStack(); if (e.key === 'Escape') setShowNewStack(false) }}
                placeholder="Stack name" autoFocus
                style={{ ...inputStyle, padding: '8px 12px', fontSize: 13 }} />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setNewStackColor(c)} style={{
                    width: 28, height: 28, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer',
                    boxShadow: newStackColor === c ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : 'none',
                    transform: newStackColor === c ? 'scale(1.15)' : 'scale(1)', transition: 'all 120ms',
                  }} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={createStack} style={{ flex: 1, padding: '7px', borderRadius: 10, border: 'none', cursor: 'pointer', background: newStackColor, color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 12 }}>Create</button>
                <button onClick={() => setShowNewStack(false)} style={{ padding: '7px 12px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)', cursor: 'pointer', background: 'transparent', color: '#94a3b8', fontFamily: 'Inter, sans-serif', fontSize: 12 }}>Cancel</button>
              </div>
            </div>
          )}

          <div style={{ padding: '0 8px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {stacks.length === 0 && !showNewStack && <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#94a3b8', padding: '8px 4px' }}>No stacks yet</div>}
            {stacks.map(s => (
              <button key={s.id} onClick={() => { setActiveStack(s); setEditingPin(null) }} style={{
                textAlign: 'left', padding: '9px 10px', borderRadius: 10, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                background: activeStack?.id === s.id ? `${s.color}18` : 'transparent',
                boxShadow: activeStack?.id === s.id ? `inset 0 0 0 1.5px ${s.color}40` : 'none',
                transition: 'all 150ms',
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0, boxShadow: `0 2px 6px ${s.color}80` }} />
                <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: activeStack?.id === s.id ? 600 : 400, fontSize: 13.5, color: activeStack?.id === s.id ? s.color : '#1a1a2e', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                <button onClick={e => { e.stopPropagation(); deleteStack(s.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 13, padding: 2, lineHeight: 1 }}>✕</button>
              </button>
            ))}
          </div>
        </div>

        {/* Col 2 — Pins list */}
        <div style={{ background: 'rgba(255,255,255,0.45)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.7)', overflow: 'hidden' }}>
          {!activeStack ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 8 }}>
              <div style={{ fontSize: 32, opacity: 0.2 }}>📍</div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#94a3b8' }}>Select a stack</div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(124,106,247,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: activeStack.color, boxShadow: `0 2px 8px ${activeStack.color}80` }} />
                  <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 16, color: '#1a1a2e' }}>{activeStack.name}</span>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#94a3b8' }}>{pins.length} pins</span>
                </div>
                <button onClick={openNewPin} style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 100,
                  background: stackColor, border: 'none', cursor: 'pointer', color: '#fff',
                  fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 12,
                }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1v8M1 5h8" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                  Add pin
                </button>
              </div>

              {/* Pin rows */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {pins.length === 0 && <div style={{ textAlign: 'center', color: '#94a3b8', padding: 32, fontFamily: 'Inter, sans-serif', fontSize: 13 }}>No pins yet — click Add pin</div>}
                {pins.map((p, i) => (
                  <div key={p.id}
                    onClick={() => openEditPin(p)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px',
                      borderTop: i > 0 ? '1px solid rgba(124,106,247,0.06)' : 'none',
                      background: (editingPin !== 'new' && editingPin && editingPin.id === p.id) ? `${stackColor}0d` : 'transparent',
                      boxShadow: (editingPin !== 'new' && editingPin && editingPin.id === p.id) ? `inset 2px 0 0 ${stackColor}` : 'none',
                      cursor: 'pointer', transition: 'background 120ms',
                    }}
                    onMouseEnter={e => { if (!(editingPin !== 'new' && editingPin && editingPin.id === p.id)) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.5)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = (editingPin !== 'new' && editingPin && editingPin.id === p.id) ? `${stackColor}0d` : 'transparent' }}
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

        {/* Col 3 — Pin detail panel */}
        {isEditing && activeStack && (
          <div style={{ background: 'rgba(255,255,255,0.45)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.7)', overflow: 'hidden' }}>
            <div style={{ background: `linear-gradient(135deg, ${stackColor} 0%, ${accent} 100%)`, padding: '16px 16px 12px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', top: -30, right: -20, pointerEvents: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{editingPin === 'new' ? 'New pin' : 'Edit pin'} · {activeStack.name}</span>
                <button onClick={() => setEditingPin(null)} style={{ width: 24, height: 24, borderRadius: 7, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
              <input value={pf.label} onChange={e => setPf(p => ({ ...p, label: e.target.value }))}
                style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 18, color: '#fff', background: 'transparent', border: 'none', outline: 'none', width: '100%', letterSpacing: '-0.02em' }}
                placeholder="Pin label" autoFocus />
            </div>

            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
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
              <div style={{ display: 'flex', gap: 7, marginTop: 4 }}>
                <button onClick={savePin} style={{
                  flex: 1, padding: '10px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: `linear-gradient(135deg, ${stackColor} 0%, ${accent} 100%)`,
                  color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 13,
                }}>Save</button>
                {editingPin !== 'new' && editingPin && (
                  <button onClick={() => deletePin(editingPin.id)} style={{ padding: '10px 14px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.08)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconTrash size={15} accent="#ef4444" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
