export default function DashboardLoading() {
  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{
            background: 'var(--bg2)',
            borderRadius: 10,
            padding: 20,
            height: 90,
            animation: 'pulse 1.5s infinite',
          }} />
        ))}
      </div>
      <div style={{
        background: 'var(--bg2)',
        borderRadius: 10,
        height: 400,
        animation: 'pulse 1.5s infinite',
      }} />
    </div>
  )
}
