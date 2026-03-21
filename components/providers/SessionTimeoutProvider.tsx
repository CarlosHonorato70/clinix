'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface SessionTimeoutProviderProps {
  children: React.ReactNode
  /** Timeout em minutos (padrão: 15 — conforme SBIS NGS1.02.21) */
  timeoutMinutes?: number
}

/**
 * SBIS NGS1.02.21 — Bloqueio por Inatividade
 *
 * A sessão de usuário é automaticamente bloqueada após um período de inatividade,
 * SEM que a sessão seja encerrada. Ao efetuar o login novamente, o usuário é
 * direcionado para a mesma tela em que estava, sem perda de dados.
 */
export default function SessionTimeoutProvider({
  children,
  timeoutMinutes = 15,
}: SessionTimeoutProviderProps) {
  const [locked, setLocked] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [unlocking, setUnlocking] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timeoutMs = timeoutMinutes * 60 * 1000

  const resetTimer = useCallback(() => {
    if (locked) return // Don't reset while locked
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setLocked(true), timeoutMs)
  }, [locked, timeoutMs])

  // Listen for user activity
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart']
    const handler = () => resetTimer()

    for (const event of events) {
      document.addEventListener(event, handler, { passive: true })
    }
    resetTimer() // Start initial timer

    return () => {
      for (const event of events) {
        document.removeEventListener(event, handler)
      }
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [resetTimer])

  // Unlock handler
  const handleUnlock = async () => {
    if (!password.trim()) {
      setError('Digite sua senha')
      return
    }

    setUnlocking(true)
    setError('')

    try {
      const res = await fetch('/api/auth/verify-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        setLocked(false)
        setPassword('')
        setError('')
        resetTimer()
      } else {
        setError('Senha incorreta')
      }
    } catch {
      // Fallback: accept any password in dev, require API in production
      if (process.env.NODE_ENV === 'development') {
        setLocked(false)
        setPassword('')
        resetTimer()
      } else {
        setError('Erro de conexão. Tente novamente.')
      }
    } finally {
      setUnlocking(false)
    }
  }

  return (
    <>
      {children}

      {locked && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <div
            style={{
              background: '#1a1b23',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16,
              padding: 40,
              width: '100%',
              maxWidth: 380,
              textAlign: 'center',
            }}
          >
            {/* Lock icon */}
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                marginBottom: 20,
              }}
            >
              🔒
            </div>

            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#e4e4e7', margin: '0 0 6px' }}>
              Sessão bloqueada
            </h2>
            <p style={{ fontSize: 13, color: '#71717a', margin: '0 0 24px' }}>
              Bloqueada por inatividade. Digite sua senha para desbloquear.
            </p>

            {error && (
              <div
                role="alert"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  marginBottom: 16,
                  color: '#f87171',
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleUnlock()
              }}
            >
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
                autoFocus
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  color: '#e4e4e7',
                  fontSize: 14,
                  outline: 'none',
                  marginBottom: 12,
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="submit"
                disabled={unlocking}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: unlocking ? '#4f46e5aa' : '#6366f1',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: unlocking ? 'wait' : 'pointer',
                }}
              >
                {unlocking ? 'Verificando...' : 'Desbloquear'}
              </button>
            </form>

            <p style={{ fontSize: 11, color: '#52525b', marginTop: 16 }}>
              Conforme SBIS NGS1.02.21 — Bloqueio por inatividade
            </p>
          </div>
        </div>
      )}
    </>
  )
}
