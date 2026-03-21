'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { useApi } from '@/lib/api/client'
import { PLANS } from '@/lib/billing/plans'

interface TenantBilling {
  id: string
  nome: string
  plano: string
  status: string
  trialEndsAt: string | null
}

export default function AssinaturaPage() {
  const { data } = useApi<{ tenant: TenantBilling }>('/tenant/settings')
  const tenant = data?.tenant
  const currentPlan = PLANS.find((p) => p.id === tenant?.plano) || PLANS[0]
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

  const statusColor = {
    trial: 'amber' as const,
    active: 'green' as const,
    suspended: 'red' as const,
    cancelled: 'default' as const,
  }[tenant?.status ?? 'trial'] ?? 'default' as const

  const statusLabel = {
    trial: 'Período de teste',
    active: 'Ativo',
    suspended: 'Suspenso',
    cancelled: 'Cancelado',
  }[tenant?.status ?? 'trial'] ?? tenant?.status

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Current plan banner */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Sua assinatura</h2>
              <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>{tenant?.nome ?? '—'}</p>
            </div>
            <Badge color={statusColor}>{statusLabel}</Badge>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)' }}>
              {currentPlan.preco === 0 ? 'Grátis' : currentPlan.preco === -1 ? 'Sob consulta' : `R$ ${currentPlan.preco}`}
            </span>
            {currentPlan.preco > 0 && <span style={{ fontSize: 14, color: 'var(--text3)' }}>/mês</span>}
          </div>
          <p style={{ fontSize: 13, color: 'var(--text2)' }}>
            Plano {currentPlan.nome} — {currentPlan.descricao}
          </p>

          {tenant?.trialEndsAt && tenant.status === 'trial' && (
            <div style={{
              marginTop: 16, padding: '12px 16px',
              background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: 8, fontSize: 13, color: '#fbbf24',
            }}>
              ⏰ Seu período de teste expira em {new Date(tenant.trialEndsAt).toLocaleDateString('pt-BR')}.
              Escolha um plano para continuar usando o Clinix.
            </div>
          )}
        </div>
      </Card>

      {/* Plan comparison */}
      <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>
        {tenant?.status === 'trial' ? 'Escolher plano' : 'Trocar de plano'}
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {PLANS.filter((p) => p.id !== 'trial').map((plan) => {
          const isCurrent = plan.id === currentPlan.id
          const isSelected = selectedPlan === plan.id
          const isPopular = plan.id === 'pro'

          return (
            <Card key={plan.id} style={{
              padding: 0,
              border: isSelected ? '2px solid var(--accent)' : isCurrent ? '2px solid rgba(16,185,129,0.4)' : undefined,
              position: 'relative',
              cursor: isCurrent ? 'default' : 'pointer',
              transition: 'border-color 0.2s',
            }}
              onClick={() => !isCurrent && setSelectedPlan(plan.id)}
            >
              {isPopular && (
                <div style={{
                  position: 'absolute', top: -1, right: 16,
                  background: 'var(--accent)', color: '#fff',
                  fontSize: 10, fontWeight: 700, padding: '3px 10px',
                  borderRadius: '0 0 6px 6px', letterSpacing: '0.05em',
                }}>POPULAR</div>
              )}

              <div style={{ padding: 24 }}>
                <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: '0 0 8px' }}>{plan.nome}</h4>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 12 }}>
                  <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>
                    {plan.preco === -1 ? '—' : `R$ ${plan.preco}`}
                  </span>
                  {plan.preco > 0 && <span style={{ fontSize: 12, color: 'var(--text3)' }}>/mês</span>}
                </div>
                <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>{plan.descricao}</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {plan.features.map((f) => (
                    <div key={f} style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', gap: 6 }}>
                      <span style={{ color: '#34d399' }}>✓</span> {f}
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 20 }}>
                  {isCurrent ? (
                    <div style={{
                      width: '100%', padding: '10px 0', textAlign: 'center',
                      background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                      borderRadius: 8, color: '#34d399', fontSize: 13, fontWeight: 600,
                    }}>Plano atual</div>
                  ) : plan.preco === -1 ? (
                    <a href="mailto:vendas@clinix.com.br" style={{
                      display: 'block', width: '100%', padding: '10px 0', textAlign: 'center',
                      background: 'transparent', border: '1px solid var(--border)', borderRadius: 8,
                      color: 'var(--text2)', fontSize: 13, fontWeight: 500, textDecoration: 'none',
                    }}>Falar com vendas</a>
                  ) : (
                    <button style={{
                      width: '100%', padding: '10px 0',
                      background: isSelected ? 'linear-gradient(135deg, #7c3aed, #3b82f6)' : 'transparent',
                      border: isSelected ? '1px solid rgba(139,92,246,0.5)' : '1px solid var(--border)',
                      borderRadius: 8, color: isSelected ? '#fff' : 'var(--text2)',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}>
                      {isSelected ? 'Confirmar upgrade' : 'Selecionar'}
                    </button>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Limits */}
      <Card>
        <div style={{ padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>Uso atual</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {[
              { label: 'Usuários', limit: currentPlan.limites.usuarios, icon: '👤' },
              { label: 'Pacientes', limit: currentPlan.limites.pacientes, icon: '📋' },
              { label: 'Auditorias IA/mês', limit: currentPlan.limites.auditoriasIa, icon: '🤖' },
              { label: 'API REST', limit: currentPlan.limites.apiAccess ? 'Sim' : 'Não', icon: '🔌' },
            ].map((item) => (
              <div key={item.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>{item.icon}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
                  {typeof item.limit === 'number' ? (item.limit === -1 ? '∞' : item.limit) : item.limit}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}
