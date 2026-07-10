// pwa/src/app/views/MapView.tsx
import { useEffect, useState, useCallback } from 'react'
import { getDb } from '../../db'
import { ACCENT } from '../../design/tokens'
import GlassCard from '../../design/GlassCard'
import GlassInput from '../../design/GlassInput'
import PillButton from '../../design/PillButton'
import { BentoGrid, BentoCell } from '../../design/BentoGrid'
import ViewHeader from '../ViewHeader'
import { IconMaps } from '../../design/icons'

interface MapStack { id: string; name: string; color: string; icon: string }
interface MapPin { id: string; stack_id: string; label: string; lat: number; lng: number; url: string; note: string; priority: string; category: string; rating: number; review_note: string; created_at: string }

const COLORS = ['#34d399','#818cf8','#f59e0b','#f87171','#60a5fa','#a78bfa','#fb923c']
const PRIORITIES = ['none','low','medium','high']

const accent = ACCENT.maps

export default function MapView() {
  const [stacks, setStacks] = useState<MapStack[]>([])
  const [activeStack, setActiveStack] = useState<MapStack | null>(null)
  const [pins, setPins] = useState<MapPin[]>([])
  const [showNewStack, setShowNewStack] = useState(false)
  const [newStackName, setNewStackName] = useState('')
  const [newStackColor, setNewStackColor] = useState(COLORS[0])
  const [editingPin, setEditingPin] = useState<MapPin | null>(null)
  const [isNewPin, setIsNewPin] = useState(false)
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
    setEditingPin({} as MapPin); setIsNewPin(true)
  }

  function openEditPin(p: MapPin) {
    setPf({ label:p.label, lat:String(p.lat), lng:String(p.lng), url:p.url, note:p.note, priority:p.priority, category:p.category, rating:p.rating, review_note:p.review_note })
    setEditingPin(p); setIsNewPin(false)
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
      setEditingPin(null); await loadPins(activeStack!.id)
    } catch (e) { console.error('[maps] savePin failed:', e) }
  }

  async function deletePin(id: string) {
    const db = await getDb()
    await db.query('DELETE FROM map_pins WHERE id=$1', [id])
    setEditingPin(null); await loadPins(activeStack!.id)
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
              <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: 14, color: '#1a1a2e', marginBottom: 4 }}>Stacks</div>
              {showNewStack && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                  <GlassInput value={newStackName} onChange={setNewStackName} placeholder="Stack name" autoFocus />
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {COLORS.map(c => (
                      <button key={c} onClick={() => setNewStackColor(c)}
                        style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: newStackColor === c ? '2px solid #1a1a2e' : '2px solid transparent', cursor: 'pointer' }} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <PillButton onClick={createStack} accent={accent}>Create</PillButton>
                    <PillButton variant="ghost" onClick={() => setShowNewStack(false)}>Cancel</PillButton>
                  </div>
                </div>
              )}
              {stacks.length === 0 && <div style={{ color: '#4a4a6a', fontSize: 13, fontFamily: 'Satoshi, sans-serif', padding: '8px 0' }}>No stacks yet.</div>}
              {stacks.map(s => (
                <button key={s.id} onClick={() => setActiveStack(s)}
                  style={{ textAlign: 'left', padding: '8px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                    background: activeStack?.id === s.id ? `${s.color}20` : 'rgba(255,255,255,0.4)', borderLeft: `3px solid ${s.color}` }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontFamily: 'Satoshi, sans-serif', fontWeight: 500, fontSize: 14, color: '#1a1a2e' }}>{s.name}</span>
                  <button onClick={e => { e.stopPropagation(); deleteStack(s.id) }}
                    style={{ fontSize: 11, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>✕</button>
                </button>
              ))}
            </div>
          </GlassCard>
        </BentoCell>

        <BentoCell span="2">
          <GlassCard style={{ height: '100%', minHeight: 320 }}>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {!activeStack ? (
                <div style={{ textAlign: 'center', color: '#4a4a6a', padding: 32, fontFamily: 'Satoshi, sans-serif' }}>Select a stack</div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 700, fontSize: 16, color: '#1a1a2e' }}>{activeStack.name}</span>
                    <PillButton onClick={openNewPin} accent={accent}>+ Pin</PillButton>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
                    {pins.length === 0 && <div style={{ color: '#4a4a6a', fontSize: 13, fontFamily: 'Satoshi, sans-serif', padding: 8 }}>No pins yet.</div>}
                    {pins.map(p => (
                      <div key={p.id} style={{ padding: '8px 12px', borderRadius: 10, background: editingPin?.id === p.id ? `${accent}18` : 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 600, fontSize: 14, color: '#1a1a2e' }}>{p.label}</div>
                          {p.category && <div style={{ fontSize: 11, color: '#4a4a6a' }}>{p.category}</div>}
                          <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#94a3b8' }}>{p.lat.toFixed(4)}, {p.lng.toFixed(4)}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          <PillButton variant="ghost" onClick={() => openMaps(p)}>Open</PillButton>
                          <PillButton variant="ghost" onClick={() => openEditPin(p)}>Edit</PillButton>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </GlassCard>
        </BentoCell>

        {editingPin !== null && (
          <BentoCell span="full">
            <GlassCard accentBar accent={accent}>
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 700, fontSize: 18, color: '#1a1a2e' }}>{isNewPin ? 'New Pin' : 'Edit Pin'}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 200px' }}><GlassInput value={pf.label} onChange={v => setPf(p=>({...p,label:v}))} placeholder="Label" /></div>
                  <div style={{ flex: '0 0 120px' }}><GlassInput value={String(pf.lat)} onChange={v => setPf(p=>({...p,lat:v}))} placeholder="Latitude" type="number" /></div>
                  <div style={{ flex: '0 0 120px' }}><GlassInput value={String(pf.lng)} onChange={v => setPf(p=>({...p,lng:v}))} placeholder="Longitude" type="number" /></div>
                </div>
                <GlassInput value={pf.url} onChange={v => setPf(p=>({...p,url:v}))} placeholder="Map URL (optional)" />
                <GlassInput value={pf.note} onChange={v => setPf(p=>({...p,note:v}))} placeholder="Note" />
                <GlassInput value={pf.category} onChange={v => setPf(p=>({...p,category:v}))} placeholder="Category" />
                <div style={{ display: 'flex', gap: 8 }}>
                  <select value={pf.priority} onChange={e => setPf(p=>({...p,priority:e.target.value}))}
                    style={{ flex: 1, background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.6)', borderRadius: 12, padding: '12px 16px', fontSize: 14, color: '#1a1a2e', outline: 'none' }}>
                    {PRIORITIES.map(pr => <option key={pr} value={pr}>{pr.charAt(0).toUpperCase()+pr.slice(1)}</option>)}
                  </select>
                  <div style={{ flex: 1 }}>
                    <GlassInput value={String(pf.rating)} onChange={v => setPf(p=>({...p,rating:Math.min(5, Math.max(0, +v))}))} placeholder="Rating (0-5)" type="number" />
                  </div>
                </div>
                <GlassInput value={pf.review_note} onChange={v => setPf(p=>({...p,review_note:v}))} placeholder="Review note" />
                <div style={{ display: 'flex', gap: 8 }}>
                  <PillButton onClick={savePin} accent={accent}>Save</PillButton>
                  <PillButton variant="ghost" onClick={() => setEditingPin(null)}>Cancel</PillButton>
                  {!isNewPin && <PillButton variant="ghost" onClick={() => deletePin(editingPin.id)} style={{ color: '#ef4444' }}>Delete</PillButton>}
                </div>
              </div>
            </GlassCard>
          </BentoCell>
        )}
      </BentoGrid>
    </div>
  )
}
