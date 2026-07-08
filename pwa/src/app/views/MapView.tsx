import { useEffect, useState, useCallback } from 'react'
import { getDb } from '../../db'

interface MapStack { id: string; name: string; color: string; icon: string }
interface MapPin { id: string; stack_id: string; label: string; lat: number; lng: number; url: string; note: string; priority: string; category: string; rating: number; review_note: string; created_at: string }

const COLORS = ['#34d399','#818cf8','#f59e0b','#f87171','#60a5fa','#a78bfa','#fb923c']
const PRIORITIES = ['none','low','medium','high']
const PRIORITY_COLOR: Record<string, string> = { none:'text-white/30', low:'text-blue-400', medium:'text-yellow-400', high:'text-red-400' }

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
    if (isNewPin) {
      await db.query('INSERT INTO map_pins (stack_id,label,lat,lng,url,note,priority,category,rating,review_note) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
        [activeStack!.id, pf.label, lat, lng, pf.url, pf.note, pf.priority, pf.category, pf.rating, pf.review_note])
    } else {
      await db.query('UPDATE map_pins SET label=$1,lat=$2,lng=$3,url=$4,note=$5,priority=$6,category=$7,rating=$8,review_note=$9 WHERE id=$10',
        [pf.label, lat, lng, pf.url, pf.note, pf.priority, pf.category, pf.rating, pf.review_note, editingPin!.id])
    }
    setEditingPin(null); await loadPins(activeStack!.id)
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
        if (u.protocol === 'http:' || u.protocol === 'https:') {
          window.open(p.url, '_blank', 'noopener,noreferrer')
          return
        }
      } catch { /* invalid URL — fall through to Google Maps */ }
    }
    window.open(fallback, '_blank', 'noopener,noreferrer')
  }

  if (editingPin !== null) {
    return (
      <div className="flex flex-col h-full bg-[#0f2020]">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-[#0d1f1f]">
          <button onClick={() => setEditingPin(null)} className="text-white/50 hover:text-white mr-1">←</button>
          <span className="font-semibold flex-1">{isNewPin ? 'New Pin' : 'Edit Pin'}</span>
          <button onClick={savePin} className="text-xs bg-[#b4e645] text-[#0f2020] font-semibold px-3 py-1 rounded-full">Save</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          <input value={pf.label} onChange={e => setPf(p=>({...p,label:e.target.value}))} placeholder="Label" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none" />
          <div className="flex gap-2">
            <input value={pf.lat} onChange={e => setPf(p=>({...p,lat:e.target.value}))} placeholder="Latitude" type="number" step="any" className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none" />
            <input value={pf.lng} onChange={e => setPf(p=>({...p,lng:e.target.value}))} placeholder="Longitude" type="number" step="any" className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none" />
          </div>
          <input value={pf.url} onChange={e => setPf(p=>({...p,url:e.target.value}))} placeholder="Map URL (optional)" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none" />
          <textarea value={pf.note} onChange={e => setPf(p=>({...p,note:e.target.value}))} placeholder="Note" rows={2} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none resize-none" />
          <input value={pf.category} onChange={e => setPf(p=>({...p,category:e.target.value}))} placeholder="Category (e.g. Restaurant)" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none" />
          <div className="flex gap-2">
            <div className="flex-1">
              <div className="text-xs text-white/40 mb-1">Priority</div>
              <select value={pf.priority} onChange={e => setPf(p=>({...p,priority:e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none">
                {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <div className="text-xs text-white/40 mb-1">Rating (0–5)</div>
              <input value={pf.rating} onChange={e => setPf(p=>({...p,rating:Math.min(5, Math.max(0, +e.target.value))}))} type="number" min={0} max={5} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none" />
            </div>
          </div>
          <textarea value={pf.review_note} onChange={e => setPf(p=>({...p,review_note:e.target.value}))} placeholder="Review note" rows={2} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none resize-none" />
          {!isNewPin && <button onClick={() => deletePin(editingPin.id)} className="text-red-400 text-sm text-left mt-2">Delete pin</button>}
        </div>
      </div>
    )
  }

  if (activeStack) {
    return (
      <div className="flex flex-col h-full bg-[#0f2020]">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-[#0d1f1f]">
          <button onClick={() => setActiveStack(null)} className="text-white/50 hover:text-white mr-1">←</button>
          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: activeStack.color }} />
          <span className="font-semibold flex-1">{activeStack.name}</span>
          <button onClick={openNewPin} className="bg-[#b4e645] text-[#0f2020] font-bold px-4 py-1.5 rounded-full text-sm">+ Pin</button>
          <button onClick={() => deleteStack(activeStack.id)} className="text-white/30 hover:text-red-400 text-xs ml-1">Delete</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {pins.length === 0 ? (
            <div className="text-center text-white/30 py-12 text-sm">No pins yet</div>
          ) : pins.map(p => (
            <div key={p.id} className="px-4 py-3 border-b border-white/5">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{p.label}</span>
                    {p.rating > 0 && <span className="text-xs text-yellow-400">{'★'.repeat(p.rating)}</span>}
                    {p.priority !== 'none' && <span className={`text-xs ${PRIORITY_COLOR[p.priority]}`}>●</span>}
                  </div>
                  {p.category && <div className="text-xs text-white/40">{p.category}</div>}
                  {p.note && <div className="text-xs text-white/50 mt-0.5 line-clamp-2">{p.note}</div>}
                  <div className="text-xs text-white/25 mt-0.5 font-mono">{p.lat.toFixed(5)}, {p.lng.toFixed(5)}</div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openMaps(p)} className="text-xs text-white/40 hover:text-[#b4e645] border border-white/10 px-2 py-1 rounded">Open</button>
                  <button onClick={() => openEditPin(p)} className="text-xs text-white/40 hover:text-white border border-white/10 px-2 py-1 rounded">Edit</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[#0f2020]">
      <div className="px-4 pt-4 pb-3 border-b border-white/10 bg-[#0d1f1f]">
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-lg">Map Pins</h1>
          <button onClick={() => setShowNewStack(true)} className="bg-[#b4e645] text-[#0f2020] font-bold px-4 py-1.5 rounded-full text-sm">+ Stack</button>
        </div>
      </div>

      {showNewStack && (
        <div className="px-4 py-3 border-b border-white/10 bg-[#152a2a] flex flex-col gap-2">
          <input value={newStackName} onChange={e => setNewStackName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createStack()} placeholder="Stack name" autoFocus className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none" />
          <div className="flex gap-1.5">
            {COLORS.map(c => <button key={c} onClick={() => setNewStackColor(c)} className={`w-6 h-6 rounded-full border-2 transition-all ${newStackColor===c ? 'border-white scale-125' : 'border-transparent'}`} style={{ background:c }} />)}
          </div>
          <div className="flex gap-2">
            <button onClick={createStack} className="bg-[#b4e645] text-[#0f2020] font-semibold px-4 py-1.5 rounded-full text-sm">Create</button>
            <button onClick={() => setShowNewStack(false)} className="text-white/40 text-sm px-3">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {stacks.length === 0 ? (
          <div className="text-center text-white/30 py-16 text-sm">No stacks yet — create one above</div>
        ) : stacks.map(s => (
          <button key={s.id} onClick={() => setActiveStack(s)} className="w-full text-left px-4 py-4 border-b border-white/5 hover:bg-white/5 transition-colors flex items-center gap-3">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background:s.color }} />
            <span className="font-medium">{s.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
