import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { getDb } from '../../db'
import { ACCENT } from '../../design/tokens'
import GlassCard from '../../design/GlassCard'
import GlassInput from '../../design/GlassInput'
import PillButton from '../../design/PillButton'
import { BentoGrid, BentoCell } from '../../design/BentoGrid'
import ViewHeader from '../ViewHeader'
import { IconMaps, IconTrash } from '../../design/icons'
import SwipeToDelete from '../../design/SwipeToDelete'
import AppBackground from '../../design/AppBackground'
import { useIsDesktop } from '../useIsDesktop'
import DesktopMapView from './desktop/DesktopMapView'

interface MapStack { id: string; name: string; color: string; icon: string }
interface MapPin { id: string; stack_id: string; label: string; lat: number; lng: number; url: string; note: string; priority: string; category: string; rating: number; review_note: string; created_at: string }

const COLORS = ['#34d399','#818cf8','#f59e0b','#f87171','#60a5fa','#a78bfa','#fb923c','#10b981','#6366f1','#3b82f6','#ec4899','#d946ef']
const PRIORITIES = ['none','low','medium','high']
const accent = ACCENT.maps

function contrastColor(hex: string): string {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return (r*0.299 + g*0.587 + b*0.114) > 150 ? '#1a1a2e' : '#ffffff'
}

