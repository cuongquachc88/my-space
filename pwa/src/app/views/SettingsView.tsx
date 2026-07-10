// pwa/src/app/views/SettingsView.tsx
import { useState } from 'react'
import { getDb } from '../../db'
import { lock } from '../../crypto'
import DOMPurify from 'dompurify'
import { ACCENT } from '../../design/tokens'
import GlassCard from '../../design/GlassCard'
import PillButton from '../../design/PillButton'
import { BentoGrid, BentoCell } from '../../design/BentoGrid'
import ViewHeader from '../ViewHeader'
import { IconSettings, IconLock } from '../../design/icons'

function sanitizeText(s: unknown): string {
  if (typeof s !== 'string') return ''
  return DOMPurify.sanitize(s, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
}

interface Props { onLogout: () => void }

const accent = ACCENT.settings

export default function SettingsView({ onLogout }: Props) {
  const [exporting, setExporting] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [msg, setMsg] = useState('')

  async function exportData() {
    setExporting(true)
    try {
      const db = await getDb()
      const [notes, secrets, subs, todoLists, tasks, stacks, pins, bills] = await Promise.all([
        db.query('SELECT * FROM notes'),
        db.query('SELECT * FROM secrets'),
        db.query('SELECT * FROM subscriptions'),
        db.query('SELECT * FROM todo_lists'),
        db.query('SELECT * FROM todo_tasks'),
        db.query('SELECT * FROM map_stacks'),
        db.query('SELECT * FROM map_pins'),
        db.query('SELECT * FROM bills'),
      ])
      const data = {
        exported_at: new Date().toISOString(),
        notes: notes.rows, secrets: secrets.rows, subscriptions: subs.rows,
        todo_lists: todoLists.rows, todo_tasks: tasks.rows,
        map_stacks: stacks.rows, map_pins: pins.rows, bills: bills.rows,
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `my-space-export-${new Date().toISOString().slice(0,10)}.json`
      a.click(); URL.revokeObjectURL(url)
      setMsg('Export complete')
    } catch (e) { setMsg(String(e)) }
    setExporting(false)
  }

  async function importData() {
    if (!importFile) return
    try {
      const text = await importFile.text()
      const data = JSON.parse(text) as Record<string, unknown[]>
      const db = await getDb()
      let count = 0
      if (Array.isArray(data.notes)) {
        for (const n of data.notes as { id: string; title: string; content: string; tags: string[]; image_data: string }[]) {
          await db.query('INSERT INTO notes (id,title,content,tags,image_data) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING',
            [n.id, sanitizeText(n.title), sanitizeText(n.content), n.tags ?? [], '[]'])
          count++
        }
      }
      if (Array.isArray(data.secrets)) {
        for (const s of data.secrets as { id: string; label: string; ciphertext: string; iv: string; tags: string[]; url: string; description: string }[]) {
          await db.query('INSERT INTO secrets (id,label,ciphertext,iv,tags,url,description) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING',
            [s.id, s.label, s.ciphertext, s.iv, s.tags ?? [], s.url ?? '', s.description ?? ''])
          count++
        }
      }
      if (Array.isArray(data.subscriptions)) {
        for (const s of data.subscriptions as { id: string; name: string; amount: number; currency: string; cycle: string; start_date: string; tags: string[]; notes: string; active: boolean }[]) {
          await db.query('INSERT INTO subscriptions (id,name,amount,currency,cycle,start_date,tags,notes,active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING',
            [s.id, s.name, s.amount, s.currency, s.cycle, s.start_date, s.tags ?? [], s.notes ?? '', s.active ?? true])
          count++
        }
      }
      setMsg(`Imported ${count} items`)
      setImportFile(null)
    } catch (e) { setMsg(`Import failed: ${e}`) }
  }

  function handleLogout() { lock(); onLogout() }

  return (
    <div>
      <ViewHeader title="Settings" icon={<IconSettings size={22} accent={accent} filled />} accent={accent} />
      <BentoGrid>
        <BentoCell span="1">
          <GlassCard accentBar accent={accent}>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, color: '#1a1a2e' }}>Security</div>
              <button onClick={handleLogout}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
                <IconLock size={16} accent="#ef4444" filled />
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#ef4444', fontWeight: 500 }}>Lock & Sign Out</span>
              </button>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
                All data stays on this device. Encrypted with your master password via PBKDF2 + AES-GCM.
              </div>
            </div>
          </GlassCard>
        </BentoCell>

        <BentoCell span="1">
          <GlassCard>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, color: '#1a1a2e' }}>Data</div>
              <PillButton onClick={exportData} accent={accent} disabled={exporting} style={{ width: '100%', justifyContent: 'center' }}>
                {exporting ? 'Exporting…' : 'Export JSON'}
              </PillButton>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#4a4a6a' }}>Import from JSON</div>
                <input type="file" accept=".json" onChange={e => setImportFile(e.target.files?.[0] ?? null)}
                  style={{ fontSize: 12, color: '#4a4a6a', fontFamily: 'Inter, sans-serif' }} />
                {importFile && <PillButton onClick={importData} accent={accent}>Import</PillButton>}
              </div>
              {msg && <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#34d399' }}>{msg}</div>}
            </div>
          </GlassCard>
        </BentoCell>

        <BentoCell span="1">
          <GlassCard>
            <div style={{ padding: 20 }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, color: '#1a1a2e', marginBottom: 12 }}>About</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 14, color: '#1a1a2e' }}>My SPACE v1.0.0</div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#4a4a6a' }}>Privacy-first · No servers · No tracking</div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#94a3b8', lineHeight: 1.5, marginTop: 4 }}>
                  Data stored in PGlite (WASM Postgres) — offline-first PWA. Works without internet.
                </div>
              </div>
            </div>
          </GlassCard>
        </BentoCell>
      </BentoGrid>
    </div>
  )
}
