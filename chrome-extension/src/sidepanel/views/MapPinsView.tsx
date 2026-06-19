import { useState, useEffect, useCallback } from 'react'
import type { MapStack, MapPin } from '../../shared/messages'
import { IconPicker } from '../components/IconPicker'
import { PixelIcon } from '../components/icons'

const PIN_CATEGORIES = ['', 'Hotel', 'Restaurant', 'Café', 'Attraction', 'Shopping', 'Transport', 'Hospital', 'Other']
const PIN_PRIORITIES = ['none', 'low', 'medium', 'high'] as const
type PinPriority = typeof PIN_PRIORITIES[number]

const PRIORITY_COLORS: Record<PinPriority, string> = {
  none:   'rgba(255,255,255,0.2)',
  low:    '#34d399',
  medium: '#facc15',
  high:   '#f87171',
}
const PRIORITY_LABELS: Record<PinPriority, string> = { none: '', low: 'Low', medium: 'Med', high: 'High' }
import { decodeShareParam } from '../../lib/shareLink'
import type { ShareStack } from '../../lib/shareLink'
import LZString from 'lz-string'

interface Props {
  sendMsg: (type: string, payload?: unknown) => Promise<{ ok: boolean; data?: unknown; error?: string }>
}

const STACK_COLORS = ['#fb923c','#34d399','#818cf8','#f472b6','#60a5fa','#facc15','#f87171','#a78bfa']

function extractPinFromUrl(url: string, title: string): { lat: number; lng: number; label: string; url: string } | null {
  function extract(u: string): { lat: number; lng: number } | null {
    let m = u.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }
    m = u.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/)
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }
    m = u.match(/[?&]center=(-?\d+\.?\d*),(-?\d+\.?\d*)/)
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }
    m = u.match(/[#?&]map=\d+\/(-?\d+\.?\d*)\/(-?\d+\.?\d*)/)
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }
    m = u.match(/cp=(-?\d+\.?\d*)~(-?\d+\.?\d*)/)
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }
    m = u.match(/\/place\/[^/]+\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }
    const latM = u.match(/[?&]lat=(-?\d+\.?\d*)/)
    const lngM = u.match(/[?&]lo?ng?=(-?\d+\.?\d*)/)
    if (latM && lngM) return { lat: parseFloat(latM[1]), lng: parseFloat(lngM[1]) }
    return null
  }
  const coords = extract(url)
  if (!coords) return null
  const label = title.replace(/\s*[-|–]\s*(Google Maps|OpenStreetMap|Bing Maps|Apple Maps).*$/, '').trim()
    || new URL(url).hostname
  return { lat: coords.lat, lng: coords.lng, label, url }
}

function coord(n: number, decimals = 5) {
  return n.toFixed(decimals)
}

function buildShareUrl(stack: MapStack, pins: MapPin[]): string {
  const payload: ShareStack = {
    name: stack.name,
    color: stack.color,
    pins: pins.map(p => ({ label: p.label, lat: p.lat, lng: p.lng, note: p.note, url: p.url })),
  }
  const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(payload))
  return `https://www.google.com/maps/search/?api=1&query=${pins[0]?.lat ?? 0},${pins[0]?.lng ?? 0}#myspace-pins?d=${compressed}`
}

function StarRating({ value, onChange, size = 14 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <button key={i} type="button"
          onClick={() => onChange?.(value === i ? 0 : i)}
          onMouseEnter={() => onChange && setHovered(i)}
          onMouseLeave={() => onChange && setHovered(0)}
          style={{ cursor: onChange ? 'pointer' : 'default', lineHeight: 1 }}>
          <svg width={size} height={size} viewBox="0 0 20 20">
            <polygon points="10,2 12.4,7.8 18.5,8.2 14,12.3 15.5,18.2 10,15 4.5,18.2 6,12.3 1.5,8.2 7.6,7.8"
              fill={(hovered || value) >= i ? '#fb923c' : 'rgba(255,255,255,0.12)'}
              stroke={(hovered || value) >= i ? '#fb923c' : 'rgba(255,255,255,0.1)'}
              strokeWidth="0.5" />
          </svg>
        </button>
      ))}
    </div>
  )
}

