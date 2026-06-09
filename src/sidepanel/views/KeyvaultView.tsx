import { useEffect, useState, useCallback } from 'react'
import type { SecretMeta } from '../../shared/messages'
import { SecretCard } from '../components/SecretCard'

interface Props {
  sendMsg: (type: string, payload?: unknown) => Promise<{ ok: boolean; data?: unknown; error?: string }>
}

export function KeyvaultView({ sendMsg }: Props) {
  const [locked, setLocked] = useState(true)
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  const [password, setPassword] = useState('')
  const [secrets, setSecrets] = useState<SecretMeta[]>([])
  const [query, setQuery] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newValue, setNewValue] = useState('')
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState('')

  const checkStatus = useCallback(async () => {
    const res = await sendMsg('VAULT_STATUS')
    if (res.ok && res.data) {
      const d = res.data as { locked: boolean; expiresAt?: number }
      setLocked(d.locked)
      setExpiresAt(d.expiresAt ?? null)
    }
  }, [sendMsg])

  const loadSecrets = useCallback(async (q = '') => {
    const res = await sendMsg('SECRETS_LIST', q ? { query: q } : undefined)
    if (res.ok) setSecrets(res.data as SecretMeta[])
  }, [sendMsg])

  useEffect(() => { checkStatus() }, [checkStatus])
  useEffect(() => { if (!locked) loadSecrets() }, [locked, loadSecrets])

  useEffect(() => {
    if (!expiresAt) return
    const id = setInterval(() => {
      const secs = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
      const m = Math.floor(secs / 60), s = secs % 60
      setCountdown(`${m}m ${s.toString().padStart(2,'0')}s`)
      if (secs === 0) { setLocked(true); clearInterval(id) }
    }, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  async function unlock() {
    const saltRes = await chrome.storage.local.get('vaultSalt')
    let salt: number[]
    if (!saltRes.vaultSalt) {
      const bytes = crypto.getRandomValues(new Uint8Array(16))
      salt = Array.from(bytes)
      await chrome.storage.local.set({ vaultSalt: salt })
    } else {
      salt = saltRes.vaultSalt as number[]
    }
    const res = await sendMsg('VAULT_UNLOCK', { password, salt })
    if (res.ok) {
      setLocked(false); setPassword(''); setError('')
      await checkStatus()
      await loadSecrets()
    } else {
      setError(res.error ?? 'Unlock failed')
    }
  }

  async function revealSecret(id: string): Promise<string> {
    const res = await sendMsg('SECRETS_GET', { id })
    return res.ok ? (res.data as { value: string }).value : ''
  }

  async function copySecret(id: string) {
    const val = await revealSecret(id)
    await navigator.clipboard.writeText(val)
  }

  async function addSecret() {
    if (!newLabel || !newValue) return
    await sendMsg('SECRETS_CREATE', { label: newLabel, value: newValue })
    setNewLabel(''); setNewValue('')
    await loadSecrets(query)
  }

  async function deleteSecret(id: string) {
    await sendMsg('SECRETS_DELETE', { id })
    await loadSecrets(query)
  }

  if (locked) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 gap-4">
        <div style={{ color: 'rgba(251,191,36,0.8)', fontSize: 32 }}>
          <KeyvaultIconInline />
        </div>
        <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Vault is locked
        </p>
        <input
          type="password"
          className="w-full rounded-[10px] px-3 py-2 text-sm outline-none"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
          placeholder="Master password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && unlock()}
        />
        {error && <p className="text-xs" style={{ color: 'rgba(239,68,68,0.8)' }}>{error}</p>}
        <button onClick={unlock}
          className="w-full py-2 rounded-[10px] text-sm font-semibold"
          style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', color: '#1c1917' }}>
          Unlock
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen p-3 gap-3 overflow-y-auto">
      <div className="rounded-[10px] px-3 py-2 flex justify-between items-center"
        style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
        <span className="text-xs" style={{ color: 'rgba(251,191,36,0.8)' }}>Vault unlocked</span>
        <span className="text-xs" style={{ color: 'rgba(251,191,36,0.5)' }}>{countdown} left</span>
      </div>

      <div className="flex items-center gap-2 rounded-[10px] px-3 py-2"
        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
          <circle cx="8" cy="8" r="5" stroke="rgba(255,255,255,0.35)" strokeWidth="1.6"/>
          <line x1="12" y1="12" x2="17" y2="17" stroke="rgba(255,255,255,0.35)" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
        <input className="bg-transparent text-xs outline-none flex-1"
          style={{ color: 'rgba(255,255,255,0.6)' }}
          placeholder="Search secrets..."
          value={query}
          onChange={e => { setQuery(e.target.value); loadSecrets(e.target.value) }}
        />
      </div>

      <div className="flex justify-between items-center px-1">
        <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Secrets
        </span>
      </div>

      {secrets.map(s => (
        <SecretCard key={s.id} secret={s}
          onReveal={revealSecret} onCopy={copySecret} onDelete={deleteSecret} />
      ))}

      <div className="rounded-xl p-3 flex flex-col gap-2 mt-2"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.1)' }}>
        <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Add secret
        </p>
        <input className="rounded-lg px-3 py-2 text-xs outline-none"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
          placeholder="Label (e.g. GitHub Token)"
          value={newLabel} onChange={e => setNewLabel(e.target.value)}
        />
        <input type="password"
          className="rounded-lg px-3 py-2 text-xs outline-none font-mono"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
          placeholder="Secret value"
          value={newValue} onChange={e => setNewValue(e.target.value)}
        />
        <button onClick={addSecret}
          className="py-2 rounded-lg text-xs font-semibold"
          style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', color: '#1c1917' }}>
          Save Secret
        </button>
      </div>
    </div>
  )
}

function KeyvaultIconInline() {
  return (
    <svg width="32" height="32" viewBox="0 0 20 20" fill="none">
      <path d="M10 1.5L3 4.5v5c0 4 3.1 7.5 7 8.5 3.9-1 7-4.5 7-8.5v-5L10 1.5z"
        fill="rgba(245,158,11,0.15)" stroke="rgba(251,191,36,0.8)" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="10" cy="8.5" r="2" fill="rgba(245,158,11,0.15)" stroke="rgba(251,191,36,0.8)" strokeWidth="1.3" />
      <line x1="10" y1="10.5" x2="10" y2="13" stroke="rgba(251,191,36,0.8)" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="8.5" y1="11.8" x2="11.5" y2="11.8" stroke="rgba(251,191,36,0.8)" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}
