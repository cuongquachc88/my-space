import { useEffect, useRef, useState } from 'react'

interface Props {
  sendMsg: (type: string, payload?: unknown) => Promise<{ ok: boolean; data?: unknown; error?: string }>
}

interface LogLine {
  id: number
  text: string
  type: 'info' | 'success' | 'error' | 'dim' | 'highlight'
}

let logId = 0

const STYLES = `
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  @keyframes spin { to{transform:rotate(360deg)} }
  @keyframes fadeSlideIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
  @keyframes cursorBlink { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes pulse-dot { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.4)} 50%{box-shadow:0 0 0 4px rgba(34,197,94,0)} }
`

function ts() {
  return new Date().toLocaleTimeString('en', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function LogConsole({ lines, running }: { lines: LogLine[]; running: boolean }) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  if (lines.length === 0) return null

  const colorMap: Record<LogLine['type'], string> = {
    info:      'rgba(147,197,253,0.85)',
    success:   'rgba(110,231,183,0.9)',
    error:     'rgba(252,165,165,0.9)',
    dim:       'rgba(255,255,255,0.25)',
    highlight: 'rgba(196,181,253,0.9)',
  }

  return (
    <div style={{
      borderRadius: 10,
      border: '1px solid rgba(255,255,255,0.07)',
      background: 'rgba(0,0,0,0.35)',
      overflow: 'hidden',
    }}>
      {/* Terminal titlebar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.03)',
      }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff5f57' }} />
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#febc2e' }} />
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#28c840' }} />
        <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.2)', marginLeft: 6 }}>
          my-space sync
        </span>
      </div>
      {/* Log output */}
      <div style={{
        padding: '10px 12px', maxHeight: 160, overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: 3,
        fontFamily: 'monospace', fontSize: 11,
      }}>
        {lines.map(line => (
          <div key={line.id} style={{
            animation: 'fadeSlideIn 0.2s ease both',
            display: 'flex', gap: 8, lineHeight: 1.5,
          }}>
            <span style={{ color: 'rgba(255,255,255,0.18)', flexShrink: 0 }}>
              {line.type === 'error' ? '✗' : line.type === 'success' ? '✓' : '›'}
            </span>
            <span style={{ color: colorMap[line.type], wordBreak: 'break-all' }}>{line.text}</span>
          </div>
        ))}
        {running && (
          <div style={{ display: 'flex', gap: 8, lineHeight: 1.5 }}>
            <span style={{ color: 'rgba(255,255,255,0.18)' }}>›</span>
            <span style={{
              color: 'rgba(147,197,253,0.5)',
              animation: 'cursorBlink 1s step-end infinite',
            }}>▊</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

function ProgressBar({ pct, done, error }: { pct: number; done: boolean; error: boolean }) {
  return (
    <div style={{ position: 'relative', height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: '0 auto 0 0',
        width: `${pct}%`,
        borderRadius: 3,
        background: error
          ? 'rgba(252,165,165,0.6)'
          : done
            ? 'linear-gradient(90deg,#22c55e,#34d399)'
            : 'linear-gradient(90deg,#3b82f6,#6366f1,#a78bfa)',
        backgroundSize: '200% 100%',
        transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
        animation: (!done && !error) ? 'shimmer 1.6s linear infinite' : 'none',
      }} />
    </div>
  )
}

export function SyncView({ sendMsg }: Props) {
  const [connected, setConnected] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [loading, setLoading] = useState<'connect' | 'push' | 'pull' | null>(null)
  const [pct, setPct] = useState(0)
  const [done, setDone] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [logs, setLogs] = useState<LogLine[]>([])
  const [pullPassword, setPullPassword] = useState('')
  const [needsPassword, setNeedsPassword] = useState(false)
  const pctTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    chrome.storage.local.get(['driveConnected', 'syncedAt']).then(res => {
      setConnected(!!res.driveConnected)
      setLastSync(typeof res.syncedAt === 'string' ? res.syncedAt : null)
    })
  }, [])

  function addLog(text: string, type: LogLine['type'] = 'info') {
    setLogs(prev => [...prev, { id: logId++, text: `[${ts()}] ${text}`, type }])
  }

  function startProgress(steps: string[]) {
    setDone(false); setHasError(false); setPct(0); setLogs([])
    let i = 0
    addLog(steps[0])
    const perStep = 100 / steps.length
    pctTimer.current = setInterval(() => {
      setPct(prev => {
        const next = Math.min(prev + 1.2, (i + 1) * perStep - 2)
        return next
      })
      // Advance log lines at step boundaries
      const stepPct = (i + 1) * perStep - 2
      setPct(prev => {
        if (prev >= stepPct && i < steps.length - 1) {
          i++
          addLog(steps[i])
        }
        return prev
      })
    }, 80)
  }

  function stopProgress(success: boolean) {
    if (pctTimer.current) { clearInterval(pctTimer.current); pctTimer.current = null }
    setPct(success ? 100 : 0)
    setDone(success)
    setHasError(!success)
  }

  useEffect(() => () => { if (pctTimer.current) clearInterval(pctTimer.current) }, [])

  async function connect() {
    setLoading('connect'); setHasError(false); setLogs([])
    addLog('Launching Google auth…')
    const res = await sendMsg('SYNC_CONNECT')
    setLoading(null)
    if (res.ok) {
      setConnected(true)
      addLog('Connected to Google Drive', 'success')
    } else {
      setHasError(true)
      addLog(res.error ?? 'Connection failed', 'error')
    }
  }

  async function disconnect() {
    await chrome.storage.local.remove(['driveConnected', 'driveFileId'])
    await chrome.storage.session.remove('driveAccessToken')
    setConnected(false); setLogs([]); setDone(false); setHasError(false); setPct(0)
  }

  async function push() {
    setLoading('push')
    startProgress(['Exporting database…', 'Encrypting vault…', 'Uploading to Drive…'])
    const res = await sendMsg('SYNC_PUSH')
    stopProgress(res.ok)
    setLoading(null)
    if (res.ok && res.data) {
      const d = res.data as { syncedAt: string }
      setLastSync(d.syncedAt)
      addLog('Push complete', 'success')
      addLog(`Synced at ${new Date(d.syncedAt).toLocaleTimeString()}`, 'dim')
    } else {
      addLog(res.error ?? 'Push failed', 'error')
    }
  }

  async function pull() {
    setLoading('pull')
    startProgress(['Fetching from Drive…', 'Decrypting data…', 'Importing records…'])
    const res = await sendMsg('SYNC_PULL') as { ok: boolean; needsPassword?: boolean; data?: unknown; error?: string }

    if (res.ok && res.needsPassword) {
      stopProgress(false)
      setLoading(null)
      setNeedsPassword(true)
      addLog('Different device detected — enter your master password to decrypt', 'highlight')
      return
    }

    stopProgress(res.ok)
    setLoading(null)
    handlePullResult(res)
  }

  async function confirmPull() {
    if (!pullPassword) return
    setLoading('pull')
    setNeedsPassword(false)
    startProgress(['Re-deriving key…', 'Decrypting data…', 'Importing records…'])
    const res = await sendMsg('SYNC_PULL_CONFIRM', { password: pullPassword })
    setPullPassword('')
    stopProgress(res.ok)
    setLoading(null)
    handlePullResult(res)
  }

  function handlePullResult(res: { ok: boolean; data?: unknown; error?: string }) {
    if (res.ok && res.data) {
      const d = res.data as { syncedAt: string; notesUpdated: number; secretsAdded: number; subsUpdated: number }
      setLastSync(d.syncedAt)
      addLog('Pull complete', 'success')
      addLog(`${d.notesUpdated} notes  ${d.secretsAdded} secrets  ${d.subsUpdated} subs`, 'highlight')
    } else if (!res.ok) {
      addLog(res.error ?? 'Pull failed', 'error')
    }
  }

  const isSyncing = loading === 'push' || loading === 'pull'

  return (
    <div className="flex flex-col p-4 gap-3 overflow-y-auto" style={{ height: '100%' }}>
      <style>{STYLES}</style>

      <p className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.8)' }}>Sync</p>

      <div className="glass-card p-4 flex flex-col gap-3">
        {/* Status row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: connected ? '#22c55e' : '#6b7280',
              animation: connected ? 'pulse-dot 2s ease-in-out infinite' : 'none',
            }} />
            <div>
              <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>Google Drive</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {isSyncing
                  ? (loading === 'push' ? 'Pushing…' : 'Pulling…')
                  : connected ? 'Connected' : 'Not connected'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isSyncing && (
              <div style={{
                width: 14, height: 14, borderRadius: '50%',
                border: '2px solid rgba(99,102,241,0.2)',
                borderTopColor: '#a78bfa',
                animation: 'spin 0.7s linear infinite',
              }} />
            )}
            {connected && !isSyncing && (
              <button onClick={disconnect}
                className="text-xs px-2 py-1 rounded-lg"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'rgba(239,68,68,0.7)' }}>
                Disconnect
              </button>
            )}
          </div>
        </div>

        {/* Progress bar — show while syncing or after */}
        {(isSyncing || done || hasError) && (
          <ProgressBar pct={pct} done={done} error={hasError} />
        )}

        {/* Last sync */}
        {lastSync && !isSyncing && (
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.18)', fontFamily: 'monospace' }}>
            last sync {new Date(lastSync).toLocaleString()}
          </p>
        )}

        {/* Connect button */}
        {!connected && (
          <button onClick={connect} disabled={loading === 'connect'}
            className="py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#60a5fa,#3b82f6)', color: 'white' }}>
            {loading === 'connect' ? 'Connecting…' : 'Connect to Google Drive'}
          </button>
        )}

        {/* Push / Pull buttons */}
        {connected && !needsPassword && (
          <div className="flex gap-2">
            <button onClick={push} disabled={!!loading}
              className="flex-1 py-2 rounded-[10px] text-xs font-semibold disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#60a5fa,#3b82f6)', color: 'white' }}>
              ↑ Push
            </button>
            <button onClick={pull} disabled={!!loading}
              className="flex-1 py-2 rounded-[10px] text-xs font-semibold disabled:opacity-50"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
              ↓ Pull
            </button>
          </div>
        )}

        {/* Cross-device pull: prompt for master password to re-derive the backup key */}
        {needsPassword && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p className="text-xs" style={{ color: 'rgba(196,181,253,0.8)' }}>
              This backup was created on a different device. Enter your master password to decrypt it.
            </p>
            <input
              type="password"
              className="w-full rounded-[10px] px-3 py-2 text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(167,139,250,0.3)', color: 'white' }}
              placeholder="Master password"
              value={pullPassword}
              onChange={e => setPullPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmPull()}
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={confirmPull} disabled={!pullPassword}
                className="flex-1 py-2 rounded-[10px] text-xs font-semibold disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#a78bfa,#6366f1)', color: 'white' }}>
                Decrypt & Import
              </button>
              <button onClick={() => { setNeedsPassword(false); setPullPassword('') }}
                className="py-2 px-3 rounded-[10px] text-xs"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Terminal log */}
      <LogConsole lines={logs} running={isSyncing} />
    </div>
  )
}
