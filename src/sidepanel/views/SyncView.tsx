import { useEffect, useState } from 'react'

interface Props {
  sendMsg: (type: string, payload?: unknown) => Promise<{ ok: boolean; data?: unknown; error?: string }>
}

export function SyncView({ sendMsg }: Props) {
  const [connected, setConnected] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [loading, setLoading] = useState<'push' | 'pull' | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    sendMsg('SYNC_STATUS').then(res => {
      if (res.ok && res.data) {
        const d = res.data as { connected: boolean; lastSync: string | null }
        setConnected(d.connected)
        setLastSync(d.lastSync)
      }
    })
  }, [sendMsg])

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
    <div className="flex flex-col p-4 gap-4 overflow-y-auto">
      <p className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.8)' }}>Sync</p>

      <div className="glass-card p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: connected ? '#22c55e' : '#6b7280' }} />
          <div>
            <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>Google Drive</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {connected ? 'Connected' : 'Not connected'}
            </p>
          </div>
        </div>
        {lastSync && (
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Last sync: {new Date(lastSync).toLocaleString()}
          </p>
        )}
        <div className="flex gap-2">
          <button onClick={push} disabled={!!loading}
            className="flex-1 py-2 rounded-[10px] text-xs font-semibold disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#60a5fa,#3b82f6)', color: 'white' }}>
            {loading === 'push' ? 'Pushing...' : '↑ Push to Drive'}
          </button>
          <button onClick={pull} disabled={!!loading}
            className="flex-1 py-2 rounded-[10px] text-xs font-semibold disabled:opacity-50"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
            {loading === 'pull' ? 'Pulling...' : '↓ Pull from Drive'}
          </button>
        </div>
        {result && <p className="text-xs" style={{ color: 'rgba(134,239,172,0.8)' }}>{result}</p>}
        {error && <p className="text-xs" style={{ color: 'rgba(239,68,68,0.8)' }}>{error}</p>}
      </div>
    </div>
  )
}
