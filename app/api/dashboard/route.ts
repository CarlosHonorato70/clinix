import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { agendamentos, guiasTiss, pacientes, convenios } from '@/lib/db/schema'
import { eq, and, gte, lte, count, sql } from 'drizzle-orm'

export const GET = withAuth(async (_req, ctx) => {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay = new Date(startOfDay)
  endOfDay.setDate(endOfDay.getDate() + 1)

  // Today's appointments count
  const [todayAppts] = await db
    .select({ count: count() })
    .from(agendamentos)
    .where(
      and(
        eq(agendamentos.tenantId, ctx.tenantId),
        gte(agendamentos.dataHora, startOfDay),
        lte(agendamentos.dataHora, endOfDay),
      )
    )

  // Guias pending review
  const [pendingGuias] = await db
    .select({ count: count() })
    .from(guiasTiss)
    .where(
      and(
        eq(guiasTiss.tenantId, ctx.tenantId),
        eq(guiasTiss.status, 'pendente_revisao'),
      )
    )

  // Guias ready to send
  const [readyGuias] = await db
    .select({ count: count() })
    .from(guiasTiss)
    .where(
      and(
        eq(guiasTiss.tenantId, ctx.tenantId),
        eq(guiasTiss.status, 'pendente_envio'),
      )
    )

  // Monthly billing total
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const [monthlyBilling] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${guiasTiss.valorFaturado}::numeric), 0)`,
    })
    .from(guiasTiss)
    .where(
      and(
        eq(guiasTiss.tenantId, ctx.tenantId),
        gte(guiasTiss.createdAt, startOfMonth),
      )
    )

  // Bloco 2.2: detecta clínica nova (nenhum paciente E nenhum convênio cadastrado).
  // Frontend usa esse flag para redirecionar para /onboarding no primeiro acesso.
  const [pacientesCount] = await db
    .select({ count: count() })
    .from(pacientes)
    .where(eq(pacientes.tenantId, ctx.tenantId))

  const [conveniosCount] = await db
    .select({ count: count() })
    .from(convenios)
    .where(eq(convenios.tenantId, ctx.tenantId))

  const isFreshClinic = pacientesCount.count === 0 && conveniosCount.count === 0

  return Response.json({
    metrics: {
      consultasHoje: todayAppts.count,
      guiasPendentes: pendingGuias.count,
      guiasProntas: readyGuias.count,
      faturamentoMensal: `R$ ${parseFloat(monthlyBilling.total || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    },
    isFreshClinic,
  })
})
