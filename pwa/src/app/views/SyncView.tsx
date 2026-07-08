import { useState } from 'react'
import { getDb } from '../../db'
import { deriveKey, encryptWithKey, decryptWithKey } from '../../crypto'

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata'
const FILE_NAME = 'keyvault-backup.json'

type Status = 'idle' | 'busy' | 'ok' | 'error'

export default function SyncView() {
  const [status, setStatus] = useState<Status>('idle')
  const [msg, setMsg] = useState('')
  const [syncPw, setSyncPw] = useState('')
  const [showPw, setShowPw] = useState(false)

  async function getToken(): Promise<string | null> {
    const stored = localStorage.getItem('drive_token')
    if (stored) return stored
    return null
  }

  async function authorize() {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) { setMsg('VITE_GOOGLE_CLIENT_ID not set'); setStatus('error'); return }
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: location.origin + '/oauth-callback',
      response_type: 'token',
      scope: DRIVE_SCOPE,
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

      await fetch(url, { method, headers: { Authorization: `Bearer ${token}` }, body: form })
      setMsg('Pushed to Drive ✓'); setStatus('ok')
    } catch (e) {
      setMsg(String(e)); setStatus('error')
    }
  }

  async function pull() {
    if (!syncPw.trim()) { setMsg('Enter a sync password'); setStatus('error'); return }
    const token = await getToken()
    if (!token) { setMsg('Not authorized — click Authorize first'); setStatus('error'); return }
    setStatus('busy'); setMsg('Pulling…')
    try {
      const listRes = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${FILE_NAME}'`, { headers: { Authorization: `Bearer ${token}` } })
      const list = await listRes.json() as { files?: { id: string }[] }
      const fileId = list.files?.[0]?.id
      if (!fileId) { setMsg('No backup found on Drive'); setStatus('error'); return }

      const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, { headers: { Authorization: `Bearer ${token}` } })
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
    } catch (e) {
      setMsg(String(e)); setStatus('error')
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#0f2020] p-4">
      <h1 className="font-bold text-lg mb-6">Google Drive Sync</h1>

      <div className="bg-[#152a2a] border border-white/10 rounded-xl p-4 mb-4">
        <p className="text-sm text-white/60 mb-4">
          Data is encrypted locally before upload. Use the same sync password on all devices.
          Compatible with the My SPACE Chrome extension.
        </p>
        <div className="flex gap-2 mb-4">
          <input
            type={showPw ? 'text' : 'password'}
            value={syncPw}
            onChange={e => setSyncPw(e.target.value)}
            placeholder="Sync password"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#b4e645]/50"
          />
          <button onClick={() => setShowPw(p => !p)} className="text-white/40 hover:text-white px-3 text-sm border border-white/10 rounded-lg">
            {showPw ? 'Hide' : 'Show'}
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={push} disabled={status === 'busy'} className="flex-1 bg-[#b4e645] text-[#0f2020] font-semibold py-2.5 rounded-full text-sm disabled:opacity-50">
            Push to Drive
          </button>
          <button onClick={pull} disabled={status === 'busy'} className="flex-1 border border-[#b4e645]/40 text-[#b4e645] font-semibold py-2.5 rounded-full text-sm disabled:opacity-50">
            Pull from Drive
          </button>
        </div>
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm ${status === 'error' ? 'bg-red-900/30 text-red-300' : status === 'ok' ? 'bg-green-900/30 text-green-300' : 'bg-white/5 text-white/60'}`}>
          {msg}
        </div>
      )}

      <button onClick={authorize} className="mt-4 text-sm text-white/40 hover:text-white underline text-left">
        Authorize Google Drive access
      </button>
    </div>
  )
}
