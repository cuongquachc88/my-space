export default function AppBackground() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
      background: 'linear-gradient(135deg, #c9d6ff 0%, #e2d9f3 40%, #c9d6ff 70%, #d4e4ff 100%)',
    }} />
  )
}
