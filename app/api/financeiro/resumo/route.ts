import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { guiasTiss } from '@/lib/db/schema'
import { eq, and, gte, sql } from 'drizzle-orm'

export const GET = withAuth(async (_req, ctx) => {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [summary] = await db
    .select({
      totalFaturado: sql<string>`COALESCE(SUM(${guiasTiss.valorFaturado}::numeric), 0)::text`,
      totalRecebido: sql<string>`COALESCE(SUM(${guiasTiss.valorPago}::numeric), 0)::text`,
      totalGuias: sql<number>`COUNT(${guiasTiss.id})::int`,
      guiasPagas: sql<number>`COUNT(CASE WHEN ${guiasTiss.status} = 'pago' THEN 1 END)::int`,
      guiasGlosadas: sql<number>`COUNT(CASE WHEN ${guiasTiss.status} = 'glosado' THEN 1 END)::int`,
    })
    .from(guiasTiss)
    .where(
      and(
        eq(guiasTiss.tenantId, ctx.tenantId),
        gte(guiasTiss.createdAt, startOfMonth),
      )
    )

  return Response.json({ resumo: summary })
}, ['admin', 'faturista'])
