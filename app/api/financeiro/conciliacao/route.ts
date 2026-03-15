import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { guiasTiss, convenios } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'

export const GET = withAuth(async (_req, ctx) => {
  const results = await db
    .select({
      convenioId: convenios.id,
      convenioNome: convenios.nome,
      totalGuias: sql<number>`COUNT(${guiasTiss.id})::int`,
      totalFaturado: sql<string>`COALESCE(SUM(${guiasTiss.valorFaturado}::numeric), 0)::text`,
      totalRecebido: sql<string>`COALESCE(SUM(${guiasTiss.valorPago}::numeric), 0)::text`,
      totalGlosa: sql<string>`COALESCE(SUM(CASE WHEN ${guiasTiss.status} = 'glosado' THEN ${guiasTiss.valorFaturado}::numeric - COALESCE(${guiasTiss.valorPago}::numeric, 0) ELSE 0 END), 0)::text`,
    })
    .from(guiasTiss)
    .innerJoin(convenios, eq(guiasTiss.convenioId, convenios.id))
    .where(eq(guiasTiss.tenantId, ctx.tenantId))
    .groupBy(convenios.id, convenios.nome)

  return Response.json({ conciliacao: results })
}, ['admin', 'faturista'])
