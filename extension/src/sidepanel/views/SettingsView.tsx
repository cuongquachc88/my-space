import { useState, useEffect, useRef } from 'react'
import { parseImport, type ImportedSecret } from '../../lib/parseImport'

interface Props {
  sendMsg: (type: string, payload?: unknown) => Promise<{ ok: boolean; data?: unknown; error?: string }>
  onLock: () => void
}

const TIMEOUTS = [
  { label: '15m', ms: 15 * 60 * 1000 },
  { label: '30m', ms: 30 * 60 * 1000 },
  { label: '1h',  ms: 60 * 60 * 1000 },
  { label: '∞',   ms: 0 },
]

export function SettingsView({ sendMsg, onLock }: Props) {
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [timeout, setTimeout_] = useState(15 * 60 * 1000)
  const [changingPw, setChangingPw] = useState(false)

  const [savePromptEnabled, setSavePromptEnabled] = useState<boolean | null>(null)
  const [savePromptBusy, setSavePromptBusy] = useState(false)
  const [savePromptMsg, setSavePromptMsg] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importPreview, setImportPreview] = useState<ImportedSecret[] | null>(null)
  const [importMsg, setImportMsg] = useState('')
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    chrome.storage.local.get('autoLockMs').then(res => {
      if (typeof res.autoLockMs === 'number') setTimeout_(res.autoLockMs)
    })
    sendMsg('SAVE_PROMPT_STATUS').then(res => {
      if (res.ok) setSavePromptEnabled((res.data as { enabled: boolean })?.enabled ?? false)
    })
  }, [sendMsg])

  async function toggleSavePrompt() {
    setSavePromptBusy(true)
    setSavePromptMsg('')
    try {
      if (savePromptEnabled) {
        const res = await sendMsg('SAVE_PROMPT_DISABLE')
        if (res.ok) {
          setSavePromptEnabled(false)
          setSavePromptMsg('Save Prompt disabled — reload tabs for changes to take effect')
        } else {
          setSavePromptMsg('Could not disable: ' + (res.error ?? 'unknown'))
        }
      } else {
        const res = await sendMsg('SAVE_PROMPT_ENABLE')
        if (res.ok) {
          setSavePromptEnabled(true)
          setSavePromptMsg('Save Prompt enabled on every site — reload open tabs')
        } else if ((res.error ?? '').includes('denied')) {
          setSavePromptMsg('Permission denied — accept the prompt to enable')
        } else {
          setSavePromptMsg('Could not enable: ' + (res.error ?? 'unknown'))
        }
      }
    } finally {
      setSavePromptBusy(false)
    }
  }

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

      const unlockRes = await sendMsg('VAULT_UNLOCK', { password: currentPw, salt: saltRes.vaultSalt })
      if (!unlockRes.ok) { setPwMsg('Current password is incorrect'); return }

      const exportRes = await sendMsg('DB_EXPORT')
      if (!exportRes.ok) { setPwMsg('Export failed'); return }
      const data = exportRes.data as { secrets: Array<{ id: string }> }

      const plaintexts: Array<{ id: string; value: string }> = []
      for (const s of data.secrets) {
        const decRes = await sendMsg('SECRETS_GET', { id: s.id })
        if (decRes.ok) plaintexts.push({ id: s.id, value: (decRes.data as { value: string }).value })
      }

      const newSalt = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      await chrome.storage.local.set({ vaultSalt: newSalt })
      await sendMsg('VAULT_UNLOCK', { password: newPw, salt: newSalt })

      for (const { id, value } of plaintexts) {
        await sendMsg('SECRETS_UPDATE', { id, value })
      }

      setPwMsg('Password changed successfully')
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
    } finally {
      setChangingPw(false)
    }
  }

  async function lockNow() {
    await sendMsg('VAULT_LOCK')
    onLock()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportMsg('')
    const reader = new FileReader()
    reader.onload = ev => {
      const content = ev.target?.result as string
      try {
        const parsed = parseImport(file.name, content)
        setImportPreview(parsed)
        if (parsed.length === 0) setImportMsg('No importable secrets found in file')
      } catch {
        setImportMsg('Could not parse file')
        setImportPreview(null)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function runImport() {
    if (!importPreview?.length) return
    setImporting(true)
    setImportMsg('')
    let ok = 0
    let fail = 0
    for (const s of importPreview) {
      const res = await sendMsg('SECRETS_CREATE', { label: s.label, value: s.value, tags: s.tags })
      if (res.ok) { ok++ } else { fail++ }
    }
    setImportPreview(null)
    setImportMsg(fail === 0
      ? `Imported ${ok} secret${ok !== 1 ? 's' : ''} successfully`
      : `Imported ${ok}, failed ${fail}`)
    setImporting(false)
  }

  return (
    <div className="flex flex-col p-4 gap-4 overflow-y-auto" style={{ height: '100%' }}>
      <div className="flex justify-between items-center">
        <p className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.8)' }}>Settings</p>
        <button onClick={lockNow}
          className="text-xs px-3 py-1 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.4)' }}>
          Lock vault
        </button>
      </div>

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

      <div className="glass-card p-4 flex flex-col gap-3">
        <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Save Password Prompt
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
          When enabled, My SPACE shows a small "Save to My SPACE?" badge next to login
          forms across the web. Click the badge to send the credentials straight to
          the side panel for review.
        </p>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Off by default. Chrome will prompt you to grant access to every website —
          you can revoke from <code>chrome://extensions</code> at any time.
        </p>
        <button onClick={toggleSavePrompt} disabled={savePromptBusy || savePromptEnabled === null}
          className="py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
          style={savePromptEnabled
            ? { background: 'rgba(110,231,183,0.12)', border: '1px solid rgba(110,231,183,0.25)', color: 'rgba(110,231,183,0.9)' }
            : { background: 'linear-gradient(135deg,#fb923c,#f97316)', color: '#1c1917' }}>
          {savePromptBusy ? 'Working...' : savePromptEnabled ? 'Enabled — click to disable' : 'Enable on every site'}
        </button>
        {savePromptMsg && (
          <p className="text-xs" style={{ color: savePromptMsg.includes('denied') || savePromptMsg.includes('Could') ? 'rgba(239,68,68,0.8)' : 'rgba(110,231,183,0.85)' }}>
            {savePromptMsg}
          </p>
        )}
      </div>

      <div className="glass-card p-4 flex flex-col gap-3">
        <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Import Secrets
        </p>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Supports: Generic CSV (label, value, tags), 1Password CSV export, Bitwarden JSON export.
        </p>

        <input ref={fileInputRef} type="file" accept=".csv,.json"
          className="hidden" onChange={handleFileChange} />

        <button onClick={() => fileInputRef.current?.click()}
          className="py-2 rounded-lg text-xs font-semibold"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}>
          Choose File (.csv or .json)
        </button>

        {importPreview && importPreview.length > 0 && (
          <>
            <p className="text-xs" style={{ color: 'rgba(110,231,183,0.8)' }}>
              {importPreview.length} secret{importPreview.length !== 1 ? 's' : ''} ready to import
            </p>
            <div className="flex flex-col gap-1 max-h-24 overflow-y-auto">
              {importPreview.slice(0, 5).map((s, i) => (
                <p key={i} className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {s.label}{s.tags.length ? ` [${s.tags.join(', ')}]` : ''}
                </p>
              ))}
              {importPreview.length > 5 && (
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  +{importPreview.length - 5} more…
                </p>
              )}
            </div>
            <button onClick={runImport} disabled={importing}
              className="py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
              style={{ background: 'rgba(110,231,183,0.12)', border: '1px solid rgba(110,231,183,0.25)', color: 'rgba(110,231,183,0.9)' }}>
              {importing ? 'Importing...' : `Import ${importPreview.length} Secret${importPreview.length !== 1 ? 's' : ''}`}
            </button>
          </>
        )}

        {importMsg && (
          <p className="text-xs" style={{ color: importMsg.includes('success') || importMsg.startsWith('Imported') ? 'rgba(110,231,183,0.8)' : 'rgba(239,68,68,0.8)' }}>
            {importMsg}
          </p>
        )}
      </div>
    </div>
  )
}
