import { useState, useEffect } from 'react'
import { getDb } from '../../db'
import { getKey, deriveKey, encryptWithKey, decryptWithKey, isLocked } from '../../crypto'
import { ACCENT } from '../../design/tokens'
import ViewHeader from '../ViewHeader'
import { IconSync } from '../../design/icons'
import { useIsDesktop } from '../useIsDesktop'
import DesktopSyncView from './desktop/DesktopSyncView'
import { Capacitor } from '@capacitor/core'
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

type SecretRow = { id: string; label: string; ciphertext: string; iv: string; tags: string[]; url: string; description: string }

export function useSyncLogic() {
  const [status, setStatus] = useState<Status>('idle')
  const [logs, setLogs] = useState<{ time: string; msg: string; type: 'info' | 'ok' | 'error' }[]>([])
  const [connected, setConnected] = useState(() => !!getStoredToken())
  // Cross-device pull: pending payload waiting for password confirmation
  const [pendingPull, setPendingPull] = useState<{ ciphertext: string; iv: string; salt: number[] } | null>(null)
  const [pullPassword, setPullPassword] = useState('')

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
      // Native Capacitor uses its own Browser plugin — never open a popup.
      // Web: open popup synchronously in click handler so Safari doesn't block it.
      const popup = Capacitor.isNativePlatform()
        ? null
        : window.open('', 'google-auth', 'width=520,height=620,left=200,top=100')
      await authorize(popup)
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
    const token = getStoredToken()
    if (!token) { log('Not connected — click Connect first', 'error'); setStatus('error'); return }
    if (isLocked()) { log('Unlock your vault before syncing', 'error'); setStatus('error'); return }
    setStatus('busy'); log('Exporting data…')
    try {
      const db = await getDb()
      const [notes, secrets, subs, todoLists, todos, mapStacks, pins] = await Promise.all([
        db.query('SELECT * FROM notes'),
        db.query('SELECT * FROM secrets'),
        db.query('SELECT * FROM subscriptions'),
        db.query('SELECT * FROM todo_lists'),
        db.query('SELECT * FROM todo_tasks'),
        db.query('SELECT * FROM map_stacks'),
        db.query('SELECT * FROM map_pins'),
      ])
      log(`${notes.rows.length} notes, ${secrets.rows.length} secrets, ${subs.rows.length} subs, ${todos.rows.length} todos, ${pins.rows.length} pins`)
      const vaultSaltB64 = localStorage.getItem('myspace_vault_salt')
      if (!vaultSaltB64) { log('Vault not initialised — unlock first', 'error'); setStatus('error'); return }
      const vaultSalt = Uint8Array.from(atob(vaultSaltB64), c => c.charCodeAt(0))
      const plaintext = JSON.stringify({ notes: notes.rows, secrets: secrets.rows, subscriptions: subs.rows, todo_lists: todoLists.rows, todo_tasks: todos.rows, map_stacks: mapStacks.rows, map_pins: pins.rows })
      log('Encrypting…')
      const { ciphertext, iv } = await encryptWithKey(plaintext, getKey())
      const payload = JSON.stringify({ ciphertext, iv, salt: Array.from(vaultSalt) })
      log('Uploading to Drive…')
      const existingId = await findFile(token)
      await uploadFile(token, payload, existingId)
      log('Push complete ✓', 'ok'); setStatus('ok')
    } catch (e) { log(String(e), 'error'); setStatus('error') }
  }

  async function pull() {
    const token = getStoredToken()
    if (!token) { log('Not connected — click Connect first', 'error'); setStatus('error'); return }
    if (isLocked()) { log('Unlock your vault before syncing', 'error'); setStatus('error'); return }
    setStatus('busy'); log('Searching Drive for backup…')
    try {
      const fileId = await findFile(token)
      if (!fileId) { log('No backup found on Drive', 'error'); setStatus('error'); return }
      log('Downloading…')
      const raw = await downloadFile(token, fileId)
      const payload = JSON.parse(raw) as { ciphertext: string; iv: string; salt?: number[] }
      if (!payload.ciphertext || !payload.iv) {
        throw new Error('Backup is missing required fields. Push from the source device first.')
      }

      const backupSalt = payload.salt ? Uint8Array.from(payload.salt) : null
      const localSaltB64 = localStorage.getItem('myspace_vault_salt')
      const localSalt = localSaltB64 ? Uint8Array.from(atob(localSaltB64), c => c.charCodeAt(0)) : null

      const saltsDiffer = backupSalt && localSalt &&
        (backupSalt.length !== localSalt.length || backupSalt.some((b, i) => b !== localSalt[i]))
      const noLocalSalt = backupSalt && !localSalt

      if (saltsDiffer || noLocalSalt) {
        // Cross-device: store payload and ask for password
        setPendingPull({ ciphertext: payload.ciphertext, iv: payload.iv, salt: payload.salt! })
        setStatus('idle')
        log('Different device detected — enter your master password to decrypt', 'info')
        return
      }

      // Same-device: decrypt with current vault key
      log('Decrypting…')
      let plaintext: string
      try {
        plaintext = await decryptWithKey(payload.ciphertext, payload.iv, getKey())
      } catch {
        if (backupSalt) {
          setPendingPull({ ciphertext: payload.ciphertext, iv: payload.iv, salt: payload.salt! })
          setStatus('idle')
          log('Could not decrypt — enter your master password to retry', 'info')
          return
        }
        throw new Error('Cannot decrypt: push from your original device first to embed the encryption key.')
      }

      await finishImport(plaintext, null, null)
    } catch (e) { log(String(e), 'error'); setStatus('error') }
  }

  async function confirmPull() {
    if (!pullPassword.trim() || !pendingPull) return
    setStatus('busy')
    try {
      const backupSalt = Uint8Array.from(pendingPull.salt)
      const backupKey = await deriveKey(pullPassword, backupSalt)
      log('Decrypting…')
      let plaintext: string
      try {
        plaintext = await decryptWithKey(pendingPull.ciphertext, pendingPull.iv, backupKey)
      } catch {
        log('Wrong password — decryption failed', 'error')
        setStatus('error')
        return
      }
      setPendingPull(null)
      setPullPassword('')
      await finishImport(plaintext, backupKey, getKey())
    } catch (e) { log(String(e), 'error'); setStatus('error') }
  }

  async function finishImport(plaintext: string, backupKey: CryptoKey | null, localKey: CryptoKey | null) {
    const data = JSON.parse(plaintext) as Record<string, unknown[]>
    log('Merging…')
    const db = await getDb()

    if (data.notes) {
      for (const n of data.notes as { id: string; title: string; content: string; tags: string[]; image_data: string }[]) {
        await db.query(
          'INSERT INTO notes (id,title,content,tags,image_data) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, content=EXCLUDED.content, tags=EXCLUDED.tags, image_data=EXCLUDED.image_data, updated_at=now()',
          [n.id, n.title, n.content, n.tags, n.image_data ?? '[]']
        )
      }
      log(`Merged ${data.notes.length} notes`)
    }

    if (data.secrets) {
      const secrets = data.secrets as SecretRow[]
      for (const s of secrets) {
        let finalCt = s.ciphertext
        let finalIv = s.iv
        if (backupKey && localKey) {
          const plainValue = await decryptWithKey(s.ciphertext, s.iv, backupKey)
          const enc = await encryptWithKey(plainValue, localKey)
          finalCt = enc.ciphertext
          finalIv = enc.iv
        }
        await db.query(
          'INSERT INTO secrets (id,label,ciphertext,iv,tags,url,description) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO UPDATE SET label=EXCLUDED.label, ciphertext=EXCLUDED.ciphertext, iv=EXCLUDED.iv, tags=EXCLUDED.tags, url=EXCLUDED.url, description=EXCLUDED.description, updated_at=now()',
          [s.id, s.label, finalCt, finalIv, s.tags ?? [], s.url ?? '', s.description ?? '']
        )
      }
      log(`Merged ${secrets.length} secrets`)
    }

    if (data.subscriptions) {
      for (const s of data.subscriptions as { id: string; name: string; amount: number; currency: string; cycle: string; start_date: string; notes: string; active: boolean; tags: string[] }[]) {
        await db.query(
          'INSERT INTO subscriptions (id,name,amount,currency,cycle,start_date,notes,active,tags) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, amount=EXCLUDED.amount, currency=EXCLUDED.currency, cycle=EXCLUDED.cycle, start_date=EXCLUDED.start_date, notes=EXCLUDED.notes, active=EXCLUDED.active, tags=EXCLUDED.tags, updated_at=now()',
          [s.id, s.name, s.amount, s.currency, s.cycle, s.start_date, s.notes ?? '', s.active ?? true, s.tags ?? []]
        )
      }
      log(`Merged ${data.subscriptions.length} subscriptions`)
    }

    // todo_lists must be inserted before todo_tasks (foreign key constraint)
    if (data.todo_lists) {
      for (const l of data.todo_lists as { id: string; name: string; color: string; icon: string }[]) {
        await db.query(
          'INSERT INTO todo_lists (id,name,color,icon) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, color=EXCLUDED.color, icon=EXCLUDED.icon',
          [l.id, l.name, l.color ?? '#818cf8', l.icon ?? '']
        )
      }
      log(`Merged ${data.todo_lists.length} todo lists`)
    }

    if (data.todo_tasks) {
      for (const t of data.todo_tasks as { id: string; list_id: string; title: string; done: boolean; priority: string; due_date: string; note: string; recurrence: string }[]) {
        await db.query(
          'INSERT INTO todo_tasks (id,list_id,title,done,priority,due_date,note,recurrence) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, done=EXCLUDED.done, priority=EXCLUDED.priority, due_date=EXCLUDED.due_date, note=EXCLUDED.note, recurrence=EXCLUDED.recurrence, updated_at=now()',
          [t.id, t.list_id, t.title, t.done ?? false, t.priority ?? 'medium', t.due_date ?? null, t.note ?? '', t.recurrence ?? 'none']
        )
      }
      log(`Merged ${data.todo_tasks.length} tasks`)
    }

    // map_stacks must be inserted before map_pins (foreign key constraint)
    if (data.map_stacks) {
      for (const s of data.map_stacks as { id: string; name: string; color: string; icon: string }[]) {
        await db.query(
          'INSERT INTO map_stacks (id,name,color,icon) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, color=EXCLUDED.color, icon=EXCLUDED.icon',
          [s.id, s.name, s.color ?? '#34d399', s.icon ?? '']
        )
      }
      log(`Merged ${data.map_stacks.length} map stacks`)
    }

    if (data.map_pins) {
      const pins = data.map_pins as { id: string; stack_id: string; label: string; lat: number; lng: number; url: string; note: string; priority: string; category: string; rating: number; review_note: string }[]
      for (const p of pins) {
        await db.query(
          'INSERT INTO map_pins (id,stack_id,label,lat,lng,url,note,priority,category,rating,review_note) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO UPDATE SET label=EXCLUDED.label, lat=EXCLUDED.lat, lng=EXCLUDED.lng, url=EXCLUDED.url, note=EXCLUDED.note, priority=EXCLUDED.priority, category=EXCLUDED.category, rating=EXCLUDED.rating, review_note=EXCLUDED.review_note',
          [p.id, p.stack_id, p.label, p.lat, p.lng, p.url ?? '', p.note ?? '', p.priority ?? 'none', p.category ?? '', p.rating ?? 0, p.review_note ?? '']
        )
      }
      log(`Merged ${pins.length} pins`)
    }

    log('Pull complete ✓', 'ok'); setStatus('ok')
  }

  return { status, logs, connected, pendingPull, pullPassword, setPullPassword, log, connect, disconnect, push, pull, confirmPull, cancelPull: () => { setPendingPull(null); setPullPassword('') }, clearLogs: () => setLogs([]) }
}

