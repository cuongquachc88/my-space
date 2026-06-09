import { useState } from 'react'
import type { SecretMeta } from '../../shared/messages'

interface Props {
  secret: SecretMeta
  onReveal: (id: string) => Promise<string>
  onCopy: (id: string) => void
  onDelete: (id: string) => void
}

export function SecretCard({ secret, onReveal, onCopy, onDelete }: Props) {
  const [revealed, setRevealed] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleReveal() {
    if (revealed) { setRevealed(null); return }
    setLoading(true)
    const val = await onReveal(secret.id)
    setRevealed(val)
    setLoading(false)
    setTimeout(() => setRevealed(null), 30_000)
  }

  return (
    <div className="rounded-xl p-3 flex flex-col gap-2"
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}>
      <div className="flex justify-between items-center">
        <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.87)' }}>
          {secret.label}
        </span>
        <div className="flex gap-3">
          <button onClick={handleReveal} className="text-xs" style={{ color: 'rgba(251,191,36,0.6)' }}>
            {loading ? '...' : revealed ? 'Hide' : 'Reveal'}
          </button>
          <button onClick={() => onCopy(secret.id)} className="text-xs" style={{ color: 'rgba(251,191,36,0.6)' }}>
            Copy
          </button>
          <button onClick={() => onDelete(secret.id)} className="text-xs" style={{ color: 'rgba(239,68,68,0.5)' }}>
            ✕
          </button>
        </div>
      </div>
      <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.25)', letterSpacing: '0.05em' }}>
        {revealed ?? '••••••••••••••••'}
      </p>
    </div>
  )
}
