import { useEffect, useState, useCallback } from 'react'
import type { SecretMeta, SavePasswordPayload } from '../../shared/messages'
import { SecretCard } from '../components/SecretCard'
import { TagInput } from '../components/TagInput'

interface Props {
  sendMsg: (type: string, payload?: unknown) => Promise<{ ok: boolean; data?: unknown; error?: string }>
  onLock: () => void
}

export function KeyvaultView({ sendMsg, onLock }: Props) {
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  const [secrets, setSecrets] = useState<SecretMeta[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newValue, setNewValue] = useState('')
  const [newTags, setNewTags] = useState<string[]>([])
  const [newUrl, setNewUrl] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [countdown, setCountdown] = useState('')
  const [saveOffer, setSaveOffer] = useState<SavePasswordPayload | null>(null)
  const [offerLabel, setOfferLabel] = useState('')
  const [offerUrl, setOfferUrl] = useState('')
  const [offerTags, setOfferTags] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const loadSecrets = useCallback(async (q = '', tag?: string | null) => {
    const payload: Record<string, string> = {}
    if (q) payload.query = q
    if (tag) payload.tag = tag
    const res = await sendMsg('SECRETS_LIST', Object.keys(payload).length ? payload : undefined)
    if (res.ok) {
      const list = res.data as SecretMeta[]
      setSecrets(list)
      const tags = [...new Set(list.flatMap(s => s.tags ?? []))].sort()
      setAllTags(tags)
    }
  }, [sendMsg])

  useEffect(() => {
    sendMsg('VAULT_STATUS').then(res => {
      if (res.ok && res.data) {
        const d = res.data as { expiresAt?: number }
        setExpiresAt(d.expiresAt ?? null)
      }
    })
    loadSecrets()
  }, [sendMsg, loadSecrets])

  useEffect(() => {
    if (!expiresAt) return
    const id = setInterval(() => {
      const secs = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
      const m = Math.floor(secs / 60), s = secs % 60
      setCountdown(`${m}m ${s.toString().padStart(2,'0')}s`)
      if (secs === 0) { setSecrets([]); clearInterval(id); onLock() }
    }, 1000)
    return () => clearInterval(id)
  }, [expiresAt, onLock])

  async function revealSecret(id: string): Promise<string> {
    const res = await sendMsg('SECRETS_GET', { id })
    return res.ok ? (res.data as { value: string }).value : ''
  }

  async function copySecret(id: string) {
    const val = await revealSecret(id)
    if (!val) return
    // clipboard.writeText may be blocked after async gap in extensions — use execCommand fallback
    try {
      await navigator.clipboard.writeText(val)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = val
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
  }

  async function addSecret() {
    if (!newLabel || !newValue) return
    const res = await sendMsg('SECRETS_CREATE', { label: newLabel, value: newValue, tags: newTags, url: newUrl, description: newDesc })
    if (res.ok) {
      setNewLabel(''); setNewValue(''); setNewTags([]); setNewUrl(''); setNewDesc('')
      await loadSecrets(query, activeTag)
    }
  }

  async function deleteSecret(id: string) {
    await sendMsg('SECRETS_DELETE', { id })
    await loadSecrets(query, activeTag)
  }

  async function updateSecret(id: string, fields: { label?: string; value?: string; url?: string; description?: string }): Promise<boolean> {
    const res = await sendMsg('SECRETS_UPDATE', { id, ...fields })
    if (res.ok) await loadSecrets(query, activeTag)
    return !!res.ok
  }

  function hostnameOf(url: string): string {
    try { return new URL(url).hostname } catch { return url }
  }

  function acceptSaveOffer() {
    if (!saveOffer || !offerLabel.trim()) return
    setSaving(true)
    const tagSet = new Set(offerTags)
    tagSet.add('auto-saved')
    void (async () => {
      const res = await sendMsg('SECRETS_CREATE', {
        label: offerLabel.trim(),
        value: saveOffer.password,
        tags: Array.from(tagSet),
        url: offerUrl || saveOffer.url,
        description: `Login: ${saveOffer.username}`,
      })
      setSaving(false)
      if (res.ok) {
        setSaveOffer(null)
        setOfferLabel('')
        setOfferUrl('')
        setOfferTags([])
        await loadSecrets(query, activeTag)
      }
    })()
  }

  function dismissSaveOffer() {
    setSaveOffer(null)
    setOfferLabel('')
    setOfferUrl('')
    setOfferTags([])
  }

  // Listen for offers from the content script "Save to My SPACE?" badge
  useEffect(() => {
    const handler = (msg: { type: string; payload?: SavePasswordPayload }) => {
      if (msg.type === 'SAVE_PASSWORD_OFFER_FROM_PAGE' && msg.payload) {
        const p = msg.payload
        setSaveOffer(p)
        // Default label = hostname (e.g. github.com)
        const host = hostnameOf(p.url)
        setOfferLabel(host)
        setOfferUrl(p.url)
        setOfferTags(['auto-saved'])
      }
    }
    chrome.runtime.onMessage.addListener(handler)
    return () => chrome.runtime.onMessage.removeListener(handler)
  }, [])

  function selectTag(tag: string) {
    const next = activeTag === tag ? null : tag
    setActiveTag(next)
    loadSecrets(query, next)
  }

  // Group secrets by first tag when no active tag filter
  const grouped: Record<string, SecretMeta[]> = {}
  const untagged: SecretMeta[] = []
  if (!activeTag) {
    for (const s of secrets) {
      if (s.tags?.length) {
        const t = s.tags[0]
        grouped[t] = grouped[t] ?? []
        grouped[t].push(s)
      } else {
        untagged.push(s)
      }
    }
  }

  return (
    <div className="flex flex-col p-3 gap-3 overflow-y-auto" style={{ height: '100%' }}>
      {/* Countdown */}
      <div className="rounded-[10px] px-3 py-2 flex justify-between items-center"
        style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
        <span className="text-xs" style={{ color: 'rgba(251,191,36,0.8)' }}>Vault unlocked</span>
        <span className="text-xs" style={{ color: 'rgba(251,191,36,0.5)' }}>{countdown} left</span>
      </div>

      {/* Save password offer (from content script) */}
      {saveOffer && (
        <div className="rounded-xl p-3 flex flex-col gap-2"
          style={{ background: 'rgba(110,231,183,0.07)', border: '1px solid rgba(110,231,183,0.3)' }}>
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'rgba(110,231,183,0.85)' }}>
              Save password?
            </span>
            <button onClick={dismissSaveOffer} className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>×</button>
          </div>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <span style={{ color: 'rgba(255,255,255,0.8)' }}>{saveOffer.username}</span>
            <span> · {hostnameOf(saveOffer.url)}</span>
          </p>
          <input className="rounded-lg px-3 py-2 text-xs outline-none"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(110,231,183,0.3)', color: 'white' }}
            placeholder="Label"
            value={offerLabel}
            onChange={e => setOfferLabel(e.target.value)} />
          <input className="rounded-lg px-3 py-2 text-xs outline-none"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
            placeholder="URL"
            value={offerUrl}
            onChange={e => setOfferUrl(e.target.value)} />
          <div className="rounded-lg px-2 py-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <TagInput tags={offerTags} accent="#6ee7b7" onChange={setOfferTags} />
          </div>
          <button onClick={acceptSaveOffer}
            disabled={saving || !offerLabel.trim()}
            className="py-2 rounded-lg text-xs font-semibold"
            style={{ background: saving ? 'rgba(110,231,183,0.3)' : 'linear-gradient(135deg,#34d399,#10b981)', color: '#0f1419' }}>
            {saving ? 'Saving...' : 'Save to Vault'}
          </button>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-2 rounded-[10px] px-3 py-2"
        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
          <circle cx="8" cy="8" r="5" stroke="rgba(255,255,255,0.35)" strokeWidth="1.6"/>
          <line x1="12" y1="12" x2="17" y2="17" stroke="rgba(255,255,255,0.35)" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
        <input className="bg-transparent text-xs outline-none flex-1" style={{ color: 'rgba(255,255,255,0.6)' }}
          placeholder="Search secrets..." value={query}
          onChange={e => { setQuery(e.target.value); loadSecrets(e.target.value, activeTag) }} />
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {allTags.map(t => (
            <button key={t} onClick={() => selectTag(t)}
              className="px-2 py-0.5 rounded-full text-xs"
              style={activeTag === t
                ? { background: '#f59e0b22', border: '1px solid #f59e0b44', color: '#f59e0b' }
                : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)' }}>
              #{t}
            </button>
          ))}
        </div>
      )}

      {/* Secrets list grouped by tag */}
      {activeTag ? (
        <>
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>
              #{activeTag}
            </span>
          </div>
          {secrets.map(s => (
            <SecretCard key={s.id} secret={s} onReveal={revealSecret} onCopy={copySecret} onDelete={deleteSecret} onUpdate={updateSecret} />
          ))}
        </>
      ) : (
        <>
          {Object.entries(grouped).map(([tag, list]) => (
            <div key={tag} className="flex flex-col gap-2">
              <span className="text-xs px-1 font-semibold" style={{ color: '#f59e0b', fontSize: '10px' }}>#{tag}</span>
              {list.map(s => <SecretCard key={s.id} secret={s} onReveal={revealSecret} onCopy={copySecret} onDelete={deleteSecret} onUpdate={updateSecret} />)}
            </div>
          ))}
          {untagged.map(s => <SecretCard key={s.id} secret={s} onReveal={revealSecret} onCopy={copySecret} onDelete={deleteSecret} onUpdate={updateSecret} />)}
        </>
      )}

      {secrets.length === 0 && (
        <p className="text-xs text-center py-4" style={{ color: 'rgba(255,255,255,0.2)' }}>No secrets</p>
      )}

      {/* Add secret */}
      <div className="rounded-xl p-3 flex flex-col gap-2 mt-1"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.1)' }}>
        <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.25)' }}>Add secret</p>
        <input className="rounded-lg px-3 py-2 text-xs outline-none"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
          placeholder="Label (e.g. GitHub Token)"
          value={newLabel} onChange={e => setNewLabel(e.target.value)} />
        <input type="password" className="rounded-lg px-3 py-2 text-xs outline-none font-mono"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
          placeholder="Secret value"
          value={newValue} onChange={e => setNewValue(e.target.value)} />
        <input className="rounded-lg px-3 py-2 text-xs outline-none"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
          placeholder="URL (e.g. https://github.com/login)"
          value={newUrl} onChange={e => setNewUrl(e.target.value)} />
        <input className="rounded-lg px-3 py-2 text-xs outline-none"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
          placeholder="Description (optional)"
          value={newDesc} onChange={e => setNewDesc(e.target.value)} />
        <div className="rounded-lg px-2 py-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <TagInput tags={newTags} accent="#f59e0b" onChange={setNewTags} />
        </div>
        <button onClick={addSecret}
          className="py-2 rounded-lg text-xs font-semibold"
          style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', color: '#1c1917' }}>
          Save Secret
        </button>
      </div>
    </div>
  )
}
