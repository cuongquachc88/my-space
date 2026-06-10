import { useEffect, useState } from 'react'

interface Props {
  sendMsg: (type: string, payload?: unknown) => Promise<{ ok: boolean; data?: unknown; error?: string }>
}

export function SyncView({ sendMsg }: Props) {
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [connected, setConnected] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [loading, setLoading] = useState<'connect' | 'push' | 'pull' | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showSetup, setShowSetup] = useState(false)

  useEffect(() => {
    chrome.storage.local.get(['driveClientId', 'driveClientSecret', 'driveRefreshToken', 'syncedAt']).then(res => {
      if (typeof res.driveClientId === 'string') setClientId(res.driveClientId)
      if (typeof res.driveClientSecret === 'string') setClientSecret(res.driveClientSecret)
      setConnected(!!res.driveRefreshToken)
      setLastSync(typeof res.syncedAt === 'string' ? res.syncedAt : null)
    })
  }, [])

  async function connect() {
    if (!clientId || !clientSecret) { setError('Enter Client ID and Client Secret first'); return }
    setLoading('connect'); setError(null)
    try {
      await chrome.storage.local.set({ driveClientId: clientId, driveClientSecret: clientSecret })
      const res = await sendMsg('SYNC_CONNECT', { clientId, clientSecret })
      if (res.ok) {
        setConnected(true)
        setShowSetup(false)
      } else {
        setError(res.error ?? 'Connection failed')
      }
    } finally {
      setLoading(null)
    }
  }

  async function disconnect() {
    await chrome.storage.local.remove(['driveRefreshToken', 'driveFileId'])
    setConnected(false)
    setResult(null)
  }

  async function push() {
    setLoading('push'); setResult(null); setError(null)
    const res = await sendMsg('SYNC_PUSH')
    setLoading(null)
    if (res.ok && res.data) {
      const d = res.data as { syncedAt: string }
      setLastSync(d.syncedAt)
      setResult('Pushed successfully')
    } else {
      setError(res.error ?? 'Push failed')
    }
  }

  async function pull() {
    setLoading('pull'); setResult(null); setError(null)
    const res = await sendMsg('SYNC_PULL')
    setLoading(null)
    if (res.ok && res.data) {
      const d = res.data as { syncedAt: string; notesUpdated: number; secretsAdded: number }
      setLastSync(d.syncedAt)
      setResult(`${d.notesUpdated} notes updated, ${d.secretsAdded} secrets added`)
    } else {
      setError(res.error ?? 'Pull failed')
    }
  }

  return (
    <div className="flex flex-col p-4 gap-4 overflow-y-auto" style={{ height: '100%' }}>
      <p className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.8)' }}>Sync</p>

      {/* Status card */}
      <div className="glass-card p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full" style={{ background: connected ? '#22c55e' : '#6b7280' }} />
            <div>
              <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>Google Drive</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {connected ? 'Connected' : 'Not connected'}
              </p>
            </div>
          </div>
          {connected ? (
            <button onClick={disconnect}
              className="text-xs px-2 py-1 rounded-lg"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'rgba(239,68,68,0.7)' }}>
              Disconnect
            </button>
          ) : (
            <button onClick={() => { setShowSetup(v => !v); setError(null) }}
              className="text-xs px-2 py-1 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)' }}>
              {showSetup ? 'Cancel' : 'Set up'}
            </button>
          )}
        </div>
        {lastSync && (
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Last sync: {new Date(lastSync).toLocaleString()}
          </p>
        )}
        {connected && (
          <div className="flex gap-2">
            <button onClick={push} disabled={!!loading}
              className="flex-1 py-2 rounded-[10px] text-xs font-semibold disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#60a5fa,#3b82f6)', color: 'white' }}>
              {loading === 'push' ? 'Pushing...' : '↑ Push'}
            </button>
            <button onClick={pull} disabled={!!loading}
              className="flex-1 py-2 rounded-[10px] text-xs font-semibold disabled:opacity-50"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
              {loading === 'pull' ? 'Pulling...' : '↓ Pull'}
            </button>
          </div>
        )}
        {result && <p className="text-xs" style={{ color: 'rgba(134,239,172,0.8)' }}>{result}</p>}
        {error && <p className="text-xs" style={{ color: 'rgba(239,68,68,0.8)' }}>{error}</p>}
      </div>

      {/* Setup panel */}
      {showSetup && (
        <div className="glass-card p-4 flex flex-col gap-3">
          <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Google OAuth Credentials
          </p>

          {/* Instructions */}
          <div className="rounded-lg p-3 flex flex-col gap-2" style={{ background: 'rgba(96,165,250,0.07)', border: '1px solid rgba(96,165,250,0.15)' }}>
            <p className="text-xs font-semibold" style={{ color: 'rgba(147,197,253,0.9)' }}>How to get credentials:</p>
            <ol className="flex flex-col gap-1" style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', paddingLeft: '14px', listStyle: 'decimal' }}>
              <li>Go to <span style={{ color: 'rgba(147,197,253,0.8)' }}>console.cloud.google.com</span></li>
              <li>Create a project → Enable <b style={{ color: 'rgba(255,255,255,0.6)' }}>Google Drive API</b></li>
              <li>APIs &amp; Services → Credentials → <b style={{ color: 'rgba(255,255,255,0.6)' }}>Create OAuth 2.0 Client ID</b></li>
              <li>Application type: <b style={{ color: 'rgba(255,255,255,0.6)' }}>Desktop app</b></li>
              <li>Copy <b style={{ color: 'rgba(255,255,255,0.6)' }}>Client ID</b> and <b style={{ color: 'rgba(255,255,255,0.6)' }}>Client Secret</b> below</li>
            </ol>
          </div>

          <input
            className="rounded-lg px-3 py-2 text-xs outline-none font-mono"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
            placeholder="Client ID (…apps.googleusercontent.com)"
            value={clientId}
            onChange={e => setClientId(e.target.value)}
          />
          <input
            className="rounded-lg px-3 py-2 text-xs outline-none font-mono"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
            placeholder="Client Secret"
            value={clientSecret}
            onChange={e => setClientSecret(e.target.value)}
          />
          <button onClick={connect} disabled={loading === 'connect'}
            className="py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#60a5fa,#3b82f6)', color: 'white' }}>
            {loading === 'connect' ? 'Connecting...' : 'Connect to Google Drive'}
          </button>
        </div>
      )}
    </div>
  )
}
