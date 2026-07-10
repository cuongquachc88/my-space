// pwa/src/design/AppBackground.tsx
export default function AppBackground() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        background: 'linear-gradient(135deg, #c9d6ff, #e2e2e2, #f5c6cb, #d4e4ff)',
        backgroundSize: '400% 400%',
        animation: 'gradientShift 12s ease infinite',
      }}
      aria-hidden="true"
    >
      <style>{`
        @keyframes gradientShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
