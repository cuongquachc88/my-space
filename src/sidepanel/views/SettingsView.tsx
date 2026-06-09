import { useState, useEffect } from 'react'

interface Props {
  sendMsg: (type: string, payload?: unknown) => Promise<{ ok: boolean; data?: unknown; error?: string }>
}

const TIMEOUTS = [
  { label: '15m', ms: 15 * 60 * 1000 },
  { label: '30m', ms: 30 * 60 * 1000 },
  { label: '1h',  ms: 60 * 60 * 1000 },
  { label: '∞',   ms: 0 },
]

export function SettingsView({ sendMsg }: Props) {
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [timeout, setTimeout_] = useState(15 * 60 * 1000)
  const [changingPw, setChangingPw] = useState(false)

  useEffect(() => {
    chrome.storage.local.get('autoLockMs').then(res => {
      if (typeof res.autoLockMs === 'number') setTimeout_(res.autoLockMs)
    })
  }, [])

  function selectTimeout(ms: number) {
    setTimeout_(ms)
    chrome.storage.local.set({ autoLockMs: ms })
  }

  async function changePw() {
    if (newPw !== confirmPw) { setPwMsg('Passwords do not match'); return }
    if (newPw.length < 8) { setPwMsg('Password must be at least 8 characters'); return }
    setChangingPw(true)
    try {
      const saltRes = await chrome.storage.local.get('vaultSalt')
      if (!saltRes.vaultSalt) { setPwMsg('Vault not initialised'); return }

      // 1. Unlock with current password (old key)
      const unlockRes = await sendMsg('VAULT_UNLOCK', { password: currentPw, salt: saltRes.vaultSalt })
      if (!unlockRes.ok) { setPwMsg('Current password is incorrect'); return }

      // 2. Export raw rows to get list of secret IDs
      const exportRes = await sendMsg('DB_EXPORT')
      if (!exportRes.ok) { setPwMsg('Export failed'); return }
      const data = exportRes.data as { secrets: Array<{ id: string }> }

      // 3. Fetch plaintext for ALL secrets NOW (while old key is active)
      const plaintexts: Array<{ id: string; value: string }> = []
      for (const s of data.secrets) {
        const decRes = await sendMsg('SECRETS_GET', { id: s.id })
        if (decRes.ok) plaintexts.push({ id: s.id, value: (decRes.data as { value: string }).value })
      }

      // 4. Switch to new key
      const newSalt = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      await chrome.storage.local.set({ vaultSalt: newSalt })
      await sendMsg('VAULT_UNLOCK', { password: newPw, salt: newSalt })

      // 5. Re-encrypt all secrets with new key
      for (const { id, value } of plaintexts) {
        await sendMsg('SECRETS_UPDATE', { id, value })
      }

      setPwMsg('Password changed successfully')
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
    } finally {
      setChangingPw(false)
    }
  }

  return (
    <div className="flex flex-col p-4 gap-4 overflow-y-auto">
      <p className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.8)' }}>Settings</p>

      <div className="glass-card p-4 flex flex-col gap-3">
        <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Master Password
        </p>
        <input type="password"
          className="rounded-lg px-3 py-2 text-xs outline-none"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
          placeholder="Current password"
          value={currentPw} onChange={e => setCurrentPw(e.target.value)}
        />
        <input type="password"
          className="rounded-lg px-3 py-2 text-xs outline-none"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
          placeholder="New password (min 8 chars)"
          value={newPw} onChange={e => setNewPw(e.target.value)}
        />
        <input type="password"
          className="rounded-lg px-3 py-2 text-xs outline-none"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
          placeholder="Confirm new password"
          value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
        />
        <button onClick={changePw} disabled={changingPw}
          className="py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
          style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)', color: 'rgba(239,68,68,0.8)' }}>
          {changingPw ? 'Changing...' : 'Change Password'}
        </button>
        {pwMsg && (
          <p className="text-xs" style={{ color: pwMsg.includes('success') ? 'rgba(134,239,172,0.8)' : 'rgba(239,68,68,0.8)' }}>
            {pwMsg}
          </p>
        )}
      </div>

      <div className="glass-card p-4 flex flex-col gap-3">
        <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Vault Auto-lock
        </p>
        <div className="flex gap-2">
          {TIMEOUTS.map(t => (
            <button key={t.label} onClick={() => selectTimeout(t.ms)}
              className="flex-1 py-2 rounded-lg text-xs font-semibold"
              style={timeout === t.ms
                ? { background: 'linear-gradient(135deg,#818cf8,#6366f1)', color: 'white' }
                : { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