export default function MapView() {
  const isDesktop = useIsDesktop()
  if (isDesktop) return <DesktopMapView />

  const [stacks, setStacks] = useState<MapStack[]>([])
  const [activeStack, setActiveStack] = useState<MapStack | null>(null)
  const [stackScreenVisible, setStackScreenVisible] = useState(false)
  const [pins, setPins] = useState<MapPin[]>([])
  const [showNewStack, setShowNewStack] = useState(false)
  const [newStackVisible, setNewStackVisible] = useState(false)
  const [newStackName, setNewStackName] = useState('')
  const [newStackColor, setNewStackColor] = useState(COLORS[0])
  const [editingStack, setEditingStack] = useState<MapStack | null>(null)

  // Pin detail push screen
  const [editingPin, setEditingPin] = useState<MapPin | null>(null)
  const [isNewPin, setIsNewPin] = useState(false)
  const [showPinDetail, setShowPinDetail] = useState(false)
  const [pinDetailVisible, setPinDetailVisible] = useState(false)
  const [pf, setPf] = useState({ label:'', lat:'', lng:'', url:'', note:'', priority:'none', category:'', rating:0, review_note:'' })

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

  function openStack(s: MapStack) {
    setActiveStack(s)
    setStackScreenVisible(false)
    setTimeout(() => setStackScreenVisible(true), 10)
  }

  function closeStack() {
    setStackScreenVisible(false)
    setTimeout(() => { setActiveStack(null); setPins([]) }, 560)
  }

  async function createStack() {
    if (!newStackName.trim()) return
    const db = await getDb()
    await db.query('INSERT INTO map_stacks (name,color) VALUES ($1,$2)', [newStackName, newStackColor])
    setNewStackName(''); await loadStacks()
  }

  async function updateStack() {
    if (!newStackName.trim() || !editingStack) return
    const db = await getDb()
    await db.query('UPDATE map_stacks SET name=$1,color=$2 WHERE id=$3', [newStackName, newStackColor, editingStack.id])
    if (activeStack?.id === editingStack.id) setActiveStack({ ...editingStack, name: newStackName, color: newStackColor })
    setEditingStack(null); await loadStacks()
  }

  async function deleteStack(id: string) {
    const db = await getDb()
    await db.query('DELETE FROM map_stacks WHERE id=$1', [id])
    closeStack(); await loadStacks()
  }

  function openNewPin() {
    setPf({ label:'', lat:'', lng:'', url:'', note:'', priority:'none', category:'', rating:0, review_note:'' })
    setEditingPin(null); setIsNewPin(true)
    setShowPinDetail(true)
    setTimeout(() => setPinDetailVisible(true), 10)
  }

  function openEditPin(p: MapPin) {
    setPf({ label:p.label, lat:String(p.lat), lng:String(p.lng), url:p.url, note:p.note, priority:p.priority, category:p.category, rating:p.rating, review_note:p.review_note })
    setEditingPin(p); setIsNewPin(false)
    setShowPinDetail(true)
    setTimeout(() => setPinDetailVisible(true), 10)
  }

  function closePinDetail() {
    setPinDetailVisible(false)
    setTimeout(() => { setShowPinDetail(false); setEditingPin(null) }, 560)
  }

  async function savePin() {
    if (!pf.label.trim() || !pf.lat || !pf.lng) return
    const db = await getDb()
    const lat = parseFloat(pf.lat), lng = parseFloat(pf.lng)
    try {
      if (isNewPin) {
        await db.query('INSERT INTO map_pins (stack_id,label,lat,lng,url,note,priority,category,rating,review_note) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
          [activeStack!.id, pf.label, lat, lng, pf.url, pf.note, pf.priority, pf.category, pf.rating, pf.review_note])
      } else {
        await db.query('UPDATE map_pins SET label=$1,lat=$2,lng=$3,url=$4,note=$5,priority=$6,category=$7,rating=$8,review_note=$9 WHERE id=$10',
          [pf.label, lat, lng, pf.url, pf.note, pf.priority, pf.category, pf.rating, pf.review_note, editingPin!.id])
      }
      await loadPins(activeStack!.id)
      closePinDetail()
    } catch (e) { console.error('[maps] savePin failed:', e) }
  }

  async function deletePin(id: string) {
    const db = await getDb()
    await db.query('DELETE FROM map_pins WHERE id=$1', [id])
    await loadPins(activeStack!.id)
    closePinDetail()
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
    <div>
      <ViewHeader
        title="Maps" icon={<IconMaps size={22} accent={accent} filled />}
        accent={accent} stats={`${stacks.length} stacks`}
        action="+ Stack" onAction={() => { setNewStackName(''); setNewStackColor(COLORS[0]); setShowNewStack(true); setTimeout(() => setNewStackVisible(true), 10) }}
      />
      <BentoGrid>
        <BentoCell span="full">
          <GlassCard>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stacks.length === 0 && (
                <div style={{ textAlign: 'center', color: '#4a4a6a', padding: '20px 0', fontFamily: 'Inter, sans-serif', fontSize: 14 }}>No stacks yet</div>
              )}
              {stacks.map(s => {
                const fg = contrastColor(s.color)
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button onClick={() => openStack(s)} style={{
                      display: 'flex', alignItems: 'center', gap: 10, flex: 1,
                      padding: '14px 16px', borderRadius: 14, border: 'none', cursor: 'pointer',
                      background: s.color, boxShadow: `0 4px 14px ${s.color}50`,
                      transition: 'transform 120ms, box-shadow 120ms',
                    }}>
                      <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 15, color: fg, flex: 1, textAlign: 'left' }}>{s.name}</span>
                      <svg width="7" height="12" viewBox="0 0 7 12" fill="none" style={{ opacity: 0.6 }}>
                        <path d="M1 1l5 5-5 5" stroke={fg} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <button onClick={() => { setEditingStack(s); setNewStackName(s.name); setNewStackColor(s.color); setShowNewStack(true); setTimeout(() => setNewStackVisible(true), 10) }} style={{
                      alignSelf: 'stretch', minWidth: 52, borderRadius: 14, border: 'none', cursor: 'pointer', flexShrink: 0,
                      background: s.color, boxShadow: `0 4px 14px ${s.color}50`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={contrastColor(s.color)} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85 }}>
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  </div>
                )
              })}
            </div>
          </GlassCard>
        </BentoCell>
      </BentoGrid>

      {/* ── Stack (pins) push screen ── */}
      {activeStack && createPortal(
        <div style={{
          position: 'fixed', inset: 0, zIndex: 400,
          background: 'linear-gradient(160deg, #f0f2ff 0%, #e8eeff 50%, #dde3ff 100%)',
          overflowY: 'auto',
          transform: stackScreenVisible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 550ms cubic-bezier(0.22,1,0.36,1)',
        }}>
          <AppBackground />
          {/* Header */}
          <div style={{ background: `linear-gradient(145deg, ${stackColor} 0%, ${stackColor}cc 100%)`, paddingBottom: 20, position: 'relative', overflow: 'hidden', zIndex: 1 }}>
            <div style={{ position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', top: -60, right: -40, pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'calc(env(safe-area-inset-top) + 14px) 20px 10px', position: 'relative' }}>
              <button onClick={closeStack} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.92)', padding: 0 }}>
                <svg width="8" height="13" viewBox="0 0 8 13" fill="none">
                  <path d="M7 1L1.5 6.5L7 12" stroke="rgba(255,255,255,0.92)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Maps
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <PillButton onClick={openNewPin} accent={stackColor}>+ Pin</PillButton>
                <button onClick={() => deleteStack(activeStack.id)} style={{ width: 34, height: 34, borderRadius: 10, border: 'none', cursor: 'pointer', background: 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconTrash size={15} accent="rgba(255,255,255,0.85)" />
                </button>
              </div>
            </div>
            <div style={{ padding: '4px 20px 0', position: 'relative' }}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 28, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{activeStack.name}</div>
              <div style={{ marginTop: 4, fontSize: 13, fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.7)' }}>{pins.length} pins</div>
            </div>
          </div>

          {/* Pins list */}
          <div style={{ padding: '16px 16px 80px', display: 'flex', flexDirection: 'column', gap: 8, position: 'relative', zIndex: 1 }}>
            {pins.length === 0 && (
              <div style={{ textAlign: 'center', color: '#4a4a6a', padding: '32px 0', fontFamily: 'Inter, sans-serif', fontSize: 14 }}>No pins yet</div>
            )}
            {pins.map(p => (
              <SwipeToDelete key={p.id} onDelete={async () => {
                const db = await getDb(); await db.query('DELETE FROM map_pins WHERE id=$1', [p.id]); await loadPins(activeStack.id)
              }}>
                <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 14, color: '#1a1a2e' }}>{p.label}</div>
                    {p.category && <div style={{ fontSize: 11, color: '#4a4a6a', marginTop: 2 }}>{p.category}</div>}
                    <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#94a3b8', marginTop: 2 }}>{p.lat.toFixed(4)}, {p.lng.toFixed(4)}</div>
                    {p.rating > 0 && <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 2 }}>{'★'.repeat(p.rating)}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <PillButton variant="ghost" onClick={() => openMaps(p)}>Open</PillButton>
                    <PillButton variant="ghost" onClick={() => openEditPin(p)}>Edit</PillButton>
                  </div>
                </div>
              </SwipeToDelete>
            ))}
          </div>
        </div>,
        document.body
      )}

      {/* ── Pin detail push screen ── */}
      {showPinDetail && createPortal(
        <div style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: 'linear-gradient(160deg, #f0f2ff 0%, #e8eeff 50%, #dde3ff 100%)',
          overflowY: 'auto',
          transform: pinDetailVisible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 550ms cubic-bezier(0.22,1,0.36,1)',
        }}>
          <div style={{ background: `linear-gradient(145deg, ${stackColor} 0%, ${accent} 60%, #34d399 100%)`, paddingBottom: 24, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', top: -60, right: -40, pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'calc(env(safe-area-inset-top) + 14px) 20px 10px', position: 'relative' }}>
              <button onClick={closePinDetail} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.92)', padding: 0 }}>
                <svg width="8" height="13" viewBox="0 0 8 13" fill="none">
                  <path d="M7 1L1.5 6.5L7 12" stroke="rgba(255,255,255,0.92)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {activeStack?.name ?? 'Maps'}
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={savePin} style={{ padding: '8px 22px', borderRadius: 100, border: '1.5px solid rgba(255,255,255,0.5)', cursor: 'pointer', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13 }}>Save</button>
                {!isNewPin && editingPin && (
                  <button onClick={() => deletePin(editingPin.id)} style={{ width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconTrash size={15} accent="rgba(255,255,255,0.85)" />
                  </button>
                )}
              </div>
            </div>
            <div style={{ padding: '8px 20px 0', position: 'relative' }}>
              <input
                value={pf.label}
                onChange={e => setPf(p => ({ ...p, label: e.target.value }))}
                style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 26, color: '#fff', background: 'transparent', border: 'none', outline: 'none', width: '100%', letterSpacing: '-0.02em', lineHeight: 1.2 }}
                placeholder={isNewPin ? 'New pin' : 'Pin label'}
                autoFocus
              />
              {pf.category && <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>{pf.category}</div>}
            </div>
          </div>

          <div style={{ padding: '20px 20px 80px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <GlassInput value={String(pf.lat)} onChange={v => setPf(p => ({ ...p, lat: v }))} placeholder="Latitude" type="number" />
              <GlassInput value={String(pf.lng)} onChange={v => setPf(p => ({ ...p, lng: v }))} placeholder="Longitude" type="number" />
            </div>
            <GlassInput value={pf.url} onChange={v => setPf(p => ({ ...p, url: v }))} placeholder="Map URL (optional)" />
            <GlassInput value={pf.category} onChange={v => setPf(p => ({ ...p, category: v }))} placeholder="Category" />
            <GlassInput value={pf.note} onChange={v => setPf(p => ({ ...p, note: v }))} placeholder="Note" />
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#4a4a6a', marginBottom: 6, fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>Priority</div>
                <select value={pf.priority} onChange={e => setPf(p => ({ ...p, priority: e.target.value }))}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1.5px solid rgba(255,255,255,0.6)', borderRadius: 14, padding: '12px 16px', fontSize: 15, color: '#1a1a2e', outline: 'none', cursor: 'pointer' }}>
                  {PRIORITIES.map(pr => <option key={pr} value={pr}>{pr.charAt(0).toUpperCase()+pr.slice(1)}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#4a4a6a', marginBottom: 6, fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>Rating (0–5)</div>
                <GlassInput value={String(pf.rating)} onChange={v => setPf(p => ({ ...p, rating: Math.min(5, Math.max(0, +v)) }))} placeholder="0" type="number" />
              </div>
            </div>
            <GlassInput value={pf.review_note} onChange={v => setPf(p => ({ ...p, review_note: v }))} placeholder="Review note" />
          </div>
        </div>,
        document.body
      )}

      {/* ── Create stack push screen ── */}
      {showNewStack && createPortal(
        <div style={{
          position: 'fixed', inset: 0, zIndex: 600,
          background: 'linear-gradient(160deg, #f0f2ff 0%, #e8eeff 50%, #dde3ff 100%)',
          overflowY: 'auto',
          transform: newStackVisible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 550ms cubic-bezier(0.22,1,0.36,1)',
        }}>
          <AppBackground />
          <div style={{ background: `linear-gradient(145deg, ${newStackColor} 0%, ${newStackColor}cc 100%)`, paddingBottom: 28, position: 'relative', overflow: 'hidden', zIndex: 1 }}>
            <div style={{ position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', top: -60, right: -40, pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'center', padding: 'calc(env(safe-area-inset-top) + 14px) 20px 10px', position: 'relative' }}>
              <button onClick={() => { setNewStackVisible(false); setTimeout(() => { setShowNewStack(false); setEditingStack(null) }, 560) }} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 600, color: contrastColor(newStackColor), opacity: 0.9, padding: 0 }}>
                <svg width="8" height="13" viewBox="0 0 8 13" fill="none">
                  <path d="M7 1L1.5 6.5L7 12" stroke={contrastColor(newStackColor)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Maps
              </button>
            </div>
            <div style={{ padding: '8px 20px 0', position: 'relative' }}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 28, color: contrastColor(newStackColor), letterSpacing: '-0.02em', opacity: newStackName ? 1 : 0.4 }}>
                {newStackName || (editingStack ? 'Edit Stack' : 'New Stack')}
              </div>
            </div>
          </div>
          <div style={{ padding: '24px 20px 80px', display: 'flex', flexDirection: 'column', gap: 20, position: 'relative', zIndex: 1 }}>
            <GlassInput value={newStackName} onChange={setNewStackName} placeholder="Stack name" autoFocus />
            <div>
              <div style={{ fontSize: 12, color: '#4a4a6a', marginBottom: 10, fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Color</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setNewStackColor(c)} style={{
                    width: '100%', aspectRatio: '1', borderRadius: 12, background: c, border: 'none', cursor: 'pointer',
                    boxShadow: newStackColor === c ? `0 0 0 3px #fff, 0 0 0 5px ${c}` : `0 3px 8px ${c}60`,
                    transform: newStackColor === c ? 'scale(1.15)' : 'scale(1)',
                    transition: 'transform 150ms, box-shadow 150ms',
                  }} />
                ))}
              </div>
            </div>
            <PillButton onClick={async () => {
              if (editingStack) { await updateStack() } else { await createStack() }
              setNewStackVisible(false); setTimeout(() => { setShowNewStack(false); setEditingStack(null) }, 560)
            }} accent={newStackColor}>{editingStack ? 'Save' : 'Create Stack'}</PillButton>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
