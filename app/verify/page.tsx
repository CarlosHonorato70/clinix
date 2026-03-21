'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function VerifyPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setError('Token não encontrado')
      return
    }

    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (res.ok) {
          setStatus('success')
        } else {
          setStatus('error')
          setError(data.error || 'Erro ao verificar')
        }
      })
      .catch(() => {
        setStatus('error')
        setError('Erro de conexão')
      })
  }, [token])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f1117',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        width: 420,
        padding: 40,
        textAlign: 'center',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 44, height: 44, background: '#6366f1', borderRadius: 10,
          color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 16,
        }}>M</div>

        {status === 'verifying' && (
          <>
            <h2 style={{ color: '#e4e4e7', fontSize: 20, fontWeight: 600 }}>Verificando email...</h2>
            <p style={{ color: '#71717a', fontSize: 14 }}>Aguarde um momento.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <h2 style={{ color: '#34d399', fontSize: 20, fontWeight: 600 }}>Email verificado!</h2>
            <p style={{ color: '#a1a1aa', fontSize: 14, marginBottom: 24 }}>
              Sua conta foi ativada com sucesso.
            </p>
            <a href="/login" style={{
              display: 'inline-block', background: '#6366f1', color: '#fff',
              padding: '12px 24px', borderRadius: 8, textDecoration: 'none',
              fontSize: 15, fontWeight: 600,
            }}>
              Fazer login
            </a>
          </>
        )}

        {status === 'error' && (
          <>
            <h2 style={{ color: '#f87171', fontSize: 20, fontWeight: 600 }}>Erro na verificação</h2>
            <p style={{ color: '#a1a1aa', fontSize: 14, marginBottom: 24 }}>{error}</p>
            <a href="/login" style={{
              display: 'inline-block', background: '#6366f1', color: '#fff',
              padding: '12px 24px', borderRadius: 8, textDecoration: 'none',
              fontSize: 15, fontWeight: 600,
            }}>
              Ir para login
            </a>
          </>
        )}
      </div>
    </div>
  )
}
