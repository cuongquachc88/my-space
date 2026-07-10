import { useState } from 'react'
import { ACCENT } from '../../../design/tokens'
import { IconSync } from '../../../design/icons'
import { useSyncLogic } from '../SyncView'

const accent = ACCENT.sync

function StatusDot({ ok }: { ok: boolean }) {
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: ok ? '#34d399' : '#94a3b8', boxShadow: ok ? '0 0 6px rgba(52,211,153,0.6)' : 'none' }} />
}

const logColor = (type: 'info' | 'ok' | 'error') =>
  type === 'error' ? '#f87171' : type === 'ok' ? '#34d399' : 'rgba(255,255,255,0.7)'

export default function DesktopSyncView() {
  const { status, logs, syncPw, setSyncPw, connected, connect, disconnect, push, pull, clearLogs } = useSyncLogic()
  const [showPw, setShowPw] = useState(false)

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.6)', border: '1.5px solid rgba(255,255,255,0.7)',
    borderRadius: 12, padding: '10px 14px', fontSize: 14, color: '#1a1a2e',
    fontFamily: 'Inter, sans-serif', outline: 'none',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: `${accent}18`, border: `1.5px solid ${accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconSync size={20} accent={accent} filled />
          </div>
          <div>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 22, color: '#1a1a2e', letterSpacing: '-0.02em', lineHeight: 1 }}>Sync</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Google Drive backup</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* ── Connection card ── */}
        <div style={{ background: 'rgba(255,255,255,0.55)', borderRadius: 20, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            {/* Google Drive icon */}
            <div style={{ width: 48, height: 48, borderRadius: 14, background: connected ? 'rgba(52,211,153,0.1)' : 'rgba(148,163,184,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="26" height="22" viewBox="0 0 87 78" fill="none">
                <path d="M28.5 0L0 48H28.5L57 0H28.5Z" fill="#4285F4"/>
                <path d="M57 0L28.5 48H87L57 0Z" fill="#0F9D58" opacity="0.85"/>
                <path d="M0 48L14.25 72L43.5 72L28.5 48H0Z" fill="#F4B400"/>
                <path d="M43.5 72H72.75L87 48H57.75L43.5 72Z" fill="#EA4335" opacity="0.9"/>
                <path d="M28.5 48H57.75L43.5 72H14.25L28.5 48Z" fill="#0F9D58" opacity="0.5"/>
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 16, color: '#1a1a2e' }}>Google Drive</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <StatusDot ok={connected} />
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#4a4a6a' }}>{connected ? 'Connected' : 'Not connected'}</span>
              </div>
            </div>
          </div>

          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#4a4a6a', lineHeight: 1.6, marginBottom: 20, padding: '12px 14px', background: 'rgba(124,106,247,0.05)', borderRadius: 10 }}>
            Your data is <strong>encrypted locally</strong> before upload. Google only stores an encrypted blob — it cannot read your content.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={connect} style={{
              padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: `linear-gradient(135deg, ${accent} 0%, #ec4899 100%)`,
              color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 14,
              boxShadow: `0 4px 14px ${accent}40`,
            }}>
              {connected ? '↺ Re-connect' : '→ Connect Google Drive'}
            </button>
            {connected && (
              <button onClick={disconnect} style={{
                padding: '12px', borderRadius: 12, border: '1.5px solid rgba(239,68,68,0.25)', cursor: 'pointer',
                background: 'transparent', color: '#ef4444', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13,
              }}>Disconnect</button>
            )}
          </div>
        </div>

        {/* ── Backup & Restore card ── */}
        <div style={{ background: 'rgba(255,255,255,0.55)', borderRadius: 20, padding: 24 }}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 16, color: '#1a1a2e', marginBottom: 6 }}>Backup & Restore</div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#94a3b8', marginBottom: 20 }}>Use the same sync password on all devices.</div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: '#4a4a6a', marginBottom: 6 }}>Vault password</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={syncPw} onChange={e => setSyncPw(e.target.value)}
                type={showPw ? 'text' : 'password'}
                placeholder="Enter sync password…"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button onClick={() => setShowPw(p => !p)} style={{
                padding: '10px 14px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.6)',
                cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, color: '#4a4a6a', flexShrink: 0,
              }}>{showPw ? 'Hide' : 'Show'}</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button onClick={push} disabled={status === 'busy'} style={{
              padding: '13px', borderRadius: 12, border: 'none', cursor: status === 'busy' ? 'not-allowed' : 'pointer',
              background: `linear-gradient(135deg, ${accent} 0%, #ec4899 100%)`,
              color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 14,
              boxShadow: `0 4px 14px ${accent}40`, opacity: status === 'busy' ? 0.6 : 1,
            }}>↑ Push to Drive</button>
            <button onClick={pull} disabled={status === 'busy'} style={{
              padding: '13px', borderRadius: 12, border: '1.5px solid rgba(124,106,247,0.25)', cursor: status === 'busy' ? 'not-allowed' : 'pointer',
              background: 'rgba(255,255,255,0.6)', color: '#1a1a2e', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 14,
              opacity: status === 'busy' ? 0.6 : 1,
            }}>↓ Pull from Drive</button>
          </div>

          {status === 'busy' && (
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Inter, sans-serif', fontSize: 12, color: accent }}>
              <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', border: `2px solid ${accent}`, borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
              Working…
            </div>
          )}
        </div>
      </div>

      {/* ── Console log ── */}
      {logs.length > 0 && (
        <div style={{ marginTop: 20, background: 'rgba(15,15,30,0.88)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', padding: '14px 16px', maxHeight: 220, overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Console</span>
            <button onClick={clearLogs} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>Clear</button>
          </div>
          {logs.map((l, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, fontFamily: 'monospace', fontSize: 12, lineHeight: 1.7 }}>
              <span style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>{l.time}</span>
              <span style={{ color: logColor(l.type) }}>{l.msg}</span>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
