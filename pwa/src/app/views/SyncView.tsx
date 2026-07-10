import { useState, useEffect } from 'react'
import { getDb } from '../../db'
import { deriveKey, encryptWithKey, decryptWithKey, saveVerifyToken } from '../../crypto'
import { ACCENT } from '../../design/tokens'
import ViewHeader from '../ViewHeader'
import { IconSync } from '../../design/icons'
import { useIsDesktop } from '../useIsDesktop'
import DesktopSyncView from './desktop/DesktopSyncView'
import {
  authorize, getStoredToken, clearToken,
  findFile, uploadFile, downloadFile,
} from '../../services/googleDrive'

export { authorize, getStoredToken, clearToken, findFile, uploadFile, downloadFile }

const accent = ACCENT.sync

type Status = 'idle' | 'busy' | 'ok' | 'error'

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: ok ? '#34d399' : '#94a3b8',
      boxShadow: ok ? '0 0 6px rgba(52,211,153,0.6)' : 'none',
    }} />
  )
}

export function useSyncLogic() {
  const [status, setStatus] = useState<Status>('idle')
  const [logs, setLogs] = useState<{ time: string; msg: string; type: 'info' | 'ok' | 'error' }[]>([])
  const [syncPw, setSyncPw] = useState('')
  const [connected, setConnected] = useState(() => !!getStoredToken())

  // Pick up result from OAuth redirect flow on mount
  useEffect(() => {
    const error = localStorage.getItem('oauth_error')
    if (error) {
      localStorage.removeItem('oauth_error')
      log(`OAuth failed: ${error}`, 'error')
      setStatus('error')
      return
    }
    if (getStoredToken() && !connected) {
      setConnected(true)
      log('Connected to Google Drive ✓', 'ok')
    }
  }, [])

  function log(msg: string, type: 'info' | 'ok' | 'error' = 'info') {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setLogs(prev => [...prev.slice(-49), { time, msg, type }])
  }

  async function connect() {
    try {
      log('Opening Google authorization…')
      await authorize()
      setConnected(true)
      log('Connected to Google Drive ✓', 'ok')
    } catch (e) {
      log(String(e), 'error')
      setStatus('error')
    }
  }

  function disconnect() {
    clearToken()
    setConnected(false)
    log('Disconnected from Google Drive')
  }

  async function push() {
    if (!syncPw.trim()) { log('Enter your vault password', 'error'); setStatus('error'); return }
    const token = getStoredToken()
    if (!token) { log('Not connected — click Connect first', 'error'); setStatus('error'); return }
    setStatus('busy'); log('Exporting data…')
    try {
      const db = await getDb()
      const [notes, secrets, subs, todos, pins] = await Promise.all([
        db.query('SELECT * FROM notes'),
        db.query('SELECT * FROM secrets'),
        db.query('SELECT * FROM subscriptions'),
        db.query('SELECT * FROM todo_tasks'),
        db.query('SELECT * FROM map_pins'),
      ])
      log(`${notes.rows.length} notes, ${secrets.rows.length} secrets, ${todos.rows.length} todos`)
      // Use vault salt + vault password — same format as Chrome extension
      const vaultSaltB64 = localStorage.getItem('myspace_vault_salt')
      if (!vaultSaltB64) { log('Vault not initialised — unlock first', 'error'); setStatus('error'); return }
      const vaultSalt = Uint8Array.from(atob(vaultSaltB64), c => c.charCodeAt(0))
      const key = await deriveKey(syncPw, vaultSalt)
      const plaintext = JSON.stringify({ notes: notes.rows, secrets: secrets.rows, subscriptions: subs.rows, todo_tasks: todos.rows, map_pins: pins.rows })
      log('Encrypting…')
      const { ciphertext, iv } = await encryptWithKey(plaintext, key)
      const payload = JSON.stringify({ ciphertext, iv, salt: Array.from(vaultSalt) })
      log('Uploading to Drive…')
      const existingId = await findFile(token)
      await uploadFile(token, payload, existingId)
      log('Push complete ✓', 'ok'); setStatus('ok')
    } catch (e) { log(String(e), 'error'); setStatus('error') }
  }

  async function pull() {
    if (!syncPw.trim()) { log('Enter your vault password', 'error'); setStatus('error'); return }
    const token = getStoredToken()
    if (!token) { log('Not connected — click Connect first', 'error'); setStatus('error'); return }
    setStatus('busy'); log('Searching Drive for backup…')
    try {
      const fileId = await findFile(token)
      if (!fileId) { log('No backup found on Drive', 'error'); setStatus('error'); return }
      log('Downloading…')
      const raw = await downloadFile(token, fileId)
      const payload = JSON.parse(raw) as { ciphertext: string; iv: string; salt: number[] }
      log(`Backup fields: ${Object.keys(payload).join(', ')} | salt len: ${payload.salt?.length ?? 'none'}`)
      log('Decrypting…')
      const salt = Uint8Array.from(payload.salt)
      const key = await deriveKey(syncPw, salt)
      const plaintext = await decryptWithKey(payload.ciphertext, payload.iv, key)
      const data = JSON.parse(plaintext) as Record<string, unknown[]>
      // Update vault salt + verify token to match the backup's key
      const saltB64 = btoa(Array.from(salt, c => String.fromCharCode(c)).join(''))
      localStorage.setItem('myspace_vault_salt', saltB64)
      await saveVerifyToken(key)
      log('Merging…')
      const db = await getDb()
      if (data.notes) {
        for (const n of data.notes as { id: string; title: string; content: string; tags: string[]; image_data: string }[]) {
          await db.query('INSERT INTO notes (id,title,content,tags,image_data) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, content=EXCLUDED.content, tags=EXCLUDED.tags, image_data=EXCLUDED.image_data, updated_at=now()',
            [n.id, n.title, n.content, n.tags, n.image_data])
        }
        log(`Merged ${data.notes.length} notes`)
      }
      if (data.secrets) {
        for (const s of data.secrets as { id: string; label: string; ciphertext: string; iv: string; tags: string[]; url: string; description: string }[]) {
          await db.query('INSERT INTO secrets (id,label,ciphertext,iv,tags,url,description) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO UPDATE SET label=EXCLUDED.label, ciphertext=EXCLUDED.ciphertext, iv=EXCLUDED.iv, tags=EXCLUDED.tags, url=EXCLUDED.url, description=EXCLUDED.description, updated_at=now()',
            [s.id, s.label, s.ciphertext, s.iv, s.tags, s.url ?? '', s.description ?? ''])
        }
        log(`Merged ${data.secrets.length} secrets`)
      }
      if (data.subscriptions) {
        for (const s of data.subscriptions as { id: string; name: string; amount: number; currency: string; cycle: string; start_date: string; notes: string; active: boolean; tags: string[] }[]) {
          await db.query('INSERT INTO subscriptions (id,name,amount,currency,cycle,start_date,notes,active,tags) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, amount=EXCLUDED.amount, currency=EXCLUDED.currency, cycle=EXCLUDED.cycle, start_date=EXCLUDED.start_date, notes=EXCLUDED.notes, active=EXCLUDED.active, tags=EXCLUDED.tags, updated_at=now()',
            [s.id, s.name, s.amount, s.currency, s.cycle, s.start_date, s.notes ?? '', s.active, s.tags])
        }
        log(`Merged ${data.subscriptions.length} subscriptions`)
      }
      if (data.todo_tasks) {
        for (const t of data.todo_tasks as { id: string; list_id: string; title: string; done: boolean; priority: string; due_date: string; notes: string }[]) {
          await db.query('INSERT INTO todo_tasks (id,list_id,title,done,priority,due_date,notes) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, done=EXCLUDED.done, priority=EXCLUDED.priority, due_date=EXCLUDED.due_date, notes=EXCLUDED.notes',
            [t.id, t.list_id, t.title, t.done, t.priority, t.due_date, t.notes])
        }
        log(`Merged ${data.todo_tasks.length} tasks`)
      }
      log('Pull complete ✓', 'ok'); setStatus('ok')
    } catch (e) { log(String(e), 'error'); setStatus('error') }
  }

  return { status, logs, syncPw, setSyncPw, connected, log, connect, disconnect, push, pull, clearLogs: () => setLogs([]) }
}

