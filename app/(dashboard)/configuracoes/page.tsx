'use client'

import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { useAuth } from '@/lib/auth/auth-context'
import { useApi } from '@/lib/api/client'
import { PLANS } from '@/lib/billing/plans'

interface TenantSettings {
  id: string
  nome: string
  subdominio: string
  plano: string
  status: string
  trialEndsAt: string | null
}

export default function ConfiguracoesPage() {
  const { user } = useAuth()
  const { data } = useApi<{ tenant: TenantSettings }>('/tenant/settings')
  const tenant = data?.tenant

  const plan = PLANS.find((p) => p.id === tenant?.plano) || PLANS[0]

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
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <Card>
          <div style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>Dados da clínica</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nome</div>
                <div style={{ fontSize: 14, color: 'var(--text)' }}>{tenant?.nome ?? '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subdomínio</div>
                <div style={{ fontSize: 14, color: 'var(--text)', fontFamily: 'var(--mono)' }}>{tenant?.subdominio ?? '—'}.medflow.com.br</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Administrador</div>
                <div style={{ fontSize: 14, color: 'var(--text)' }}>{user?.nome ?? '—'} ({user?.email})</div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Plano atual</h3>
              <Badge color={statusColor}>{statusLabel}</Badge>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>
                {plan.preco === 0 ? 'Grátis' : plan.preco === -1 ? 'Sob consulta' : `R$ ${plan.preco}`}
              </span>
              {plan.preco > 0 && <span style={{ fontSize: 13, color: 'var(--text3)' }}>/mês</span>}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>{plan.nome} — {plan.descricao}</div>
            {tenant?.trialEndsAt && tenant.status === 'trial' && (
              <div style={{ fontSize: 12, color: '#fbbf24', marginBottom: 12 }}>
                Trial expira em {new Date(tenant.trialEndsAt).toLocaleDateString('pt-BR')}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {plan.features.map((f) => (
                <div key={f} style={{ fontSize: 12, color: 'var(--text2)' }}>✓ {f}</div>
              ))}
            </div>
            <button style={{
              marginTop: 16,
              padding: '8px 20px',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}>
              {tenant?.status === 'trial' ? 'Escolher plano' : 'Gerenciar assinatura'}
            </button>
          </div>
        </Card>
      </div>

      <Card>
        <div style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>Limites do plano</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {[
              { label: 'Usuários', limit: plan.limites.usuarios, icon: '👤' },
              { label: 'Pacientes', limit: plan.limites.pacientes, icon: '📋' },
              { label: 'Auditorias IA/mês', limit: plan.limites.auditoriasIa, icon: '🤖' },
              { label: 'API REST', limit: plan.limites.apiAccess ? 'Sim' : 'Não', icon: '🔌' },
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
    </>
  )
}
