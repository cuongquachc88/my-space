// pwa/src/app/views/MapView.tsx
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
import { useIsDesktop } from '../useIsDesktop'
import DesktopMapView from './desktop/DesktopMapView'

interface MapStack { id: string; name: string; color: string; icon: string }
interface MapPin { id: string; stack_id: string; label: string; lat: number; lng: number; url: string; note: string; priority: string; category: string; rating: number; review_note: string; created_at: string }

const COLORS = ['#34d399','#818cf8','#f59e0b','#f87171','#60a5fa','#a78bfa','#fb923c']
const PRIORITIES = ['none','low','medium','high']

const accent = ACCENT.maps

export default function MapView() {
  const isDesktop = useIsDesktop()
  if (isDesktop) return <DesktopMapView />
  const [stacks, setStacks] = useState<MapStack[]>([])
  const [activeStack, setActiveStack] = useState<MapStack | null>(null)
  const [pins, setPins] = useState<MapPin[]>([])
  const [showNewStack, setShowNewStack] = useState(false)
  const [newStackName, setNewStackName] = useState('')
  const [newStackColor, setNewStackColor] = useState(COLORS[0])
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

  function goBack() {
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
      goBack()
    } catch (e) { console.error('[maps] savePin failed:', e) }
  }

  async function deletePin(id: string) {
    const db = await getDb()
    await db.query('DELETE FROM map_pins WHERE id=$1', [id])
    await loadPins(activeStack!.id)
    goBack()
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
        accent={accent} stats={`${stacks.length} stacks · ${pins.length} pins`}
        action="+ Stack" onAction={() => setShowNewStack(true)}
      />
      <BentoGrid>
        <BentoCell span="1">
          <GlassCard style={{ height: '100%' }}>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 13, color: '#8e8e93', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Stacks</div>
              {showNewStack && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8, padding: 12, background: 'rgba(255,255,255,0.5)', borderRadius: 12 }}>
                  <GlassInput value={newStackName} onChange={setNewStackName} placeholder="Stack name" autoFocus />
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {COLORS.map(c => (
                      <button key={c} onClick={() => setNewStackColor(c)}
                        style={{ width: 26, height: 26, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer',
                          boxShadow: newStackColor === c ? `0 0 0 3px #fff, 0 0 0 5px ${c}` : `0 2px 6px ${c}60`,
                          transform: newStackColor === c ? 'scale(1.15)' : 'scale(1)', transition: 'transform 150ms, box-shadow 150ms' }} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <PillButton onClick={createStack} accent={accent}>Create</PillButton>
                    <PillButton variant="ghost" onClick={() => setShowNewStack(false)}>Cancel</PillButton>
                  </div>
                </div>
              )}
              {stacks.length === 0 && <div style={{ color: '#4a4a6a', fontSize: 13, fontFamily: 'Inter, sans-serif', padding: '8px 0' }}>No stacks yet.</div>}
              {stacks.map(s => (
                <button key={s.id} onClick={() => setActiveStack(s)}
                  style={{ textAlign: 'left', padding: '11px 14px', borderRadius: 12, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                    background: activeStack?.id === s.id ? `${s.color}20` : 'rgba(255,255,255,0.4)', boxShadow: activeStack?.id === s.id ? `0 0 0 1.5px ${s.color}60` : 'none',
                    transition: 'background 150ms, box-shadow 150ms' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0, boxShadow: `0 2px 6px ${s.color}80` }} />
                  <span style={{ flex: 1, fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 14, color: '#1a1a2e' }}>{s.name}</span>
                  <button onClick={e => { e.stopPropagation(); deleteStack(s.id) }}
                    style={{ fontSize: 12, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>✕</button>
                </button>
              ))}
            </div>
          </GlassCard>
        </BentoCell>

        <BentoCell span="2">
          <GlassCard style={{ height: '100%', minHeight: 320 }}>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {!activeStack ? (
                <div style={{ textAlign: 'center', color: '#4a4a6a', padding: 32, fontFamily: 'Inter, sans-serif' }}>Select a stack</div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: activeStack.color, boxShadow: `0 2px 6px ${activeStack.color}80` }} />
                      <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 16, color: '#1a1a2e' }}>{activeStack.name}</span>
                    </div>
                    <PillButton onClick={openNewPin} accent={accent}>+ Pin</PillButton>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {pins.length === 0 && <div style={{ color: '#4a4a6a', fontSize: 13, fontFamily: 'Inter, sans-serif', padding: 8 }}>No pins yet.</div>}
                    {pins.map(p => (
                      <SwipeToDelete key={p.id} onDelete={async () => {
                        const db = await getDb(); await db.query('DELETE FROM map_pins WHERE id=$1', [p.id]); await loadPins(activeStack.id)
                      }}>
                        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 14, color: '#1a1a2e' }}>{p.label}</div>
                            {p.category && <div style={{ fontSize: 11, color: '#4a4a6a' }}>{p.category}</div>}
                            <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#94a3b8' }}>{p.lat.toFixed(4)}, {p.lng.toFixed(4)}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            <PillButton variant="ghost" onClick={() => openMaps(p)}>Open</PillButton>
                            <PillButton variant="ghost" onClick={() => openEditPin(p)}>Edit</PillButton>
                          </div>
                        </div>
                      </SwipeToDelete>
                    ))}
                  </div>
                </>
              )}
            </div>
          </GlassCard>
        </BentoCell>
      </BentoGrid>

      {/* ── Pin detail push screen ── */}
      {showPinDetail && createPortal(
        <div style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: 'linear-gradient(160deg, #f0f2ff 0%, #e8eeff 50%, #dde3ff 100%)',
          overflowY: 'auto',
          transform: pinDetailVisible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 550ms cubic-bezier(0.22,1,0.36,1)',
        }}>
          {/* Hero header */}
          <div style={{ background: `linear-gradient(145deg, ${stackColor} 0%, ${accent} 60%, #34d399 100%)`, paddingBottom: 24, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', top: -60, right: -40, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', bottom: -20, left: 20, pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'calc(env(safe-area-inset-top) + 14px) 20px 10px', position: 'relative' }}>
              <button onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.92)', padding: 0 }}>
                <svg width="8" height="13" viewBox="0 0 8 13" fill="none">
                  <path d="M7 1L1.5 6.5L7 12" stroke="rgba(255,255,255,0.92)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {activeStack?.name ?? 'Maps'}
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={savePin} style={{
                  padding: '8px 22px', borderRadius: 100, border: '1.5px solid rgba(255,255,255,0.5)', cursor: 'pointer',
                  background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                  color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13,
                }}>Save</button>
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

          {/* Content */}
          <div style={{ padding: '20px 20px 80px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
