import { useState } from 'react'
import { generatePassword } from '../../lib/generatePassword'

export default function GeneratorView() {
  const [length, setLength] = useState(20)
  const [upper, setUpper] = useState(true)
  const [lower, setLower] = useState(true)
  const [digits, setDigits] = useState(true)
  const [symbols, setSymbols] = useState(false)
  const [password, setPassword] = useState('')
  const [copied, setCopied] = useState(false)

  function generate() {
    try {
      setPassword(generatePassword({ length, upper, lower, digits, symbols }))
      setCopied(false)
    } catch (e) {
      setPassword(String(e))
    }
  }

  async function copy() {
    if (!password) return
    await navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const strength = [upper, lower, digits, symbols].filter(Boolean).length
  const strengthLabel = strength <= 1 ? 'Weak' : strength === 2 ? 'Fair' : strength === 3 ? 'Good' : 'Strong'
  const strengthColor = strength <= 1 ? 'text-red-400' : strength === 2 ? 'text-yellow-400' : strength === 3 ? 'text-blue-400' : 'text-[#b4e645]'

  return (
    <div className="flex flex-col h-full bg-[#0f2020] p-4">
      <h1 className="font-bold text-lg mb-6">Password Generator</h1>

      {password && (
        <div className="bg-[#152a2a] border border-white/10 rounded-xl p-4 mb-6">
          <div className="font-mono text-base break-all text-white/90 mb-3 select-all">{password}</div>
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${strengthColor}`}>{strengthLabel}</span>
            <button onClick={copy} className={`text-sm px-4 py-1.5 rounded-full font-semibold transition-colors ${copied ? 'bg-green-500 text-white' : 'bg-[#b4e645] text-[#0f2020]'}`}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 bg-[#152a2a] border border-white/10 rounded-xl p-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-white/60">Length</span>
            <span className="font-mono font-semibold">{length}</span>
          </div>
          <input type="range" min={8} max={64} value={length} onChange={e => setLength(+e.target.value)}
            className="w-full accent-[#b4e645]" />
        </div>

        {([['Uppercase A–Z', upper, setUpper], ['Lowercase a–z', lower, setLower],
           ['Digits 0–9', digits, setDigits], ['Symbols !@#…', symbols, setSymbols]] as const).map(([label, val, set]) => (
          <label key={label} className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-white/70">{label}</span>
            <div onClick={() => set(!val)} className={`w-10 h-5 rounded-full transition-colors relative ${val ? 'bg-[#b4e645]' : 'bg-white/20'}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${val ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </label>
        ))}
      </div>

      <button onClick={generate} className="mt-6 bg-[#b4e645] text-[#0f2020] font-bold py-3 rounded-full text-base">
        Generate
      </button>
    </div>
  )
}