export default function SyncView() {
  const isDesktop = useIsDesktop()
  if (isDesktop) return <DesktopSyncView />

  const { status, logs, syncPw, setSyncPw, connected, connect, disconnect, push, pull, clearLogs } = useSyncLogic()
  const [showPw, setShowPw] = useState(false)

  const logColor = (type: 'info' | 'ok' | 'error') =>
    type === 'error' ? '#f87171' : type === 'ok' ? '#34d399' : 'rgba(255,255,255,0.7)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ViewHeader title="Sync" icon={<IconSync size={22} accent={accent} filled />} accent={accent} />

      {/* Connection card */}
      <div style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.6)', padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 14, color: '#1a1a2e', marginBottom: 4 }}>Google Drive</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <StatusDot ok={connected} />
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#4a4a6a' }}>
                {connected ? 'Connected' : 'Not connected'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {connected && (
              <button onClick={disconnect} style={{
                padding: '9px 16px', borderRadius: 100, border: '1.5px solid rgba(239,68,68,0.3)', cursor: 'pointer',
                background: 'transparent', color: '#ef4444', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13,
              }}>Disconnect</button>
            )}
            <button onClick={connect} style={{
              padding: '9px 18px', borderRadius: 100, border: 'none', cursor: 'pointer',
              background: `linear-gradient(135deg, ${accent}, #ec4899)`,
              color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13,
              boxShadow: `0 4px 14px ${accent}40`,
            }}>
              {connected ? 'Re-connect' : 'Connect'}
            </button>
          </div>
        </div>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#94a3b8', lineHeight: 1.5, borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 12 }}>
          Data is encrypted with your vault password. Compatible with the Chrome extension — use the same password everywhere.
        </div>
      </div>

      {/* Backup card */}
      <div style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.6)', padding: 20 }}>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 14, color: '#1a1a2e', marginBottom: 14 }}>Backup & Restore</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            value={syncPw} onChange={e => setSyncPw(e.target.value)}
            type={showPw ? 'text' : 'password'}
            placeholder="Vault password (same as unlock password)"
            style={{ flex: 1, padding: '10px 14px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.5)', fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#1a1a2e', outline: 'none' }}
          />
          <button onClick={() => setShowPw(p => !p)} style={{
            padding: '10px 16px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, color: '#4a4a6a',
          }}>{showPw ? 'Hide' : 'Show'}</button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={push} disabled={status === 'busy'} style={{
            flex: 1, padding: '11px 0', borderRadius: 100, border: 'none', cursor: status === 'busy' ? 'not-allowed' : 'pointer',
            background: `linear-gradient(135deg, ${accent}, #ec4899)`,
            color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13,
            boxShadow: `0 4px 14px ${accent}40`, opacity: status === 'busy' ? 0.6 : 1,
          }}>↑ Push to Drive</button>
          <button onClick={pull} disabled={status === 'busy'} style={{
            flex: 1, padding: '11px 0', borderRadius: 100, border: '1.5px solid rgba(255,255,255,0.7)', cursor: status === 'busy' ? 'not-allowed' : 'pointer',
            background: 'rgba(255,255,255,0.5)', color: '#1a1a2e', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13,
            opacity: status === 'busy' ? 0.6 : 1,
          }}>↓ Pull from Drive</button>
        </div>
      </div>

      {/* Console */}
      {logs.length > 0 && (
        <div style={{ background: 'rgba(15,15,30,0.88)', backdropFilter: 'blur(20px)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', padding: '12px 14px', maxHeight: 200, overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Console</span>
            <button onClick={clearLogs} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>Clear</button>
          </div>
          {logs.map((l, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, fontFamily: 'monospace', fontSize: 11, lineHeight: 1.6 }}>
              <span style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>{l.time}</span>
              <span style={{ color: logColor(l.type) }}>{l.msg}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
