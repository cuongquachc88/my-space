import { useState, useEffect, useCallback } from 'react'
import { IconRail, type View } from './components/IconRail'
import { NotesView } from './views/NotesView'
import { KeyvaultView } from './views/KeyvaultView'
import { SyncView } from './views/SyncView'
import { SettingsView } from './views/SettingsView'
import { GeneratorView } from './views/GeneratorView'

export async function sendMsg(type: string, payload?: unknown): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  return chrome.runtime.sendMessage({ type, payload })
}

const glows: Record<View, string> = {
  notes:    'radial-gradient(ellipse 120px 80px at 60px -20px, rgba(99,102,241,0.2) 0%, transparent 70%)',
  keyvault: 'radial-gradient(ellipse 120px 80px at 60px -20px, rgba(245,158,11,0.18) 0%, transparent 70%)',
  generator: 'radial-gradient(ellipse 120px 80px at 60px -20px, rgba(167,139,250,0.18) 0%, transparent 70%)',
  sync:     'radial-gradient(ellipse 120px 80px at 60px -20px, rgba(59,130,246,0.18) 0%, transparent 70%)',
  settings: 'radial-gradient(ellipse 120px 80px at 60px -20px, rgba(59,130,246,0.18) 0%, transparent 70%)',
}

const GATED_VIEWS: View[] = ['notes', 'keyvault', 'sync', 'settings']

// ── First-time setup screen ────────────────────────────────────────────────
function SetupScreen({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  async function create() {
    if (pw.length < 8) { setError('Password must be at least 8 characters'); return }
    if (pw !== confirm) { setError('Passwords do not match'); return }
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    const salt = Array.from(bytes)
    await chrome.storage.local.set({ vaultSalt: salt })
    const res = await sendMsg('VAULT_UNLOCK', { password: pw, salt })
    if (res.ok) {
      onDone()
    } else {
      setError(res.error ?? 'Setup failed')
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '0 24px' }}>
        <svg width="36" height="36" viewBox="0 0 20 20" fill="none">
          <path d="M10 1.5L3 4.5v5c0 4 3.1 7.5 7 8.5 3.9-1 7-4.5 7-8.5v-5L10 1.5z"
            fill="rgba(245,158,11,0.15)" stroke="rgba(251,191,36,0.8)" strokeWidth="1.4" strokeLinejoin="round" />
          <circle cx="10" cy="8.5" r="2" fill="rgba(245,158,11,0.15)" stroke="rgba(251,191,36,0.8)" strokeWidth="1.3" />
          <line x1="10" y1="10.5" x2="10" y2="13" stroke="rgba(251,191,36,0.8)" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="8.5" y1="11.8" x2="11.5" y2="11.8" stroke="rgba(251,191,36,0.8)" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        <div style={{ textAlign: 'center' }}>
          <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>Create Master Password</p>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>This encrypts all your secrets</p>
        </div>
        <input
          type="password"
          className="w-full rounded-[10px] px-3 py-2 text-sm outline-none"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
          placeholder="New password (min 8 chars)"
          value={pw}
          onChange={e => setPw(e.target.value)}
          autoFocus
        />
        <input
          type="password"
          className="w-full rounded-[10px] px-3 py-2 text-sm outline-none"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
          placeholder="Confirm password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && create()}
        />
        {error && <p className="text-xs" style={{ color: 'rgba(239,68,68,0.8)' }}>{error}</p>}
        <button onClick={create}
          className="w-full py-2 rounded-[10px] text-sm font-semibold"
          style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', color: '#1c1917' }}>
          Create Vault
        </button>
    </div>
  )
}

// ── Unlock screen ──────────────────────────────────────────────────────────
function LockScreen({ onUnlocked }: { onUnlocked: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function unlock() {
    const saltRes = await chrome.storage.local.get('vaultSalt')
    const res = await sendMsg('VAULT_UNLOCK', { password, salt: saltRes.vaultSalt })
    if (res.ok) {
      setPassword('')
      setError('')
      onUnlocked()
    } else {
      setError(res.error ?? 'Unlock failed')
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '0 24px' }}>
      <svg width="36" height="36" viewBox="0 0 20 20" fill="none">
        <path d="M10 1.5L3 4.5v5c0 4 3.1 7.5 7 8.5 3.9-1 7-4.5 7-8.5v-5L10 1.5z"
          fill="rgba(245,158,11,0.15)" stroke="rgba(251,191,36,0.8)" strokeWidth="1.4" strokeLinejoin="round" />
        <circle cx="10" cy="8.5" r="2" fill="rgba(245,158,11,0.15)" stroke="rgba(251,191,36,0.8)" strokeWidth="1.3" />
        <line x1="10" y1="10.5" x2="10" y2="13" stroke="rgba(251,191,36,0.8)" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="8.5" y1="11.8" x2="11.5" y2="11.8" stroke="rgba(251,191,36,0.8)" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
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
        autoFocus
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

// ── Root ───────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState<View>('notes')
  const [vaultLocked, setVaultLocked] = useState(true)
  // null = still checking, false = no password yet, true = password exists
  const [hasPassword, setHasPassword] = useState<boolean | null>(null)

  const checkVault = useCallback(async () => {
    const res = await sendMsg('VAULT_STATUS')
    if (res.ok && res.data) {
      const d = res.data as { locked: boolean }
      setVaultLocked(d.locked)
    }
  }, [])

  useEffect(() => {
    chrome.storage.local.get('vaultSalt').then(res => {
      setHasPassword(!!res.vaultSalt)
    })
    checkVault()
  }, [checkVault])

  // Poll vault status every 5s to detect auto-lock
  useEffect(() => {
    const id = setInterval(checkVault, 5000)
    return () => clearInterval(id)
  }, [checkVault])

  if (hasPassword === null) {
    return <div style={{ width: '100%', height: '100%', background: '#0d1117' }} />
  }

  if (!hasPassword) {
    return (
      <div style={{ width: '100%', height: '100%', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <SetupScreen onDone={() => { setHasPassword(true); setVaultLocked(false) }} />
      </div>
    )
  }

  const needsUnlock = GATED_VIEWS.includes(view) && vaultLocked

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', background: '#0d1117', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: glows[view] }} />
      <IconRail active={view} onChange={setView} />
      <div style={needsUnlock
        ? { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }
        : { flex: 1, overflow: 'hidden', position: 'relative' }
      }>
        {needsUnlock ? (
          <LockScreen onUnlocked={() => setVaultLocked(false)} />
        ) : (
          <>
            {view === 'notes'    && <NotesView sendMsg={sendMsg} />}
            {view === 'keyvault' && <KeyvaultView sendMsg={sendMsg} onLock={() => setVaultLocked(true)} />}
            {view === 'generator' && <GeneratorView />}
            {view === 'sync'     && <SyncView sendMsg={sendMsg} />}
            {view === 'settings' && <SettingsView sendMsg={sendMsg} onLock={() => setVaultLocked(true)} />}
          </>
        )}
      </div>
    </div>
  )
}