function PinRow({ pin, onDelete, onEdit }: { pin: MapPin; onDelete: () => void; onEdit: (label: string, note: string, priority: string, category: string, rating: number, review_note: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(pin.label)
  const [note, setNote] = useState(pin.note)
  const [priority, setPriority] = useState<PinPriority>((pin.priority as PinPriority) ?? 'none')
  const [category, setCategory] = useState(pin.category ?? '')
  const [rating, setRating] = useState(pin.rating ?? 0)
  const [reviewNote, setReviewNote] = useState(pin.review_note ?? '')

  function save() {
    onEdit(label, note, priority, category, rating, reviewNote)
    setEditing(false)
    setExpanded(false)
  }

  const mapsUrl = `https://www.google.com/maps?q=${pin.lat},${pin.lng}`

  if (editing) {
    return (
      <div className="rounded-[10px] p-3 flex flex-col gap-2" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <input className="w-full rounded-[8px] px-2 py-1 text-xs outline-none"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}
          value={label} onChange={e => setLabel(e.target.value)} autoFocus />
        <textarea className="w-full rounded-[8px] px-2 py-1 text-xs outline-none resize-none"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}
          rows={2} placeholder="Note…" value={note} onChange={e => setNote(e.target.value)} />
        <div className="flex gap-2">
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="flex-1 rounded-[7px] px-2 py-1 text-xs outline-none"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}>
            {PIN_CATEGORIES.map(c => <option key={c} value={c}>{c || 'Category…'}</option>)}
          </select>
          <select value={priority} onChange={e => setPriority(e.target.value as PinPriority)}
            className="rounded-[7px] px-2 py-1 text-xs outline-none"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: PRIORITY_COLORS[priority] }}>
            {PIN_PRIORITIES.map(p => <option key={p} value={p}>{p === 'none' ? 'Priority' : PRIORITY_LABELS[p]}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <StarRating value={rating} onChange={setRating} />
          {rating > 0 && <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{rating}/5</span>}
        </div>
        <textarea className="w-full rounded-[8px] px-2 py-1 text-xs outline-none resize-none"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}
          rows={2} placeholder="Review / what I thought…" value={reviewNote} onChange={e => setReviewNote(e.target.value)} />
        <div className="flex gap-2 justify-end">
          <button onClick={() => setEditing(false)} className="text-xs px-2 py-1 rounded-[6px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Cancel</button>
          <button onClick={save} className="text-xs px-2 py-1 rounded-[6px]" style={{ background: '#fb923c22', color: '#fb923c' }}>Save</button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-[10px] overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
      {/* Main row — tap to expand */}
      <div className="flex items-center gap-2 px-3 py-2 cursor-pointer" onClick={() => setExpanded(v => !v)}>
        <svg width="13" height="13" viewBox="0 0 20 20" fill="none" className="shrink-0">
          <path d="M10 2.5C8 2.5 6.5 4 6.5 5.9c0 2.6 3.5 6.6 3.5 6.6s3.5-4 3.5-6.6C13.5 4 12 2.5 10 2.5z"
            fill="#fb923c44" stroke="#fb923c" strokeWidth="1.4" />
          <circle cx="10" cy="5.8" r="1.4" fill="#fb923c" />
        </svg>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>{pin.label}</p>
            {pin.priority && pin.priority !== 'none' && (
              <span className="text-[9px] px-1 rounded-[4px] font-semibold shrink-0"
                style={{ background: `${PRIORITY_COLORS[pin.priority as PinPriority]}22`, color: PRIORITY_COLORS[pin.priority as PinPriority] }}>
                {PRIORITY_LABELS[pin.priority as PinPriority]}
              </span>
            )}
            {pin.category && (
              <span className="text-[9px] px-1 rounded-[4px] shrink-0"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
                {pin.category}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{coord(pin.lat)}, {coord(pin.lng)}</span>
            {(pin.rating ?? 0) > 0 && <StarRating value={pin.rating} size={10} />}
          </div>
        </div>
        <span className="text-[10px] shrink-0 transition-transform" style={{ color: 'rgba(255,255,255,0.2)', transform: expanded ? 'rotate(90deg)' : 'none' }}>›</span>
      </div>
      {/* Expanded section */}
      {expanded && (
        <div className="px-3 pb-2.5 flex flex-col gap-1.5">
          {pin.note && <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{pin.note}</p>}
          {pin.review_note && <p className="text-[10px] italic" style={{ color: 'rgba(255,255,255,0.35)' }}>"{pin.review_note}"</p>}
          <div className="flex gap-2 justify-end mt-1">
            <a href={mapsUrl} target="_blank" rel="noreferrer"
              className="text-[10px] px-2 py-1 rounded-[6px]"
              style={{ background: 'rgba(251,146,60,0.15)', color: '#fb923c' }}>Open Maps</a>
            <button onClick={() => { setEditing(true); setExpanded(false) }}
              className="text-[10px] px-2 py-1 rounded-[6px]"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)' }}>Edit</button>
            <button onClick={onDelete}
              className="text-[10px] px-2 py-1 rounded-[6px]"
              style={{ background: 'rgba(239,68,68,0.12)', color: 'rgba(239,68,68,0.7)' }}>Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}

function StackDetail({
  stack, sendMsg, onBack,
}: {
  stack: MapStack
  sendMsg: Props['sendMsg']
  onBack: () => void
}) {
  const [pins, setPins] = useState<MapPin[]>([])
  const [pendingPin, setPendingPin] = useState<{ lat: number; lng: number; label: string; url: string } | null>(null)
  const [newLabel, setNewLabel] = useState('')
  const [newNote, setNewNote] = useState('')
  const [newPriority, setNewPriority] = useState<PinPriority>('none')
  const [newCategory, setNewCategory] = useState('')
  const [copied, setCopied] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [addMode, setAddMode] = useState<'none' | 'page' | 'manual'>('none')
  const [manualLink, setManualLink] = useState('')
  const [manualLat, setManualLat] = useState('')
  const [manualLng, setManualLng] = useState('')
  const [manualLabel, setManualLabel] = useState('')
  const [manualNote, setManualNote] = useState('')
  const [manualError, setManualError] = useState('')
  const [linkParsed, setLinkParsed] = useState(false)

  function onPasteLink(raw: string) {
    setManualLink(raw)
    setLinkParsed(false)
    const trimmed = raw.trim()
    if (!trimmed) return
    const pin = extractPinFromUrl(trimmed, '')
    if (pin) {
      setManualLat(String(pin.lat))
      setManualLng(String(pin.lng))
      setLinkParsed(true)
      setManualError('')
    }
  }

  const loadPins = useCallback(async () => {
    const res = await sendMsg('PINS_LIST', { stack_id: stack.id })
    if (res.ok) setPins(res.data as MapPin[])
  }, [sendMsg, stack.id])

  useEffect(() => { loadPins() }, [loadPins])


  async function captureFromTab() {
    setCapturing(true)
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    setCapturing(false)
    if (!tab?.url) return

    const pin = extractPinFromUrl(tab.url, tab.title ?? '')
    if (pin) {
      setPendingPin(pin)
      setNewLabel(pin.label)
      setNewNote('')
      setAddMode('page')
    } else {
      alert('No map coordinates found in this page URL.\nNavigate to a specific location on Google Maps, OpenStreetMap, or Bing Maps first.')
    }
  }

  function submitManual() {
    const lat = parseFloat(manualLat)
    const lng = parseFloat(manualLng)
    if (isNaN(lat) || lat < -90  || lat > 90)  { setManualError('Latitude must be between -90 and 90');   return }
    if (isNaN(lng) || lng < -180 || lng > 180) { setManualError('Longitude must be between -180 and 180'); return }
    if (!manualLabel.trim()) { setManualError('Label is required'); return }
    setManualError('')
    setPendingPin({ lat, lng, label: manualLabel.trim(), url: manualLink.trim() })
    setNewLabel(manualLabel.trim())
    setNewNote(manualNote.trim())
    setAddMode('page')
    setManualLink(''); setManualLat(''); setManualLng(''); setManualLabel(''); setManualNote(''); setLinkParsed(false)
  }

  async function savePin() {
    if (!pendingPin || !newLabel.trim()) return
    await sendMsg('PINS_CREATE', {
      stack_id: stack.id,
      label: newLabel.trim(),
      lat: pendingPin.lat,
      lng: pendingPin.lng,
      url: pendingPin.url,
      note: newNote.trim(),
      priority: newPriority,
      category: newCategory,
    })
    setPendingPin(null)
    setNewLabel('')
    setNewNote('')
    setNewPriority('none')
    setNewCategory('')
    setAddMode('none')
    loadPins()
  }

  async function deletePin(id: string) {
    await sendMsg('PINS_DELETE', { id })
    loadPins()
  }

  async function editPin(id: string, label: string, note: string, priority: string, category: string, rating: number, review_note: string) {
    await sendMsg('PINS_UPDATE', { id, label, note, priority, category, rating, review_note })
    loadPins()
  }

  function share() {
    const url = buildShareUrl(stack, pins)
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col h-full" style={{ color: 'white' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <button onClick={onBack} className="text-xs px-2 py-1 rounded-[6px]" style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }}>←</button>
        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: stack.color }} />
        <span className="text-sm font-semibold flex-1 truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>{stack.name}</span>
        <button onClick={share}
          className="text-xs px-2 py-1 rounded-[6px] transition-all"
          style={{ background: copied ? 'rgba(52,211,153,0.2)' : 'rgba(251,146,60,0.15)', color: copied ? '#34d399' : '#fb923c' }}>
          {copied ? '✓ Copied' : 'Share'}
        </button>
      </div>

      {/* Add buttons row */}
      {addMode === 'none' && (
        <div className="px-3 pt-2 pb-1 flex gap-2">
          <button onClick={captureFromTab} disabled={capturing}
            className="flex-1 py-2.5 rounded-[10px] text-xs font-medium transition-all flex items-center justify-center gap-1.5"
            style={{ background: 'rgba(251,146,60,0.15)', color: capturing ? 'rgba(251,146,60,0.5)' : '#fb923c', border: '1px solid rgba(251,146,60,0.3)' }}>
            {capturing ? (
              <svg width="13" height="13" viewBox="0 0 20 20" fill="none" className="animate-spin">
                <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="2" strokeDasharray="22 10" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="10" cy="10" r="2" fill="currentColor" />
                <line x1="10" y1="3" x2="10" y2="1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="10" y1="19" x2="10" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="3" y1="10" x2="1" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="19" y1="10" x2="17" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            )}
            {capturing ? 'Reading…' : 'From page'}
          </button>
          <button onClick={() => setAddMode('manual')}
            className="flex-1 py-2.5 rounded-[10px] text-xs font-medium flex items-center justify-center gap-1.5"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
              <path d="M10 2.5C8 2.5 6.5 4 6.5 5.9c0 2.6 3.5 6.6 3.5 6.6s3.5-4 3.5-6.6C13.5 4 12 2.5 10 2.5z"
                fill="rgba(255,255,255,0.15)" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="10" cy="5.8" r="1.2" fill="currentColor" />
              <line x1="4" y1="15" x2="16" y2="15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeDasharray="2 2" />
            </svg>
            Manual
          </button>
        </div>
      )}

      {/* Manual entry form */}
      {addMode === 'manual' && (
        <div className="mx-3 mt-2 mb-1 p-3 rounded-[10px] flex flex-col gap-2.5"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>

          {/* Map link paste field */}
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>Paste map link (optional)</p>
            <div className="relative">
              <input
                className="w-full rounded-[8px] px-2 py-1.5 pr-8 text-xs outline-none"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: `1px solid ${linkParsed ? 'rgba(52,211,153,0.5)' : 'rgba(255,255,255,0.12)'}`,
                  color: 'white',
                }}
                placeholder="Google Maps, OSM, Bing, Apple Maps…"
                value={manualLink}
                onChange={e => onPasteLink(e.target.value)}
                autoFocus
              />
              {linkParsed && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px]" style={{ color: '#34d399' }}>✓</span>
              )}
              {manualLink && !linkParsed && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px]" style={{ color: 'rgba(248,113,113,0.8)' }}>?</span>
              )}
            </div>
            {linkParsed && (
              <p className="text-[10px]" style={{ color: '#34d399' }}>
                Detected: {parseFloat(manualLat).toFixed(5)}, {parseFloat(manualLng).toFixed(5)}
              </p>
            )}
            {manualLink && !linkParsed && (
              <p className="text-[10px]" style={{ color: 'rgba(248,113,113,0.7)' }}>
                No coordinates found — enter lat/lng manually below
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
            <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>coordinates</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
          </div>

          {/* Lat / Lng */}
          <div className="flex gap-2">
            <input className="flex-1 rounded-[8px] px-2 py-1.5 text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}
              placeholder="Latitude" value={manualLat} onChange={e => { setManualLat(e.target.value); setLinkParsed(false) }} />
            <input className="flex-1 rounded-[8px] px-2 py-1.5 text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}
              placeholder="Longitude" value={manualLng} onChange={e => { setManualLng(e.target.value); setLinkParsed(false) }} />
          </div>

          {/* Label */}
          <input className="w-full rounded-[8px] px-2 py-1.5 text-xs outline-none"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}
            placeholder="Label" value={manualLabel} onChange={e => setManualLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submitManual()} />

          {manualError && <p className="text-[10px]" style={{ color: '#f87171' }}>{manualError}</p>}

          <div className="flex gap-2 justify-end">
            <button onClick={() => { setAddMode('none'); setManualError(''); setManualLink(''); setManualLat(''); setManualLng(''); setLinkParsed(false) }}
              className="text-xs px-3 py-1.5 rounded-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Cancel</button>
            <button onClick={submitManual}
              className="text-xs px-3 py-1.5 rounded-[7px] font-semibold"
              style={{ background: 'rgba(251,146,60,0.15)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.4)' }}>
              Next
            </button>
          </div>
        </div>
      )}

      {/* Pending pin confirm form */}
      {pendingPin && addMode === 'page' && (
        <div className="mx-3 mb-2 p-3 rounded-[10px] flex flex-col gap-2"
          style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.25)' }}>
          <p className="text-[10px]" style={{ color: '#fb923c' }}>
            📍 {coord(pendingPin.lat)}, {coord(pendingPin.lng)}
          </p>
          <input className="w-full rounded-[8px] px-2 py-1 text-xs outline-none"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}
            placeholder="Label" value={newLabel} onChange={e => setNewLabel(e.target.value)} autoFocus />
          <textarea className="w-full rounded-[8px] px-2 py-1 text-xs outline-none resize-none"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}
            rows={2} placeholder="Note (optional)" value={newNote} onChange={e => setNewNote(e.target.value)} />
          <div className="flex gap-2">
            <select value={newCategory} onChange={e => setNewCategory(e.target.value)}
              className="flex-1 rounded-[7px] px-2 py-1 text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}>
              {PIN_CATEGORIES.map(c => <option key={c} value={c}>{c || 'Category…'}</option>)}
            </select>
            <select value={newPriority} onChange={e => setNewPriority(e.target.value as PinPriority)}
              className="rounded-[7px] px-2 py-1 text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: PRIORITY_COLORS[newPriority] }}>
              {PIN_PRIORITIES.map(p => <option key={p} value={p}>{p === 'none' ? 'Priority' : PRIORITY_LABELS[p]}</option>)}
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setPendingPin(null); setNewPriority('none'); setNewCategory(''); setAddMode('none') }}
              className="text-xs px-2 py-1 rounded-[6px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Cancel</button>
            <button onClick={savePin}
              className="text-xs px-3 py-1.5 rounded-[7px] font-semibold"
              style={{ background: 'rgba(251,146,60,0.15)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.4)' }}>
              Add Pin
            </button>
          </div>
        </div>
      )}

      {/* Pin list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-2">
        {pins.length === 0 && !pendingPin && (
          <p className="text-xs text-center mt-8" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Open a map page and click "Pin current map page"
          </p>
        )}
        {pins.map(pin => (
          <PinRow
            key={pin.id}
            pin={pin}
            onDelete={() => deletePin(pin.id)}
            onEdit={(label, note, priority, category, rating, review_note) => editPin(pin.id, label, note, priority, category, rating, review_note)}
          />
        ))}
      </div>
    </div>
  )
}

export function MapPinsView({ sendMsg }: Props) {
  const [stacks, setStacks] = useState<MapStack[]>([])
  const [activeStack, setActiveStack] = useState<MapStack | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(STACK_COLORS[0])
  const [newIcon, setNewIcon] = useState('pin')
  const [sharedPreview, setSharedPreview] = useState<ShareStack | null>(null)

  const loadStacks = useCallback(async () => {
    const res = await sendMsg('STACKS_LIST')
    if (res.ok) setStacks(res.data as MapStack[])
  }, [sendMsg])

  useEffect(() => { loadStacks() }, [loadStacks])

  // Check if sidepanel was opened from a share link
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const d = params.get('d')
    if (d) setSharedPreview(decodeShareParam(d))
  }, [])

  async function createStack() {
    if (!newName.trim()) return
    const res = await sendMsg('STACKS_CREATE', { name: newName.trim(), color: newColor, icon: newIcon })
    if (res.ok) {
      setNewName('')
      setNewColor(STACK_COLORS[0])
      setNewIcon('pin')
      setCreating(false)
      loadStacks()
      setActiveStack(res.data as MapStack)
    }
  }

  async function deleteStack(id: string) {
    await sendMsg('STACKS_DELETE', { id })
    loadStacks()
    if (activeStack?.id === id) setActiveStack(null)
  }

  async function importShared() {
    if (!sharedPreview) return
    const stackRes = await sendMsg('STACKS_CREATE', { name: sharedPreview.name, color: sharedPreview.color })
    if (!stackRes.ok) return
    const stack = stackRes.data as MapStack
    for (const p of sharedPreview.pins) {
      await sendMsg('PINS_CREATE', { stack_id: stack.id, label: p.label, lat: p.lat, lng: p.lng, url: p.url, note: p.note })
    }
    setSharedPreview(null)
    loadStacks()
    setActiveStack(stack)
  }

  if (activeStack) {
    return <StackDetail stack={activeStack} sendMsg={sendMsg} onBack={() => { setActiveStack(null); loadStacks() }} />
  }

  return (
    <div className="flex flex-col h-full" style={{ color: 'white' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>Map Pins</span>
        <button
          onClick={() => setCreating(v => !v)}
          className="text-xs px-2 py-1 rounded-[6px]"
          style={{ background: 'rgba(251,146,60,0.18)', color: '#fb923c' }}>
          + Stack
        </button>
      </div>

      {/* Shared preview banner */}
      {sharedPreview && (
        <div className="mx-3 mt-2 p-3 rounded-[10px] flex flex-col gap-2" style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.25)' }}>
          <p className="text-xs font-semibold" style={{ color: '#fb923c' }}>Shared stack: {sharedPreview.name}</p>
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{sharedPreview.pins.length} pin{sharedPreview.pins.length !== 1 ? 's' : ''}</p>
          <div className="flex gap-2">
            <button onClick={() => setSharedPreview(null)} className="text-xs px-2 py-1 rounded-[6px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Dismiss</button>
            <button onClick={importShared} className="text-xs px-2 py-1 rounded-[6px] font-semibold" style={{ background: '#fb923c', color: '#1c1917' }}>Import</button>
          </div>
        </div>
      )}

      {/* New stack form */}
      {creating && (
        <div className="mx-3 mt-2 p-3 rounded-[10px] flex flex-col gap-2.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex gap-2 items-center">
            <div className="w-9 h-9 flex items-center justify-center rounded-[10px] shrink-0"
              style={{ background: `${newColor}22` }}>
              <PixelIcon id={newIcon} color={newColor} size={20} />
            </div>
            <input
              className="flex-1 rounded-[8px] px-2 py-1.5 text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}
              placeholder="Stack name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createStack()}
              autoFocus
            />
          </div>
          <IconPicker value={newIcon} onChange={setNewIcon} accentColor={newColor} />
          <div className="flex items-center gap-2">
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Color</span>
            <div className="flex gap-2 flex-wrap">
              {STACK_COLORS.map(c => (
                <button key={c} onClick={() => setNewColor(c)}
                  className="w-5 h-5 rounded-full transition-all relative flex items-center justify-center shrink-0"
                  style={{ background: c, boxShadow: newColor === c ? `0 0 0 2px #0d1117, 0 0 0 3.5px ${c}` : 'none', transform: newColor === c ? 'scale(1.2)' : 'scale(1)' }}>
                  {newColor === c && <svg width="8" height="8" viewBox="0 0 10 10"><polyline points="2,5 4,7 8,3" stroke="#0d1117" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setCreating(false); setNewIcon('pin') }} className="text-xs px-3 py-1.5 rounded-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Cancel</button>
            <button onClick={createStack} className="text-xs px-3 py-1.5 rounded-[7px] font-semibold" style={{ background: 'rgba(251,146,60,0.15)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.4)' }}>Create</button>
          </div>
        </div>
      )}

      {/* Stack list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-2">
        {stacks.length === 0 && !creating && (
          <p className="text-xs text-center mt-8" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Create a stack to start pinning locations
          </p>
        )}
        {stacks.map(s => (
          <StackCard
            key={s.id}
            stack={s}
            onOpen={() => setActiveStack(s)}
            onRename={(name, icon) => sendMsg('STACKS_UPDATE', { id: s.id, name, icon }).then(() => loadStacks())}
            onDelete={() => deleteStack(s.id)}
          />
        ))}
      </div>
    </div>
  )
}

function StackCard({ stack, onOpen, onRename, onDelete }: {
  stack: MapStack
  onOpen: () => void
  onRename: (name: string, icon: string) => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(stack.name)
  const [icon, setIcon] = useState(stack.icon || 'pin')

  function commitRename() {
    if (name.trim()) onRename(name.trim(), icon)
    setRenaming(false)
    setExpanded(false)
  }

  return (
    <div className="rounded-[12px] overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
      {renaming ? (
        <div className="p-3 flex flex-col gap-2.5">
          <div className="flex gap-2 items-center">
            <div className="w-9 h-9 flex items-center justify-center rounded-[10px] shrink-0"
              style={{ background: `${stack.color}22` }}>
              <PixelIcon id={icon} color={stack.color} size={20} />
            </div>
            <input className="flex-1 text-sm outline-none bg-transparent font-medium"
              style={{ color: 'white' }}
              value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setRenaming(false); setName(stack.name); setIcon(stack.icon || 'pin') } }}
              autoFocus />
          </div>
          <IconPicker value={icon} onChange={setIcon} accentColor={stack.color} />
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setRenaming(false); setName(stack.name); setIcon(stack.icon || 'pin') }}
              className="text-xs px-2 py-1 rounded-[6px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Cancel</button>
            <button onClick={commitRename}
              className="text-xs px-3 py-1.5 rounded-[6px] font-semibold"
              style={{ background: 'rgba(251,146,60,0.15)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.35)' }}>Save</button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2.5 px-3 py-2.5">
            {/* Icon badge */}
            <div className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0"
              style={{ background: `${stack.color}22` }}>
              <PixelIcon id={stack.icon || 'pin'} color={stack.color} size={18} />
            </div>
            <button onClick={onOpen} className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>{stack.name}</p>
            </button>
            <button onClick={() => setExpanded(v => !v)}
              className="w-7 h-7 flex items-center justify-center rounded-[7px] shrink-0 transition-all"
              style={{ color: expanded ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)', background: expanded ? 'rgba(255,255,255,0.08)' : 'transparent' }}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                <circle cx="4" cy="10" r="1.6" /><circle cx="10" cy="10" r="1.6" /><circle cx="16" cy="10" r="1.6" />
              </svg>
            </button>
            <button onClick={onOpen}
              className="w-6 h-6 flex items-center justify-center shrink-0"
              style={{ color: 'rgba(255,255,255,0.2)' }}>
              <span className="text-base">›</span>
            </button>
          </div>
          {expanded && (
            <div className="flex border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <button onClick={() => { setRenaming(true); setExpanded(false) }}
                className="flex-1 text-[10px] py-1.5 text-center"
                style={{ color: 'rgba(255,255,255,0.4)' }}>Edit</button>
              <button onClick={onDelete}
                className="flex-1 text-[10px] py-1.5 text-center border-l"
                style={{ borderColor: 'rgba(255,255,255,0.06)', color: 'rgba(239,68,68,0.6)' }}>Delete</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
