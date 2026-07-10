// pwa/src/app/views/GeneratorView.tsx
import { useState } from 'react'
import { generatePassword } from '../../lib/generatePassword'
import { ACCENT } from '../../design/tokens'
import GlassCard from '../../design/GlassCard'
import PillButton from '../../design/PillButton'
import { BentoGrid, BentoCell } from '../../design/BentoGrid'
import ViewHeader from '../ViewHeader'
import { IconGen } from '../../design/icons'

const accent = ACCENT.gen

export default function GeneratorView() {
  const [length, setLength] = useState(20)
  const [upper, setUpper] = useState(true)
  const [lower, setLower] = useState(true)
  const [digits, setDigits] = useState(true)
  const [symbols, setSymbols] = useState(false)
  const [password, setPassword] = useState('')
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState<string[]>([])

  function generate() {
    try {
      const pw = generatePassword({ length, upper, lower, digits, symbols })
      setPassword(pw)
      setCopied(false)
      setHistory(h => [pw, ...h].slice(0, 10))
    } catch (e) { setPassword(String(e)) }
  }

  async function copyPassword() {
    if (!password) return
    await navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function copyFromHistory(pw: string) {
    await navigator.clipboard.writeText(pw)
  }

  const strength = [upper, lower, digits, symbols].filter(Boolean).length
  const strengthLabel = strength <= 1 ? 'Weak' : strength === 2 ? 'Fair' : strength === 3 ? 'Good' : 'Strong'
  const strengthColor = strength <= 1 ? '#ef4444' : strength === 2 ? '#f59e0b' : strength === 3 ? '#60a5fa' : '#34d399'

  return (
    <div>
      <ViewHeader title="Generator" icon={<IconGen size={22} accent={accent} filled />} accent={accent} />
      <BentoGrid>
        <BentoCell span="full">
          <GlassCard accentBar accent={accent}>
            <div style={{ padding: 32, textAlign: 'center' }}>
              {password ? (
                <>
                  <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 22, letterSpacing: '0.05em', color: '#1a1a2e', wordBreak: 'break-all', background: `${accent}10`, borderRadius: 12, padding: '16px 24px', userSelect: 'all' }}>
                    {password}
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: strengthColor, fontWeight: 600 }}>{strengthLabel}</span>
                    <PillButton onClick={copyPassword} accent={accent}>{copied ? 'Copied!' : 'Copy'}</PillButton>
                  </div>
                </>
              ) : (
                <div style={{ color: '#4a4a6a', fontFamily: 'Inter, sans-serif', fontSize: 15 }}>Press Generate to create a password</div>
              )}
            </div>
          </GlassCard>
        </BentoCell>

        <BentoCell span="2">
          <GlassCard>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#4a4a6a', marginBottom: 8 }}>
                  <span>Length</span>
                  <span style={{ fontWeight: 700, color: '#1a1a2e', fontFamily: 'monospace' }}>{length}</span>
                </div>
                <input type="range" min={8} max={64} value={length} onChange={e => setLength(+e.target.value)}
                  style={{ width: '100%', accentColor: accent }} />
              </div>
              {([['Uppercase A–Z', upper, (v: boolean) => setUpper(v)] as const,
                 ['Lowercase a–z', lower, (v: boolean) => setLower(v)] as const,
                 ['Digits 0–9', digits, (v: boolean) => setDigits(v)] as const,
                 ['Symbols !@#…', symbols, (v: boolean) => setSymbols(v)] as const]).map(([label, val, set]) => (
                <label key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#4a4a6a' }}>{label}</span>
                  <div onClick={() => set(!val)}
                    style={{ width: 40, height: 20, borderRadius: 100, background: val ? accent : 'rgba(148,163,184,0.3)', position: 'relative', cursor: 'pointer', transition: 'background 150ms' }}>
                    <div style={{ position: 'absolute', top: 2, left: val ? 22 : 2, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 150ms', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </div>
                </label>
              ))}
              <PillButton onClick={generate} accent={accent} style={{ marginTop: 4 }}>Generate</PillButton>
            </div>
          </GlassCard>
        </BentoCell>

        <BentoCell span="1">
          <GlassCard style={{ height: '100%' }}>
            <div style={{ padding: 16 }}>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, fontSize: 14, color: '#1a1a2e', marginBottom: 10 }}>History</div>
              {history.length === 0 && <div style={{ color: '#94a3b8', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>No history yet.</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
                {history.map((pw, i) => (
                  <div key={i} style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 11, color: '#1a1a2e', wordBreak: 'break-all' }}>{pw}</span>
                    <button onClick={() => copyFromHistory(pw)} style={{ fontSize: 11, color: accent, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>Copy</button>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </BentoCell>
      </BentoGrid>
    </div>
  )
}
