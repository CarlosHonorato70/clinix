'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log para o console em dev — em prod o digest já vai pro Sentry
    console.error('[Dashboard Error]', error)
  }, [error])

  // Bloco 2.3: detectar tipo de erro para mensagem amigável
  const isNetwork =
    error.message.toLowerCase().includes('fetch') ||
    error.message.toLowerCase().includes('network') ||
    error.message.toLowerCase().includes('failed to')
  const isAuth =
    error.message.includes('401') || error.message.toLowerCase().includes('token')

  const title = isNetwork
    ? 'Sem conexão com o servidor'
    : isAuth
      ? 'Sessão expirada'
      : 'Algo deu errado'

  const body = isNetwork
    ? 'Verifique sua conexão com a internet. Se o problema persistir, nossos servidores podem estar passando por instabilidade momentânea.'
    : isAuth
      ? 'Sua sessão expirou. Faça login novamente para continuar.'
      : (error.message || 'Ocorreu um erro inesperado.')

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 480,
      padding: 40,
    }}>
      <div style={{
        background: 'rgba(239, 68, 68, 0.08)',
        border: '1px solid rgba(239, 68, 68, 0.18)',
        borderRadius: 12,
        padding: '40px 48px',
        textAlign: 'center',
        maxWidth: 480,
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{isNetwork ? '📡' : isAuth ? '🔒' : '⚠️'}</div>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>
          {title}
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 24, lineHeight: 1.6 }}>
          {body}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          {isAuth ? (
            <Link
              href="/login"
              style={{
                padding: '10px 24px',
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              Fazer login
            </Link>
          ) : (
            <button
              onClick={reset}
              style={{
                padding: '10px 24px',
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Tentar novamente
            </button>
          )}
          <Link
            href="/dashboard"
            style={{
              padding: '10px 24px',
              background: 'transparent',
              color: 'var(--text2)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Voltar ao dashboard
          </Link>
        </div>
        {error.digest && (
          <p style={{ marginTop: 20, fontSize: 11, color: 'var(--text3)', fontFamily: 'monospace' }}>
            Código: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
