'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { useAuth } from '@/lib/auth/auth-context'
import { useApi, apiFetch } from '@/lib/api/client'
import { PLANS } from '@/lib/billing/plans'

interface TenantSettings {
  id: string
  nome: string
  subdominio: string
  plano: string
  status: string
  trialEndsAt: string | null
}

interface Usuario {
  id: string
  nome: string
  email: string
  role: string
  crm: string | null
  especialidade: string | null
  corAgenda: string | null
  ativo: boolean
  createdAt: string
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  medico: 'Médico',
  faturista: 'Faturista',
  recepcionista: 'Recepcionista',
}

const ROLE_COLORS: Record<string, 'purple' | 'blue' | 'amber' | 'green'> = {
  admin: 'purple',
  medico: 'blue',
  faturista: 'amber',
  recepcionista: 'green',
}

export default function ConfiguracoesPage() {
  const { user } = useAuth()
  const { data } = useApi<{ tenant: TenantSettings }>('/tenant/settings')
  const { data: usersData, mutate: mutateUsers } = useApi<{ usuarios: Usuario[] }>('/usuarios')
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUser, setNewUser] = useState({ nome: '', email: '', senha: '', role: 'recepcionista', crm: '', especialidade: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
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
                <div style={{ fontSize: 14, color: 'var(--text)', fontFamily: 'var(--mono)' }}>{tenant?.subdominio ?? '—'}.clinixproia.com.br</div>
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

      <Card style={{ marginTop: 20 }}>
        <div style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
              Equipe ({usersData?.usuarios?.filter((u) => u.ativo).length ?? 0}/{plan.limites.usuarios === -1 ? '∞' : plan.limites.usuarios})
            </h3>
            {user?.role === 'admin' && (
              <button
                onClick={() => { setShowAddUser(!showAddUser); setError('') }}
                style={{
                  padding: '6px 14px', background: 'var(--accent)', color: '#fff',
                  border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                }}
              >
                {showAddUser ? 'Cancelar' : '+ Adicionar'}
              </button>
            )}
          </div>

          {showAddUser && (
            <div style={{ padding: 16, background: 'var(--bg2)', borderRadius: 8, marginBottom: 16 }}>
              {error && <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 8 }}>{error}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <input placeholder="Nome" value={newUser.nome} onChange={(e) => setNewUser({ ...newUser, nome: e.target.value })}
                  style={{ padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 13 }} />
                <input placeholder="Email" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  style={{ padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 13 }} />
                <input placeholder="Senha" type="password" value={newUser.senha} onChange={(e) => setNewUser({ ...newUser, senha: e.target.value })}
                  style={{ padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 13 }} />
                <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  style={{ padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 13 }}>
                  <option value="recepcionista">Recepcionista</option>
                  <option value="medico">Médico</option>
                  <option value="faturista">Faturista</option>
                  <option value="admin">Administrador</option>
                </select>
                {newUser.role === 'medico' && (
                  <>
                    <input placeholder="CRM" value={newUser.crm} onChange={(e) => setNewUser({ ...newUser, crm: e.target.value })}
                      style={{ padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 13 }} />
                    <input placeholder="Especialidade" value={newUser.especialidade} onChange={(e) => setNewUser({ ...newUser, especialidade: e.target.value })}
                      style={{ padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 13 }} />
                  </>
                )}
              </div>
              <button
                disabled={saving}
                onClick={async () => {
                  setSaving(true); setError('')
                  try {
                    await apiFetch('/usuarios', { method: 'POST', body: JSON.stringify(newUser) })
                    setShowAddUser(false)
                    setNewUser({ nome: '', email: '', senha: '', role: 'recepcionista', crm: '', especialidade: '' })
                    mutateUsers()
                  } catch (err) { setError(err instanceof Error ? err.message : 'Erro ao criar usuário') }
                  setSaving(false)
                }}
                style={{
                  padding: '8px 20px', background: 'var(--accent)', color: '#fff',
                  border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Salvando...' : 'Criar usuário'}
              </button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {usersData?.usuarios?.map((u) => (
              <div key={u.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', background: 'var(--bg2)', borderRadius: 8,
                opacity: u.ativo ? 1 : 0.5,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: u.corAgenda || 'var(--accent)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 600,
                  }}>
                    {u.nome.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                      {u.nome} {!u.ativo && <span style={{ fontSize: 11, color: 'var(--text3)' }}>(inativo)</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{u.email}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Badge color={ROLE_COLORS[u.role] || 'default'}>{ROLE_LABELS[u.role] || u.role}</Badge>
                  {user?.role === 'admin' && u.id !== user.id && u.ativo && (
                    <button
                      onClick={async () => {
                        if (!confirm(`Desativar ${u.nome}?`)) return
                        await apiFetch(`/usuarios/${u.id}`, { method: 'DELETE' })
                        mutateUsers()
                      }}
                      style={{
                        padding: '4px 10px', background: 'transparent', color: '#ef4444',
                        border: '1px solid #ef4444', borderRadius: 4, fontSize: 11, cursor: 'pointer',
                      }}
                    >
                      Desativar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </>
  )
}
