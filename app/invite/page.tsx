'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function InvitePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [info, setInfo] = useState<{ nome: string; email: string; role: string } | null>(null)

  useEffect(() => {
    if (!token) return
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      setInfo({ nome: payload.nome, email: payload.email, role: payload.role })
    } catch {
      setError('Convite inválido')
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (senha.length < 8) {
      setError('Senha deve ter pelo menos 8 caracteres')
      return
    }
    if (senha !== confirmar) {
      setError('Senhas não coincidem')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/usuarios/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, senha }),
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

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: '#e4e4e7',
    fontSize: 14,
    outline: 'none',
  }

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1117' }}>
        <p style={{ color: '#71717a', fontSize: 15 }}>Link de convite inválido.</p>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f1117',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <form onSubmit={handleSubmit} style={{
        width: 420,
        padding: 40,
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 44, height: 44, background: '#6366f1', borderRadius: 10,
            color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 12,
          }}>M</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e4e4e7', margin: 0 }}>Aceitar convite</h1>
          {info && (
            <p style={{ fontSize: 13, color: '#71717a', marginTop: 8 }}>
              Bem-vindo, <strong style={{ color: '#a1a1aa' }}>{info.nome}</strong>!<br />
              Crie sua senha para acessar o Clinix.
            </p>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {info && (
            <div>
              <label style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 4, display: 'block' }}>Email</label>
              <input style={{ ...inputStyle, opacity: 0.6 }} value={info.email} disabled />
            </div>
          )}
          <div>
            <label style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 4, display: 'block' }}>Senha</label>
            <input type="password" style={inputStyle} placeholder="Mínimo 8 caracteres" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={8} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 4, display: 'block' }}>Confirmar senha</label>
            <input type="password" style={inputStyle} placeholder="Repita a senha" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} required />
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, color: '#f87171', fontSize: 13 }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} style={{
          width: '100%', marginTop: 20, padding: '12px 0',
          background: loading ? '#4f46e5aa' : '#6366f1', color: '#fff',
          border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
        }}>
          {loading ? 'Criando conta...' : 'Criar conta e entrar'}
        </button>
      </form>
    </div>
  )
}
