import { useState, useEffect } from 'react'
import { generatePassword } from '../../lib/generatePassword'

interface StrengthInfo {
  label: string
  color: string
  bits: number
}

function calcStrength(charsetSize: number, length: number): StrengthInfo {
  const bits = Math.log2(charsetSize) * length
  if (bits < 40) return { label: 'Weak',        color: '#ef4444', bits }
  if (bits < 60) return { label: 'Fair',        color: '#f59e0b', bits }
  if (bits < 80) return { label: 'Strong',      color: '#6ee7b7', bits }
  return            { label: 'Very Strong', color: '#818cf8', bits }
}

const CHARSET_SIZES = { upper: 26, lower: 26, digits: 10, symbols: 28 }

interface ToggleButtonProps {
  label: string
  value: boolean
  onToggle: () => void
  accentColor: string
}

function ToggleButton({ label, value, onToggle, accentColor }: ToggleButtonProps) {
  return (
    <button
      onClick={onToggle}
      className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
      style={value
        ? { background: `${accentColor}22`, border: `1px solid ${accentColor}55`, color: accentColor }
        : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)' }}
    >
      {label}
    </button>
  )
}

export function GeneratorView() {
  const [length, setLength]   = useState(20)
  const [upper, setUpper]     = useState(true)
  const [lower, setLower]     = useState(true)
  const [digits, setDigits]   = useState(true)
  const [symbols, setSymbols] = useState(false)
  const [password, setPassword] = useState(() =>
    generatePassword({ length: 20, upper: true, lower: true, digits: true, symbols: false })
  )
  const [copied, setCopied] = useState(false)

  const anyEnabled = upper || lower || digits || symbols

  useEffect(() => {
    if (!anyEnabled) return
    try {
      setPassword(generatePassword({ length, upper, lower, digits, symbols }))
    } catch {
      // length < enabled sets count — don't update
    }
  }, [length, upper, lower, digits, symbols, anyEnabled])

  function regenerate() {
    if (!anyEnabled) return
    try {
      setPassword(generatePassword({ length, upper, lower, digits, symbols }))
    } catch {}
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  const charsetSize = (upper ? CHARSET_SIZES.upper : 0)
    + (lower ? CHARSET_SIZES.lower : 0)
    + (digits ? CHARSET_SIZES.digits : 0)
    + (symbols ? CHARSET_SIZES.symbols : 0)

  const strength = anyEnabled ? calcStrength(charsetSize, length) : null

  return (
    <div className="flex flex-col p-4 gap-4 overflow-y-auto" style={{ height: '100%' }}>
      <p className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.8)' }}>Password Generator</p>

      {/* Generated password display */}
      <div className="glass-card p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <p
            className="flex-1 font-mono text-xs break-all select-all"
            style={{ color: anyEnabled ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.2)',
                     lineHeight: '1.6', wordBreak: 'break-all' }}
          >
            {anyEnabled ? password : '— select at least one character set —'}
          </p>
        </div>
        {strength && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="h-1 rounded-full transition-all" style={{
                width: `${Math.min(100, (strength.bits / 128) * 100)}%`,
                background: strength.color
              }} />
            </div>
            <span className="text-xs font-semibold" style={{ color: strength.color, minWidth: '60px', textAlign: 'right' }}>
              {strength.label}
            </span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button onClick={regenerate} disabled={!anyEnabled}
          className="flex-1 py-2 rounded-lg text-xs font-semibold disabled:opacity-40"
          style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)', color: '#a78bfa' }}>
          Regenerate
        </button>
        <button onClick={copy} disabled={!anyEnabled}
          className="flex-1 py-2 rounded-lg text-xs font-semibold disabled:opacity-40 transition-all"
          style={copied
            ? { background: 'rgba(110,231,183,0.15)', border: '1px solid rgba(110,231,183,0.3)', color: '#6ee7b7' }
            : { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)' }}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Options */}
      <div className="glass-card p-4 flex flex-col gap-4">
        {/* Length slider */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>Length</span>
            <span className="text-xs font-mono font-bold" style={{ color: '#a78bfa' }}>{length}</span>
          </div>
          <input type="range" min={8} max={64} value={length}
            onChange={e => setLength(Number(e.target.value))}
            className="w-full accent-violet-400" />
          <div className="flex justify-between">
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>8</span>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>64</span>
          </div>
        </div>

        {/* Character set toggles */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>Include</span>
          <div className="flex gap-1.5">
            <ToggleButton label="ABC" value={upper}   onToggle={() => setUpper(v => !v)}   accentColor="#f472b6" />
            <ToggleButton label="abc" value={lower}   onToggle={() => setLower(v => !v)}   accentColor="#60a5fa" />
            <ToggleButton label="123" value={digits}  onToggle={() => setDigits(v => !v)}  accentColor="#6ee7b7" />
            <ToggleButton label="!@#" value={symbols} onToggle={() => setSymbols(v => !v)} accentColor="#fb923c" />
          </div>
          {!anyEnabled && (
            <p className="text-xs" style={{ color: 'rgba(239,68,68,0.7)' }}>Select at least one character set</p>
          )}
        </div>
      </div>
    </div>
  )
}
