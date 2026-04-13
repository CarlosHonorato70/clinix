'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erro ao fazer login')
        return
      }

      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      localStorage.setItem('user', JSON.stringify(data.user))

      // Redirect to the page they were trying to access, or dashboard
      const params = new URLSearchParams(window.location.search)
      router.push(params.get('redirect') || '/agenda')
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r2)',
          padding: '40px',
          width: '100%',
          maxWidth: '400px',
        }}
      >
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                fontWeight: 600,
                color: '#fff',
              }}
            >
              M
            </div>
            <span style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)' }}>
              Clinix
            </span>
          </div>
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>
            Gestão Clínica Inteligente
          </p>
        </div>

        {error && (
          <div
            role="alert"
            id="login-error"
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 20,
              color: '#ef4444',
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: 'block',
              color: 'var(--text2)',
              fontSize: 13,
              marginBottom: 6,
              fontWeight: 500,
            }}
          >
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            required
            aria-describedby={error ? 'login-error' : undefined}
            style={{
              width: '100%',
              padding: '10px 14px',
              background: 'var(--bg3)',
              border: '1px solid var(--border2)',
              borderRadius: 8,
              color: 'var(--text)',
              fontSize: 14,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label
            style={{
              display: 'block',
              color: 'var(--text2)',
              fontSize: 13,
              marginBottom: 6,
              fontWeight: 500,
            }}
          >
            Senha
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            style={{
              width: '100%',
              padding: '10px 14px',
              background: 'var(--bg3)',
              border: '1px solid var(--border2)',
              borderRadius: 8,
              color: 'var(--text)',
              fontSize: 14,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '11px',
            background: loading ? 'var(--bg4)' : 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>

        <p
          style={{
            textAlign: 'center',
            color: 'var(--text3)',
            fontSize: 12,
            marginTop: 24,
          }}
        >
          Dev: admin@clinix.dev / clinix123
        </p>
      </form>
    </div>
  )
}
