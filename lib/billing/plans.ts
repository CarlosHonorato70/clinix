export interface Plan {
  id: string
  nome: string
  preco: number // BRL / mês
  descricao: string
  limites: {
    usuarios: number     // -1 = ilimitado
    pacientes: number
    auditoriasIa: number
    apiAccess: boolean
  }
  features: string[]
}

export const PLANS: Plan[] = [
  {
    id: 'trial',
    nome: 'Trial',
    preco: 0,
    descricao: '14 dias grátis para conhecer o MedFlow',
    limites: { usuarios: 2, pacientes: 50, auditoriasIa: 10, apiAccess: false },
    features: [
      'Dashboard completo',
      'Agenda inteligente',
      'Prontuário eletrônico',
      'Faturamento TISS básico',
    ],
  },
  {
    id: 'basic',
    nome: 'Basic',
    preco: 197,
    descricao: 'Para clínicas pequenas',
    limites: { usuarios: 5, pacientes: 500, auditoriasIa: 100, apiAccess: false },
    features: [
      'Tudo do Trial',
      'Agente IA de convênios',
      'Relatórios financeiros',
      'Conciliação automática',
      'Suporte por email',
    ],
  },
  {
    id: 'pro',
    nome: 'Pro',
    preco: 497,
    descricao: 'Para clínicas em crescimento',
    limites: { usuarios: 15, pacientes: -1, auditoriasIa: -1, apiAccess: false },
    features: [
      'Tudo do Basic',
      'Auditoria IA ilimitada',
      'Regras personalizadas',
      'Exportação LGPD',
      'Suporte prioritário',
    ],
  },
  {
    id: 'enterprise',
    nome: 'Enterprise',
    preco: -1, // custom
    descricao: 'Para grandes clínicas e redes',
    limites: { usuarios: -1, pacientes: -1, auditoriasIa: -1, apiAccess: true },
    features: [
      'Tudo do Pro',
      'Usuários ilimitados',
      'API REST completa',
      'SLA dedicado',
      'Suporte dedicado',
      'Integração customizada',
    ],
  },
]

export function getPlan(planId: string): Plan | undefined {
  return PLANS.find((p) => p.id === planId)
}

export function checkLimit(plan: Plan, resource: keyof Plan['limites'], current: number): boolean {
  const limit = plan.limites[resource]
  if (typeof limit === 'boolean') return limit
  if (limit === -1) return true
  return current < limit
}
