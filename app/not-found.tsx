import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg, #0f1117)',
      color: 'var(--text, #e4e4e7)',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 72, fontWeight: 700, color: 'var(--accent, #6366f1)', marginBottom: 8 }}>404</div>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
          Página não encontrada
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text3, #71717a)', marginBottom: 24 }}>
          A página que você está procurando não existe ou foi movida.
        </p>
        <Link
          href="/"
          style={{
            padding: '10px 24px',
            background: 'var(--accent, #6366f1)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          Voltar ao Dashboard
        </Link>
      </div>
    </div>
  )
}
