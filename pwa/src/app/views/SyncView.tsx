// pwa/src/app/views/SyncView.tsx
import { useState } from 'react'
import { getDb } from '../../db'
import { deriveKey, encryptWithKey, decryptWithKey } from '../../crypto'
import { ACCENT } from '../../design/tokens'
import GlassCard from '../../design/GlassCard'
import GlassInput from '../../design/GlassInput'
import PillButton from '../../design/PillButton'
import { BentoGrid, BentoCell } from '../../design/BentoGrid'
import ViewHeader from '../ViewHeader'
import { IconSync } from '../../design/icons'

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata'
const FILE_NAME = 'keyvault-backup.json'

type Status = 'idle' | 'busy' | 'ok' | 'error'

const accent = ACCENT.sync

export default function SyncView() {
  const [status, setStatus] = useState<Status>('idle')
  const [msg, setMsg] = useState('')
  const [syncPw, setSyncPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [connected, setConnected] = useState(() => !!sessionStorage.getItem('drive_token'))

  async function getToken(): Promise<string | null> {
    return sessionStorage.getItem('drive_token')
  }

  async function authorize() {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) { setMsg('VITE_GOOGLE_CLIENT_ID not set'); setStatus('error'); return }
    const stateBytes = crypto.getRandomValues(new Uint8Array(16))
    const state = Array.from(stateBytes, b => b.toString(16).padStart(2, '0')).join('')
    sessionStorage.setItem('oauth_state', state)
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: location.origin + '/oauth-callback',
      response_type: 'token',
      scope: DRIVE_SCOPE,
      state,
    })
    window.location.href = `https://accounts.google.com/o/oauth2/auth?${params}`
  }

  async function push() {
    if (!syncPw.trim()) { setMsg('Enter a sync password'); setStatus('error'); return }
    const token = await getToken()
    if (!token) { setMsg('Not authorized — click Authorize first'); setStatus('error'); return }
    setStatus('busy'); setMsg('Exporting…')
    try {
      const db = await getDb()
      const [notes, secrets, subs, todos, pins, bills] = await Promise.all([
        db.query('SELECT * FROM notes'),
        db.query('SELECT * FROM secrets'),
        db.query('SELECT * FROM subscriptions'),
        db.query('SELECT * FROM todo_tasks'),
        db.query('SELECT * FROM map_pins'),
        db.query('SELECT * FROM bills'),
      ])
      const plaintext = JSON.stringify({ notes: notes.rows, secrets: secrets.rows, subscriptions: subs.rows, todo_tasks: todos.rows, map_pins: pins.rows, bills: bills.rows })
      const salt = crypto.getRandomValues(new Uint8Array(32))
      const key = await deriveKey(syncPw, salt)
      const { ciphertext, iv } = await encryptWithKey(plaintext, key)
      const payload = JSON.stringify({ ciphertext, iv, salt: Array.from(salt) })

      const listRes = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${FILE_NAME}'`, { headers: { Authorization: `Bearer ${token}` } })
      if (!listRes.ok) throw new Error(`Drive list failed: ${listRes.status}`)
      const list = await listRes.json() as { files?: { id: string }[] }
      const existingId = list.files?.[0]?.id

      const meta = JSON.stringify({ name: FILE_NAME, parents: ['appDataFolder'] })
      const body = new Blob([payload], { type: 'application/json' })
      const form = new FormData()
      form.append('metadata', new Blob([meta], { type: 'application/json' }))
      form.append('file', body)

      const url = existingId
        ? `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=multipart`
        : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart'
      const method = existingId ? 'PATCH' : 'POST'

      const uploadRes = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` }, body: form })
      if (!uploadRes.ok) throw new Error(`Drive upload failed: ${uploadRes.status}`)
      setMsg('Pushed to Drive ✓'); setStatus('ok')
    } catch (e) { setMsg(String(e)); setStatus('error') }
  }

  async function pull() {
    if (!syncPw.trim()) { setMsg('Enter a sync password'); setStatus('error'); return }
    const token = await getToken()
    if (!token) { setMsg('Not authorized — click Authorize first'); setStatus('error'); return }
    setStatus('busy'); setMsg('Pulling…')
    try {
      const listRes = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${FILE_NAME}'`, { headers: { Authorization: `Bearer ${token}` } })
      if (!listRes.ok) throw new Error(`Drive list failed: ${listRes.status}`)
      const list = await listRes.json() as { files?: { id: string }[] }
      const fileId = list.files?.[0]?.id
      if (!fileId) { setMsg('No backup found on Drive'); setStatus('error'); return }

      const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, { headers: { Authorization: `Bearer ${token}` } })
      if (!fileRes.ok) throw new Error(`Drive download failed: ${fileRes.status}`)
      const payload = await fileRes.json() as { ciphertext: string; iv: string; salt: number[] }
      const salt = Uint8Array.from(payload.salt)
      const key = await deriveKey(syncPw, salt)
      const plaintext = await decryptWithKey(payload.ciphertext, payload.iv, key)
      const data = JSON.parse(plaintext) as Record<string, unknown[]>

      const db = await getDb()
      if (data.notes) {
        for (const n of data.notes as { id: string; title: string; content: string; tags: string[]; image_data: string }[]) {
          await db.query('INSERT INTO notes (id,title,content,tags,image_data) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, content=EXCLUDED.content, tags=EXCLUDED.tags, image_data=EXCLUDED.image_data, updated_at=now()',
            [n.id, n.title, n.content, n.tags, n.image_data])
        }
      }
      if (data.secrets) {
        for (const s of data.secrets as { id: string; label: string; ciphertext: string; iv: string; tags: string[]; url: string; description: string }[]) {
          await db.query('INSERT INTO secrets (id,label,ciphertext,iv,tags,url,description) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO UPDATE SET label=EXCLUDED.label, ciphertext=EXCLUDED.ciphertext, iv=EXCLUDED.iv, tags=EXCLUDED.tags, url=EXCLUDED.url, description=EXCLUDED.description, updated_at=now()',
            [s.id, s.label, s.ciphertext, s.iv, s.tags, s.url ?? '', s.description ?? ''])
        }
      }
      setMsg('Pulled from Drive ✓ — data merged'); setStatus('ok')
    } catch (e) { setMsg(String(e)); setStatus('error') }
  }

  const statusColor = status === 'error' ? '#ef4444' : status === 'ok' ? '#34d399' : '#4a4a6a'

  return (
    <div>
      <ViewHeader title="Sync" icon={<IconSync size={22} accent={accent} filled />} accent={accent} />
      <BentoGrid>
        <BentoCell span="1">
          <GlassCard accentBar accent={accent}>
            <div style={{ padding: 20 }}>
              <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 700, fontSize: 16, color: '#1a1a2e', marginBottom: 8 }}>Connection</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#34d399' : '#94a3b8' }} />
                <span style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 13, color: '#4a4a6a' }}>
                  {connected ? 'Google Drive connected' : 'Not connected'}
                </span>
              </div>
              <PillButton onClick={authorize} accent={accent} style={{ width: '100%', justifyContent: 'center' }}>
                Authorize Google Drive
              </PillButton>
              <div style={{ marginTop: 12, fontFamily: 'Satoshi, sans-serif', fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
                Data is encrypted locally before upload. Use the same sync password on all devices.
              </div>
            </div>
          </GlassCard>
        </BentoCell>

        <BentoCell span="2">
          <GlassCard style={{ height: '100%' }}>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 700, fontSize: 16, color: '#1a1a2e' }}>Backup & Restore</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <GlassInput value={syncPw} onChange={setSyncPw} placeholder="Sync password" type={showPw ? 'text' : 'password'} />
                </div>
                <PillButton variant="secondary" onClick={() => setShowPw(p => !p)}>{showPw ? 'Hide' : 'Show'}</PillButton>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <PillButton onClick={push} accent={accent} disabled={status === 'busy'} style={{ flex: 1, justifyContent: 'center' }}>
                  Push to Drive
                </PillButton>
                <PillButton variant="secondary" onClick={pull} accent={accent} disabled={status === 'busy'} style={{ flex: 1, justifyContent: 'center' }}>
                  Pull from Drive
                </PillButton>
              </div>
              {msg && (
                <div style={{ padding: '10px 14px', borderRadius: 10, background: status === 'error' ? 'rgba(239,68,68,0.1)' : status === 'ok' ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.3)', fontFamily: 'Satoshi, sans-serif', fontSize: 13, color: statusColor }}>
                  {msg}
                </div>
              )}
            </div>
          </GlassCard>
        </BentoCell>
      </BentoGrid>
    </div>
  )
}