export default function SyncView() {
  const isDesktop = useIsDesktop()
  if (isDesktop) return <DesktopSyncView />

  const { status, logs, connected, pendingPull, pullPassword, setPullPassword, connect, disconnect, push, pull, confirmPull, cancelPull, clearLogs } = useSyncLogic()

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
          Data is encrypted with your vault password. Compatible with the Chrome extension.
        </div>
      </div>

      {/* Backup card */}
      <div style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.6)', padding: 20 }}>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 14, color: '#1a1a2e', marginBottom: 14 }}>Backup & Restore</div>

        {/* Cross-device password prompt */}
        {pendingPull ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#7c6af7', lineHeight: 1.5 }}>
              Different device detected — enter your master password to decrypt the backup.
            </div>
            <input
              type="password"
              autoFocus
              value={pullPassword}
              onChange={e => setPullPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmPull()}
              placeholder="Master password"
              style={{ padding: '10px 14px', borderRadius: 12, border: '1.5px solid rgba(124,106,247,0.4)', background: 'rgba(255,255,255,0.5)', fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#1a1a2e', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={confirmPull} disabled={!pullPassword.trim() || status === 'busy'} style={{
                flex: 1, padding: '11px 0', borderRadius: 100, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #7c6af7, #6366f1)',
                color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13,
                opacity: !pullPassword.trim() || status === 'busy' ? 0.5 : 1,
              }}>Decrypt & Import</button>
              <button onClick={cancelPull} style={{
                padding: '11px 16px', borderRadius: 100, border: '1.5px solid rgba(255,255,255,0.7)', cursor: 'pointer',
                background: 'rgba(255,255,255,0.5)', color: '#4a4a6a', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13,
              }}>Cancel</button>
            </div>
          </div>
        ) : (
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
        )}
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
