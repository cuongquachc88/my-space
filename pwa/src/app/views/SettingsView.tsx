import { useState } from 'react'
import { getDb } from '../../db'
import { lock } from '../../crypto'

interface Props { onLogout: () => void }

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
        notes: notes.rows,
        secrets: secrets.rows,
        subscriptions: subs.rows,
        todo_lists: todoLists.rows,
        todo_tasks: tasks.rows,
        map_stacks: stacks.rows,
        map_pins: pins.rows,
        bills: bills.rows,
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
            [n.id, n.title, n.content ?? '', n.tags ?? [], n.image_data ?? '[]'])
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
    <div className="flex flex-col h-full bg-[#0f2020] p-4">
      <h1 className="font-bold text-lg mb-6">Settings</h1>

      <div className="flex flex-col gap-3">
        <Section title="Data">
          <button onClick={exportData} disabled={exporting} className="w-full text-left px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm hover:bg-white/10 transition-colors disabled:opacity-50">
            Export all data (JSON)
          </button>
          <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl">
            <div className="text-sm mb-2">Import from JSON</div>
            <input type="file" accept=".json" onChange={e => setImportFile(e.target.files?.[0] ?? null)} className="text-xs text-white/60 mb-2 block" />
            {importFile && <button onClick={importData} className="text-xs bg-[#b4e645] text-[#0f2020] font-semibold px-4 py-1.5 rounded-full">Import</button>}
          </div>
        </Section>

        <Section title="Account">
          <button onClick={handleLogout} className="w-full text-left px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-red-400 hover:bg-red-900/20 transition-colors">
            Lock vault &amp; return to landing
          </button>
        </Section>

        <Section title="About">
          <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white/50 space-y-1">
            <div>My SPACE v1.0.0</div>
            <div>Privacy-first · No servers · No tracking</div>
            <div>Data stored in PGlite (WASM Postgres) — offline-first PWA</div>
          </div>
        </Section>
      </div>

      {msg && <div className="mt-4 text-sm text-[#b4e645] bg-[#b4e645]/10 rounded-lg px-4 py-3">{msg}</div>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-2 px-1">{title}</div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}
