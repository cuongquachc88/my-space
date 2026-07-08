interface Props { onEnter: () => void }

const FEATURES = [
  { icon: '🔐', title: 'Encrypted Vault', desc: 'AES-256 + PBKDF2, 600k iterations' },
  { icon: '📝', title: 'Private Notes', desc: 'Markdown, image attachments, full-text search' },
  { icon: '✅', title: 'Todo Lists', desc: 'Priority, due dates, recurrence, color-coded lists' },
  { icon: '💳', title: 'Subscriptions', desc: 'Recurring costs with multi-currency conversion' },
  { icon: '📍', title: 'Map Pins', desc: 'Save locations in stacks with ratings and notes' },
  { icon: '🔑', title: 'Password Generator', desc: 'Crypto-random, configurable charset' },
  { icon: '📊', title: 'Reports', desc: '6-month billing chart, actual vs expected' },
  { icon: '☁️', title: 'Drive Sync', desc: 'End-to-end encrypted, compatible with Chrome extension' },
]

export default function LandingPage({ onEnter }: Props) {
  return (
    <div className="min-h-screen bg-[#0f2020] text-white flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <span className="font-bold text-lg tracking-tight">My <span className="text-[#b4e645]">SPACE</span></span>
        <button
          onClick={onEnter}
          className="bg-[#b4e645] text-[#0f2020] font-semibold px-4 py-2 rounded-full text-sm hover:bg-[#c8f060] transition-colors"
        >
          Open App
        </button>
      </nav>

      <section className="flex flex-col items-center justify-center text-center px-6 py-16 flex-1">
        <div className="inline-flex items-center gap-2 bg-[#b4e645]/10 border border-[#b4e645]/30 rounded-full px-4 py-1.5 text-[#b4e645] text-sm mb-6">
          Privacy-first · No accounts · No tracking
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight mb-4">
          Your private<br /><span className="text-[#b4e645]">digital vault</span>
        </h1>
        <p className="text-white/60 text-lg max-w-md mb-10">
          Everything stays encrypted on your device. Notes, secrets, todos, subscriptions — all in one place.
        </p>
        <button
          onClick={onEnter}
          className="bg-[#b4e645] text-[#0f2020] font-bold px-8 py-3.5 rounded-full text-base hover:bg-[#c8f060] transition-colors"
        >
          Get Started — It's Free
        </button>
      </section>

      <section className="px-6 pb-16 max-w-4xl mx-auto w-full">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-[#152a2a] border border-white/10 rounded-xl p-4">
              <div className="text-2xl mb-2">{f.icon}</div>
              <div className="font-semibold text-sm mb-1">{f.title}</div>
              <div className="text-white/50 text-xs leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
