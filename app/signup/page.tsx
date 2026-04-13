'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    nomeClinica: '',
    subdominio: '',
    nomeAdmin: '',
    email: '',
    senha: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        credentials: 'include',
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error)
        return
      }

      router.push('/')
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (field === 'nomeClinica') {
      const slug = value
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      setForm((prev) => ({ ...prev, subdominio: slug }))
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: '#e4e4e7',
    fontSize: 13,
    outline: 'none',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f1117',
      fontFamily: 'system-ui, sans-serif',
      padding: '16px',
      display: 'flex',
      justifyContent: 'center',
    }}>
      <form onSubmit={handleSubmit} style={{
        width: 440,
        maxWidth: '100%',
        padding: '20px 28px 28px',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        height: 'fit-content',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            background: '#6366f1',
            borderRadius: 8,
            color: '#fff',
            fontSize: 16,
            fontWeight: 700,
            marginBottom: 8,
          }}>C</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#e4e4e7', margin: 0 }}>Criar conta</h1>
          <p style={{ fontSize: 12, color: '#71717a', marginTop: 2 }}>14 dias grátis, sem cartão de crédito</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 4, display: 'block' }}>Nome da clínica</label>
            <input
              style={inputStyle}
              placeholder="Clínica São Lucas"
              value={form.nomeClinica}
              onChange={(e) => updateField('nomeClinica', e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 4, display: 'block' }}>Subdomínio</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              <input
                style={{ ...inputStyle, borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                value={form.subdominio}
                onChange={(e) => setForm((prev) => ({ ...prev, subdominio: e.target.value }))}
                required
              />
              <span style={{
                padding: '10px 12px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderLeft: 'none',
                borderTopRightRadius: 8,
                borderBottomRightRadius: 8,
                color: '#71717a',
                fontSize: 13,
                whiteSpace: 'nowrap',
              }}>.clinixproia.com.br</span>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 4, display: 'block' }}>Seu nome</label>
            <input
              style={inputStyle}
              placeholder="Dr. Carlos Honorato"
              value={form.nomeAdmin}
              onChange={(e) => setForm((prev) => ({ ...prev, nomeAdmin: e.target.value }))}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 4, display: 'block' }}>Email</label>
            <input
              type="email"
              style={inputStyle}
              placeholder="email@clinica.com"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 4, display: 'block' }}>Senha</label>
            <input
              type="password"
              style={inputStyle}
              placeholder="Mínimo 8 caracteres"
              value={form.senha}
              onChange={(e) => setForm((prev) => ({ ...prev, senha: e.target.value }))}
              required
              minLength={8}
            />
          </div>
        </div>

        {error && (
          <div
            role="alert"
            id="signup-error"
            style={{
              marginTop: 12,
              padding: '8px 12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: 6,
              color: '#f87171',
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            marginTop: 12,
            padding: '10px 0',
            background: loading ? '#4f46e5aa' : '#6366f1',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Criando conta...' : 'Começar teste grátis'}
        </button>

        <p style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: '#71717a' }}>
          Já tem conta? <a href="/login" style={{ color: '#818cf8', textDecoration: 'none' }}>Entrar</a>
        </p>
      </form>
    </div>
  )
}
