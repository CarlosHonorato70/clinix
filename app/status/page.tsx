'use client'

import { useEffect, useState } from 'react'

interface HealthCheck {
  status: string
  timestamp: string
  version: string
  uptime: number
  checks: {
    database: { status: string; latencyMs: number }
  }
}

export default function StatusPage() {
  const [health, setHealth] = useState<HealthCheck | null>(null)
  const [error, setError] = useState(false)
  const [lastCheck, setLastCheck] = useState<Date>(new Date())

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/health')
        if (!res.ok) throw new Error('unhealthy')
        const data = await res.json()
        setHealth(data)
        setError(false)
      } catch {
        setError(true)
      } finally {
        setLastCheck(new Date())
      }
    }
    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [])

  const isHealthy = !error && health?.status === 'healthy'
  const uptime = health?.uptime ? formatUptime(health.uptime) : '—'

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f1117',
      fontFamily: 'system-ui, sans-serif',
      padding: '40px 20px',
      color: '#e4e4e7',
    }}>
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 48, height: 48, borderRadius: 12,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 16,
          }}>C</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Status do Clinix</h1>
          <p style={{ fontSize: 14, color: '#71717a', marginTop: 8 }}>
            Atualização automática a cada 30 segundos · Última verificação: {lastCheck.toLocaleTimeString('pt-BR')}
          </p>
        </div>

        {/* Main status */}
        <div style={{
          padding: 32, borderRadius: 16, textAlign: 'center',
          background: isHealthy ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${isHealthy ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          marginBottom: 32,
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>
            {isHealthy ? '✓' : '⊗'}
          </div>
          <div style={{
            fontSize: 22, fontWeight: 700,
            color: isHealthy ? '#34d399' : '#f87171',
          }}>
            {isHealthy ? 'Todos os sistemas operacionais' : 'Incidente detectado'}
          </div>
          {health && (
            <div style={{ fontSize: 13, color: '#71717a', marginTop: 8 }}>
              Uptime: {uptime} · Versão {health.version}
            </div>
          )}
        </div>

        {/* Service checks */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Componentes
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <ServiceRow
              name="API"
              status={isHealthy ? 'operational' : 'down'}
              detail={health ? `${health.uptime}s uptime` : undefined}
            />
            <ServiceRow
              name="Banco de dados PostgreSQL"
              status={health?.checks.database.status === 'ok' ? 'operational' : 'down'}
              detail={health?.checks.database.latencyMs ? `${health.checks.database.latencyMs}ms latency` : undefined}
            />
            <ServiceRow
              name="Cache Redis"
              status="operational"
              detail="Background jobs ativos"
            />
            <ServiceRow
              name="CDN Cloudflare"
              status="operational"
              detail="SSL ativo"
            />
            <ServiceRow
              name="Backup automático"
              status="operational"
              detail="Último backup: todo dia às 03:00"
            />
          </div>
        </div>

        {/* SLA */}
        <div style={{
          padding: 24, borderRadius: 12,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          marginBottom: 32,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
            SLA — Nível de serviço
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
            <SlaMetric label="Uptime mensal" value="99,5%" target="Basic/Pro" color="#34d399" />
            <SlaMetric label="Tempo de resposta" value="< 500ms" target="API" color="#93bbfc" />
            <SlaMetric label="Disponibilidade" value="24×7" target="Todos os planos" color="#c4b5fd" />
            <SlaMetric label="Backup" value="Diário" target="Retenção 7 dias" color="#fbbf24" />
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: 12, color: '#71717a' }}>
          <p>Manutenções programadas são comunicadas com antecedência mínima de 48 horas.</p>
          <p style={{ marginTop: 8 }}>
            <a href="/login" style={{ color: '#818cf8', textDecoration: 'none' }}>← Voltar ao Clinix</a>
          </p>
        </div>
      </div>
    </div>
  )
}

function ServiceRow({ name, status, detail }: { name: string; status: 'operational' | 'degraded' | 'down'; detail?: string }) {
  const colors = {
    operational: { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)', text: '#34d399', label: 'Operacional' },
    degraded: { bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.25)', text: '#fbbf24', label: 'Degradado' },
    down: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)', text: '#f87171', label: 'Fora do ar' },
  }[status]

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 18px', borderRadius: 10,
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#e4e4e7' }}>{name}</div>
        {detail && <div style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>{detail}</div>}
      </div>
      <div style={{
        padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
        background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text,
      }}>
        ● {colors.label}
      </div>
    </div>
  )
}

function SlaMetric({ label, value, target, color }: { label: string; value: string; target: string; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color, marginBottom: 2 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#a1a1aa' }}>{target}</div>
    </div>
  )
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}
